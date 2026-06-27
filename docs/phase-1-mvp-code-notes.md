# Phase 1 MVP Code Notes

## 2026-06-10

本轮目标是先写 Phase 1 MVP 基础代码，不做测试。

## 已写入的代码方向

- 前端统一世界实体类型：`src/types/world.ts`
- 前端统一设置字段适配：`src/utils/settings.ts`
- 前端世界二进制解析器：`src/utils/worldBinary.ts`
- 后端 Phase 1 算法任务目录：`src-tauri/src/evolution/benchmark.rs`
- 后端突变提示可接入有用任务上下文：`src-tauri/src/evolution/mutation.rs`
- 后端任务目录 command：`get_benchmark_catalog`
- 设置页新增 Phase 1 有用工作任务选择：`sort_i32`、`rle`、`freeform`
- 后端任务化验证与评分：`WasmEngine::score_dna_for_task`、`validate_and_test_for_task`、`execute_entity_for_task`
- 后端基线 DNA：`baseline_dna_for_task` 为 `freeform`、`sort_i32`、`rle` 提供可运行初始 DNA

## Phase 1 MVP 当前代码目标

- LocalMock 能稳定演示主流程。
- 真实后端二进制数据由专用 parser 处理。
- 设置字段同时兼容 camelCase 与 snake_case。
- `sort_i32` 与 `rle` 成为第一批真实有用工作任务。
- `sort_i32` 与 `rle` 已接入 `WasmEngine` 的任务化评分和影子验证；缺少任务导出的 DNA 会被拒绝。
- 任务切换后会清空旧种群；运行中切换会立即用新任务基线重播种，避免旧 DNA 复用到新任务。

## 验证记录

- 2026-06-19：`cargo fmt --check` 通过。
- 2026-06-19：`cargo test` 通过，包含 3 个 Phase 1 useful-work 单测。
- 2026-06-19：`.\run.ps1 -Action Check -NoPause` 通过，覆盖 `tsc --noEmit`、`vite build`、`cargo check`。
- 待手测：`npm run tauri dev`/`.\run.ps1 -Action Dev` 下的完整窗口交互、设置保存、实体点击和 Review 流转。
