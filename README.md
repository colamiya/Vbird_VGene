# 🌌 VGene: The Entropy Protocol (v2.0)

> **“将全球闲置算力与人类的博弈本能，转化为推动文明进步的逻辑燃料。”**

**VGene** 当前是基于 **Tauri + Rust + Wasmtime** 构建的本地单机“下饭观看数字生命演化”垂直切片；分布式 4X、PoUW、PVP 和链上分润仍属于长期愿景，未在当前源码形成完整闭环。

当前受支持的公开发行平台为 Windows 10/11，默认 Tauri 发行配置仅生成 NSIS 与 MSI 安装包。macOS/Linux 可用于源码研究，但不属于已验证或受支持的发行目标。

---

## 当前交付口径

> 当前仓库是本地单机“下饭观看数字生命演化”垂直切片；下表以源码闭环为准，避免把愿景写成已交付能力。

| 能力 | 当前状态 | 代码证据 |
| --- | --- | --- |
| 本地 Wasm 数字生命评分 | 已实现 | `src-tauri/src/evolution/wasm_runtime.rs` |
| Phase 1 useful-work 任务 | 已实现 | `src-tauri/src/evolution/benchmark.rs` |
| Local useful-work 固定边界语料 + 语义写回门槛 | 部分已实现 | `src-tauri/src/evolution/mutation.rs`、`src-tauri/src/evolution/wasm_runtime.rs`、`src-tauri/src/evolution/simulation_engine.rs`；Local 已能产生可执行任务变体并过非退化门槛，仍未证明长期泛化优化 |
| 下饭局会话、干预、事件、复盘 | 已实现 | `src/App.tsx`、`src/utils/runSession.ts`、`src/utils/worldEvents.ts` |
| 后端真实交互日志与 Arena 实线事实线 | 已实现 | `src-tauri/src/evolution/compute.rs`、`src-tauri/src/world_commands.rs`、`src/utils/liveInteractions.ts`、`src/components/Arena.tsx` |
| CUDA 数值生态后端 | 实验中 | `src-tauri/src/evolution/gpu/`，需 `cuda` feature、CUDA Toolkit 与 MSVC |
| PoUW 商业提交、PVP、Merkle 分润、`vgene://`、OffscreenCanvas | 愿景/未交付 | 当前源码无完整闭环 |

---

## 🧬 核心愿景：逻辑压缩与价值重构

在 VGene 中，战场不是星空，而是内存堆栈。
- **创世 (Genesis)**：利用本地 **Ollama (Qwen2.5-Coder)** 诱导 Wasm 代码变异。
- **熵网悬赏 (Entropy Contracts)**：通过解决真实世界的算法难题（PVE）获取代币奖励。
- **维度角斗场 (Arena)**：玩家间通过代码效率进行对抗（PVP），掠夺计算资源。

---

## 🛠️ 三位一体：进化架构栈

### 1. 主权引擎 (The Sovereign Engine / Rust & Wasmtime)
- **底层沙箱**：基于 `Wasmtime`。强制执行 **[Fuel 消耗限制]** 与 **[16MB 内存隔离]**，确保绝对安全。
- **确定性验证**：服务器通过校验 `wasmtime::consume_fuel` 的数值实现零延迟防作弊。
- **血统账本 (Lineage Ledger)**：基于 Merkle Tree 追踪基因演化路径，实现算法专利的自动分润。

### 2. 女娲突变器 (The Nuwa Mutator / LLM Integration)
- **自然语言重构**：玩家通过 Prompt 下达“神谕”，Ollama 将意图转化为 `.wat` 汇编指令块。
- **视觉基因编辑器 (VGE)**：将位运算、循环等逻辑封装为 3D 可视化“器官”，降低极客门槛。

### 3. 以太视窗 (The Aether Window / React & Three.js)
- **高性能隧道**（愿景，未交付）：放弃 JSON 通信，采用 **自定义协议 `vgene://`** 直接流式传输二进制顶点数据。
- **离屏渲染 (OffscreenCanvas)**（愿景，未交付）：3D 渲染与逻辑计算完全解耦，确保在高频演化时 UI 保持 144Hz。

---

## ⚖️ 数字宇宙的 20 条熵增定律 (The Physics)

### 1. 熵增约束 (Thermodynamic Constraint)
*   **算法简介**：引入虚拟能量（Energy）概念。`Energy = Max_Capacity - (Execution_Steps * k1 + Code_Size * k2)`。
*   **简单例子**：一段实现“加法”的代码，如果用了 10 条指令，其消耗的能量远高于只用 1 条指令的代码。能量耗尽则个体死亡。

### 2. “捕食者-猎物”模型 (Predator-Prey Logic)
*   **算法简介**：系统中同时存在“功能个体”和“压力个体（模拟攻击者）”。
*   **简单例子**：压力个体会不断向功能个体发送非法的边界数据或大数据包，若功能个体的 Wasm 代码没有写 `if` 边界检查，沙箱会报错，功能个体被判定被“捕食”。

### 3. 代谢毒素机制 (Metabolic Toxicity)
*   **算法简介**：记录代码的“逻辑死循环”或“高延迟”频次。
*   **简单例子**：若一段代码包含大量无用跳转（JMP），系统会给其累加 `Toxin` 值。`Toxin` 达到阈值后，个体的变异率会强行升高（逻辑崩溃），模拟生物中毒死亡。

### 4. 纳什均衡博弈 (Game-Theoretic Equilibrium)
*   **算法简介**：资源（CPU 时间片）是有限的，个体间通过交换数据包决定资源分配。
*   **简单例子**：两个个体若都选择“合作（共享缓存）”，则整体能耗降低；若一方“背叛（抢占内存）”，则背叛者短期获益但会被系统标记。

### 5. 指令方言漂移 (Linguistic Drift)
*   **算法简介**：允许 AI 使用特定硬件架构的非标准指令组合（如利用特定显卡的位运算优化）。
*   **简单例子**：在 3080 上，AI 可能会发现使用某种特殊的二进制掩码比标准逻辑快，这种“方言”会在种群中保留。

### 6. 神经剪枝映射 (Neural Pruning)
*   **算法简介**：监控 Wasm 指令的热力图。
*   **简单例子**：若代码中有 30% 的逻辑在 1000 代进化中从未被执行（死代码），系统会自动将其剔除并重新评估。

### 7. 分形逻辑架构 (Fractal Logic)
*   **算法简介**：强制要求 Wasm 模块采用“主函数调用子函数”的递归自相似结构。
*   **简单例子**：一个处理图像的逻辑，其子模块的结构必须与主模块相似，确保逻辑在复杂化时不会产生乱码。

### 8. 概率叠加态执行 (Probabilistic Superposition)
*   **算法简介**：在 WAT 指令中插入占位符，运行时根据环境参数决定执行分支。
*   **简单例子**：`if (current_vram_usage > 80%) { 极简模式 } else { 全量模式 }`。

### 9. 免疫记忆机制 (Immunological Memory)
*   **算法简介**：建立 `Hash(Crash_Pattern)` 数据库。
*   **简单例子**：如果一个个体因为“除零错误”崩溃，其特征哈希会被记录。新一代变异如果产生类似模式，会被拦截并强制重新变异。

### 10. 自修复智能合约 (Self-Amending Contract)
*   **算法简介**：变异后的代码必须通过父代的“功能校验函数”。
*   **简单例子**：父代要求：“我进化的目的是排序”。如果子代变异后不再具备排序功能，即便运行速度再快，也会被判定为“非法变异”。

### 11. 水平基因转移 (Horizontal Gene Transfer)
*   **算法简介**：`DNA_A.splice(DNA_B.best_block)`。
*   **简单例子**：个体 A 擅长数学计算，个体 B 擅长数据读写。它们碰撞时，可以交换一段 WAT 指令块，产生一个全才。

### 12. 影子演化预测 (Shadow Evolution)
*   **算法简介**：在显存 Buffer 中开启一个 10x 速度的模拟，不输出结果。
*   **简单例子**：在个体正式运行前，先在“影子沙箱”里跑 50 轮。如果影子崩溃了，本体立即舍弃该突变方案。

### 13. 计算引力场 (Computational Gravity)
*   **算法简介**：高性能代码（High Score）会获得更多的“资源吸引力（Priority）”。
*   **简单例子**：谁的代码跑得快，系统就给它分配更多的模拟时长，让它产生更多后代。

### 14. 光速限制 (Speed-of-Light Constraint)
*   **算法简介**：限制内存指针移动的最大步长。
*   **简单例子**：代码不能无限制地访问远程内存地址，必须遵循局部性原理，减少缓存失效。

### 15. 液体逻辑引擎 (Liquid Logic)
*   **算法简介**：将代码变异视为高维空间的连续坐标点位移动。
*   **简单例子**：AI 不再随机改字母，而是通过调整“逻辑张量”的权重，平滑地改变指令生成的概率。

### 16. 流形梯度搜索 (Manifold Search)
*   **算法简介**：计算 `d(Score)/d(Instruction_Sequence)` 的梯度。
*   **简单例子**：AI 分析代码：“如果我在这里把 i32 换成 i64，得分会上升还是下降？” 沿着上升方向进行变异。

### 17. 语义共振接口 (Semantic Resonance)
*   **算法简介**：利用向量余弦相似度匹配上帝（用户）的意图。
*   **简单例子**：上帝输入“要快”，系统会将 `Latency` 权重的引力调到最大，吸引所有个体向该向量坍缩。

### 18. 观察者干扰 (Observer Interference)
*   **算法简介**：用户的实时 UI 操作会改变进化算法的随机数种子（Seed）。
*   **简单例子**：当你点击某个进化体时，你会赋予它“上帝加持”，它的存活概率会瞬间提高 10%。

### 19. 凤凰回溯协议 (Phoenix Protocol)
*   **算法简介**：代码崩溃时执行 `Dump_Last_Stable_State`。
*   **简单例子**：死掉的代码不会消失，其最精华的 10 行指令会被提取并随机分配给周围的幸存者。

### 20. 跨维度门户 (The Gateway/Panspermia)
*   **算法简介**：实现 Wasm 的极致序列化与压缩。
*   **简单例子**：一个极其强悍的进化个体可以被压缩成一个 1KB 的“孢子”，通过网络发送到另一台运行 AetherGenesis 的电脑上继续称霸。

---

## 🚀 开发者与上帝指南

### 1. 环境初始化
- **GPU**: NVIDIA RTX 级设备；默认构建只需要驱动/NVML，启用 CUDA 计算需安装 CUDA Toolkit 与 MSVC Build Tools。
- **Ollama**: 运行 `ollama serve` 并拉取 `qwen2.5-coder`。
- **Tauri v2**: 确保 Rust 环境已升级。

### 2. 启动逻辑大爆炸
```bash
# 安装核糖体依赖
npm install

# 开启数字大爆发 (Debug 模式)
npm run tauri dev
```

### 2.1 推荐一键入口

当前 Windows 环境可能存在全局 npm 损坏问题。优先使用根目录脚本：

```powershell
.\run.ps1
```

常用非交互命令：

```powershell
.\run.ps1 -Action Check       # tsc --noEmit + vite build + cargo check
.\run.ps1 -Action Launch      # stop old process + start existing release exe
.\run.ps1 -Action Build       # vite build + tauri release build
.\run.ps1 -Action Run         # stop old process + build release + run exe
.\run.ps1 -Action Dev         # start Vite 1420 + Tauri dev
.\run.ps1 -Action Stop        # stop app/dev-server processes
.\run.ps1 -Action RepairNpm   # diagnose/repair global Node/npm
.\run.ps1 -Action OpenOutput  # open release/bundle folders
```

默认交互菜单不会在执行一次动作后直接退出；每个动作完成后按 Enter 返回菜单。菜单默认项优先快速启动已有 release exe，缺少 exe 时才自动构建。`Stop`/`Launch` 只清理可确认归属当前仓库路径的 release exe、Node 进程和 1420 端口占用者，避免误杀同名或同端口的其他程序。脚本不会把项目构建绑定到全局 npm；它会直接调用本地 `node_modules` 里的 `tsc`、`vite`、`tauri.js`，并优先使用 `VGENE_NODE`、用户目录便携 Node 或 Codex 内置 Node 兜底。
`RepairNpm` 会安装/复用 `%LOCALAPPDATA%\VGene\node\node-v24.16.0-win-x64`，该便携 Node 自带可用 npm；全局 npm 若仍崩溃，按脚本提示用管理员 PowerShell 执行卸载/重装 Node.js LTS。
`package-lock.json` 与 `src-tauri/Cargo.lock` 不再被 `.gitignore` 忽略，桌面应用发布应保留锁文件以稳定复现前端和 Rust 依赖树。

本轮排查结论：

- 不是单纯网络问题：`C:\Program Files\nodejs\node.exe -v` 可输出版本，但 `node -e "console.log(...)"`、`npm-cli.js -v`、`corepack --version` 均以 `-1073741819` 退出。
- 网络只影响便携 Node zip 下载速度；最终已安装并验证便携 Node `v24.16.0` 与 npm `11.13.0`。
- 已清理 Machine PATH 中失效的 `C:\Users\Gene\.trae\binaries\node\versions\24.13.0`。

### 3. 商业化闭环 (PoUW)
当你的“逻辑生物”进化出极高效率的压缩算法时，可以通过内置的 **[Entropy Portal]** 提交至链上/中心化验证节点，换取商业分润。

---

## 当前代码核验状态

> 本节记录当前源代码已确认实现，避免愿景描述与工程现实混淆。

- 桌面壳：Tauri v2，入口在 `src-tauri/src/main.rs`；包版本以 `src-tauri/tauri.conf.json` 与 `src-tauri/Cargo.toml` 的 `0.1.0` 为准，前端 `package.json` 和入口页版本显示同步为 `0.1.0`；窗口标题和安装产品名为 `V-GENE`，Tauri `identifier` 暂保留 `com.digitallife.platform` 以避免影响既有本地数据/安装标识；Tauri 主循环或 Wasmtime 初始化失败会显式记录错误并退出，不再通过 `expect(...)` 触发 panic 文案。
- 前端：React + Vite + Three.js，入口在 `src/main.tsx` 与 `src/App.tsx`。
- 渲染：`src/components/Arena.tsx` 使用 `@react-three/fiber` 的 `instancedMesh` 渲染实体群；当导演镜头指向具体实体时，Arena 会用不参与点击拾取的三轴锁定环高亮目标；Arena 会叠加互助、能量转移、掠食和毒性冲突交互线，其中后端 CPU 碰撞日志产生的 `MutualAid / ResourceTransfer / Predation` 以实线和 `实测` 标记显示，前端实体距离/属性推导的态势预测以虚线和 `预测` 标记补充，避免把推测包装成事实；最近玩家干预会显示“手痕”范围、手痕中心到受影响实体的追踪连线和实体光环；选中实体或本刻焦点存在手痕快照时，Arena 只投影一条命运线，连接干预前/最新快照与实时头部，无 trace 不显示，不伪造轨迹；低能、高毒和顶点实体会以不同颜色/亮度呈现；最新自然世界事件会在 Arena 生成事件信标，带 `entityId` 的事件锁定实体，无实体事件会按事件类型从当前实体快照反推高毒、低能、高协作、高能或高分实体簇并多点标记，未命中玩家干预只保留点击反馈和 HUD 状态，不再抢占 Arena 事件信标；`src/utils/experienceDirector.ts` 会按真实统计、实体、目标、交互线和玩家手痕推导局内压力场，Arena 以低透明环形场和灯光颜色反馈危机、升温、手痕或熄火状态；提供焦点可见的键盘实体选择入口作为 Canvas 点击的等价路径。
- Arena 性能收口：`Arena.tsx` 的干预水波纹使用 Three ref 在帧循环内更新透明度和缩放，不再每帧触发 React state；实体 `instancedMesh` 容量按 64/128/256 分桶增长，降低种群波动导致的 buffer 重建；交互线只索引当前可见边，高密度实体时自动降低星空数量、Bloom 强度和实体自发光，优先保证战场可读性；设置页 `visualFidelity` 现在实际控制 Arena DPR、抗锯齿、星场密度、Bloom 和灯光强度，Low 会关闭 Bloom，Ultra 会开启更高 DPR 与抗锯齿。
- 本刻焦点：`src/utils/activeMoment.ts` 只从选中实体、命中干预手痕、钉选样本、导演提示、体验态势、神谕建议、局内目标、下饭节奏和最新真实世界事件中派生当前最该看的焦点，不生成事件、不写 settings、不调用后端；`App.tsx` 把该焦点同时传给 `Arena.tsx` 与 `NarrativeFeed.tsx`，Arena 用独立高亮环标出焦点实体，并根据真实 `InterventionOutcome.affected` 区分观察、武装点击、命中和未命中反馈；叙事 HUD 在倒计时/倍率/阶段后显示本刻焦点摘要、目标实体、建议干预和证据，命中手痕焦点会标注 `Arena 命运线` 并说明其为已发生生存轨迹。
- 复盘与归档：`src/components/PhoenixReview.tsx` 导出当前复盘 JSON 快照，复盘编号按打开时间生成，空统计时显示空态而不伪造柱状数据，导出失败会在底部操作区反馈；`HallOfFame.tsx` 可导出英雄 DNA/WAT，并对加载失败、导出失败、窄屏标题、导出操作和键盘选择做兜底；`PhylogeneticTree.tsx` 可复制谱系节点 DNA 片段，节点详情在窄屏以底部抽屉呈现，并提供加载失败提示和键盘节点选择入口；`MicroArena.tsx` 按实体内存快照渲染微观网格，缺少快照时显示空态，不再伪造对手。
- 下饭局复盘：`PhoenixReview.tsx` 可接收 `RunSummary`，展示局长、倍率、主题、阶段、关键事件、干预次数、餐前押题结果、神谕纪律、钉选样本档案、本局观测目标、饭局委托单、本局图鉴发现、战报海报、饭局口味标签、传播素材包、传播标题组、社交切片脚本、饭桌弹幕反应包、下局变体牌组、下饭宾果卡、三幕战报短片、下饭播报台、饭点名场面卡包、复开配方、文明遗物库、下饭节奏、精彩瞬间、文明纪元轴、文明主角席、下饭局徽章、再开一局协议、结局原因和可复制战报；`src/utils/runObjectives.ts` 根据实时统计、实体快照、自然世界事件、本局主题和会话进度推导局内/局后观测目标，保全、共生、顶点和挑战目标不会只靠开局快照立即完成；`src/utils/runCommissions.ts` 聚合观测目标、自然世界事件、实体快照、终局统计和本局主题生成饭局委托评分，不写 settings；`src/utils/runThemeProfile.ts` 根据本局主题、真实统计、实体快照和关键事件生成局内/局后主题画像；`src/utils/runDiscoveries.ts` 根据本局真实事件首次触发情况生成文明词条发现记录；`src/utils/runShareCard.ts` 根据终局统计、主题画像、委托评分、图鉴发现、遗物、徽章和战报短片生成局后 SVG 战报海报；`src/utils/mealRunFlavor.ts` 根据本局主题、局长倍率、终局统计、真实事件、玩家干预、图鉴、遗物和名场面生成可复制饭局口味标签；`src/utils/mealRunShareBundle.ts` 聚合战报海报、口味标签、桌边播报、名场面卡包、复开配方、遗物、图鉴和挑战，生成传播素材就绪清单与复制文本，不伪造缺失素材；`src/utils/mealRunCopyHooks.ts` 根据真实结局、终局统计、关键事件、口味标签、素材包、下饭指数、名场面和播报生成群聊/短视频/收藏册三条传播标题；`src/utils/mealRunSocialClips.ts` 根据三幕战报、真实事件、名场面、播报、标题组、素材包和下饭指数生成 15/30/60 秒社交切片分镜脚本；`src/utils/mealRunReactions.ts` 根据真实事件、终局统计、口味标签、传播素材、切片脚本、复开配方、遗物和图鉴生成可复制饭桌弹幕反应，不伪造真实观众评论；`src/utils/mealRunVariants.ts` 根据本局真实结局、终局统计、真实事件、玩家干预、复开配方、弹幕反应和社交切片生成复现、反事实和高压三条可复制/可载入的下局变体，不写 settings；`src/utils/mealRunBingo.ts` 根据真实统计、自然世界事件、玩家干预、观测目标、图鉴、遗物、徽章、口味标签和下局变体生成 3x3 下饭宾果卡，未达成格子只作为下一局目标，不伪造成已发生；`src/utils/mealRunPredictions.ts` 根据局前参数和餐前简报生成餐前押题，并在终局按真实事件、统计、干预和收藏物判定命中，不写 settings、不伪造事件；`src/utils/runTrailer.ts` 根据真实事件、实体快照、节奏、高光、目标、徽章和终局统计生成局后三幕短片；`src/utils/mealRunBroadcast.ts` 根据三幕战报、真实事件、主题画像、下饭指数、饭局委托和收藏物生成可复制桌边播报稿；`src/utils/mealMoments.ts` 根据三幕战报、真实事件、玩家高光、桌边播报和终局统计生成可复制饭点名场面卡包；`src/utils/runReplayRecipe.ts` 根据下一局挑战、主题画像、下饭指数、桌边播报、真实事件和玩家干预计数生成可复制/可载入的复开配方；`src/utils/runRelics.ts` 根据终局统计、实体主角、真实事件、玩家干预、徽章和下饭节奏生成可收藏文明遗物；`src/utils/relicCodex.ts` 按当前复盘和本地收藏战报聚合文明遗物发现进度；`src/utils/mealRhythm.ts` 根据局内阶段、真实事件、世界统计、神谕充能和已标记高光推导观看/标记/干预节奏；`src/utils/runHighlights.ts` 根据玩家手动标记时的导演镜头、最新真实事件和世界指标生成最多 12 条精彩瞬间；`src/utils/specimenDossier.ts` 根据钉选实体的真实世界快照生成样本追踪和终局摘要；`src/utils/eraChronicle.ts` 按真实事件阶段和终局统计压缩本局文明纪元；`src/utils/civilizationCast.ts` 根据终局实体快照与已触发事件推导顶点个体、谱系开创者、掠食压力源、协作看护者和瓶颈幸存者；`src/utils/runAchievements.ts` 只根据真实事件、终局统计、玩家干预和文明主角席推导局后徽章；`src/utils/runChallenges.ts` 根据本局真实结局、事件、干预和复盘内容推导下一局挑战，并可推荐下一局主题；复盘页挑战卡可点击载入推荐局长、倍率与主题到 `MotherMachine`，该预设只保存在本次前端跳转状态中，不写入 settings；`src/utils/runArchive.ts` 负责本地战报册收藏、复制和删除，使用 `localStorage` 独立保存最近 24 条归档，不写入 settings；`src/utils/eventCodex.ts` 提供事件图鉴和文明词条，按本局与本地收藏战报计算发现进度；没有下饭局摘要时仍保留原有世界统计复盘。
- 下饭局下饭指数：`src/utils/mealRunScorecard.ts` 根据自然世界事件、终局统计、玩家高光、下饭节奏、饭局委托、图鉴发现、遗物和徽章生成局后下饭指数；`RunSummary`、分享文本、本地归档和 `PhoenixReview.tsx` 会展示或复制该评分；旧归档缺少该字段时由复盘页按已保存真实数据降级推导，不写 settings、不伪造评分。
- 饭桌传承档案：`src/utils/mealTableLegacy.ts` 聚合当前 `RunSummary` 与本地战报册，推导跨局局数、最高下饭局、收藏物、主题覆盖、传承等级、下一局建议和可点击传承挑战；`PhoenixReview.tsx` 在本地战报册前展示该档案，并复用现有 `NextRunChallenge` 入口把推荐局长、倍率和主题回填到 `MotherMachine`；该逻辑只读 `localStorage` 归档和当前复盘，不新增持久化字段、不写 settings。
- 窗口控制：自绘标题栏通过 `src/utils/windowControls.ts` 统一调用 Tauri window API；窗口级 close request 会复用 `closeAppGracefully` 先停止模拟再销毁窗口，日志写入、停止模拟和窗口销毁均有超时兜底，避免后端 command 卡住时关闭无反馈；标题栏最小化、最大化和关闭按钮有错误捕获与 `aria-live` 状态兜底；窗口模式分辨率会夹取到可用范围，避免损坏的持久化配置把窗口设到异常尺寸；Tauri v2 窗口权限在 `src-tauri/capabilities/default.json` 显式放行。
- 入口页交互：窗口拖拽职责集中在自绘标题栏，`GenesisGate` 主操作区不再整屏声明 `data-tauri-drag-region`，避免初始化、系统配置和退出按钮被拖拽区域干扰；硬件拓扑或实时负载读取失败会显示在 HUD 内，不再长期停留在分析中状态。
- 音频：`src/utils/audio/engine.ts` 统一管理 Web Audio `AudioContext`、BGM 调度、SFX、音量和强联动状态；关闭音频后重新开启会按当前阶段恢复 BGM，延迟切歌有取消 token，避免快速阶段切换排入过期曲目；导演镜头切换、实体目标锁定、危机切镜、目标完成、手痕结算和真实世界大事件会通过同一 SFX 通道触发轻量节拍，其中导演、危机、目标完成和命运结算类提示会进入 stinger 队列，同一 JS tick 只播放最高优先级叙事提示；`App.tsx` 对世界事件、导演 cue、体验 cue、本刻焦点、目标完成和熵警告再做 4.5 秒叙事音频仲裁，短时间内只允许更高优先级提示覆盖，按钮、错误、暂停恢复和干预命中仍保持即时反馈；体验导演输出的压力、交互热度和玩家手痕动量会进入自适应音乐强度、滤波和声部混音，混音参数按量化签名做约 180ms 降采样，避免 100ms 世界轮询造成过密自动化；WebAudio 初始化或恢复失败会记录 `vgene:audio-error` 本地事件并进入界面状态反馈，不再静默失效；`src/utils/audio/presets.ts` 补充 `Causality Engine` 演化曲目；`src/utils/bgm.ts` 与 `src/utils/sfx.ts` 仅保留兼容门面。
- 自适应音乐选曲：`AudioGameState` 会接收本局 `runId/theme/phase`、体验导演 tone、最新真实世界事件类型和事件严重度；`src/utils/audio/presets.ts` 为演化曲目补充主题、tone、压力和事件标签；`audio/engine.ts` 在音乐结构段落边界与循环点用确定性打分和 hash tie-break 选曲，不再用随机数让 BGM 漂移。
- 音画同源事件：局内 BGM 的 `recentEventKind/recentEventSeverity` 使用与 Arena 焦点相同的有效世界事件口径，排除开局/终局和未命中干预事件，避免未命中祝福、投毒等操作让音乐误判局势；自然世界大事件和命中干预仍可触发 SFX 与音乐权重。
- 设置音频试听：`SettingsModal.tsx` 会在弹窗打开时把草稿音频设置以短延迟同步给 `audioEngine`，支持确认音/危机音试听，关闭未保存设置时恢复持久化音频配置；演化 BGM 切换被限制在音乐结构循环点，并在切换前播放过渡提示音，减少突兀跳曲。
- 后端状态：`src-tauri/src/state.rs` 维护实体、环境配置、突变引擎、Wasm 引擎、崩溃注册表、谱系和英灵殿。
- 状态锁处理：Tauri command 与仿真循环通过 `src-tauri/src/state.rs` 的 `lock_app_state` 把锁中毒转换为可记录/可返回的错误，避免后台任务异常后窗口关闭、停止、重置、导出等基础操作继续 panic。
- 系统信息 command：`src-tauri/src/system_info.rs` 负责 `get_sys_info` 与 `get_live_stats`，主入口只注册 handler；Windows 内存频率会从 WMIC 多列输出中提取数字频率并推断 DDR 类型，解析失败时显示 `Unknown`。
- 世界状态 command：`src-tauri/src/world_commands.rs` 负责 `get_world_state`、`get_world_binary`、`get_recent_interactions`、实体详情、谱系、英灵殿和观察者干预；`get_recent_interactions` 返回最近后端计算 tick 中真实发生的互助、能量转移和掠食碰撞日志，供前端 Arena 与 `WorldPulsePanel` 标成实测线；`apply_player_intervention` 处理祝福、投毒、隔离、放逐和钉选观察，并返回真实命中的 `affectedEntityIds`，显式点击实体会优先纳入命中名单，旧 `interfere_at` 仍保留兼容；二进制协议仍保持 raw buffer。
- 下饭局玩法：`src/utils/runSession.ts` 负责局长、倍率、主题、阶段、倒计时和复盘摘要；复盘挑战可作为 `loadedChallenge` 随 `RunSession` 进入下一局，`src/utils/runObjectives.ts` 会把该挑战置顶为局内目标，并按真实统计、事件、有效干预和实体快照推导进度；`src/utils/mealRunMenu.ts` 负责局前“今日下饭菜单”轮转推荐，只输出本局选择和基础生态参数 patch，不生成事件；`src/utils/runStartForecast.ts` 按局前已选局长、倍率、主题和生态参数生成餐前观测简报，只提示风险、观察焦点和建议先手，不写 settings、不伪造历史；`src/utils/mealRunPredictions.ts` 按局前参数生成餐前押题候选，玩家在 `MotherMachine` 选择后只随本局 `RunSession` 带入，不写 settings；`src/utils/mealRunPredictionProgress.ts` 按局内真实统计和事件流实时推导押题进度，不生成事件，且只把祝福、投毒、隔离和放逐计为主动干预，钉选观察只作为观察证据；`src/utils/interventionTrace.ts` 在玩家每次祝福、投毒、隔离、放逐或钉选后记录后端真实命中实体的干预前快照，并选取相似未命中实体作为对照组，随世界轮询在 90 秒窗口内按 5 秒节流追加能量、毒素、分数、代际、位置和消亡采样，生成连续实体命运线、对照组净变化相关性方向和复盘手痕证据；`App.tsx` 将干预拆成“已选类型”和“已武装”两步，默认点击 Arena/实体只观察或检查，只有选择干预按钮、采纳建议或按 1-5 后的下一次点击才会调用真实干预，暂停中数字键不能武装，手动终结复盘需要二次确认，成功或解除后退出武装，防止误点制造假手痕；干预事件会写入 `entityId`、`affected`、`traceId` 和命中实体列表，`runObjectives.ts` 的“留下手痕”只认命中实体的主动玩家事件，且需后续 trace 信号才完成目标；复盘挑战中的黄金时代、共生保护和放逐暴君目标还需要终局窗口、稳定观察窗、双信号或放逐后的正向生态事件，不能被单个事件秒完成；`src/utils/experienceDirector.ts` 聚合真实统计、实体快照、局内目标、交互网络、押题进度、下饭节奏和玩家手痕，输出局内体验态势、建议干预和音画强度，不生成事件、不写 settings；`src/utils/useRunHotkeys.ts` 只在局内非弹窗状态启用 Space 暂停/恢复、数字键武装干预、F 标记高光和 R 复盘，Esc 优先解除武装，避开输入框、按钮、设置和微观战场；`src/utils/playerImpactTrace.ts` 仍作为事件流回响兜底，但会把钉选观察视为观察证据，不再把自然后续事件计为主动救援或改命；`src/utils/civilizationFactions.ts` 按实体真实快照推导看护者、掠食压力源、先锋、幸存者和濒压阵营；`src/utils/civilizationCast.ts` 生成复盘主角席时，协作看护者和掠食压力源不再只是排名标签，分别需要满足协作/利他硬阈值和高适应低利他阈值后才会入席并影响下一局挑战；`src/utils/endgameForecast.ts` 按本局剩余时间、真实统计、实体快照和事件流推导终局走向预报，不把未来伪造成历史；`src/utils/runThemeProfile.ts` 按本局主题、真实事件、实体快照和统计生成主题信号，不伪造历史；`src/utils/runDiscoveries.ts` 按本局真实事件首次触发情况生成图鉴发现提示，不伪造解锁；`src/utils/runShareCard.ts` 生成可预览和导出的局后 SVG 战报海报，不依赖远程服务；`src/utils/worldEvents.ts` 只从真实世界统计、实体快照和玩家干预结果生成历史事件；`src/utils/eventDigest.ts` 按局内倍率聚合近期真实事件，降低 4x/8x 下的事件刷屏；`src/utils/worldEventCausality.ts` 按真实事件顺序推导局内文明关联链，只解释已发生事件；`src/utils/eventInsights.ts` 复用事件图鉴，为最新真实事件生成科学解释、历史类比和玩法建议；`src/utils/worldPulse.ts` 根据实体能量、毒素、协作、掠食比例、顶点适应度和世界统计推导局内文明态势；`src/utils/worldOmens.ts` 根据同一批真实数据推导毒潮、饥荒、掠食、共生窗口等世界预兆；`src/utils/oracleAdvice.ts` 根据世界预兆、神谕充能和当前阶段生成可采纳的干预建议；`src/utils/directorCues.ts` 根据真实事件、实体、统计、阶段和钉选样本推导局内镜头提示；`src/utils/liveProtagonists.ts` 按实体快照、世界统计和最近真实事件推导顶点、看护、幸存与威胁主角候选；`src/utils/liveInteractions.ts` 按实体距离、能量、毒素、适应度、利他和协作推导互助、转移、掠食与毒性冲突交互线，玩家事件只有命中相关实体才增强边信号；`src/utils/interventionBudget.ts` 根据局长、倍率和干预类型计算本局神谕充能、成本、冷却、恢复和终局纪律摘要；`src/utils/runObjectives.ts` 将局内目标收敛为 3 个主目标，固定包含主动手痕目标，祝福/投毒/隔离/放逐命中后只先计为主动手痕候选，钉选只计入观察证据，目标完成需等待后续能量、毒素、分数、代际或消亡信号，并按主题选择保全、顶点、共生或灾变目标；`MotherMachine` 提供“今日下饭菜单”、“餐前观测简报”和“餐前押题”，并保留 `Snack / Dinner / LongTable`、`1x / 2x / 4x / 8x` 和 `随机 / 崛起 / 共生 / 灾变 / 顶点` 本局主题选择，倍率仅临时折算本局后端 `evolutionThrottle`，主题、餐前押题和载入挑战只进入局内会话状态，不写入持久化 settings。
- 下一局挑战规则：`src/utils/runChallenges.ts` 为复盘推荐挑战补充可执行规则，包括允许的干预类型、主动干预上限和本局临时生态参数 patch；`src/utils/challengeRules.ts` 统一负责规则说明、运行时配置 patch 与干预校验；`App.tsx` 只在开局运行态应用挑战 patch，不写入持久化 settings，并在选择干预、Arena 落点和强制突变入口统一拦截违反规则的操作；`InterventionDock` 与 `MotherMachine` 会显示挑战规则和禁用锁定状态。
- 真实事件口径：`src/utils/worldEvents.ts` 提供 `naturalWorldEvents`，统一排除开局/终局、阶段切换、玩家干预和钉选观察；`App.tsx` 在世界轮询中维护最近 30 秒的轻量 `WorldEventEvidenceSample` 窗口，只保存种群、均分、世代、能量、毒素、协作比例、顶点和掠食候选摘要，不保存整批实体；自然事件生成需要先经过观测 warmup，并要求证据窗口出现跨阈值、趋势或持续窗口证据，降低单帧噪声伪造成历史转折的概率；局内目标、餐前押题、押题实时进度、复盘首屏三件大事、下一局挑战、饭局委托评分、下饭指数和下饭宾果只把自然世界变化计入“真实历史密度”。纯观察挑战会过滤主动干预目标；干预未命中只写未命中事件，不生成实体命运线，也不进入 Arena 最新事件信标。
- 干预有效性口径：`src/utils/interventionKinds.ts` 统一维护玩家干预事件类型、空计数、有效事件判断和计数；祝福、投毒、隔离、放逐和钉选只有在后端结果 `affected > 0` 且事件类型与 `intervention.kind` 匹配时才计入押题、挑战、玩家手痕回响、复盘、下饭指数、宾果、传播素材和交互网络增强。未命中点击可以进入事件流反馈，但不能伪造成玩家手痕或实体因果。
- 复盘首屏：`PhoenixReview.tsx` 的 `REPORT` 视图优先展示“本局三件大事 / 玩家关键手痕 / 下一局动机”，再进入较重的图鉴、素材和档案墙；关键手痕只从命中实体的主动干预后续信号中选择，钉选只作为观察证据。
- 局内 HUD：`SimulationHud.tsx` 是运行页唯一 HUD 布局层，统一分配左操作轨、右叙事轨、顶部导演提示、底部控制条和小屏标签抽屉；`ExperienceDirectorPanel.tsx`、`DirectorCuePanel.tsx`、`InterventionDock.tsx`、`NarrativeFeed.tsx`、`WorldPulsePanel.tsx`、`ObservationObjectivesPanel.tsx`、`PinnedSpecimenPanel.tsx` 现在只提供嵌入式卡片内容，不再各自决定 `absolute top/left/right/bottom`；`2xl` 以上使用桌面左右轨，1536px 以下走底部标签抽屉以保留 Arena 主视区；桌面左轨承载干预、文明态势和观测目标，右轨承载体验导演、导演提示、事件流、押题/实体手痕/图鉴/节奏与钉选样本，选中实体时实体检查卡只作为右轨内一张紧凑卡片，不再替换事件流和钉选样本；小于桌面宽度时 HUD 收敛为底部标签抽屉，选中实体会新增“实体”标签，事件、干预和态势标签仍保留，抽屉使用 flex 滚动区和安全区偏移降低 150% 字号下的遮挡风险；`src/index.css` 提供 `hud-panel`、`hud-panel-quiet`、`hud-scroll`、`hud-deco`、`hud-control-bar`、`--hud-bottom-reserve` 和 `--hud-control-bottom`，统一深色实体背景、低干扰装饰、滚动边界和底部控制条层级；`Arena.tsx` 会把实体点击绑定到实体中心，空白点击先按射线近邻实体吸附，拖拽 Orbit 不触发干预；真实干预仍由 `App.tsx` 调用后端 command，前端会话层在 command 成功后扣除神谕充能并生成实体追踪；`App.tsx` 对暂停/恢复和干预落点都有 in-flight 闸口，pending 时禁用底部控制、HUD 操作与快捷键，防止重复点击或 Space 连按造成前后端状态错位；Arena 顶部仅在 `2xl` 宽屏显示常驻图例，解释观察/武装状态、互助/转移/掠食/毒压/手痕颜色和 `1-5 / Space / F / Esc` 操作；局前、局内和复盘本地视觉媒体资产仍保留在 `public/media/`，但局内 HUD 和复盘装饰默认以低透明度渲染，优先保证文字可读。
- HUD 派生性能：`SimulationStage.tsx` 是局内运行态容器，统一推导局内目标、交互网络、导演提示、体验态势、押题进度、本刻焦点、实体命运线和局内音频状态；Arena 仍接收实时实体快照，HUD 使用约 750ms 的轻量快照节流，避免同一轮实体轮询反复重算左右轨叙事面板；`WorldPulsePanel` 与 `ObservationObjectivesPanel` 复用传入结果，`SimulationHud` 使用媒体查询在桌面轨与移动抽屉之间二选一渲染，减少隐藏分支仍然执行派生逻辑的成本。
- 前端拆包性能：`App.tsx` 对 `MotherMachine`、`SimulationStage`、`PhoenixReview` 和 `SettingsModal` 使用阶段级 `React.lazy`，`SimulationStage` 内承载 Arena、HUD、热键、微观战场、底部控制条和局内音乐状态，并在进入局前、仿真、复盘、设置或微观战场前通过 hover/focus/阶段切换预加载；终局 `summarizeRun` 已拆到 `src/utils/runSummary.ts` 并在复盘前动态加载，避免普通局内格式化函数把复盘传播链拉进主包；`PhoenixReview.tsx` 对 `PhylogeneticTree` 与 `HallOfFame` 做 tab 级懒加载，复盘页不再在运行时二次派生整条传播 fallback 链；`GenesisGate.tsx` 会先渲染 CSS 轻量背景，再延迟 lazy 加载 `NeuralBackground`；`NeuralBackground.tsx` 现在使用 2D canvas/CSS 粒子背景，不再引入 `three`、`@react-three/fiber` 或 `@react-three/drei`，入口首屏不再提前创建 WebGL 背景；`Arena.tsx`、`PhylogeneticTree.tsx` 和 `HallOfFame.tsx` 已移除 `@react-three/drei` 运行态依赖，改用轻量自有星场、Three 官方 OrbitControls、原生 line primitive 与 DOM/几何体信息层；`ArenaPostEffects.tsx` 将 Bloom/postprocessing 拆成 lazy chunk，低画质不会加载后处理；`vite.config.ts` 对 React、R3F、Three、postprocessing 和图标库做 manualChunks，`package.json` 已移除 `@react-three/drei`；`MicroArena.tsx` 的 16x16 内存网格由实体真实内存快照直接 `useMemo` 派生，不再通过 effect 派生 state 造成打开浮窗后二次渲染。当前 `npm run build` 的 Vite 构建结果为 `index` 约 139.86KB、`Arena` 约 23.12KB、`ArenaPostEffects` 约 0.34KB、`PhylogeneticTree` 约 7.43KB、`HallOfFame` 约 8.16KB、`vendor-r3f` 约 31.67KB、`vendor-postfx` 约 66.20KB、`vendor-react` 约 275.55KB、`vendor-three` 约 708.97KB；剩余最大 chunk 仍是 Three 基础 vendor，后续应继续做运行期按需加载、实体数据结构和 shader/material 合并治理。
- 叙事 HUD 信息架构：`NarrativeFeed.tsx` 首屏固定展示倒计时/倍率/阶段和最新关键真实事件，押题进度、下饭节奏、玩家手痕、主题信号、图鉴、事件摘要、文明关联链和史官讲解收敛到可展开情报层；当下饭节奏进入标记或干预窗口时，操作追踪层会自动展开；小屏底部抽屉优先显示事件流，再显示体验导演和导演提示，避免最新事件被解释卡淹没。
- 下饭指数媒体资产：`public/media/meal-run-scorecard.svg` 是局后下饭指数卡的本地视觉底板，与战报海报、三幕战报短片、文明遗物库、局后徽章和再开一局协议同属离线复盘媒体资产。
- 饭局口味媒体资产：`public/media/meal-run-flavor-tags.svg` 是局后口味标签的本地视觉底板，不依赖远程素材。
- 传播素材包媒体资产：`public/media/meal-run-share-bundle.svg` 是局后传播素材就绪清单的本地视觉底板，不依赖远程素材。
- 传播标题组媒体资产：`public/media/meal-run-copy-hooks.svg` 是局后群聊、短视频和收藏册标题组的本地视觉底板，不依赖远程素材。
- 社交切片媒体资产：`public/media/meal-run-social-clips.svg` 是局后 15/30/60 秒分镜脚本的本地视觉底板，不依赖远程素材。
- 饭桌弹幕媒体资产：`public/media/meal-run-reactions.svg` 是局后弹幕/群聊反应包的本地视觉底板，不依赖远程素材。
- 下局变体媒体资产：`public/media/meal-run-variant-deck.svg` 是局后复现、反事实和高压三路线牌组的本地视觉底板，不依赖远程素材。
- 下饭宾果媒体资产：`public/media/meal-run-bingo-board.svg` 是局后 3x3 达成盘的本地视觉底板，不依赖远程素材。
- 餐前押题媒体资产：`public/media/meal-run-prediction-slip.svg` 是局前押题和局后判定结果的本地视觉底板，`public/media/meal-run-prediction-progress.svg` 是局内押题进度卡的本地视觉底板，均不依赖远程素材。
- 事件关联媒体资产：`public/media/event-causality-chain.svg` 是局内文明关联链的本地视觉底板，不依赖远程素材。
- 玩家手痕媒体资产：`public/media/player-impact-trace.svg` 是局内手痕回响卡的本地视觉底板，不依赖远程素材。
- 阵营谱媒体资产：`public/media/civilization-faction-ledger.svg` 是局内数字生命阵营谱的本地视觉底板，不依赖远程素材。
- 终局预报媒体资产：`public/media/endgame-forecast-scope.svg` 是局内终局走向预报卡的本地视觉底板，不依赖远程素材。
- 主角雷达媒体资产：`public/media/live-protagonist-radar.svg` 是局内候选主角雷达的本地视觉底板，不依赖远程素材。
- 交互网络媒体资产：`public/media/live-interaction-network.svg` 是局内互助、转移、掠食和毒性冲突线的本地视觉底板，不依赖远程素材。
- 饭桌传承媒体资产：`public/media/meal-table-legacy.svg` 是本地战报册跨局档案的视觉底板，`public/media/legacy-challenge-seal.svg` 是传承挑战按钮区的本地封印素材，均不依赖远程资源。
- 下饭播报媒体资产：`public/media/meal-run-broadcast.svg` 是局后桌边播报稿的本地视觉底板，不依赖远程素材。
- 饭点名场面媒体资产：`public/media/meal-moment-cards.svg` 是局后名场面卡包的本地视觉底板，不依赖远程素材。
- 复开配方媒体资产：`public/media/run-replay-recipe.svg` 是局后复开配方的本地视觉底板，不依赖远程素材。
- 设置 command：`src-tauri/src/settings_commands.rs` 负责 `save_settings`、`load_settings`、`update_settings`、运行模式切换、演化参数同步和 Phase 1 任务切换后的种群清理；后端会对 `max_entities`、`evolution_throttle`、`font_scale`、突变率、熵压、音量、视觉档位、胜利规则、环境类型、任务 id 和 CUDA 后端请求做最后归一化，防止损坏 settings 或异常前端入参把仿真推到不可用区间；未启用 `cuda` feature 时持久化请求 CUDA 会降级为 `Auto`。
- AI/Ollama command：`src-tauri/src/ai_commands.rs` 负责 Ollama 模型列表预检和母亲机床神谕配置生成，前端不直接跨域访问 `/api/tags` 或 `/api/generate`。
- Benchmark command：`src-tauri/src/benchmark_commands.rs` 负责 `get_benchmark_catalog` 与 `score_benchmark_preview`。
- 生命周期 command：`src-tauri/src/lifecycle_commands.rs` 负责 `start_sim`、`stop_sim`、`reset_sim`、`export_logs` 与 `logger`；`export_logs` 会导出运行日志和谱系 JSON，复盘页“重新开启创世”会先清空后端实体、谱系和英灵殿，再回到入口页。
- 演化循环：`src-tauri/src/evolution/simulation_engine.rs` 负责实体 Wasm 执行、捕食者注入、计算后端调度、突变任务和谱系记录；Wasm DNA 评分、突变、splicer、黑名单、谱系和英灵殿仍在 CPU/Wasmtime 安全边界内，生态物理、能量/毒素、空间交互和选择分数由 `src-tauri/src/evolution/compute.rs` 的 CPU 后端或 `src-tauri/src/evolution/gpu/` 的 CUDA 后端执行；突变任务在 spawn 前按当前引擎限流，Local 按 CPU 并行度夹到 2-8，Ollama 限 2 个 in-flight 目标，同一目标未完成前不会重复派发；突变任务只返回结果，实体 DNA、谱系和英灵殿写回集中在当前 epoch 的主循环中应用，避免 stop/reset 后旧任务直接污染共享状态；`mutationRate`、`entropyFactor`、`winningRule`、`envType` 与 `computeBackend` 会影响突变替换比例、熵压力、选择排序、实体运动和计算路径；`start_sim` 会按硬件压力播种不超过 effective cap 的初始种群并启动该 loop。
- CUDA 计算：`src-tauri/Cargo.toml` 提供 `cuda` feature，使用 `cudarc` Driver API；`src-tauri/build.rs` 在启用 feature 时调用 `nvcc` 把 `src-tauri/src/evolution/gpu/kernels/evolution.cu` 编译为 PTX，默认架构 `sm_86`，可用 `VGENE_CUDA_ARCH` 覆盖；当前前端设置支持 `Auto / CPU / CUDA`，`get_compute_status` 返回实际后端、设备、VRAM、温度、负载、kernel 耗时、fallback 原因和自适应倍率；在 CPU/CUDA 交互 parity 完成前，`Auto` 会固定走 CPU 并显示安全门原因，只有显式选择 `CUDA` 才会进入实验后端；显式 CUDA 路径当前不产生 `get_recent_interactions` 实测交互日志，不能把 CUDA 画面中的预测线当作后端事实线。
- CUDA 验收边界：当前代码有 CUDA feature 与 UI 状态入口，并已新增 CPU/CUDA parity fixture 基线和 CPU-only 碰撞/交互 contract；未安装 `nvcc`/MSVC `cl` 的机器只能算 CPU fallback；CUDA 与 CPU 的碰撞/交互公式仍需继续对齐，对齐前 UI 只标记为 `CUDA EXPERIMENTAL`，不能宣称为等价性能后端；在 `cargo check --features cuda`、CPU/CUDA parity 测试和 `nvidia-smi` 运行期 util/VRAM 变化通过前，不能把 CUDA 宣称为已交付性能卖点。
- 运行生命周期：`AppState::run_epoch` 用于区分每次启动/停止/重置和运行中任务切换的仿真代次，快速 stop/start、复盘重置或 Phase 1 任务切换后旧异步 loop 和旧突变任务不会继续写回当前世界。
- 前端世界视图：任务切换或 `LocalMock` 与真实后端世界来源切换后会同步清空当前实体、统计、实体检查器和微观战场，避免显示旧世界残留。
- Wasm 沙箱：`src-tauri/src/evolution/wasm_runtime.rs` 使用 Wasmtime fuel 限制与 StoreLimits；当前内存限制为 `1024 * 1024` 字节。
- 突变来源：`src-tauri/src/evolution/mutation.rs` 支持真实本地后端突变和 Ollama `/api/generate`；前端 `Local` 对应后端 `MutationMode::Local`，`LocalMock` 只作为前端 UI 沙盒，不进入 Rust 仿真；Ollama prompt 会按当前 Phase 1 任务要求导出 `calculate_fitness`、`sort_i32` 或 `rle_encode` 等必要 ABI。
- 运行时文件：`src-tauri/src/runtime_files.rs` 统一管理 app data 路径；`logger`、`save_settings`、`load_settings` 与 `export_logs` 默认读写 `%LOCALAPPDATA%\VGene`，`load_settings` 保留旧相对 `settings.json` 读取兜底；settings 与 run log 写入采用同目录临时文件和原子替换，`run.log` 写入加同进程互斥、按新日志优先保留并限制历史体积，避免长期运行后日志文件无限增长或多线程写入截断；启动脚本的早退提示指向 `%LOCALAPPDATA%\VGene\run.log`。
- 运行命令：`npm run dev` 启动 Vite；`npm run build` 执行 `tsc && vite build`；`npm run tauri dev` 启动 Tauri 开发模式。
- 推荐入口：`.\run.ps1` 提供可返回的交互菜单与 `Launch`、`Check`、`Build`、`Run`、`Dev`、`Stop`、`RepairNpm`、`OpenOutput` 非交互动作。

## Phase 1 MVP 代码入口

- 前端实体与配置类型：`src/types/world.ts`。
- 前端配置字段适配：`src/utils/settings.ts`，用于兼容 camelCase 与 snake_case。
- 前端世界二进制解析：`src/utils/worldBinary.ts`，按 40 字节实体记录 + 12 字节统计尾部解析，并保留旧 36 字节实体记录兼容。
- 后端任务目录：`src-tauri/src/evolution/benchmark.rs`，当前包含 `freeform`、`sort_i32`、`rle`、`sum_i32`、`max_i32`、`find_i32`、`checksum8` 与 `count_byte` 八类任务。
- 后端任务目录 command：`get_benchmark_catalog`，实现于 `src-tauri/src/benchmark_commands.rs`，设置面板会从该 command 加载任务按钮。
- 后端评分预览 command：`score_benchmark_preview`，实现于 `src-tauri/src/benchmark_commands.rs`，可复用 `ScoreBreakdown` 公式。
- 后端真实任务评分：`WasmEngine::score_dna_for_task`、`validate_and_test_for_task` 与 `execute_entity_for_task` 已接入八类任务；`sort_i32` 会写入 wasm memory 并校验排序结果，`rle` 会校验 value/count byte pairs，新增 i32/byte 任务会校验固定公开用例与导出 ABI；任务执行路径会记录代表性 fuel 与前 256 字节 memory snapshot，供实体检查器和微观战场读取。
- Phase 1 基线 DNA：`baseline_dna_for_task` 会为八类任务提供可运行初始 DNA；任务切换后会清空旧种群，运行中切换会立即用新任务基线重播种。
- Ollama 突变提示已加入 Phase 1 有用工作上下文，并会按当前 `taskId` 注入明确 ABI 约束；本地 Local 的 Freeform 突变会生成可编译进 wasm 的 helper 变体，Phase 1 任务突变当前只修改 `calculate_fitness` 可执行常量来触发编译后字节码和实体策略差异，不触碰 `sort_i32/rle/...` 任务导出函数路径，因此不能宣称为算法级 useful-work 优化搜索；仿真写回前必须先通过当前任务的固定 edge corpus 和语义准入门槛：子代必须有可执行字节码变化、`validate_and_test_for_task` 通过，且 `ScoreBreakdown.final_score` 不低于父代容差范围；注释/空白/Ollama 原样返回、helper-only 变体或低分子代不会进入谱系或递增代际；无效突变回退时会再次验证 splicer/fallback 结果，任务模式当前不允许通用 splicer 破坏任务 ABI。

## 程序化音频系统入口

- 音频引擎：`src/utils/audio/engine.ts`，提供 `audioEngine.setSettings(...)`、`setGameState(...)`、`emit(...)`、`getNowPlaying()`。
- 曲库数据：`src/utils/audio/presets.ts`，包含 `STARTUP`、`CONFIG`、`REVIEW` 与多个 `EVOLUTION` 暗黑赛博 8-bit 变体；下饭局补充 `Meal Run Observatory`、`Causality Engine` 等观测/因果曲目，并按主题、阶段、压力、危机、目标完成和手痕后果参与自适应打分。
- 音效配方：`src/utils/audio/sfxPresets.ts`，包含 hover、click、start、pause、resume、entity_select、mutation_surge、五种玩家干预、director_cue、director_target_lock、director_danger_cue、entropy_warning、crisis_surge、objective_complete、fate_resolved、review、success、error；本轮增强了攻击、互助、目标、危机、干预命中和复盘类 stinger 的层次，但仍只走统一 WebAudio 引擎。
- 默认运行模式：`src/utils/settings.ts` 的 `DEFAULT_APP_CONFIG.mode` 为 `Local`，默认走 Rust 后端仿真；`LocalMock` 只作为设置面板里的 `UI 沙盒` 调试选项。
- 设置字段：演化参数、任务、音频和显示字段通过 `src/utils/settings.ts` 归一化；`fontScale/font_scale` 默认 `125%`，只控制前端全局 DOM UI 字号，不进入后端仿真运行态；`SettingsModal` 保存时先应用显示模式并同步前后端配置，全部成功后再写入 `%LOCALAPPDATA%\VGene\settings.json`，持久化失败会尽量回滚显示、前端状态和后端运行态到提交前配置；设置弹窗具备 `dialog` 语义、Escape 关闭和遮罩关闭，未保存修改会先显示内嵌放弃确认，重置也需要确认且只重置当前草稿，保存中会锁定表单并禁止误关闭；`MotherMachine` 启动时先完成后端同步与仿真启动，成功后才持久化最终配置，持久化失败会停止刚启动的后端仿真，离开页面时会清理启动进度定时器。
- 神谕终端：`MotherMachine` 会把当前 `ollamaUrl` 与 `modelName` 传入 `DivineMandate`；`DivineMandate` 通过 Tauri command 调用后端 `reqwest` 访问 Ollama；AI 返回的神谕参数会先经 `normalizeSettings` 归一化再进入预览和应用流程，避免配置面板与实际请求脱节；终端日志有上限并通过 `aria-live` 暴露异步更新。
- 显示与窗口字段：`displayMode`、`resolution` 通过 `src/utils/windowControls.ts` 应用，设置面板提交后同时持久化并同步到当前窗口；`fontScale` 通过 `.vgene-ui-scale` 与 CSS 变量应用到入口、局前、局内、复盘和设置页。
- 桌面壳布局：主运行页预留自绘标题栏高度，并对底部控制栏、移动端实体检查器补安全区偏移；全局禁用页面 overscroll 并设置触控点击延迟兜底；运行页硬件读取和 Canvas 观察者干预失败会进入界面状态反馈；微观战场浮层具备 `dialog` 语义并支持 Escape 关闭。
- WebView 壳元信息：`index.html` 使用 `zh-CN` 语言、本地 `public/vgene-icon.svg` 图标和黑色 `theme-color`；Tauri PNG/ICO 图标资源已按真实 32/128/512 尺寸生成；前端字体使用 Windows/系统字体栈，不依赖 Google Fonts 远程加载。

## Phase 1 未测试记录

- 2026-06-10 本轮按用户要求只写代码与文档，未执行测试。
- 次日优先验证：`npm run build`、`cd src-tauri; cargo check`、`npm run tauri dev`。
- 2026-06-13 已用用户目录便携 Node / Codex 内置 Node 绕过本机 npm 解析异常，执行 `tsc --noEmit`、`vite build`、`cargo check` 通过。
- 2026-06-13 已验证自绘窗口控制与设置链路相关改动可通过 `.\run.ps1 -Action Check` 与 `.\run.ps1 -Action Build`；release exe 可启动到主窗口并可由 `.\run.ps1 -Action Stop` 停止，窗口按钮交互仍需人工手测确认。
- 2026-06-19 已验证 `cargo fmt --check`、`cargo test`、`.\run.ps1 -Action Check -NoPause` 通过；Rust 后端当前有 3 个 Phase 1 useful-work 单测。
- 2026-06-19 基础体验修复轮按用户要求仅做代码和静态文本自查，未执行构建、cargo、Tauri 冒烟或人工 UI 测试；后续统一验证需覆盖启动/关闭、标题栏、设置保存、窗口模式、窄屏布局、暂停/恢复/复盘。
- 2026-06-22 多智能体 5A 收口轮已验证 `git diff --check`、`cargo fmt --check`、TSX button type 扫描、反模式扫描、`npm run build`、`cd src-tauri; cargo check`、`cd src-tauri; cargo test`、`.\run.ps1 -Action Check -NoPause`、`.\run.ps1 -Action Build -NoPause`、`.\run.ps1 -Action Launch -NoPause` 与 `.\run.ps1 -Action Stop -NoPause` 通过；当前 release exe、MSI 和 NSIS 可生成，主窗口标题为 `V-GENE`；CUDA feature 仍因当前机器缺少 `nvcc` 与 MSVC `cl` 不能通过。
- 2026-06-27 Git 同步前收口已再次验证 `git diff --check`、`cargo fmt --check`、TSX button type 扫描、反模式扫描、`npm run build`、`cd src-tauri; cargo check`、`cd src-tauri; cargo test`、`.\run.ps1 -Action Check -NoPause`、`.\run.ps1 -Action Build -NoPause`、`.\run.ps1 -Action Launch -NoPause` 与 `.\run.ps1 -Action Stop -NoPause` 通过；`src-tauri\target\release\digital-life-platform.exe`、MSI 与 NSIS 安装包可生成；CUDA feature 仍因缺少 `nvcc` 与 MSVC `cl` 不能通过，详见 `docs/closeout/2026-06-27-git-sync-closeout.md`。

## 已知文档-代码偏差

- Wasmtime 实例内存限制为 `1 MiB`；WAT 源码和编译后二进制还分别设置了独立的输入大小上限。
- README 上文提到自定义协议 `vgene://`，当前代码实际通过 Tauri `invoke('get_world_binary')` 传输二进制数组。
- Phase 1 已将 `get_world_binary` 调整为返回未压缩 raw binary；zstd 压缩需等协议加入 codec header 后再恢复。
- README 上文提到 OffscreenCanvas，当前 `Arena.tsx` 仍使用普通 `Canvas`。

---

## ⚠️ 架构师提示 (Architect's Note)
在当前版本开发中，请务必保持 **`src-tauri/src/main.rs`** 的轻量化。所有的计算密集型逻辑应下沉至专门的 `evolution_engine` 模块，并利用 `SharedArrayBuffer`（在支持环境下）或 `Custom Protocol` 解决前后端数据交换瓶颈。

**“在 VGene 中，没有任何一行代码是永恒的。唯有进化本身，才是唯一的真理。”**

---

## 安全与许可证

Ollama 响应和 WAT/Wasm 输入设有大小上限，Wasmtime 运行还使用 fuel 与内存限制。安全问题请按 [SECURITY.md](SECURITY.md) 私下报告。

项目代码采用 [MIT License](LICENSE)。依赖、可选 CUDA 工具链与发布包的第三方许可边界见 [THIRD_PARTY_NOTICES.md](THIRD_PARTY_NOTICES.md)。
