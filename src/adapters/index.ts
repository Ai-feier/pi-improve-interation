import type { PluginAdapter } from "./types.ts";
import { piSubagentsAdapter } from "./pi-subagents/index.ts";

/**
 * Adapter registry. Adding a new enhanced host package:
 * 1. create src/adapters/<host-id>/index.ts implementing PluginAdapter
 * 2. append it here
 */
export const adapters: readonly PluginAdapter[] = [piSubagentsAdapter];

export function getAdapter(id: string): PluginAdapter | undefined {
	return adapters.find((adapter) => adapter.id === id);
}
