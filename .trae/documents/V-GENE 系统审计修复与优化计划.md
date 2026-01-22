## V-GENE 系统深度优化方案

结合审计报告与当前代码库的实际情况，我制定了以下修复与优化计划。我们将重点解决性能瓶颈（锁竞争、碰撞检测）、逻辑缺陷（依赖项缺失、捕食者逻辑机械）以及架构优化。

### **1. 后端架构与性能优化 (Rust)**
*   **[entity.rs](file:///d%3A/Code/Vbird_VGene/src-tauri/src/evolution/entity.rs)**: 
    *   为 `Entity`, `Stats`, `Ethics` 结构体派生 `PartialEq`, `Eq`, `Hash`，以便在集合操作和测试中使用。
*   **[wasm_runtime.rs](file:///d%3A/Code/Vbird_VGene/src-tauri/src/evolution/wasm_runtime.rs)**:
    *   **缓存优化**: 将 `module_cache` 从 `Mutex<HashMap<String, Module>>` 替换为 `DashMap<String, Module>`，减少锁竞争。
    *   **键值优化**: 使用 DNA 的 SHA256 哈希作为缓存键，避免超大 DNA 字符串带来的内存和比较开销。
    *   **并行验证**: 利用 `rayon` 并行执行“影子演化”测试（50轮试运行），显著缩短变异验证时间。
*   **[main.rs](file:///d%3A/Code/Vbird_VGene/src-tauri/src/main.rs)**:
    *   **锁粒度重构**: 优化 `simulation_loop`。不再在整个处理块中持有 `entities` 锁，而是采用“读取-处理-写入”模式，或缩短锁持有时间，确保前端指令（如 `get_entity_detail`）不会被阻塞。
    *   **碰撞算法升级**: 废弃 $O(n^2)$ 双重循环，实现基于**网格划分 (Grid-based)** 的空间索引，将碰撞检测复杂度降至近乎 $O(n)$。
    *   **动态生态逻辑**: 
        *   捕食者注入不再仅基于固定代数，而是根据种群平均能量或得分动态触发。
        *   在碰撞和互动中引入 `altruism` (利他主义) 影响，实现真实的协作与背叛机制。
*   **[mutation.rs](file:///d%3A/Code/Vbird_VGene/src-tauri/src/evolution/mutation.rs)**:
    *   **健壮性提升**: 增强 `extract_wat` 逻辑，处理更复杂的模型输出格式。

### **2. 前端渲染与逻辑优化 (React/TS)**
*   **[App.tsx](file:///d%3A/Code/Vbird_VGene/src/App.tsx)**:
    *   **依赖项修复**: 在 `useEffect` 依赖数组中添加 `config`，确保配置变更（如模式切换）时模拟逻辑能正确重置。
    *   **熵值算法改进**: 引入更科学的熵值计算公式（如基于适应度分布的 Shannon Entropy），而非简单的代谢毒素平均值。
*   **[Arena.tsx](file:///d%3A/Code/Vbird_VGene/src/components/Arena.tsx)**:
    *   **性能优化**: 优化 `EntitySwarm` 中的脏检查逻辑。避免每帧对所有实体进行深度拷贝（`[...entities.map(e => ({...e}))]`），改用更轻量级的状态追踪或版本号对比。

### **3. 安全与配置优化**
*   **[tauri.conf.json](file:///d%3A/Code/Vbird_VGene/src-tauri/tauri.conf.json)**:
    *   **CSP 紧固**: 评估并收紧内容安全策略，移除不必要的 `'unsafe-eval'`，并针对 Ollama API 地址进行精确授权。

请确认上述计划，我将开始逐步实施。
