/**
 * @agent:<name> mention → delegation instruction for the main session.
 *
 * Design (the main agent is the dispatcher, not the prompt author):
 * 1. the mention is routing only — "@agent:reviewer" names the target agent;
 *    the remaining message text is the task
 * 2. the transform keeps the main agent's effort low: it must quickly grasp
 *    the user's intent, then only organize the work and optimize the handoff
 *    prompt — not recreate the handoff from scratch
 * 3. the main agent dispatches immediately and integrates the child result;
 *    it does not re-derive context or pause to ask on a clear task
 * 4. when no task text accompanies the mention, the main agent infers the
 *    most useful task from the conversation
 */
export const AGENT_MENTION_TOKEN_PATTERN = /(?:^|\s)@agent:([\w.-]+)/;

export function buildDelegationInstruction(
	agentName: string,
	task: string,
): string {
	const trimmed = task.trim();
	const rawMessage =
		trimmed.length > 0
			? trimmed
			: "(no explicit task — infer the most useful one from this conversation)";
	return [
		"[Must] The user wants to use a subagent. Quickly grasp the intent of the user's raw message below, then focus solely on how to organize the work of the specified agent(s) and how to optimize the prompt you hand off. Then dispatch the subagent.",
		"",
		`Select AGENTS: ${agentName}`,
		"",
		`Raw Message: ${rawMessage}`,
	].join("\n");
}
