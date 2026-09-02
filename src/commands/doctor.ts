import { adapters } from "../adapters/index.ts";

export interface DoctorLine {
	level: "ok" | "fail" | "info";
	text: string;
}

/**
 * Wiring diagnostics for /plus-doctor: adapter registry health plus a probe of
 * every enhanced host package. Never throws.
 */
export async function runDoctor(): Promise<DoctorLine[]> {
	const lines: DoctorLine[] = [
		{ level: "info", text: `pi-subagents-plus doctor — ${adapters.length} adapter(s) registered` },
	];

	for (const adapter of adapters) {
		try {
			const result = await adapter.probe();
			lines.push({
				level: result.ok ? "ok" : "fail",
				text: `${result.ok ? "OK  " : "FAIL"} ${adapter.id} (${adapter.packageName}): ${result.detail}`,
			});
		} catch (err) {
			lines.push({
				level: "fail",
				text: `FAIL ${adapter.id} (${adapter.packageName}): probe threw: ${(err as Error).message}`,
			});
		}
	}

	return lines;
}
