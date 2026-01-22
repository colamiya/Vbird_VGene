## 审计任务分析

我们将对 5 个关键 Rust 库进行升级。以下是核心 API 变化分析及修复计划：

### 1. dashmap v6.1.0

* **核心变化**：`DashSet` 和 `DashMap` 的命名空间在某些重构版本中可能有所调整（通常建议直接使用根路径）。`Entry` API 的返回类型和枚举变体可能更名或细化。

* **修复计划**：

  * 检查 [crash\_registry.rs](file:///c:/Users/A0065509/source/repos/Vbird_VGene/src-tauri/src/evolution/crash_registry.rs) 中的 `DashSet` 导入。

  * 如果代码中涉及 `DashMap::entry`，确保逻辑适配新的 `Entry` 变体。

### 2. sysinfo v0.37.2

* **核心变化**：`refresh_all()` 因性能问题已被标记为废弃或不建议使用。现在推荐使用 `refresh_specifics()` 并配合 `RefreshKind` 精确控制。

* **修复计划**：

  * 修改 [main.rs](file:///c:/Users/A0065509/source/repos/Vbird_VGene/src-tauri/src/main.rs) 和 [environment.rs](file:///c:/Users/A0065509/source/repos/Vbird_VGene/src-tauri/src/evolution/environment.rs)。

  * 将 `sys.refresh_all()` 替换为 `sys.refresh_specifics(RefreshKind::new().with_cpu(CpuRefreshKind::everything()).with_memory())`。

### 3. rand v0.9.2

* **核心变化**：`Rng` trait 必须显式导入才能使用 `gen_range` 等方法。`StdRng::from_entropy()` 已被 `StdRng::from_os_rng()` 取代。

* **修复计划**：

  * 在 [main.rs](file:///c:/Users/A0065509/source/repos/Vbird_VGene/src-tauri/src/main.rs)、[dna\_splicer.rs](file:///c:/Users/A0065509/source/repos/Vbird_VGene/src-tauri/src/evolution/dna_splicer.rs) 和 [mutation.rs](file:///c:/Users/A0065509/source/repos/Vbird_VGene/src-tauri/src/evolution/mutation.rs) 中确保 `use rand::Rng;`。

  * 更新 `StdRng` 的初始化逻辑（如有使用）。

### 4. windows v0.62.2

* **核心变化**：`SetPriorityClass` 及其相关常量的命名空间路径可能发生细微变化。

* **修复计划**：

  * 更新 [main.rs](file:///c:/Users/A0065509/source/repos/Vbird_VGene/src-tauri/src/main.rs) 中的路径：`windows::Win32::System::Threading::SetPriorityClass`。

  * 确保操作封装在 `unsafe` 块中（目前已封装，需保持）。

### 5. wasmtime (最新版)

* **核心变化**：`Config` 中的 `static_memory_maximum_size` 和 `dynamic_memory_maximum_size` 已被移除。

* **修复计划**：

  * 修改 [wasm\_runtime.rs](file:///c:/Users/A0065509/source/repos/Vbird_VGene/src-tauri/src/evolution/wasm_runtime.rs)。

  * 使用 `config.memory_reservation(size)` 代替 `static_memory_maximum_size`，并调整 `memory_guard_size`。

***

## 实施步骤

1. **更新依赖**：修改 [Cargo.toml](file:///c:/Users/A0065509/source/repos/Vbird_VGene/src-tauri/Cargo.toml) 的版本号。
2. **修复代码**：按照上述计划逐个文件修改代码逻辑。
3. **验证**：提示用户在编译环境运行 `cargo check` 验证 API 兼容性。

