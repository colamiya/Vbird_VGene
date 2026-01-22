## V-GENE 系统第二阶段深度优化方案

在完成第一阶段的性能修复后，我们将进入第二阶段，重点解决算法复杂度、数据传输效率以及可视化真实性问题。

### **1. 渲染性能优化: 进化星图 O(N) 重构**
*   **问题**: [PhylogeneticTree.tsx](file:///d%3A/Code/Vbird_VGene/src/components/PhylogeneticTree.tsx) 在绘制谱系连线时，对每个节点都执行全量查找，复杂度为 $O(N^2)$。
*   **优化**: 
    *   在 `useMemo` 计算中引入 `Map<number, Node>` 索引。
    *   将查找父节点位置的操作优化为 $O(1)$，总复杂度降至 $O(N)$。这将允许星图在显示 2000+ 个体时依然保持 60FPS。

### **2. 算法精度优化: 基因重组逻辑增强**
*   **问题**: [dna_splicer.rs](file:///d%3A/Code/Vbird_VGene/src-tauri/src/evolution/dna_splicer.rs) 目前基于字符串行过滤，容易破坏 WAT 语法结构且内存分配频繁。
*   **优化**: 
    *   **语义化提取**: 增强提取逻辑，确保交换的是完整的 S-expression 指令块。
    *   **内存优化**: 减少不必要的 `.to_string()` 和 `.clone()`，改用引用和预分配缓存。

### **3. 极致序列化: 1KB “孢子”传输协议**
*   **问题**: [main.rs](file:///d%3A/Code/Vbird_VGene/src-tauri/src/main.rs) 的二进制传输未经过压缩，带宽占用较高。
*   **优化**: 
    *   引入 `zstd` 库。
    *   对 `get_world_binary` 返回的字节流进行高效压缩，实现 README 承诺的极致网络传输效率。

### **4. 可视化真实性: 打通 WASM 内存映射**
*   **问题**: [MicroArena.tsx](file:///d%3A/Code/Vbird_VGene/src/components/MicroArena.tsx) 目前是随机模拟，无法反映代码执行的真实状态。
*   **优化**: 
    *   **后端通道**: 在 `WasmEngine` 执行期间，提取 WASM 实例的 `Linear Memory` 指纹。
    *   **前端同步**: 通过 `get_entity_detail` 或新的指令将真实内存字节传给前端，让微观战场展示真实的“内存占领”与“指令对抗”。

### **5. 辅助功能: 二进制导出与英灵殿增强**
*   **功能**: 为精英个体增加 `.wasm` 二进制导出选项，方便外部调试。

请确认上述计划，我将开始逐步实施。
