# pi-improve-interation

Companion enhancement layer over [pi-subagents](https://github.com/nicobailon/pi-subagents) — and, over time, other open-source pi packages. Secondary development **without forking**: this package installs alongside the host plugins and builds on their public extension APIs.

## Why a companion, not a fork

pi-subagents ships a deliberate extension surface (delegation event transport, runtime agent registration, shared types) and iterates fast. Forking would freeze us on a stale copy; a companion package tracks the host and adapts in one place (`src/adapters/`).

## Architecture

```text
extensions/plus.ts          pi extension entry (registers /plus-doctor; more commands over time)
src/adapters/types.ts       PluginAdapter contract — one adapter per enhanced host package
src/adapters/index.ts       adapter registry
src/adapters/pi-subagents/  pi-subagents adapter (delegation event transport, agents API)
src/commands/doctor.ts      wiring diagnostics
```

Adding an enhanced plugin = implementing one `PluginAdapter` and appending it to the registry. Enhancement features stay host-agnostic.

## Install (local development)

```bash
pi install /Users/apple/open/pi-improve-interation
```

Requires [pi-subagents](https://github.com/nicobailon/pi-subagents) to be installed as a pi package (`pi install npm:pi-subagents`).

## Agent palette (consumes pi-subagents)

Typing `/` in the composer lists one command per available agent: `/agent:scout`, `/agent:reviewer`, … Sources: built-in `agents/*.md` from the installed pi-subagents package, custom `agents/*.md` in `~/.pi/agent/agents` and the project's `.pi/agents`, plus runtime-registered agents. `/agent` (no arguments) lists everything with its source.

Running `/agent:reviewer review my diff` injects a prompt into the main session — the main agent then builds the actual task prompt and dispatches it through pi-subagents' `subagent` tool itself.

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
- [x] Agent palette: `/agent:<name>` commands + `/agent` listing (consumes pi-subagents)
- [ ] Orchestration enhancements over the delegation event transport (progress visibility, retry, budget control)
- [ ] Second adapter (next open-source pi plugin)

## License

MIT
