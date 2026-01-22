# VGene 项目深度修复与优化方案

根据 Claude 的审计建议，我制定了以下分阶段的修复计划，旨在解决系统中的死锁风险、资源限制、并发性能及前端过载问题。

## 第一阶段：核心安全性与稳定性修复 (P0)

### 1. 修复异步死锁风险
- **文件**: [main.rs](file:///c:/Users/A0065509/source/repos/Vbird_VGene/src-tauri/src/main.rs)
- **方案**: 重构 `simulation_loop` 中的 `tokio::spawn` 逻辑，确保在执行异步 `.await`（如 `engine.mutate`）之前释放互斥锁。
- **关键点**: 先克隆 `MutationEngine` 后立即释放锁。

### 2. 强化 Wasmtime 沙箱限制
- **文件**: [wasm_runtime.rs](file:///c:/Users/A0065509/source/repos/Vbird_VGene/src-tauri/src/evolution/wasm_runtime.rs)
- **方案**: 
    - 在 `Config` 中添加内存限制（1MB 最大内存，128KB 栈空间）。
    - 降低 `execute_entity` 的燃料限制（从 2000 降至 500）。
    - 为 `validate_and_test` 添加更严格的限制。

## 第二阶段：并发性能与数据传输优化 (P1)

### 3. 优化 CrashRegistry 线程安全
- **文件**: [crash_registry.rs](file:///c:/Users/A0065509/source/repos/Vbird_VGene/src-tauri/src/evolution/crash_registry.rs)
- **依赖**: 添加 `dashmap = "5.5"`
- **方案**: 将 `blacklisted_hashes` 从 `Mutex<HashSet>` 替换为 `DashSet`，实现无锁并发检查，消除性能瓶颈。

### 4. 降低 Tauri 数据传输负载
- **文件**: [main.rs](file:///c:/Users/A0065509/source/repos/Vbird_VGene/src-tauri/src/main.rs), [Arena.tsx](file:///c:/Users/A0065509/source/repos/Vbird_VGene/src/components/Arena.tsx)
- **方案**:
    - 在后端定义轻量级 `EntityView` 结构（不包含庞大的 DNA 字符串）。
    - 修改 `get_world_state` 返回 `Vec<EntityView>`。
    - 新增 `get_entity_detail` 命令，按需获取单个实体的完整信息。
    - 前端配合调整，减少每帧传输的数据量（预计减少 80% 以上）。

## 第三阶段：算法增强与前端渲染优化 (P2-P3)

### 5. Ollama 变异机制鲁棒性增强
- **文件**: [mutation.rs](file:///c:/Users/A0065509/source/repos/Vbird_VGene/src-tauri/src/evolution/mutation.rs)
- **方案**: 为 Ollama 请求添加 10 秒超时限制和 3 次指数退避重试机制。

### 6. 前端 Arena 渲染降频
- **文件**: [Arena.tsx](file:///c:/Users/A0065509/source/repos/Vbird_VGene/src/components/Arena.tsx)
- **方案**: 在 `useFrame` 中引入更新频率控制（如每 3 帧更新一次）和简单的变化检测，避免无意义的 GPU 上传。

### 7. 改进 DNA 拼接算法
- **文件**: [dna_splicer.rs](file:///c:/Users/A0065509/source/repos/Vbird_VGene/src-tauri/src/evolution/dna_splicer.rs)
- **方案**: 废弃简单的行拼接，改为基于语法块（函数体内的语句）的随机交换，提高生成 DNA 的合法性和存活率。

### 8. 强化影子演化测试
- **文件**: [wasm_runtime.rs](file:///c:/Users/A0065509/source/repos/Vbird_VGene/src-tauri/src/evolution/wasm_runtime.rs)
- **方案**: 将测试轮数从 10 轮增加到 50 轮，并增加对返回值范围（0-1000）的校验。

## 第四阶段：环境适配与系统日志

### 9. 初始化日志与 Windows 优化
- **文件**: [main.rs](file:///c:/Users/A0065509/source/repos/Vbird_VGene/src-tauri/src/main.rs)
- **方案**: 
    - 初始化 `env_logger`。
    - 在 Windows 环境下提升进程优先级至 `HIGH_PRIORITY_CLASS` 以获得更稳定的模拟性能。

---
请确认上述计划，我将开始逐步实施。由于本项目不需要在本地运行编译指令，我将仅专注于代码修改和优化。
