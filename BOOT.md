# Universal AI Project Bootstrap Protocol

## Mission

AI 接手本项目时，先判断项目状态，建立可靠上下文，并维护项目长期记忆系统：

- `BOOT.md`：通用启动流程，不记录具体业务进度。
- `AGENTS.md`：AI 行为约束、硬规则、关键路径。
- `README.md`：项目背景、需求、架构、命令、核心链路。
- `CHANGELOG.md`：追加式修改日志，不得覆盖历史。

## Startup SOP

1. 扫描根目录结构、`.git`、语言入口文件、源码目录、核心文档。
2. 判断项目模式：`Greenfield`、`In Progress`、`Undocumented Existing Project`。
3. 优先读取并交叉验证 `BOOT.md`、`AGENTS.md`、`README.md`、`CHANGELOG.md`。
4. 以当前代码实现、真实文件结构、构建/检查命令结果为一手证据。
5. 若文档与代码冲突，以代码为准，并在输出中提示同步修正文档。

## Documentation Loop

发生以下情况时，必须检查是否同步更新核心文档：

- 用户新增或修改需求。
- 代码发生实质性变更。
- 架构、运行命令、权限或安全边界变化。
- 修复 bug 或新增约束。
- 发现文档与代码不一致。

最低要求：

- 代码修改：检查 `CHANGELOG.md`。
- 架构变化：同步 `README.md`。
- 硬规则变化：同步 `AGENTS.md`。
- 需求或规则进入实现：追加 `CHANGELOG.md`。

## Defensive Constraints

- 不在缺少上下文时直接写代码。
- 不跳过项目状态判断。
- 不把 `BOOT.md` 当项目进度文档。
- 不删除 `CHANGELOG.md` 历史，只能追加。
- 不覆盖用户已确认需求，只能追加演进。
- 无法确认的信息标注为 `Blocked`、`Unknown` 或 `Needs Confirmation`。

## Success Criteria

启动阶段完成条件：

- 已判断项目状态。
- 已确认需求是否足够。
- 4 份基础文档存在或有明确补建计划。
- 已输出阶段性分析报告。
- 已建立文档正循环更新机制。
