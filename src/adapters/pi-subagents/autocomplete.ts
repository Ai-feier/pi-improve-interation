import type {
	AutocompleteItem,
	AutocompleteProvider,
} from "@earendil-works/pi-tui";
import type { AgentEntry } from "./agents.ts";

/** A mention like "@rev" at a token boundary in the composer. */
const AGENT_MENTION_PATTERN = /(?:^|[ \t])@([^\s@]*)$/;

/**
 * "@" autocomplete for agents, layered on top of pi's built-in provider.
 *
 * - `@<query>` lists agents whose name starts with the query
 * - `@` alone (or no agent match) falls back to the built-in file/path
 *   completion so normal "@" file mentions keep working
 */
export function createAgentAutocompleteProvider(
	current: AutocompleteProvider,
	getAgents: () => Promise<AgentEntry[]>,
): AutocompleteProvider {
	return {
		triggerCharacters: ["@"],
		async getSuggestions(lines, cursorLine, cursorCol, options) {
			const beforeCursor = (lines[cursorLine] ?? "").slice(0, cursorCol);
			const query = AGENT_MENTION_PATTERN.exec(beforeCursor)?.[1];
			if (query === undefined || query.length === 0) {
				return current.getSuggestions(lines, cursorLine, cursorCol, options);
			}
			const agents = (await getAgents()).filter((agent) =>
				agent.name.toLowerCase().startsWith(query.toLowerCase()),
			);
			if (agents.length === 0) {
				return current.getSuggestions(lines, cursorLine, cursorCol, options);
			}
			const items: AutocompleteItem[] = agents.map((agent) => ({
				value: `@agent:${agent.name}`,
				label: `@agent:${agent.name}`,
				description: agent.description ?? `${agent.source} agent`,
			}));
			return { prefix: `@${query}`, items };
		},
		applyCompletion(lines, cursorLine, cursorCol, item, prefix) {
			return current.applyCompletion(lines, cursorLine, cursorCol, item, prefix);
		},
	};
}
