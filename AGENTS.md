# pi-improve-interation

companion 增强层，叠加在 pi-subagents（及未来的开源 pi 包）之上，不 fork 宿主：以 pi 包形式与宿主并存，仅通过宿主公开扩展 API 做增强。

## 目录

- extensions/plus.ts — pi 扩展入口，注册 /plus-doctor 等命令
- src/adapters/types.ts — PluginAdapter 契约：每个被增强的宿主包对应一个 adapter，probe 永不抛错只返回诊断
- src/adapters/index.ts — adapter 注册表；新增被增强宿主 = 实现一个 PluginAdapter 并追加进注册表
- src/adapters/pi-subagents/ — pi-subagents 适配器（delegation event transport、agents API）
- src/commands/doctor.ts — 接线诊断实现，/plus-doctor 背后
- test/wiring.test.ts — 接线测试：注册表内容 + 扩展入口导出
- .pi/ — AI harness 层：agents 定义、外部引入 skills 库、本文件所在层

## 代码约定

- 纯 ESM：package.json type 为 module，Node >= 22
- 测试用 node:test，直接运行 test 下 *.test.ts，无其他测试框架
- import 必须带 .ts 后缀（tsconfig 开启 allowImportingTsExtensions 与 verbatimModuleSyntax）
- adapter 契约唯一来源是 src/adapters/types.ts，增强功能保持宿主无关

## 常用命令

- npm run typecheck — tsc --noEmit
- npm test — node --test

## harness 层

- .pi/agents/harness-architect.md — harness 层定义文件（agents, rules, skills, AGENTS.md）的变更管理者；改动这些文件前先读它
- .pi/agents/architect.md — 架构设计 agent
- .pi/skills/ — 外部引入 skill 库，各 README 顶部已标注本项目实际使用范围
