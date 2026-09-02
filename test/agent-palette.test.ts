import { test } from "node:test";
import assert from "node:assert/strict";
import { mkdtemp, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import {
	listBuiltinAgents,
	scanAgentsDir,
	mergeAgentEntries,
} from "../src/adapters/pi-subagents/agents.ts";
import { buildDelegationInstruction } from "../src/commands/delegation.ts";
import registerPlusExtension from "../extensions/plus.ts";
import { createAgentAutocompleteProvider } from "../src/adapters/pi-subagents/autocomplete.ts";
import type { AutocompleteItem } from "@earendil-works/pi-tui";

test("builtin agents resolve from the bundled pi-subagents package", async () => {
	const agents = await listBuiltinAgents();
	const names = agents.map((agent) => agent.name);
	assert.ok(names.includes("scout"), `expected scout in ${names.join(",")}`);
	assert.ok(
		names.includes("reviewer"),
		`expected reviewer in ${names.join(",")}`,
	);
	assert.ok(agents.every((agent) => agent.source === "builtin"));
});

test("scanAgentsDir reads frontmatter name/description and tolerates missing dirs", async () => {
	const dir = await mkdtemp(join(tmpdir(), "plus-agents-"));
	await writeFile(
		join(dir, "my-agent.md"),
		"---\nname: my-agent\ndescription: Does things well\n---\n",
	);
	await writeFile(join(dir, "bare.md"), "no frontmatter here");
	await writeFile(join(dir, "notes.txt"), "ignored");
	const agents = await scanAgentsDir(dir, "custom");
	assert.deepEqual(
		agents.map((agent) => agent.name).sort(),
		["bare", "my-agent"],
	);
	assert.equal(
		agents.find((agent) => agent.name === "my-agent")?.description,
		"Does things well",
	);
	assert.equal(agents.find((agent) => agent.name === "bare")?.description, undefined);
	assert.deepEqual(await scanAgentsDir(join(dir, "missing"), "custom"), []);
});

test("mergeAgentEntries: later groups override earlier by name", () => {
	const merged = mergeAgentEntries(
		[
			{ name: "x", source: "builtin" },
			{ name: "keep", source: "builtin" },
		],
		[{ name: "x", source: "custom", description: "custom desc" }],
		[{ name: "x", source: "runtime" }],
	);
	assert.deepEqual(merged, [
		{ name: "x", source: "runtime", description: "custom desc" },
		{ name: "keep", source: "builtin" },
	]);
});

test("buildDelegationInstruction: with task and without task", () => {
	const withTask = buildDelegationInstruction("reviewer", "  review my diff  ");
	assert.match(withTask, /^Delegate to the reviewer subagent via the subagent tool\./);
	assert.match(withTask, /Task: review my diff/);
	assert.match(withTask, /decide the exact child prompt yourself/);

	const withoutTask = buildDelegationInstruction("scout", "");
	assert.match(withoutTask, /Task: not specified/);
	assert.match(withoutTask, /ask me before delegating/);
});

function makeCurrent() {
	const calls: string[] = [];
	return {
		calls,
		provider: {
			getSuggestions: async () => {
				calls.push("suggestions");
				return null;
			},
			applyCompletion: () => {
				calls.push("apply");
				return { lines: [], cursorLine: 0, cursorCol: 0 };
			},
		},
	};
}

const AUTOCOMPLETE_OPTIONS = { signal: new AbortController().signal };

const AUTOCOMPLETE_AGENTS = [
	{ name: "reviewer", source: "builtin" as const, description: "Review specialist" },
	{ name: "scout", source: "builtin" as const },
];

async function getTestAgents(): Promise<typeof AUTOCOMPLETE_AGENTS> {
	return AUTOCOMPLETE_AGENTS;
}

test("@ provider lists matching agents with descriptions", async () => {
	const { provider: current } = makeCurrent();
	const provider = createAgentAutocompleteProvider(current, getTestAgents);
	const result = await provider.getSuggestions(["@rev"], 0, 4, AUTOCOMPLETE_OPTIONS);
	assert.equal(result?.prefix, "@rev");
	assert.deepEqual(
		result?.items.map((item) => item.value),
		["@agent:reviewer"],
	);
	assert.equal(result?.items[0]?.description, "Review specialist");
	assert.equal(result?.items[0]?.label, "@agent:reviewer");
});

test("@ provider falls back to built-in completion outside agent mentions", async () => {
	const { calls, provider: current } = makeCurrent();
	const provider = createAgentAutocompleteProvider(current, getTestAgents);
	await provider.getSuggestions(["@"], 0, 1, AUTOCOMPLETE_OPTIONS);
	await provider.getSuggestions(["@zzz"], 0, 4, AUTOCOMPLETE_OPTIONS);
	await provider.getSuggestions(["plain text"], 0, 10, AUTOCOMPLETE_OPTIONS);
	assert.deepEqual(calls, ["suggestions", "suggestions", "suggestions"]);
});

test("@ provider applyCompletion delegates to the built-in provider", () => {
	const { calls, provider: current } = makeCurrent();
	const provider = createAgentAutocompleteProvider(current, getTestAgents);
	provider.applyCompletion([], 0, 0, {} as AutocompleteItem, "@rev");
	assert.deepEqual(calls, ["apply"]);
});

type CmdOptions = {
	description: string;
	handler: (args: string, ctx: unknown) => Promise<void> | void;
};

function makePi() {
	const commands = new Map<string, CmdOptions>();
	const handlers = new Map<string, (event: { text: string }) => unknown>();
	const sent: string[] = [];
	const pi = {
		registerCommand: (name: string, options: CmdOptions) => {
			commands.set(name, options);
		},
		events: { on: () => {} },
		on: (event: string, handler: (event: { text: string }) => unknown) => {
			handlers.set(event, handler);
		},
		sendUserMessage: async (content: string) => {
			sent.push(content);
		},
	};
	return {
		commands,
		handlers,
		sent,
		pi: pi as unknown as Parameters<typeof registerPlusExtension>[0],
	};
}

test("extension registers doctor and an input transformer (no /agent:* commands)", () => {
	const { commands, handlers, pi } = makePi();
	registerPlusExtension(pi);
	assert.ok(commands.has("plus-doctor"));
	assert.ok(![...commands.keys()].some((name) => name.startsWith("agent")));
	assert.ok(handlers.has("input"), "expected the input event handler");
	assert.ok(handlers.has("session_start"));
});

test("input handler transforms @agent: mentions into delegation instructions", () => {
	const { handlers, pi } = makePi();
	registerPlusExtension(pi);
	const handler = handlers.get("input");
	assert.ok(handler);

	const transformed = handler({ text: "@agent:reviewer review my diff" }) as {
		action: string;
		text: string;
	};
	assert.equal(transformed.action, "transform");
	assert.match(
		transformed.text,
		/^Delegate to the reviewer subagent via the subagent tool\./,
	);
	assert.match(transformed.text, /Task: review my diff/);
	assert.doesNotMatch(transformed.text, /@agent:/);

	const passthrough = handler({ text: "hello world" }) as { action: string };
	assert.deepEqual(passthrough, { action: "continue" });
});

test("input handler keeps mention-less @ references untouched", () => {
	const { handlers, pi } = makePi();
	registerPlusExtension(pi);
	const handler = handlers.get("input");
	assert.ok(handler);
	const result = handler({ text: "look at @src/auth.ts please" }) as {
		action: string;
	};
	assert.deepEqual(result, { action: "continue" });
});
