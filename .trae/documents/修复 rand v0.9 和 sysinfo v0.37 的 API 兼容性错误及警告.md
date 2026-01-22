## 审计修复计划：全量适配 2026 最新版 API (rand v0.9.2 / sysinfo v0.37.2)

根据您提供的 `cargo check` 错误日志，并结合我刚刚对 **2026-01-22** 实时在线文档的核查结果，我制定了以下修复计划。这些修改点均已通过联网搜索确认，而非依赖过时的训练数据。

### 1. 修复 rand v0.9.2 引起的错误与警告
- **核心变更**：`rand` 在 `0.9` 版本中进行了重大的 API 重命名和 Trait 调整。
- **修复方案**：
    - 将所有 `rand::thread_rng()` 替换为最新的 `rand::rng()`。
    - 将 `gen_bool(p)` 替换为 `random_bool(p)`。
    - 将 `gen_range(range)` 替换为 `random_range(range)`。
    - **重点修复**：由于 `StandardUniform` 逻辑变更，不再支持 `random::<usize>()`。在 [main.rs](file:///c:/Users/A0065509/source/repos/Vbird_VGene/src-tauri/src/main.rs) 中，将 `rand::random::<usize>() % entities.len()` 直接改为 `rand::random_range(0..entities.len())`。

### 2. 修复 sysinfo v0.37.2 引起的错误
- **核心变更**：`RefreshKind` 不再支持 `new()`，必须从 `nothing()` 或 `everything()` 开始构建。
- **修复方案**：
    - 在 [main.rs](file:///c:/Users/A0065509/source/repos/Vbird_VGene/src-tauri/src/main.rs) 和 [environment.rs](file:///c:/Users/A0065509/source/repos/Vbird_VGene/src-tauri/src/evolution/environment.rs) 中，将 `RefreshKind::new()` 改为 `RefreshKind::nothing()`。

### 3. 修复 wasmtime v41.0.0 引起的警告
- **修复方案**：
    - 在 [wasm_runtime.rs](file:///c:/Users/A0065509/source/repos/Vbird_VGene/src-tauri/src/evolution/wasm_runtime.rs) 的 `WasmEngine::new` 中，正式应用 `config.max_wasm_stack(128 * 1024)`，并移除 `HostState::new` 中未使用的参数，以消除编译警告。

### 4. 实施细节
| 文件 | 修改点 | 理由 |
| :--- | :--- | :--- |
| **main.rs** | 删除 `use rand::Rng;` | `random_range` 是顶级函数，不再需要导入 Trait。 |
| **main.rs** | `random::<usize>()` -> `random_range()` | `v0.9` 类型约束变更。 |
| **mutation.rs** | `thread_rng` -> `rng`, `gen_bool` -> `random_bool` | `v0.9` API 重命名。 |
| **dna_splicer.rs** | `gen_range` -> `random_range` | `v0.9` API 重命名。 |
| **wasm_runtime.rs** | 应用 `max_wasm_stack` | 解决未使用变量警告。 |

我将严格按照上述计划进行修改，并在修改完成后请您在编译环境再次验证。
