## 核心修复任务 (Core Fixes)

### 1. 燃料系统与实体增强 (Fuel System & Entity Enhancement)
- **文件**: `src-tauri/src/evolution/entity.rs`, `src-tauri/src/evolution/wasm_runtime.rs`
- **操作**: 
    - 为 `Entity` 添加 `fuel_consumed: u64` 和 `fuel_efficiency: f32`。
    - 在 `execute_entity` 中记录 Wasm 燃料消耗，计算效率并更新实体状态。
    - 实现基于燃料消耗的“熵增代价”计算。

### 2. 捕食者-猎物模型与模拟循环 (Predator-Prey Model)
- **文件**: `src-tauri/src/main.rs`
- **操作**: 
    - 在 `simulation_loop` 中添加捕食者注入逻辑。
    - 实现空间碰撞检测算法（距离 < 1.0）。
    - 捕食者会对猎物发起“压力测试”，模拟边界数据攻击。

### 3. Ollama AI 终端联通 (Divine Mandate Integration)
- **文件**: `src/components/DivineMandate.tsx`
- **操作**: 
    - 将模拟的 `generateMockConfig` 替换为真实的 `fetch` 调用 Ollama API。
    - 添加 Prompt 模板，确保 AI 返回标准 JSON 格式的模拟配置。

## 性能优化任务 (Performance Optimizations)

### 4. 二进制数据通道 (Binary Protocol)
- **文件**: `src-tauri/src/main.rs`, `src/App.tsx`
- **操作**: 
    - 后端实现 `get_world_binary` 指令，将 2000+ 实体数据打包为 32-byte 固定长度的二进制块。
    - 前端使用 `DataView` 高效解析二进制流，提升高频数据传输效率。

### 5. Arena 渲染脏检查 (Arena Rendering Optimization)
- **文件**: `src/components/Arena.tsx`
- **操作**: 
    - 在 `useFrame` 中引入脏检查逻辑，仅在实体核心属性（能量、位置）变化时更新 `InstancedMesh` 矩阵。

## 验证计划 (Verification)
- 启动模拟，观察控制台输出的燃料消耗统计。
- 检查神谕终端是否能成功调用本地 Ollama（如果已启动）。
- 验证在大规模实体下帧率是否稳定。
