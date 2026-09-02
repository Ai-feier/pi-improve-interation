import type { ExtensionAPI } from "@earendil-works/pi-coding-agent";
import { runDoctor, type DoctorLine } from "../src/commands/doctor.ts";
import {
	buildDelegationInstruction,
	AGENT_MENTION_TOKEN_PATTERN,
} from "../src/commands/delegation.ts";
import {
	listBuiltinAgents,
	listCustomAgents,
	mergeAgentEntries,
	type AgentEntry,
} from "../src/adapters/pi-subagents/agents.ts";
import { createAgentAutocompleteProvider } from "../src/adapters/pi-subagents/autocomplete.ts";

/**
 * pi-subagents runtime agent registration event (pi-subagents:runtime-agent-register:v1).
 * Literal on purpose: importing "pi-subagents/agents" at load time would crash this
 * extension when the host package is absent; the adapter probe validates the real
 * exported constant instead.
 */
const RUNTIME_AGENT_REGISTER_EVENT = "pi-subagents:runtime-agent-register:v1";

async function discoverAgents(
	runtimeAgentNames: ReadonlySet<string>,
): Promise<AgentEntry[]> {
	const [builtins, customs] = await Promise.all([
		listBuiltinAgents(),
		listCustomAgents(process.cwd()),
	]);
	const runtime: AgentEntry[] = [...runtimeAgentNames].map((name) => ({
		name,
		source: "runtime",
	}));
	return mergeAgentEntries(builtins, customs, runtime);
}

/**
 * pi-improve-interation — companion extension entry.
 *
 * Loads alongside pi-subagents (installed as its own pi package) and adds
 * orchestration enhancements through pi-subagents' public API surface.
 *
 * Agent entry point (only): typing "@" in the composer autocompletes agents;
 * a sent message containing "@agent:<name>" is transformed, before agent
 * processing, into an explicit delegation instruction for the main session.
 */
export default function registerPlusExtension(pi: ExtensionAPI): void {
	pi.registerCommand("plus-doctor", {
		description:
			"Diagnose pi-improve-interation wiring: adapter registry and host package availability",
		handler: async (_args, ctx) => {
			const lines: DoctorLine[] = await runDoctor();
			const allOk = lines.every((line) => line.level !== "fail");
			ctx.ui.notify(
				lines.map((line) => line.text).join("\n"),
				allOk ? "info" : "error",
			);
		},
	});

	const runtimeAgentNames = new Set<string>();
	let cachedAgents: Promise<AgentEntry[]> | null = null;
	const getAgents = (): Promise<AgentEntry[]> =>
		(cachedAgents ??= discoverAgents(runtimeAgentNames));

	pi.events.on(RUNTIME_AGENT_REGISTER_EVENT, (payload: unknown) => {
		const name = (payload as { name?: unknown } | null | undefined)?.name;
		if (typeof name === "string" && name.length > 0) {
			runtimeAgentNames.add(name);
			cachedAgents = null;
		}
	});

	pi.on("session_start", (_event, ctx) => {
		ctx.ui.addAutocompleteProvider((current) =>
			createAgentAutocompleteProvider(current, getAgents),
		);
	});

	// Transform "@agent:<name> …" messages into explicit delegation
	// instructions before the main agent sees them (pi "input" event).
	pi.on("input", (event) => {
		const match = AGENT_MENTION_TOKEN_PATTERN.exec(event.text);
		if (!match?.[1]) {
			return { action: "continue" };
		}
		const task = event.text.replace(match[0], " ").replace(/\s+/g, " ").trim();
		return {
			action: "transform",
			text: buildDelegationInstruction(match[1], task),
		};
	});
}
