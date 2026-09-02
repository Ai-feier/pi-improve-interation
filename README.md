# pi-subagents-plus

Companion enhancement layer over [pi-subagents](https://github.com/nicobailon/pi-subagents) — and, over time, other open-source pi packages. Secondary development **without forking**: this package installs alongside the host plugins and builds on their public extension APIs.

## Why a companion, not a fork

pi-subagents ships a deliberate extension surface (delegation event transport, runtime agent registration, shared types) and iterates fast. Forking would freeze us on a stale copy; a companion package tracks the host and adapts in one place (`src/adapters/`).

## Architecture

```
extensions/plus.ts          pi extension entry (registers /plus-doctor; more commands over time)
src/adapters/types.ts       PluginAdapter contract — one adapter per enhanced host package
src/adapters/index.ts       adapter registry
src/adapters/pi-subagents/  pi-subagents adapter (delegation event transport, agents API)
src/commands/doctor.ts      wiring diagnostics
```

Adding an enhanced plugin = implementing one `PluginAdapter` and appending it to the registry. Enhancement features stay host-agnostic.

## Install (local development)

```bash
pi install /Users/apple/open/pi-subagents-plus
```

Requires [pi-subagents](https://github.com/nicobailon/pi-subagents) to be installed as a pi package (`pi install npm:pi-subagents`).

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
- [ ] Orchestration enhancements over the delegation event transport (progress visibility, retry, budget control)
- [ ] Second adapter (next open-source pi plugin)

## License

MIT
