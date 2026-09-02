import type { ExtensionAPI } from "@earendil-works/pi-coding-agent";
import { runDoctor, type DoctorLine } from "../src/commands/doctor.ts";

/**
 * pi-subagents-plus — companion extension entry.
 *
 * Loads alongside pi-subagents (installed as its own pi package) and adds
 * orchestration enhancements through pi-subagents' public API surface
 * (delegation event transport, runtime agent registration).
 */
export default function registerPlusExtension(pi: ExtensionAPI): void {
	pi.registerCommand("plus-doctor", {
		description: "Diagnose pi-subagents-plus wiring: adapter registry and host package availability",
		handler: async (_args, ctx) => {
			const lines: DoctorLine[] = await runDoctor();
			const allOk = lines.every((line) => line.level !== "fail");
			ctx.ui.notify(
				lines.map((line) => line.text).join("\n"),
				allOk ? "info" : "error",
			);
		},
	});
}
