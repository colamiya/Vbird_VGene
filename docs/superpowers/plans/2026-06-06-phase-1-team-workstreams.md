# Phase 1 Team Workstreams

## 智能体编制

| 职能 | 智能体 | 责任边界 | 第一优先级 |
|---|---|---|---|
| 项目经理 | 当前主线程 | 统一排期、验收口径、风险收敛、文档同步 | 控制范围，推动 Phase 1 先绿构建再跑通 |
| 技术负责人 | Jason | 架构边界、模块拆分、技术依赖关系 | 确认 MVP 架构与拆分顺序 |
| Rust/Tauri 后端负责人 | Meitner | Tauri command、仿真循环、Wasm 沙箱、路径/日志/设置 | 修复二进制协议与后端稳定性 |
| React/Three 前端负责人 | Volta | UI 流转、Three 渲染、前端类型、世界数据解析 | 修复 `npm run build` |
| 算法/程序合成负责人 | Linnaeus | DNA/WAT、任务 ABI、评分函数、隐藏测试 | 定义 `sort_i32 + rle` 任务评测 |
| QA/发布负责人 | Planck | 构建门禁、测试矩阵、发布前检查 | 建立第一阶段 QA 门禁 |

## 第一阶段总目标

把项目从“概念原型”推进到“可构建、可运行、可演示、可回归”的本地 MVP。

不做：

- 链上 PoUW。
- 分布式节点。
- 商业分润。
- 自定义 `vgene://`。
- OffscreenCanvas。
- 完整 20 条物理定律工程化。

必须做到：

- `npm run build` 通过。
- `cd src-tauri; cargo check` 通过。
- `npm run tauri dev` 可跑主流程。
- LocalMock 不依赖 Ollama 可演示。
- 真实后端模式不再解析压缩数据出错。
- README/CHANGELOG 与代码现实同步。

## Sprint 0：恢复工程门禁

### FE-01 修复 TypeScript 构建

Owner：Volta  
Review：Planck  
Files：

- `src/App.tsx`
- `src/components/Arena.tsx`
- `src/components/PhylogeneticTree.tsx`
- `src/components/HallOfFame.tsx`
- `src/components/DivineMandate.tsx`
- `src/components/GenesisGate.tsx`
- `src/components/MicroArena.tsx`
- `src/components/MotherMachine.tsx`
- `src/components/PhoenixReview.tsx`
- `src/components/SettingsModal.tsx`
- `src/utils/i18n.ts`

验收：

```powershell
npx tsc --noEmit --pretty false
npm run build
```

完成标准：

- 无 TS6133 未使用项。
- `Arena` 与 `App.EntityView` 类型兼容。
- `EffectComposer` 使用当前依赖支持的属性。
- `PhylogeneticTree` 不再从 `@react-three/drei` 导入不存在成员。

### QA-01 建立失败基线记录

Owner：Planck  
Review：项目经理  
Files：

- `CHANGELOG.md`
- 可选：`docs/qa/phase-1-build-baseline.md`

验收：

- 记录当前 `npx tsc --noEmit --pretty false` 错误分类。
- 修复后记录通过命令和时间。

## Sprint 1：修复真实数据通道

### BE-01 修复 `get_world_binary` 协议

Owner：Meitner  
Review：Jason + Volta  
Files：

- `src-tauri/src/main.rs`
- `src/App.tsx`
- 可选：`src/utils/worldBinary.ts`

PM 决策：

- Phase 1 优先保证正确性，建议后端先返回 raw binary，zstd 移入 Phase 2。
- 如果保留 zstd，前端必须引入解压库并做协议校验。

验收：

```powershell
npm run build
cd src-tauri; cargo check
```

手测：

- 真实后端模式 `start_sim -> get_world_binary -> Arena` 不白屏。
- 统计尾部 12 字节能正确读取。
- 解析失败时 UI 不崩溃。

### FE-02 抽世界数据解析

Owner：Volta  
Review：Meitner  
Files：

- `src/utils/worldBinary.ts`
- `src/App.tsx`
- 可选：`src/types/world.ts`

验收：

- 实体记录协议固定为 36 字节。
- 统计尾部固定为 12 字节。
- `collaboration` 默认值统一。
- `App.tsx` 不直接承担 DataView 细节。

## Sprint 2：稳定 MVP 运行流

### FE-03 修复设置字段适配

Owner：Volta  
Review：Meitner  
Files：

- `src/App.tsx`
- `src/components/SettingsModal.tsx`

问题：

- `SettingsModal` 保存字段偏 snake_case。
- `App.handleStart/handleUpdateSettings` 使用 camelCase。

验收：

- `mode`、`ollamaUrl`、`modelName`、`maxEntities`、`evolutionThrottle`、`visualFidelity` 正确传入后端。
- 无配置文件时可以正常使用默认值。

### BE-02 稳定仿真生命周期

Owner：Meitner  
Review：Jason  
Files：

- `src-tauri/src/main.rs`
- 可选：`src-tauri/src/services/simulation.rs`

验收：

- 重复点击开始不会多次创建无限后台循环。
- 停止后仿真循环能确定退出。
- Ollama 慢响应不会无限堆积突变任务。

## Sprint 3：让“有用工作”成立

### ALG-01 定义第一批任务 ABI

Owner：Linnaeus  
Review：Jason + Meitner  
Files：

- 可选：`docs/algorithm/phase-1-task-abi.md`
- 可选：`src-tauri/src/evolution/benchmark.rs`

任务：

- `sort_i32(ptr, len) -> i32`
- `rle_encode(in_ptr, in_len, out_ptr, out_cap) -> i32`

验收：

- 有公开样例。
- 有隐藏测试策略。
- 有防常量投机说明。
- 有评分公式。

### ALG-02 引入评分结果结构

Owner：Linnaeus  
Review：Meitner  
Files：

- `src-tauri/src/evolution/benchmark.rs`
- `src-tauri/src/evolution/wasm_runtime.rs`

验收：

- 错误输出得 0。
- trap/超 fuel 得 0。
- 正确性权重高于性能权重。
- `Entity.score` 仍可被现有仿真循环消费。

## Sprint 4：架构拆分与发布门禁

### ARCH-01 拆分 `main.rs`

Owner：Jason + Meitner  
Review：项目经理  
Files：

- `src-tauri/src/main.rs`
- `src-tauri/src/commands.rs`
- `src-tauri/src/services/settings.rs`
- `src-tauri/src/services/logging.rs`
- `src-tauri/src/services/system_info.rs`
- `src-tauri/src/services/world_codec.rs`
- `src-tauri/src/services/simulation.rs`

顺序：

1. settings/logging。
2. system_info。
3. world_codec。
4. simulation。
5. commands 薄封装。

验收：

```powershell
cd src-tauri
cargo fmt --check
cargo check
```

### QA-02 发布门禁

Owner：Planck  
Review：项目经理  
Files：

- `README.md`
- `CHANGELOG.md`
- 可选：`docs/qa/phase-1-release-checklist.md`

门禁：

```powershell
cd D:\Code\Vbird_VGene
npm run build
cd D:\Code\Vbird_VGene\src-tauri
cargo fmt --check
cargo check
cargo test
cd D:\Code\Vbird_VGene
npm run tauri dev
```

补充手测矩阵：

- Windows 普通用户。
- LocalMock。
- Ollama 可用。
- Ollama 不可用。
- NVIDIA GPU。
- 无 NVIDIA/无 GPU。

## 当前最高优先级

1. FE-01：修复 TypeScript 构建。
2. BE-01 / FE-02：修复世界二进制协议。
3. FE-03 / BE-02：稳定主流程与仿真生命周期。
4. ALG-01：定义 `sort_i32 + rle`，让项目从随机演示转向有用工作。
5. QA-02：建立发布门禁。

## PM 决策记录

- Phase 1 内存限制按代码现实先记录为 1MB；是否改 16MB 延后到沙箱配置任务。
- Phase 1 不追求 zstd 性能，优先追求数据正确性。
- Phase 1 算法任务只选 `sort_i32 + rle`，暂缓 `crc32/base64`。
- Phase 1 后端拆分不得改变 Tauri command 名称。
