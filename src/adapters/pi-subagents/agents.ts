import { createRequire } from "node:module";
import { readdir, readFile } from "node:fs/promises";
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
	/** Frontmatter description from the agent's md file, when present. */
	description?: string;
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

/**
 * Minimal frontmatter parsing: single-line `key: value` pairs between `---`
 * fences. Block scalars (YAML `>-`) are not expanded — agent frontmatter in
 * practice uses single-line names and descriptions.
 */
function parseFrontmatter(content: string): Record<string, string> {
	const fence = /^---\r?\n([\s\S]*?)\r?\n---/.exec(content);
	if (!fence?.[1]) {
		return {};
	}
	const fields: Record<string, string> = {};
	for (const line of fence[1].split(/\r?\n/)) {
		const pair = /^(\w[\w-]*):\s*(.*)$/.exec(line.trim());
		const key = pair?.[1];
		const value = pair?.[2];
		if (!key || value === undefined) {
			continue;
		}
		fields[key] = value.replace(/^['"]|['"]$/g, "").trim();
	}
	return fields;
}

/**
 * Scan an agents directory; every *.md file is one agent. Name and description
 * come from frontmatter when present, falling back to the file stem.
 */
export async function scanAgentsDir(
	dir: string,
	source: AgentEntry["source"],
): Promise<AgentEntry[]> {
	let files: string[];
	try {
		files = (await readdir(dir)).filter((file) => file.endsWith(".md"));
	} catch {
		return [];
	}
	const entries = await Promise.all(
		files.map(async (file) => {
			const stem = basename(file, ".md");
			try {
				const frontmatter = parseFrontmatter(await readFile(join(dir, file), "utf8"));
				return {
					name: frontmatter.name || stem,
					source,
					description: frontmatter.description || undefined,
				};
			} catch {
				return { name: stem, source };
			}
		}),
	);
	return entries;
}

/** Builtins from the bundled pi-subagents package; falls back to the core six. */
export async function listBuiltinAgents(): Promise<AgentEntry[]> {
	const fallback = (): AgentEntry[] =>
		CORE_BUILTIN_AGENTS.map((name) => ({ name, source: "builtin" }));
	try {
		// "." export resolves to the package root's index.ts; resolve() only
		// computes the path, it never executes the .ts entry.
		const entryPath = createRequire(import.meta.url).resolve("pi-subagents");
		const agents = await scanAgentsDir(
			join(dirname(entryPath), "agents"),
			"builtin",
		);
		return agents.length > 0 ? agents : fallback();
	} catch {
		return fallback();
	}
}

/** Custom agents: ~/.pi/agent/agents (global) and <projectCwd>/.pi/agents (project). */
export async function listCustomAgents(
	projectCwd: string,
): Promise<AgentEntry[]> {
	const [globalAgents, projectAgents] = await Promise.all([
		scanAgentsDir(join(homedir(), ".pi", "agent", "agents"), "custom"),
		scanAgentsDir(join(projectCwd, ".pi", "agents"), "custom"),
	]);
	return [...projectAgents, ...globalAgents];
}

/**
 * Merge agent groups by name; each group overrides same-named entries from
 * earlier groups. An entry without a description inherits the one it overrides.
 */
export function mergeAgentEntries(...groups: AgentEntry[][]): AgentEntry[] {
	const byName = new Map<string, AgentEntry>();
	for (const group of groups) {
		for (const entry of group) {
			const existing = byName.get(entry.name);
			const merged: AgentEntry = { ...existing, ...entry };
			const description = entry.description ?? existing?.description;
			if (description !== undefined) {
				merged.description = description;
			}
			byName.set(entry.name, merged);
		}
	}
	return [...byName.values()];
}
