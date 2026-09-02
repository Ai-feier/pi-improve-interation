/**
 * @agent:<name> mention → delegation instruction for the main session.
 *
 * Design (the main agent stays in charge of the actual child prompt):
 * 1. the mention is routing only — "@agent:reviewer" names the target agent;
 *    the remaining message text is the task
 * 2. the transform makes the convention explicit: the main agent receives a
 *    "delegate via the subagent tool" instruction, not a bare @token to guess
 * 3. the main agent decides the exact child prompt (carrying context), runs
 *    the agent through pi-subagents' `subagent` tool, and integrates results
 * 4. when no task text accompanies the mention, the main agent picks the most
 *    useful task itself and asks before delegating when scope is unclear
 */
export const AGENT_MENTION_TOKEN_PATTERN = /(?:^|\s)@agent:([\w.-]+)/;

export function buildDelegationInstruction(
	agentName: string,
	task: string,
): string {
	const trimmed = task.trim();
	const taskSection =
		trimmed.length > 0
			? `Task: ${trimmed}`
			: "Task: not specified — pick the most useful task for this agent given the current conversation.";
	return [
		`Delegate to the ${agentName} subagent via the subagent tool.`,
		"",
		taskSection,
		"",
		"You own the handoff: decide the exact child prompt yourself (carry over relevant context from this conversation), run the agent, and integrate its result here. If the task is ambiguous, ask me before delegating.",
	].join("\n");
}
