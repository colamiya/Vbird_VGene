## 审计任务：深度纠正版本降级及 v41.x 全量 API 适配

非常感谢您提供的 `cargo check` 日志。这份日志清晰地揭示了我之前的错误操作导致了大规模的依赖降级（如 `wasmtime`、`cranelift` 系列从 `v41.0.0` 降到了 `v29.0.1`，`addr2line` 等工具库也发生了联动降级）。这种行为确实非常危险，因为它不仅破坏了项目的现代特性，还可能引入已修复的安全漏洞。

我已完成**全量联网核查**，以下是 2026-01-22 状态下的最终修复计划：

### 1. 核心库版本最终锁定
我们将严格按照 2026 年的最新标准恢复并锁定版本：
- **wasmtime**: `41.0.0` (恢复并锁定，解决 `pulley-interpreter` 等联动降级)
- **dashmap**: `6.1.0` (保持最新)
- **sysinfo**: `0.37.2` (保持最新)
- **rand**: `0.9.2` (保持最新)
- **windows**: `0.62.2` (保持最新)

### 2. 深度适配 Wasmtime v41.0.0 (Resource Limiter)
`v41.x` 已经彻底废弃了 `Config` 上的内存限制方法。现在的标准做法是使用 `ResourceLimiter` 接口。

**修改计划 (wasm_runtime.rs)**：
- 定义一个 `HostState` 结构体实现 `ResourceLimiter`。
- 在 `Store` 创建时注入该限制器。
```rust
// 伪代码参考
struct HostState {
    limits: StoreLimits,
}
impl ResourceLimiter for HostState {
    fn memory_growing(&mut self, current: usize, desired: usize, maximum: Option<usize>) -> Result<bool> {
        self.limits.memory_growing(current, desired, maximum)
    }
    // ... 其他方法
}
```

### 3. 修复 Rand v0.9.2 与 Sysinfo v0.37.2
- **Rand**: 确保所有 `thread_rng()` 后的调用符合 `v0.9` 规范（如 `gen_range` 需显式导入 `Rng` trait）。
- **Sysinfo**: 确保 `RefreshKind` 的使用是针对 `v0.37` 的最新 API（如 `with_cpu` 的参数变化）。

### 4. 实施步骤
1. **修正 Cargo.toml**：将 `wasmtime` 恢复为 `41.0.0`。
2. **重构 wasm_runtime.rs**：全面转向 `StoreLimits` 和 `ResourceLimiter`。
3. **全局代码清理**：删除之前降级引入的冗余配置。
4. **编译验证**：指导用户运行 `cargo check` 确保所有降级 log 消失，变为 `Updating` 或保持最新。

我已深刻认识到依赖树联动降级的风险，后续将以 `cargo check` 的实际输出作为最高优先级参考，确保每一步操作都是向上升级。
