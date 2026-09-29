# AGENTS.md

## 语言与输出

- 始终使用简体中文。
- 遵循极简输出：不寒暄，不重复需求，不写无意义前后缀。
- 优先给出 Diff、完整代码块或可执行结论。
- 每次输出末尾附带签名：`[Conf: X% | Ref: Docs/Code/Both]`。
- 必要时附微型诊断：`[问题]:简述 | [方案]:简述 | [优化点]:若有则提`。

## 启动硬规则

- 开始任何工作前，先阅读 `BOOT.md`。
- 复杂改动前静默读取 `README.md` 与 `AGENTS.md`，再交叉比对源代码。
- `npx skills ls -g` 为技能优先索引；若网络或 npm 不稳定，不得阻塞代码阅读与本地验证。
- 文档与代码冲突时，以代码为准，并输出 `[Update AGENTS.md]` 或 `[Update README.md]` 提醒。
- 不允许凭文档脑补实现；无法确认的信息标注 `Unknown`、`Blocked` 或 `Needs Confirmation`。

## 项目事实

- 项目类型：Tauri v2 桌面应用，前端 React + Vite + Three.js，后端 Rust + Wasmtime。
- 受支持的公开发行平台：Windows 10/11；`tauri.conf.json` 的默认 bundle targets 为 `nsis` 与 `msi`。这不是平台编译禁令；不得在未完成平台依赖审计和构建验证前宣称支持 macOS/Linux 发行。
- 前端入口：`src/main.tsx`、`src/App.tsx`。
- 主要 3D 视图：`src/components/Arena.tsx`。
- 设置与阶段流转：`src/components/GenesisGate.tsx`、`src/components/MotherMachine.tsx`、`src/components/SettingsModal.tsx`。
- 前端世界类型：`src/types/world.ts`。
- 前端配置适配：`src/utils/settings.ts`。
- 前端窗口控制：`src/utils/windowControls.ts`。
- 前端二进制世界解析：`src/utils/worldBinary.ts`。
- 前端音频引擎：`src/utils/audio/engine.ts`。
- 前端音频曲库与音效配方：`src/utils/audio/presets.ts`、`src/utils/audio/sfxPresets.ts`。
- 后端入口：`src-tauri/src/main.rs`。
- 后端运行时文件：`src-tauri/src/runtime_files.rs`。
- 后端系统信息 command：`src-tauri/src/system_info.rs`。
- 后端世界状态 command：`src-tauri/src/world_commands.rs`。
- 后端设置 command：`src-tauri/src/settings_commands.rs`。
- 后端 benchmark command：`src-tauri/src/benchmark_commands.rs`。
- 后端 AI/Ollama command：`src-tauri/src/ai_commands.rs`。
- 后端生命周期 command：`src-tauri/src/lifecycle_commands.rs`，包含 `start_sim`、`stop_sim`、`reset_sim`、`export_logs` 与 `logger`。
- Tauri v2 权限：`src-tauri/capabilities/default.json`。
- 全局状态：`src-tauri/src/state.rs`。
- 演化核心：`src-tauri/src/evolution/`。
- 仿真循环：`src-tauri/src/evolution/simulation_engine.rs`。
- Wasm 沙箱：`src-tauri/src/evolution/wasm_runtime.rs`。
- Ollama/本地突变：`src-tauri/src/evolution/mutation.rs`。
- Phase 1 有用工作任务目录：`src-tauri/src/evolution/benchmark.rs`。

## 不可违反规则

- `src-tauri/src/main.rs` 应保持入口与 Tauri command 编排职责；计算密集逻辑优先下沉到 `src-tauri/src/evolution/`。
- Tauri command 层访问共享状态时必须使用 `src-tauri/src/state.rs` 的 `lock_app_state` 或等价错误返回，不得在用户可触发路径新增 `lock().unwrap()`。
- Wasm DNA 必须导出 `calculate_fitness() -> i32`。
- Wasm 执行必须保留燃料限制、内存限制、编译校验和影子验证。
- CUDA 计算只允许处理实体生态数值批处理；不得把不可信 Wasm DNA 执行、突变验证、splicer、黑名单、谱系或英灵殿写入 GPU kernel。
- 启用 `cargo check --features cuda` 或 CUDA release 构建前，必须安装 CUDA Toolkit 与 MSVC Build Tools；默认 CUDA 架构为 `sm_86`，如换卡用 `VGENE_CUDA_ARCH` 覆盖。
- 前后端 command 名称变更必须同步 `invoke(...)` 调用点。
- 自绘标题栏和显示模式只能通过 `src/utils/windowControls.ts` 调用 Tauri window API；新增窗口能力时必须同步 `src-tauri/capabilities/default.json`。
- `CHANGELOG.md` 只能追加，不得删除或重写历史。
- `README.md` 保存稳定背景、链路、命令与代码核验状态，不记录零散临时进度。
- Phase 1 的世界二进制协议由 `src/utils/worldBinary.ts` 统一解析，禁止在 `App.tsx` 继续手写 DataView 解析。
- 配置字段必须经 `src/utils/settings.ts` 适配，避免 camelCase / snake_case 混用。
- 局内会话状态（局长、倍率、事件流、复盘摘要）不得写入 `AppConfig` 或 settings 持久化；`AppConfig` 只保留长期应用配置。
- 音频必须统一走 `src/utils/audio/`；禁止在组件或旧门面文件里新增第二套 `AudioContext`、散落式 BGM/SFX 合成逻辑。
- 前端 `LocalMock` 只表示 UI 沙盒，不能进入 Rust 仿真；真实本地后端模式使用前端 `Local` 与后端 `MutationMode::Local`。
- Phase 1 任务 DNA 经突变、splicer 或 fallback 后，写回种群前必须按当前 `task_id` 调用 `validate_and_test_for_task`，并通过语义准入：子代必须有可执行字节码变化，且 `ScoreBreakdown.final_score + epsilon >= parent.final_score`；不得让只导出 `calculate_fitness`、helper-only 字节差异或低分子代污染任务种群。
- 官方安装包仅发布 Windows NSIS/MSI；Cargo.lock 中仅供 Linux GTK 后端使用的依赖不得被解释为受支持发行物的一部分。

## 常用命令

```powershell
.\run.ps1
.\run.ps1 -Action Launch
.\run.ps1 -Action Check
.\run.ps1 -Action Build
.\run.ps1 -Action Run
npm install
npm run dev
npm run build
npm run tauri dev
cd src-tauri; cargo check
cd src-tauri; cargo check --features cuda
```

## Node/npm 约束

- 当前 Windows 全局 npm 曾出现 `Could not determine Node.js install directory` 与 `npm-cli.js` 崩溃；项目构建脚本不得只依赖全局 npm。
- 首选 `.\run.ps1`，其内部按 `VGENE_NODE`、`%LOCALAPPDATA%\VGene\node\node-v24.16.0-win-x64\node.exe`、Codex 内置 Node、`C:\Program Files\nodejs\node.exe`、`Get-Command node` 顺序解析 Node。
- Tauri 构建脚本应通过 `--config '{"build":{"beforeBuildCommand":""}}'` 临时绕过 `tauri.conf.json` 中的 npm hook。
- 若 `C:\Program Files\nodejs\node.exe -v` 正常但 `node -e "console.log(1)"` 以 `-1073741819` 退出，判定为全局 Node 安装/运行时损坏，不要继续归因网络。
- 桌面应用发布需要可复现依赖树；`package-lock.json` 与 `src-tauri/Cargo.lock` 不应被 `.gitignore` 忽略。

## 文档同步触发器

- 需求新增/修改：检查 `AGENTS.md`、`README.md`、`CHANGELOG.md`。
- 代码变更：至少追加 `CHANGELOG.md`。
- 架构变化：同步 `README.md`。
- 硬约束变化：同步 `AGENTS.md`。
- 命令变化：同步 `README.md`。
- 修复 bug：追加 `CHANGELOG.md`，若暴露文档错误则同步 `README.md` 或 `AGENTS.md`。

## 已知代码坏味道

- `src-tauri/src/main.rs` 当前应保持 Tauri bootstrap、状态注入和 handler 注册职责；新增业务 command 不应再直接写入 `main.rs`。
- `get_world_binary` 当前已统一为 raw binary；后续若恢复 zstd，必须先加入 codec header 并同步 `src/utils/worldBinary.ts`。
- 运行时文件 helper 已拆到 `src-tauri/src/runtime_files.rs`；系统信息 command 已拆到 `src-tauri/src/system_info.rs`；世界状态与二进制 command 已拆到 `src-tauri/src/world_commands.rs`；设置 command 已拆到 `src-tauri/src/settings_commands.rs`；benchmark command 已拆到 `src-tauri/src/benchmark_commands.rs`；AI/Ollama command 已拆到 `src-tauri/src/ai_commands.rs`；生命周期 command 已拆到 `src-tauri/src/lifecycle_commands.rs`；仿真循环已拆到 `src-tauri/src/evolution/simulation_engine.rs`。
- `src/utils/audio/presets.ts` 曲库会随玩法扩展变长；后续若继续新增音乐，应优先补数据和事件映射，不要把调度逻辑塞回组件。
