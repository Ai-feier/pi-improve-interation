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
import registerPlusExtension, {
	buildDelegationPrompt,
} from "../extensions/plus.ts";

function flush(ms = 50): Promise<void> {
	return new Promise((resolve) => setTimeout(resolve, ms));
}

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

test("buildDelegationPrompt: with task and without task", () => {
	assert.equal(
		buildDelegationPrompt("reviewer", "  review my diff  "),
		"Use reviewer to review my diff.",
	);
	assert.match(
		buildDelegationPrompt("scout", ""),
		/^Use scout on the current context.*subagent tool/s,
	);
});

type CmdOptions = {
	description: string;
	handler: (args: string, ctx: unknown) => Promise<void> | void;
};

function makePi() {
	const commands = new Map<string, CmdOptions>();
	const sent: string[] = [];
	const pi = {
		registerCommand: (name: string, options: CmdOptions) => {
			commands.set(name, options);
		},
		events: { on: () => {} },
		sendUserMessage: async (content: string) => {
			sent.push(content);
		},
	};
	return {
		commands,
		sent,
		pi: pi as unknown as Parameters<typeof registerPlusExtension>[0],
	};
}

test("extension registers doctor, listing, and per-agent commands", async () => {
	const { commands, pi } = makePi();
	registerPlusExtension(pi);
	assert.ok(commands.has("plus-doctor"));
	assert.ok(commands.has("agent"));
	await flush();
	const names = [...commands.keys()];
	assert.ok(
		names.includes("agent:scout"),
		`expected agent:scout in ${names.join(",")}`,
	);
	const reviewer = commands.get("agent:reviewer");
	assert.ok(reviewer, "expected agent:reviewer command");
	assert.match(reviewer.description, /^builtin agent — /);
	assert.doesNotMatch(reviewer.description, /delegate to/);
	assert.ok(reviewer.description.length > "builtin agent — ".length);
});

test("agent command injects the delegation prompt into the main session", async () => {
	const { commands, sent, pi } = makePi();
	registerPlusExtension(pi);
	await flush();
	const reviewer = commands.get("agent:reviewer");
	assert.ok(reviewer);
	await reviewer.handler("review my diff", {});
	assert.deepEqual(sent, ["Use reviewer to review my diff."]);
});
