/**
 * Adapter contract: one adapter per enhanced open-source pi package.
 *
 * An adapter encapsulates everything specific to the host package —
 * how to probe it, which API surface it exposes, how versions drift —
 * so enhancement features stay host-agnostic.
 */
export interface PluginAdapter {
	/** Stable adapter id, e.g. "pi-subagents". */
	id: string;
	/** npm package this adapter enhances, e.g. "pi-subagents". */
	packageName: string;
	/**
	 * Minimal integration probe. Never throws — returns diagnostics so
	 * /plus-doctor can render them.
	 */
	probe(): Promise<AdapterProbeResult>;
}

export interface AdapterProbeResult {
	ok: boolean;
	/** Host package version, when the host exposes it. */
	version?: string;
	detail: string;
}
