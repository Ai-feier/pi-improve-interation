import type { AdapterProbeResult, PluginAdapter } from "../types.ts";

/**
 * Adapter over pi-subagents (npm: pi-subagents, MIT, nicobailon/pi-subagents).
 *
 * Verified integration surface (pi-subagents 0.62.0), all imports lazy so this
 * extension still loads when the host package is absent:
 *
 * - Delegation event transport (extension-to-extension over the pi event bus):
 *   `SUBAGENT_DELEGATION_REQUEST_EVENT` = "prompt-template:subagent:request",
 *   plus started/update/response/cancel events. See pi-subagents/delegation.
 * - Runtime agent registration: `registerAgent` via pi-subagents/agents.
 * - Shared types: pi-subagents/shared-types.
 */
export const PI_SUBAGENTS_EXPECTED_REQUEST_EVENT = "prompt-template:subagent:request";

export const piSubagentsAdapter: PluginAdapter = {
	id: "pi-subagents",
	packageName: "pi-subagents",

	async probe(): Promise<AdapterProbeResult> {
		let delegation: typeof import("pi-subagents/delegation");
		try {
			delegation = await import("pi-subagents/delegation");
		} catch (err) {
			return {
				ok: false,
				detail: `pi-subagents is not resolvable from this package (${(err as Error).message}). Fix: run \`pi install npm:pi-subagents\` and \`npm install\` in this package.`,
			};
		}

		if (delegation.SUBAGENT_DELEGATION_REQUEST_EVENT !== PI_SUBAGENTS_EXPECTED_REQUEST_EVENT) {
			return {
				ok: false,
				detail: `delegation event constant drifted: expected "${PI_SUBAGENTS_EXPECTED_REQUEST_EVENT}", got "${String(delegation.SUBAGENT_DELEGATION_REQUEST_EVENT)}". Check the installed pi-subagents version against this adapter.`,
			};
		}

		return {
			ok: true,
			detail: "delegation event transport resolved; extension-to-extension delegation available",
		};
	},
};
