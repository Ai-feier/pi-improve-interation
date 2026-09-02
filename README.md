# pi-improve-interation

Companion enhancement layer over [pi-subagents](https://github.com/nicobailon/pi-subagents) — and, over time, other open-source pi packages. Secondary development **without forking**: this package installs alongside the host plugins and builds on their public extension APIs.

## Why a companion, not a fork

pi-subagents ships a deliberate extension surface (delegation event transport, runtime agent registration, shared types) and iterates fast. Forking would freeze us on a stale copy; a companion package tracks the host and adapts in one place (`src/adapters/`).

## Architecture

```text
extensions/plus.ts          pi extension entry (/plus-doctor, @ agent palette, input transform)
src/adapters/types.ts       PluginAdapter contract — one adapter per enhanced host package
src/adapters/index.ts       adapter registry
src/adapters/pi-subagents/  pi-subagents adapter (agents discovery, @ autocomplete, probe)
src/commands/doctor.ts      wiring diagnostics
src/commands/delegation.ts  @agent:<name> mention → delegation instruction
```

Adding an enhanced plugin = implementing one `PluginAdapter` and appending it to the registry. Enhancement features stay host-agnostic.

## Install (local development)

```bash
pi install /Users/apple/open/pi-improve-interation
```

Requires [pi-subagents](https://github.com/nicobailon/pi-subagents) to be installed as a pi package (`pi install npm:pi-subagents`).

## Agent palette (consumes pi-subagents)

Typing `@` in the composer autocompletes available agents: `@rev` → `@agent:reviewer` with its description. Sources: built-in `agents/*.md` from the installed pi-subagents package, custom agents in `~/.pi/agent/agents` and the project's `.pi/agents`, plus runtime-registered agents. `@` alone (and non-agent queries) fall back to pi's built-in file completion.

### Prompt design

When a sent message contains `@agent:<name>`, the extension transforms it (pi `input` event, before agent processing) into an explicit delegation instruction. `@agent:reviewer review my diff` becomes:

```text
Delegate to the reviewer subagent via the subagent tool.

Task: review my diff

You own the handoff: decide the exact child prompt yourself (carry over relevant context from this conversation), run the agent, and integrate its result here. If the task is ambiguous, ask me before delegating.
```

Design points: the mention is routing only (the rest of the message is the task); the convention is stated explicitly instead of relying on the model guessing what `@agent:` means; the main agent — not the extension — writes the actual child prompt; with no task text the main agent picks the task itself and asks first when scope is unclear.

## Try it

Restart pi, then:

```text
/plus-doctor
```

Expected: `OK  pi-subagents (pi-subagents): delegation event transport resolved …`

## Develop

```bash
npm install
npm run typecheck
npm test
```

## Roadmap

- [x] Scaffold + adapter framework + pi-subagents adapter probe
- [x] Agent palette via `@`: autocomplete + delegation prompt transform (consumes pi-subagents)
- [ ] Orchestration enhancements over the delegation event transport (progress visibility, retry, budget control)
- [ ] Second adapter (next open-source pi plugin)

## License

MIT
