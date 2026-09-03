# pi-improve-interation

[English](./README.en.md) | 中文

## Summary

给 pi 原生与上游 pi 插件**已有交互**叠加增强的伴生包。核心只有一件事：让你继续用熟悉的交互，但更强。

- 不 fork 上游：只走宿主公开扩展 API，上游升级最多改一处 adapter
- 不引入平行概念：增强的就是你已经在敲的 `@`、已经在派的活

## 增强了什么

当前增强对象是 [pi-subagents](https://github.com/badlogic/pi-subagents)（子 agent 编排包）：

| 场景 | 之前 | 之后 |
| --- | --- | --- |
| 输入框敲 `@` | 只有文件补全 | 同时补全 agent（`@rev` → `@agent:reviewer`，含内置 + 你的自定义 agents） |
| 派活给子 agent | 自己拼 subagent 调用话术 | 直接写 `@agent:<name> <任务>`，扩展自动转成显式委派指令 |
| 怀疑增强层没接上 | 翻配置、看日志 | `/plus-doctor` 一条命令定位 |

## 如何安装

```bash
pi install npm:pi-subagents             # 前置
pi install npm:pi-improve-interation
```

重启 pi，敲 `/plus-doctor`。看到 `OK  pi-subagents (pi-subagents): delegation event transport resolved …` 即接线成功。

本地开发装法：`pi install /path/to/pi-improve-interation`

## 贡献

本包按 adapter 组织：每个被增强的上游包对应一个 `PluginAdapter`（probe 只返回诊断、永不抛错），增强功能宿主无关。

```text
extensions/plus.ts          pi 扩展入口：/plus-doctor、@ 面板、input 转换
src/adapters/types.ts       PluginAdapter 契约（唯一来源）
src/adapters/index.ts       adapter 注册表
src/adapters/pi-subagents/  当前唯一 adapter
```

给下一个插件加增强：

1. 实现 `src/adapters/<pkg>/`，契约见 `src/adapters/types.ts`（probe 永不抛错，只返回诊断）
2. 追加进 `src/adapters/index.ts`，在 `test/wiring.test.ts` 补一条注册表断言
3. `npm run typecheck && npm test`

Roadmap（欢迎认领）：

- [ ] delegation event transport 编排增强（进度可见、重试、预算控制）
- [ ] 第二个 adapter

## License

[MIT](./LICENSE)
