import { createRequire } from "node:module";
import { readdir } from "node:fs/promises";
import { basename, dirname, join } from "node:path";
import { homedir } from "node:os";

/**
 * Agent discovery for the /agent:* palette (pi-subagents adapter).
 *
 * Sources, in override order (later wins on name collision, mirroring
 * pi-subagents' mergeRuntimeAgents semantics):
 *   1. builtin — *.md in the installed pi-subagents package agents/ dir
 *   2. custom  — ~/.pi/agent/agents and <project>/.pi/agents *.md files
 *   3. runtime — names collected from pi-subagents' runtime registration events
 */
export interface AgentEntry {
	name: string;
	source: "builtin" | "custom" | "runtime";
}

/** Core builtins, used when the installed package's agents/ dir cannot be read. */
const CORE_BUILTIN_AGENTS = [
	"delegate",
	"oracle",
	"researcher",
	"reviewer",
	"scout",
	"worker",
] as const;

/** Scan an agents directory; every *.md file is one agent named by its stem. */
export async function scanAgentsDir(dir: string, source: AgentEntry["source"]): Promise<AgentEntry[]> {
	try {
		const files = await readdir(dir);
		return files
			.filter((file) => file.endsWith(".md"))
			.map((file) => ({ name: basename(file, ".md"), source }));
	} catch {
		return [];
	}
}

/** Builtins from the bundled pi-subagents package; falls back to the core six. */
export async function listBuiltinAgents(): Promise<AgentEntry[]> {
	const fallback = (): AgentEntry[] =>
		CORE_BUILTIN_AGENTS.map((name) => ({ name, source: "builtin" }));
	try {
		// "." export resolves to the package root's index.ts; resolve() only
		// computes the path, it never executes the .ts entry.
		const entryPath = createRequire(import.meta.url).resolve("pi-subagents");
		const agents = await scanAgentsDir(join(dirname(entryPath), "agents"), "builtin");
		return agents.length > 0 ? agents : fallback();
	} catch {
		return fallback();
	}
}

/** Custom agents: ~/.pi/agent/agents (global) and <projectCwd>/.pi/agents (project). */
export async function listCustomAgents(projectCwd: string): Promise<AgentEntry[]> {
	const [globalAgents, projectAgents] = await Promise.all([
		scanAgentsDir(join(homedir(), ".pi", "agent", "agents"), "custom"),
		scanAgentsDir(join(projectCwd, ".pi", "agents"), "custom"),
	]);
	return [...projectAgents, ...globalAgents];
}

/** Merge agent groups by name; each group overrides same-named entries from earlier groups. */
export function mergeAgentEntries(...groups: AgentEntry[][]): AgentEntry[] {
	const byName = new Map<string, AgentEntry>();
	for (const group of groups) {
		for (const entry of group) {
			byName.set(entry.name, entry);
		}
	}
	return [...byName.values()];
}
