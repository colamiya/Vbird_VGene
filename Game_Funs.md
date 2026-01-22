# 🌌 VGene: 数字创世引擎架构白皮书 (Ver 2027.Alpha)

> "在硅基的土壤中，我们播种混沌，收割秩序。" —— 首席架构师日志

## 1. 核心循环 (The Loop of Genesis)

本引擎遵循宇宙演化的基本法则，构建了一个闭环的数字生态系统：
`神谕 (Oracle)` -> `创世 (Genesis)` -> `角斗 (Arena)` -> `收割 (Harvest)`

---

## 2. 模块详解 (Module Specification)

### 🔮 2.1 神谕协议 (The Oracle Protocol)
**目标**: 将人类自然语言转化为机器可执行的演化约束。

*   **输入 (Input)**: 自然语言 Prompt (e.g., "创造一种能够快速复制但极度脆弱的病毒式生物")
*   **处理流 (Process Flow)**:
    1.  **语义解析**: 使用 LLM (Ollama/Llama3) 提取关键词: `strategy: viral`, `stat: high_speed`, `stat: low_hp`.
    2.  **约束生成**:
        *   `Memory_Limit`: 64KB (限制体积，强制精简)
        *   `Instruction_Set`: 偏向 `local.get`, `local.set` (高频读写)
        *   `Energy_Cost`: 复制操作消耗极低，但防御操作消耗极高。
    3.  **奖惩函数 (Fitness Function)**:
        ```rust
        fn calculate_fitness(entity) {
            let reproduction_score = entity.children_count * 10.0;
            let survival_penalty = if entity.age > 100 { -50.0 } else { 0.0 }; // 强制短命
            return reproduction_score + survival_penalty;
        }
        ```
*   **输出 (Output)**: `EvolutionConfig` JSON 对象。

### 🧬 2.2 创世引擎 (Genesis Engine)
**目标**: 基于 WAT (WebAssembly Text) 生成初始种群。

*   **基因结构 (DNA Structure)**:
    *   每个生物体是一个独立的 WASM 模块。
    *   **基因片段**: 预定义的 WASM 函数块 (e.g., `func $search_food`, `func $attack_neighbor`).
    *   **拼接逻辑**: 随机组合基因片段，形成完整的 `module`。
*   **初始状态**:
    *   生成 500-2000 个随机变异体。
    *   每个个体分配唯一的 `HashID`。

### ⚔️ 2.3 角斗场物理学 (Arena Physics)
**目标**: 定义数字空间的客观规律。

*   **内存拓扑 (Memory Topology)**:
    *   二维环面 (Toroidal Grid): 左右相通，上下相连，模拟无边界宇宙。
    *   每个坐标点 `(x, y)` 对应一段内存地址空间。
*   **能量守恒 (Energy Conservation)**:
    *   **指令消耗**: 执行 `i32.add` 消耗 0.1 能量，`memory.grow` 消耗 10.0 能量。
    *   **光合作用**: 随机在网格生成 `EnergyPacket`，移动到该位置可获得能量。
    *   **掠夺**: 攻击成功可窃取对方 50% 能量。
*   **战斗机制 (Combat Mechanics)**:
    *   **写入攻击 (Write Attack)**: 尝试向邻居内存地址写入垃圾数据。若无护盾，对方代码崩溃 (Trap)。
    *   **读取侦查 (Read Probe)**: 扫描邻居内存，判断敌我 (基于 HashID)。
    *   **护盾 (Shield)**: 消耗大量能量锁定内存段，防止写入。

### 🌾 2.4 收割协议 (Harvest Protocol)
**目标**: 提取并保存有价值的进化成果。

*   **筛选标准 (Selection Criteria)**:
    *   `Top 1% Fitness`: 适应度最高的精英。
    *   `Unique Mutation`: 产生了前所未见的代码模式 (通过 AST 分析)。
*   **序列化 (Serialization)**:
    *   将 WASM 模块编译为二进制 `.wasm` 文件。
    *   生成 `SoulCard` (JSON 元数据): 包含世代数、击杀数、存活时间、核心策略描述。
*   **导出 (Export)**: 用户可将 `.wasm` 导出用于其他项目，或在“名人堂”中展示。

---

## 3. 视觉与交互规范 (Visual & UX Specs)

*   **风格**: Cyberpunk / Glitch Art / Data Moshing.
*   **色彩**: 
    *   `Neon Blue (#00f3ff)`: 正常/科技
    *   `Error Red (#ff003c)`: 危险/崩溃
    *   `Void Black (#0a0a0a)`: 背景
*   **音效**:
    *   UI 交互: 机械键盘敲击声、电流声。
    *   战斗: 8-bit 合成器音效，故障噪音。

---

> "代码即生命，Bug 即变异。"
