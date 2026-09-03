# pi-improve-interation

English | [中文](./README.md)

## Summary

A companion pi package that layers enhancements on top of interactions you already use — pi-native and upstream pi plugins alike. One idea only: keep the interactions you know, make them stronger.

- No fork of upstream: public extension APIs only, so an upstream upgrade costs at most one adapter change
- No parallel concepts: it enhances the `@` you already type and the work you already delegate

## What It Enhances

The current target is [pi-subagents](https://github.com/badlogic/pi-subagents) (the sub-agent orchestration package):

| Scenario | Before | After |
| --- | --- | --- |
| Typing `@` in the composer | File completion only | Also completes agents (`@rev` → `@agent:reviewer`; built-ins + your custom agents) |
| Delegating to a sub-agent | Assembling subagent-call prompts by hand | Write `@agent:<name> <task>`; the extension turns it into an explicit delegation instruction |
| Unsure the layer is wired up | Digging through config and logs | `/plus-doctor` pinpoints it in one command |

## Install

```bash
pi install npm:pi-subagents             # prerequisite
pi install npm:pi-improve-interation
```

Restart pi and run `/plus-doctor`. Seeing `OK  pi-subagents (pi-subagents): delegation event transport resolved …` means the wiring is good.

For local development: `pi install /path/to/pi-improve-interation`

## Contributing

The package is organized around adapters: each enhanced upstream package gets one `PluginAdapter` (probe returns diagnostics, never throws), and enhancements stay host-agnostic.

```text
extensions/plus.ts          pi extension entry: /plus-doctor, @ panel, input transform
src/adapters/types.ts       PluginAdapter contract (single source of truth)
src/adapters/index.ts       adapter registry
src/adapters/pi-subagents/  the only adapter today
```

To enhance another plugin:

1. Implement `src/adapters/<pkg>/`; the contract lives in `src/adapters/types.ts` (probe never throws, returns diagnostics only)
2. Register it in `src/adapters/index.ts` and add a registry assertion to `test/wiring.test.ts`
3. `npm run typecheck && npm test`

Roadmap (contributions welcome):

- [ ] Delegation event transport orchestration enhancements (visible progress, retries, budget control)
- [ ] A second adapter

## License

[MIT](./LICENSE)
