import type { ExtensionAPI } from "@earendil-works/pi-coding-agent";
import { runDoctor, type DoctorLine } from "../src/commands/doctor.ts";
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

/**
 * Prompt injected into the main session. The main agent stays in charge: it
 * builds the real task prompt and dispatches it through pi-subagents'
 * `subagent` tool itself (user decision: message injection, not direct RPC).
 */
export function buildDelegationPrompt(agentName: string, task: string): string {
	const trimmed = task.trim();
	return trimmed.length > 0
		? `Use ${agentName} to ${trimmed}.`
		: `Use ${agentName} on the current context: decide the most useful task for that agent and delegate it via the subagent tool. Ask me first if the scope is unclear.`;
}

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

/** Register one /agent:<name> command per discovered agent (idempotent; later calls overwrite). */
async function registerAgentCommands(
	pi: ExtensionAPI,
	runtimeAgentNames: ReadonlySet<string>,
): Promise<void> {
	const agents = await discoverAgents(runtimeAgentNames);
	for (const agent of agents) {
		pi.registerCommand(`agent:${agent.name}`, {
			description: agent.description
				? `${agent.source} agent — ${agent.description}`
				: `${agent.source} agent — delegate to ${agent.name} via the subagent tool`,
			handler: async (args, _ctx) => {
				const task = typeof args === "string" ? args : "";
				await pi.sendUserMessage(buildDelegationPrompt(agent.name, task), {
					deliverAs: "followUp",
				});
			},
		});
	}
}

/**
 * pi-improve-interation — companion extension entry.
 *
 * Loads alongside pi-subagents (installed as its own pi package) and adds
 * orchestration enhancements through pi-subagents' public API surface.
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
			void registerAgentCommands(pi, runtimeAgentNames);
		}
	});

	pi.on("session_start", (_event, ctx) => {
		ctx.ui.addAutocompleteProvider((current) =>
			createAgentAutocompleteProvider(current, getAgents),
		);
	});

	pi.registerCommand("agent", {
		description: "List agents available for /agent:<name> delegation",
		handler: async (_args, ctx) => {
			const agents = await discoverAgents(runtimeAgentNames);
			if (agents.length === 0) {
				ctx.ui.notify("No agents found. Fix: pi install npm:pi-subagents", "error");
				return;
			}
			ctx.ui.notify(
				agents
					.map(
						(agent) =>
							`${agent.name} (${agent.source})${agent.description ? ` — ${agent.description}` : ""}`,
					)
					.join("\n"),
				"info",
			);
		},
	});

	void registerAgentCommands(pi, runtimeAgentNames);
}
