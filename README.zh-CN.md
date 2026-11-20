# ai-project-bootstrap

[English](README.md) | 简体中文

**为 AI 编程助手建立清晰的项目规范，保留团队已有的工作方式。**

`ai-project-bootstrap` 是一个可复用的 Skill，用于在 Git 仓库中建立和维护 AI 开发规范。它先检查现有代码、工具和文档，再协助 Agent 找出缺口、提出限定范围的改进：应该读什么、代码应该放在哪里、如何验证，以及每类规则由哪份文档负责。

适用于新项目和已有仓库。项目已有决定与人工修改受到保护，建议经审查后再采用。

## 适用场景

- 新项目需要一套精简、易理解的 AI 编码指引。
- 已有仓库的规范分散、重复，或存在相互冲突的说明。
- 项目已从初期前端或原型演进，需要补齐其他工程规则。
- 多人协作时，需要共享项目规范，避免依赖某位开发者的个人工作流工具。
- 更新已安装的 Skill，同时保留项目本地定制。

## 主要能力

| 能力 | 具体作用 |
| --- | --- |
| 先取证再修改 | 检查仓库文件和配置声明；分析只写入明确指定的报告文件。 |
| 明确规则归属 | 每类关注点登记一个权威来源，保留项目已有文档。 |
| 渐进读取 | 基础入口保持精简，启动说明、专项规则和排障材料按任务读取。 |
| 工具独立性 | 将特定个人工具引用作为待审查线索，不自动安装或接入工作流。 |
| 增量验证 | 从改动行为和受影响的消费方开始验证，复用有效结果，保留 CI 门禁。 |
| 可读性与模块边界 | 建议使用有业务含义的命名、内聚职责、明确副作用和依赖方向。 |
| 格式化规范 | 识别部分格式化工具声明与命令正文，区分检查、写入和未解析的包装命令。 |
| 安装升级 | 记录上游基线和本地定制，提供三方合并候选，阻止未解决的冲突。 |

Skill 用于指导 Agent；不会自动重写项目，也不替代项目自己的研发流程。规则覆盖结果来自启发式分析，不能证明代码质量、执行安全或对所有 Agent 宿主的兼容性。详见[架构与能力边界](docs/architecture.md)。

## 快速开始

需要 **Node.js 20+**、**Git**，以及能读取 Skill 指令的 Agent。已提交的 Node 运行时只使用内置模块；安装和使用时，不需要安装 npm 依赖、Python 或全局工作流 CLI。升级中的三方合并使用 Git。

克隆本源码仓库：

```sh
git clone https://github.com/keepAwayFrom404/ai-project-bootstrap.git
cd ai-project-bootstrap
```

分两步安装到一个已有 Git 项目：

```sh
node scripts/install.mjs preview --repo /absolute/path/to/project
node scripts/install.mjs apply --repo /absolute/path/to/project --expected-plan-hash <hash-from-preview>
```

先审查预览，再执行安装。上游资源、受管文件、安装记录或取舍决定发生变化后，旧哈希会失效，需要重新运行 `preview`。

安装器只写入目标仓库的 `.agents/skills/ai-project-bootstrap/`。安装 Skill 本身不代表已授权修改项目规范或业务代码。

在支持项目级 Skill 的 Agent 中调用：

```text
$ai-project-bootstrap
```

如果 Agent 不会自动发现 Skill，可让它读取目标项目中的 `.agents/skills/ai-project-bootstrap/SKILL.md`。这是显式读取路径，不代表已完成该宿主的原生集成。

## 初始化如何进行

1. **检查现状**：读取当前仓库、已有规范、工具与命令。
2. **评估缺口**：结合证据与已知限制，识别缺失规则和实际的权威冲突。
3. **提出改动**：复用项目现有结构及已确认决定，限定修改范围。
4. **实施验证**：应用已接受的改动，验证产物和相关检查。

新项目的默认骨架包括 `AGENTS.md` 入口、简短工程底线、权威目录 Registry 和管理清单。只有项目确实需要时才增加详细文档；已有有效路径继续保留。

对于已初始化项目，再次运行 Skill 会基于当前证据进行复审。仅升级 Skill 不会安装格式化依赖、批量格式化业务代码或启用新的工作流。详见[初始化规则](references/initialization-foundations.md)。

## 升级与本地定制

将本源码仓库更新到希望采用的版本后，继续使用同一组 `preview` / `apply` 命令。本地单独发生的修改和删除会被保留。上游与本地同时变化时，如果存在经过校验的基线，会生成三方合并候选；重叠修改或缺失基线需要审查处理。

查看某个文件的版本和候选内容：

```sh
node scripts/install.mjs review --repo /absolute/path/to/project --path SKILL.md
```

可以逐文件选择 `keep-local`（保留本地）、`use-upstream`（采用上游），或使用已审查的 `merged-file`（人工合并文件）。使用同一份取舍文件重新预览，并凭新的计划哈希执行：

```sh
node scripts/install.mjs preview --repo /absolute/path/to/project --resolutions /path/to/resolutions.json
node scripts/install.mjs apply --repo /absolute/path/to/project --resolutions /path/to/resolutions.json --expected-plan-hash <new-hash>
```

审查输出可能包含私有的本地源码。已有文件被替换前会保存备份，管理清单最后写入；安装不保证多个文件整体成功或整体回滚。处理升级冲突前，请阅读[取舍方式、v1 兼容与失败恢复](docs/installation-upgrades.md)。

没有安装清单的完整历史副本，可以先做只登记元数据的接管：

```sh
node scripts/install.mjs adopt-preview --repo /absolute/path/to/project
node scripts/install.mjs adopt-apply --repo /absolute/path/to/project --expected-plan-hash <adoption-hash>
node scripts/install.mjs preview --repo /absolute/path/to/project
```

接管会拒绝不完整的副本。第一次正常升级时，相对未知历史上游的差异会作为本地定制保留。

## 参与贡献与验证

可复用的改进在本仓库维护；消费项目拥有自己的规范产物和本地适配。

按改动及受影响的消费方选择聚焦测试，命令与约定见[贡献指南](CONTRIBUTING.md)。运行时源码使用 `src/scripts/` 下的严格 TypeScript；编译后的 `.mjs` 保留原有命令和可直接使用的安装副本。源码开发需在仓库内安装已锁定的编译器。完整源码检查入口为：

```sh
npm ci
npm run check
```

GitHub CI 在 Node 20 和 24 上运行这项检查。本地 Skill 校验只覆盖本仓库的简单元数据格式和本地文件引用，不是完整 YAML/Markdown 解析或真实宿主认证。当前边界与后续方向见[维护路线图](docs/roadmap.md)。

## 许可证与来源

采用 [MIT](LICENSE) 许可证。链接到的推荐资料保留各自的使用条款。

项目源自一个私有仓库中的试点。本仓库只保留可复用的 Skill 源码、合成测试、工具与文档，详见[来源记录](docs/provenance.md)。

[规范链接与读取路由校验](docs/governance-validation.md)说明了支持的链接、章节锚点及校验边界。
