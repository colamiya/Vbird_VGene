# CHANGELOG.md

## 2026-06-27 Git 同步前收口验证

- 需求点：先暂停功能开发，进行 git 同步前收口，确认当前工作树至少能正常编译、打包、启动/关闭，并把真实进度与剩余风险保存到文档。
- 路径：`README.md`、`CHANGELOG.md`、`docs/closeout/2026-06-27-git-sync-closeout.md`。
- 验证：`npx skills ls -g` 可用；`git diff --check` 通过，仅有既有 CRLF 提示；`cargo fmt --check` 通过；TSX `<button>` 跨行 type 扫描通过；空 `catch`、`alert/prompt/confirm/fetch`、`transition-all` 反模式扫描通过；`npm run build` 通过；`cd src-tauri; cargo check` 通过；`cd src-tauri; cargo test` 通过，31 个 Rust 单测全绿；`.\run.ps1 -Action Check -NoPause` 通过；`.\run.ps1 -Action Build -NoPause` 通过并生成 release exe、MSI、NSIS；`.\run.ps1 -Action Launch -NoPause` 可启动主窗口 `V-GENE`，随后 `.\run.ps1 -Action Stop -NoPause` 可停止。
- 产物：`src-tauri\target\release\digital-life-platform.exe`、`src-tauri\target\release\bundle\msi\V-GENE_0.1.0_x64_en-US.msi`、`src-tauri\target\release\bundle\nsis\V-GENE_0.1.0_x64-setup.exe`。
- CUDA 状态：`nvidia-smi` 确认 RTX 3080 / driver 596.49 / 10240 MiB VRAM / compute capability 8.6；`where.exe nvcc` 与 `where.exe cl` 均不可用；`cd src-tauri; cargo check --features cuda` 按预期失败，错误明确指向缺少 `nvcc`，因此 CUDA 仍不能宣称为已交付性能后端。
- 剩余非阻断项：Browserslist/caniuse-lite 数据旧；`vendor-three` 仍为约 708.97KB 并触发 Vite chunk 警告；人工 UI 验收仍需覆盖 125%/150% 字号、1280x720/1600x900/1920x1080、实测/预测线、局内 HUD、复盘、设置、暂停/恢复和关闭窗口。

## 2026-06-22 多智能体 5A 实测交互、音频手痕与 Three 依赖收口

- 需求点：继续按 2026 级 5A 垂直切片推进，用多智能体并行审查“玩家能不能看懂真实互助/攻击、音画反馈是否有层次、渲染依赖是否过重”，优先把包装层拉回真实计算证据。
- 路径：`src-tauri/src/evolution/compute.rs`、`src-tauri/src/evolution/simulation_engine.rs`、`src-tauri/src/evolution/gpu/mod.rs`、`src-tauri/src/state.rs`、`src-tauri/src/world_commands.rs`、`src-tauri/src/lifecycle_commands.rs`、`src-tauri/src/settings_commands.rs`、`src-tauri/src/main.rs`、`src/App.tsx`、`src/components/SimulationStage.tsx`、`src/components/Arena.tsx`、`src/components/ArenaPostEffects.tsx`、`src/components/WorldPulsePanel.tsx`、`src/components/PhylogeneticTree.tsx`、`src/components/HallOfFame.tsx`、`src/types/world.ts`、`src/utils/liveInteractions.ts`、`src/utils/interventionTrace.ts`、`src/utils/audio/presets.ts`、`src/utils/audio/sfxPresets.ts`、`vite.config.ts`、`package.json`、`package-lock.json`、`README.md`、`CHANGELOG.md`。
- 关键位置：CPU 生态计算现在在碰撞处理时产出 `InteractionEvent`，记录 tick、互助/转移/掠食类型、源/目标实体、距离、能量/毒素变化、分数和代际；仿真循环把最近 96 条事实日志写入 `AppState.recent_interactions`，`get_recent_interactions` 暴露给前端，start/reset/任务切换会清空旧日志。
- 关键位置：`App.tsx` 每次真实世界轮询同步读取 `get_recent_interactions`；`liveInteractions.ts` 优先把后端 `WorldInteractionEvent` 变成 `OBSERVED` 边，前端启发式边标成 `INFERRED`；`Arena.tsx` 用实线表示后端事实碰撞、虚线表示态势预测，`WorldPulsePanel` 显示实测边数量，降低“看起来发生了但系统没记录”的欺骗感。
- 关键位置：CUDA explicit 路径当前仍返回空 `interactions`，README 明确 CUDA 画面中的交互线不能当作实测后端事实；`Auto` 仍受 parity 安全门保护。
- 关键位置：`interventionTrace.ts` 增加后果摘要与生成差异字段，让玩家手痕从 raw 对照值升级为可读的增益/压力/传播/消亡状态；音频曲库和 SFX 配方补强攻击、互助、目标、危机、干预命中、手痕结算和复盘 stinger，仍统一走 `src/utils/audio/`。
- 关键位置：`PhylogeneticTree.tsx` 与 `HallOfFame.tsx` 移除 `@react-three/drei` 的 `OrbitControls/Stars/Line/Text/Float` 依赖；`Arena.tsx` 继续使用自有星场、官方 OrbitControls 和 lazy `ArenaPostEffects`；`vite.config.ts` 增加 manualChunks，`package.json` 移除 `@react-three/drei`，降低运行态依赖面。
- 验证：`npx skills ls -g` 可用；`git diff --check` 通过，仅有既有 CRLF 提示；`cargo fmt --check` 通过；TSX `<button>` 跨行 type 扫描通过；空 `catch`、`alert/prompt/confirm/fetch`、`transition-all` 反模式扫描通过；`npm run build` 通过；`cd src-tauri; cargo check` 通过；`cd src-tauri; cargo test` 通过，31 个 Rust 单测全绿；`.\run.ps1 -Action Check -NoPause` 通过；`.\run.ps1 -Action Build -NoPause` 通过并生成 release exe、MSI、NSIS；`.\run.ps1 -Action Launch -NoPause` 可启动主窗口 `V-GENE`，随后 `.\run.ps1 -Action Stop -NoPause` 可停止。
- CUDA 状态：`nvidia-smi` 确认 RTX 3080 / driver 596.49 / 10240 MiB VRAM / compute capability 8.6；`where.exe nvcc`、`where.exe cl` 与 `nvcc --version` 均不可用；`cd src-tauri; cargo check --features cuda` 按预期失败，错误明确指向缺少 `nvcc`，因此 CUDA 仍不能宣称为已交付性能后端。
- 剩余风险：Local 非 freeform 任务仍未达到算法级 useful-work 搜索；CUDA Toolkit/MSVC 未安装前不能交付 CUDA feature；Three 基础 vendor 仍是最大前端 chunk；仍需人工验证 125%/150% 字号下实测/预测线图例、音频强度和局内 HUD 不遮挡。

## 2026-06-22 多智能体 5A Auto 安全门与 Arena 运行态拆包

- 需求点：继续按 A/B/对抗三组推进，优先修正“CUDA Auto 改变真实演化语义”和“Arena 运行态重依赖”两个硬问题，同时把 Local useful-work 口径从“真算法进化”收敛为当前真实能力。
- 路径：`src-tauri/src/evolution/simulation_engine.rs`、`src-tauri/src/evolution/compute.rs`、`src/components/Arena.tsx`、`src/components/ArenaPostEffects.tsx`、`README.md`、`CHANGELOG.md`。
- 关键位置：仿真循环新增 `should_attempt_cuda` 安全门，`Auto` 现在固定走 CPU，并在 `ComputeStatus.fallback_reason` 说明“CUDA 交互 parity 未完成”；只有玩家显式选择 `CUDA` 才进入实验 kernel，避免默认设置下 CUDA 改变真实选择分数和谱系走向。
- 关键位置：`compute.rs` 增加 CPU-only 碰撞/交互 contract fixture，覆盖协作互助均能、捕食清能量、非邻近不交互、毒素饱和、selection score 与实体状态一致；这为后续 CUDA kernel 对齐提供权威规则。
- 关键位置：`Arena.tsx` 去掉运行态对 `@react-three/drei` 的 `Stars/PerspectiveCamera/Line/OrbitControls` 依赖，改为轻量自有星场、Three 官方 OrbitControls 和原生 line primitive；`ArenaPostEffects.tsx` 将 Bloom/postprocessing 拆为 lazy chunk，低画质不会加载后处理。
- 关键位置：README 首屏改成“当前本地单机下饭局垂直切片 + 长期愿景”，并明确 Local Phase 1 任务突变当前只改 `calculate_fitness` 常量，不是算法级 useful-work 优化搜索；CUDA `Auto` 安全门和剩余 vendor 瓶颈也同步记录。
- 验证：`cd src-tauri; cargo test evolution::` 通过，19 个演化模块测试全绿；`.\run.ps1 -Action Check -NoPause` 通过，Vite 主 `index` chunk 约 275.60KB、`Arena` chunk 约 41.85KB、`ArenaPostEffects` chunk 约 66.58KB、`NeuralBackground` chunk 约 2.45KB；剩余最大 chunk 为约 822.48KB 的 R3F/Three 基础 vendor。

## 2026-06-22 多智能体 5A 真演化与性能口径收口

- 需求点：继续按 2026 级 5A 垂直切片推进，把“默认 Local 真演化、CUDA 真实性、入口性能、手痕证据口径”从包装拉回可验证系统。
- 路径：`src-tauri/src/evolution/mutation.rs`、`src-tauri/src/evolution/simulation_engine.rs`、`src-tauri/src/evolution/compute.rs`、`src/components/NeuralBackground.tsx`、`src/utils/interventionTrace.ts`、`src/components/NarrativeFeed.tsx`、`src/components/PhoenixReview.tsx`、`README.md`、`CHANGELOG.md`。
- 关键位置：Local Freeform 突变改为可编译 helper 变体；Phase 1 任务突变改为修改 `calculate_fitness` 可执行常量来触发编译后字节码和实体策略变化，同时保持任务导出函数不退化；新增本地突变非退化测试，锁住 `final_score` 不低于父代。
- 关键位置：突变写回的实体代际改为 `parent.generation + 1`，与谱系记录一致，避免高代父本写回低代目标时实体面板、谱系和复盘代际错位。
- 关键位置：`compute.rs` 增加 CPU/CUDA parity fixture 基线与 CPU 确定性测试；当前只锁定无碰撞生态 step/selection 基线，碰撞交互公式仍需后续对齐，CUDA 继续按实验后端处理。
- 关键位置：`NeuralBackground.tsx` 从 Three/R3F 背景改为 2D canvas/CSS 粒子背景，入口首屏不再提前拉起 WebGL/Three；Arena 仍按运行态加载 Three/R3F，下一步重点是 `Stars` vendor chunk 治理。
- 关键位置：玩家手痕对照输出从“因果审计”降级为“相关性方向”，置信上限收紧，局内 HUD、复盘和分享文案不再宣称唯一因果。
- 验证：`cd src-tauri; cargo test evolution::` 通过，16 个演化模块测试全绿；`cd src-tauri; cargo test` 通过，28 个 Rust 单测全绿；`git diff --check` 通过，仅有既有 CRLF 提示；TSX `<button>` 跨行扫描通过；前端空 `catch`、`alert/prompt/confirm/fetch`、`transition-all` 反模式扫描通过；`.\run.ps1 -Action Check -NoPause` 通过，Vite 主 `index` chunk 约 275.63KB、`NeuralBackground` chunk 约 2.45KB、`Stars`/Three vendor chunk 约 824.73KB。
- CUDA 状态：`nvidia-smi` 确认 RTX 3080 / driver 596.49 / 10GB VRAM / compute capability 8.6；`where.exe nvcc` 与 `where.exe cl` 均未找到；`cargo check --features cuda` 因缺少 `nvcc` 按预期失败，因此 CUDA 仍不能宣称已交付性能后端。

## 2026-06-21 多智能体 5A Arena 输入与复盘口径收口

- 需求点：继续按 5A 游戏创作团队方式推进，把“能看懂、点得准、不会误触、复盘不吹过头”作为本轮核心。
- 路径：`src/App.tsx`、`src/components/Arena.tsx`、`src/utils/runObjectives.ts`、`src/utils/runCommissions.ts`、`src/utils/mealRunScorecard.ts`、`src/utils/mealRunBingo.ts`、`src/utils/useRunHotkeys.ts`、`README.md`、`CHANGELOG.md`。
- 关键位置：`Arena.tsx` 接入设置页 `visualFidelity`，实际控制 DPR、抗锯齿、星场密度、Bloom 和灯光强度；Low 关闭 Bloom，Ultra 提升 DPR 并启用抗锯齿，设置不再只是 UI 文案。
- 关键位置：Arena 空白点击从固定 `z=-40` 背板改为中心平面投影 + 射线近邻实体吸附，实体点击直接使用实体中心；拖拽 Orbit 时不触发干预，减少“视觉点中了但后端 miss”的错觉。
- 关键位置：`App.tsx` 增加暂停/恢复 pending 闸口和干预落点 in-flight 闸口；pending 时禁用底部控制、HUD 操作和快捷键，真实干预点击后先解除武装，避免双击/连按重复消耗或前后端运行态错位。
- 关键位置：未命中玩家干预不再进入 Arena 最新事件信标，只保留点击反馈和 HUD 状态；`useRunHotkeys` 过滤 Ctrl/Meta/Alt 组合键，避免误吞系统快捷键。
- 关键位置：`runObjectives.ts` 将保全、顶点、共生和载入挑战的完成条件从“开局快照达标即完成”改为真实事件、世界建立窗口或终局窗口结算；目标仍显示进度，但不会一开局就播放完成反馈。
- 关键位置：`runCommissions.ts`、`mealRunScorecard.ts`、`mealRunBingo.ts` 统一使用 `naturalWorldEvents`，饭局委托、下饭指数和宾果的历史密度不再把阶段切换、玩家操作或终局包装成自然演化事件。
- 验证：`git diff --check` 通过，仅有既有 CRLF 提示；TSX `<button>` 跨行扫描无缺 `type=`；反模式扫描空 `catch`、`alert/prompt/confirm/fetch`、`transition-all` 无命中；`cargo test` 通过，13 个 Rust 单测全绿；`.\run.ps1 -Action Check -NoPause` 通过，覆盖 `tsc --noEmit`、Vite build 与 `cargo check`；`.\run.ps1 -Action Build -NoPause` 通过，生成 release exe、MSI 和 NSIS；剩余仅既有 Browserslist 数据旧和 Vite chunk 体积警告。

## 2026-06-21 多智能体 5A 操作守卫与目标后果收口

- 需求点：继续用多智能体游戏团队视角推进 5A 可玩核心，优先修复“点了但没有明确后果 / 暂停仍可操作 / 文案强于证据 / HUD 重复计算”的问题。
- 路径：`src/App.tsx`、`src/components/SimulationHud.tsx`、`src/components/WorldPulsePanel.tsx`、`src/components/NarrativeFeed.tsx`、`src/components/MealRhythmCard.tsx`、`src/components/ObservationObjectivesPanel.tsx`、`src/utils/runObjectives.ts`、`src/utils/interventionTrace.ts`、`src/utils/activeMoment.ts`、`src/utils/playerImpactTrace.ts`、`src/utils/runSession.ts`、`src/utils/useRunHotkeys.ts`、`src-tauri/src/world_commands.rs`、`README.md`、`CHANGELOG.md`。
- 关键位置：主动手痕目标从“命中就算改写命运”改为命中后还要等待 trace 后续信号；祝福、投毒、隔离、放逐才参与主动手痕，钉选观察只保留为观察证据，复盘分享和本刻焦点不再把 PIN 包装成改命。
- 关键位置：暂停或未开局时禁止武装干预、采纳下饭节奏建议和实体突变神谕；后端 `apply_player_intervention` 也检查 `is_running`，避免前端漏守卫时仍能改写世界。
- 关键位置：Arena 干预未命中不再消耗神谕预算，事件记录明确为未命中；真实命中后才扣预算、写 trace 和进入目标后续判定，减少玩家“点空也被惩罚”的挫败感。
- 关键位置：`NarrativeFeed` 将“因果/救回/受压/置信度”等强词收束为“关联/增益/压力/采样”，`README.md` 同步把文明因果链改成文明关联链；`WorldPulsePanel` 复用 `App.tsx` 已派生的 `liveInteractionNetwork`，避免同屏重复 O(n²) 推导。
- 关键位置：`useRunHotkeys` 让 `Esc` 在按钮聚焦时也优先解除武装；实体检查器的突变按钮跟随暂停禁用，错误或后端拒绝时自动退出武装态。
- 验证：`git diff --check` 通过，仅有既有 CRLF 提示；TSX `<button>` 跨行扫描无缺 `type=`；反模式扫描空 `catch`、`alert/prompt/confirm/fetch`、`transition-all` 无命中；旧强词扫描无命中；`cargo test` 通过，13 个 Rust 单测全绿；`.\run.ps1 -Action Check -NoPause` 通过，覆盖 `tsc --noEmit`、Vite build 与 `cargo check`；`.\run.ps1 -Action Build -NoPause` 通过，生成 release exe、MSI 和 NSIS；剩余仅既有 Browserslist 数据旧和 Vite chunk 体积警告。

## 2026-06-21 多智能体 5A 手痕因果降噪与后端单测收口

- 需求点：继续按 5A 可玩核心推进，把玩家干预从“包装成改命”收束为可追踪的真实命中与后续信号，避免复盘文案超过系统证据。
- 路径：`src-tauri/src/world_commands.rs`、`src/components/PhoenixReview.tsx`、`src/utils/interventionTrace.ts`、`src/utils/experienceDirector.ts`、`README.md`、`CHANGELOG.md`。
- 关键位置：`world_commands.rs` 新增 6 个单元测试，覆盖真实命中 ID、显式实体优先、距离排序、无命中不改数值、隔离/放逐只修改返回实体、钉选观察不改后端数值；锁住 `affectedEntityIds` 不能再退回前端半径猜测。
- 关键位置：`PhoenixReview.tsx` 复盘首屏改为“关键手痕”，只从主动干预且有后续信号的 trace 中选择；玩家证据区改为 `Player Trace / 玩家手痕证据`，排除钉选观察卡片，并明确这些是干预后状态追踪，不单独证明唯一因果。
- 关键位置：`interventionTrace.ts` 和 `experienceDirector.ts` 将“救回 / 受压 / 改命成立 / 关键一手”等强表述收束为“增益信号 / 压力信号 / 手痕成立 / 关键手痕”；README 同步把 Arena “因果连线”改成追踪连线。
- 验证：`git diff --check` 通过，仅有既有 CRLF 提示；TSX `<button>` 跨行扫描无缺 `type=`；反模式扫描空 `catch`、`alert/prompt/confirm/fetch`、`transition-all` 无命中；`cargo test world_commands` 通过，6 个 world command 单测全绿；`cargo test` 通过，13 个 Rust 单测全绿；`.\run.ps1 -Action Check -NoPause` 通过，覆盖 `tsc --noEmit`、Vite build 与 `cargo check`；剩余仅既有 Browserslist 数据旧和 Vite chunk 体积警告。

## 2026-06-21 多智能体 5A 手痕真命中与连续轨迹收口

- 需求点：继续推进 5A 可玩核心，把“我改变了谁”从前端半径反推升级为后端真命中 ID + 连续实体轨迹，减少复盘包装大于系统证据的问题。
- 路径：`src-tauri/src/world_commands.rs`、`src/types/world.ts`、`src/utils/interventionTrace.ts`、`src/components/Arena.tsx`、`src/components/SimulationHud.tsx`、`README.md`、`CHANGELOG.md`。
- 关键位置：`apply_player_intervention` 的 `InterventionOutcome` 现在按 camelCase 返回 `affectedEntityIds`；后端先按显式 `entity_id` 优先、再按距离排序确定最多 24 个真实命中实体，前端 trace 优先消费该 ID 列表，不再只能按半径反推。
- 关键位置：`InterventionTrace` 新增 `history`，`updateInterventionTraces` 在 90 秒窗口内按 5 秒节流追加真实世界轮询快照，单实体最多保留 18 个采样；`deriveEntityFateLine` 优先使用 history，并用 latest 补实时头部，旧归档缺少 history 时仍降级使用 before/latest。
- 关键位置：`Arena.tsx` 继续只渲染当前选中实体或本刻焦点的一条命运线；连续轨迹使用单条 polyline，历史点静态，只有头部 marker 动画，高实体密度下降低点数并关闭虚线噪声。
- 关键位置：`SimulationHud.tsx` 将实体详情内的命运线文案收束为“最近手痕轨迹”，显示可读证据摘要，不再把 raw key/value 当作玩家可读文案。
- 验证：`git diff --check` 通过；TSX `<button>` 跨行扫描无缺 `type=`；反模式扫描空 `catch`、`alert/prompt/confirm/fetch`、`transition-all` 无命中；`.\run.ps1 -Action Check -NoPause` 通过，覆盖 `tsc --noEmit`、Vite build 与 `cargo check`；剩余仅既有 Browserslist 数据旧和 Vite chunk 体积警告。

## 2026-06-21 多智能体 5A Arena 命运线可视化收口

- 需求点：继续按 5A 游戏优化推进场内可读性，把“玩家这一手后来改变了谁”从右侧文本推进到 Arena 可观看反馈，但不新增伪事件、不新增第二套音频或后端状态。
- 路径：`src/App.tsx`、`src/components/Arena.tsx`、`src/components/NarrativeFeed.tsx`、`README.md`、`CHANGELOG.md`。
- 关键位置：`App.tsx` 为 Arena 提供单条优先级命运线，选中实体优先，否则使用本刻焦点命中的真实手痕实体；没有 `InterventionTrace` 快照时不显示线段，避免把预测包装成历史。
- 关键位置：`Arena.tsx` 使用真实手痕快照和当前实体位置绘制单条命运线，线段本身不做父级缩放，只让头部节点局部脉冲，避免绝对坐标绕世界原点偏移；命运线与互助/掠食/毒压/手痕图例共存。
- 关键位置：`NarrativeFeed.tsx` 在本刻焦点卡标注 `Arena 命运线`，并明确“不是预测，是最近手痕后的生存轨迹”；音频继续复用既有 `fate_resolved` 与干预音效去重，不增加新 AudioContext 或组件内音频逻辑。
- 验证：`git diff --check` 通过；TSX `<button>` 跨行扫描无缺 `type=`；反模式扫描空 `catch`、`alert/prompt/confirm/fetch`、`transition-all` 无命中；`.\run.ps1 -Action Check -NoPause` 通过，覆盖 `tsc --noEmit`、Vite build 与 `cargo check`；剩余仅既有 Browserslist 数据旧和 Vite chunk 体积警告。

## 2026-06-21 多智能体 5A 本刻焦点与场内反馈收口

- 需求点：继续按 5A 游戏优化推进音乐、美术、操作、逻辑、代码实现和交互体验，优先把玩家“看什么、点中没有、我造成了什么”从分散卡片收束为统一反馈。
- 路径：`src/utils/activeMoment.ts`、`src/App.tsx`、`src/components/Arena.tsx`、`src/components/SimulationHud.tsx`、`src/components/NarrativeFeed.tsx`、`README.md`、`CHANGELOG.md`。
- 关键位置：新增 `deriveActiveMoment` 纯派生仲裁器，只从选中实体、干预手痕、钉选样本、导演提示、体验态势、神谕建议、局内目标、下饭节奏和真实世界事件中选择当前焦点；不生成 `WorldEvent`、不写 settings、不接后端 invoke，避免把 UI 焦点误做成新叙事源。
- 关键位置：`App.tsx` 将本刻焦点同时传给 Arena 和 HUD，并对本刻焦点音效做 run/session 级去重；与既有导演/体验音效去重，避免同一手痕结算重复播放。
- 关键位置：`Arena.tsx` 根据真实 `InterventionOutcome.affected` 显示干预成功或未命中的点击反馈，观察点击、武装点击、成功命中和未命中使用不同场内短反馈；本刻焦点实体用独立高亮环，导演目标只在不重叠时补充显示。
- 关键位置：`NarrativeFeed.tsx` 在倒计时/倍率/阶段后展示“本刻焦点”摘要卡，包含目标实体、建议干预和证据，减少右轨首屏被解释卡淹没的问题。
- 验证：`git diff --check` 通过；TSX `<button>` 跨行扫描无缺 `type=`；反模式扫描空 `catch`、`alert/prompt/confirm/fetch`、`transition-all` 无命中；`.\run.ps1 -Action Check -NoPause` 通过，覆盖 `tsc --noEmit`、Vite build 与 `cargo check`；剩余仅既有 Browserslist 数据旧和 Vite chunk 体积警告。

## 2026-06-21 多智能体 5A 后端真演化与突变稳定性收口

- 需求点：继续按 5A 游戏优化推进核心玩法，不再只堆 UI/复盘包装，优先让无 Ollama 的 Local 后端也产生真实可验证演化，并限制长局突变任务堆积。
- 路径：`src-tauri/src/evolution/mutation.rs`、`src-tauri/src/evolution/simulation_engine.rs`、`README.md`、`CHANGELOG.md`。
- 关键位置：`MutationEngine::mutate_local` 在非 Freeform Phase 1 任务下不再只追加 WAT 注释，而是在模块内插入会编译进 wasm 字节码的本地 helper 变体；新增测试覆盖所有非 Freeform 任务，证明本地突变仍通过 `validate_and_test_for_task` 且编译后 wasm 字节码不同。
- 关键位置：`simulation_engine` 新增编译后 DNA 差异门禁，注释/空白/Ollama 原样返回/fallback parent 不会写入谱系或递增代际；突变任务改为只通过 channel 返回结果，实体、谱系和英灵殿写回集中到当前 epoch 主循环，降低 stop/reset 与旧任务交错污染共享状态的风险。
- 关键位置：突变 spawn 前加入 in-flight 目标限流，Local 按 CPU 并行度夹到 2-8，Ollama 固定 2，同一 target 未完成前不会重复派发，避免 100ms tick 长局堆积大量外部突变请求。
- 验证：`cargo test` 通过，7 个 Rust 测试全绿；待执行 `.\run.ps1 -Action Check -NoPause` 和静态扫描。

## 2026-06-21 多智能体 5A 可信玩法与音画操作二次收口

- 需求点：继续按 5A 游戏优化推进音乐、美术、操作、逻辑、代码实现和交互体验，优先修复“看起来发生了但系统没真实支撑”的可信度问题。
- 路径：`src/App.tsx`、`src/components/Arena.tsx`、`src/components/SettingsModal.tsx`、`src/components/SimulationHud.tsx`、`src/components/PhoenixReview.tsx`、`src/utils/worldEvents.ts`、`src/utils/runObjectives.ts`、`src/utils/runChallenges.ts`、`src/utils/mealRunPredictions.ts`、`src/utils/mealRunPredictionProgress.ts`、`src/utils/interventionTrace.ts`、`src/utils/audio/engine.ts`、`README.md`、`CHANGELOG.md`。
- 关键位置：新增 `naturalWorldEvents` 统一排除开局/终局、阶段切换、玩家干预和钉选观察；目标、押题、押题进度、复盘首屏和下一局挑战只把自然世界变化计为真实历史密度；纯观察挑战不再混入“改写命运”主动干预目标；干预未命中只写未命中事件，不再生成实体命运线或假手痕。
- 关键位置：复盘 `REPORT` 首屏改为“本局三件大事 / 玩家关键一手 / 下一局动机”；局内桌面 HUD 与 Arena 图例提升到 `2xl` 才常驻，1536px 以下优先使用底部抽屉保留主战场视野。
- 关键位置：设置页音频支持草稿实时试听和确认音/危机音测试，关闭未保存设置时恢复持久化音频配置；演化 BGM 切换收束到音乐结构循环点并加入过渡提示，底部核心按钮补 hover 声反馈。
- 验证：待执行本轮静态、构建与后端验证。

## 2026-06-21 5A 垂直切片优化轮

- 需求点：继续按“5A 游戏优化”方向收口音乐、美术、操作、逻辑、代码实现和交互体验，优先修复会误导玩家或降低可玩闭环可信度的问题。
- 路径：`src/App.tsx`、`src/components/SimulationHud.tsx`、`src/components/PhoenixReview.tsx`、`src/index.css`、`src/utils/interventionKinds.ts`、`src/utils/interventionTrace.ts`、`src/utils/playerImpactTrace.ts`、`src/utils/mealRunPredictionProgress.ts`、`src/utils/mealRunPredictions.ts`、`src/utils/runRelics.ts`、`src/utils/runObjectives.ts`、`src/utils/runChallenges.ts`、`src/utils/runReplayRecipe.ts`、`src/utils/runAchievements.ts`、`src/utils/mealRunFlavor.ts`、`src/utils/mealRunBingo.ts`、`src/utils/mealRunVariants.ts`、`src/utils/mealRunPredictions.ts`、`src/utils/audio/engine.ts`、`src/utils/audio/types.ts`、`src-tauri/src/runtime_files.rs`、`src-tauri/Cargo.toml`、`scripts/vgene.ps1`、`README.md`、`CHANGELOG.md`。
- 关键位置：新增主动干预工具函数，统一把 `BLESS / POISON / QUARANTINE / EXILE` 与 `PIN_OBSERVE` 分离；押题进度、遗物、挑战、复开配方、徽章、口味、宾果和变体等系统只把主动干预计入“改写命运”，钉选观察只作为观察证据；实体命运线合并干预前与最新快照，纯钉选不再被标题或回响误判为玩家救援；目标首次完成会触发局内状态和音效反馈，但不伪造世界事件。
- 关键位置：HUD 底部安全距离改为 `--hud-bottom-reserve` / `--hud-control-bottom`，左右轨和小屏抽屉共同避让底部控制条；复盘页降低装饰图混合强度并压缩底部操作栏厚度，减少 125%/150% 字号下的视觉噪声和遮挡风险。
- 关键位置：WebAudio 初始化/恢复失败时记录 `vgene:audio-error` 并进入 App 状态提示；演化 BGM 在音乐段落边界按当前主题、阶段、压力和最新真实事件重新评分切换，减少一整首循环后才响应局势变化的问题。
- 关键位置：`runtime_files.rs` 将 settings 与 run log 写入收敛为同目录临时文件 + 原子替换，run log 写入加同进程互斥；`scripts/vgene.ps1` 的 release 早退提示指向真实 `%LOCALAPPDATA%\VGene\run.log`。
- 验证：待执行本轮静态、构建与后端验证。

## 2026-06-21 15:13

- 需求点：实现 NVIDIA/CUDA 专用演化计算路线与硬件自适应，让 GPU 承担局内生态数值批处理，同时保留 Wasm 安全沙箱在 CPU。
- 路径：`src-tauri/src/evolution/compute.rs`、`src-tauri/src/evolution/gpu/`、`src-tauri/src/evolution/simulation_engine.rs`、`src-tauri/src/compute_commands.rs`、`src-tauri/src/settings_commands.rs`、`src-tauri/Cargo.toml`、`src-tauri/build.rs`、`src/types/world.ts`、`src/utils/settings.ts`、`src/App.tsx`、`src/components/SettingsModal.tsx`、`src/components/GenesisGate.tsx`、`src/components/SimulationHud.tsx`、`src/components/WorldPulsePanel.tsx`、`README.md`、`AGENTS.md`、`CHANGELOG.md`。
- 关键位置：新增 `computeBackend: Auto | CPU | CUDA` 与 `get_compute_status`；新增 CPU/CUDA 计算后端抽象，默认 CPU/Rayon 路径保留，CUDA feature 下通过 `cudarc` Driver API 调度 `ecology_step_kernel`、`interaction_kernel`、`selection_score_kernel` 和 `world_stats_kernel`；仿真循环先执行 Wasm DNA 评分，再把能量、毒素、运动、交互和选择分数交给计算后端；硬件压力会生成 `adaptiveScale` 和 `effectiveEntityCap`，只作为后端安全倍率，不覆盖玩家下饭局倍率。
- 验证：`.\run.ps1 -Action Check` 通过；`cargo test` 通过，3 个 Wasm 任务测试全绿；`git diff --check` 通过；TSX `<button>` 跨行扫描无缺 `type=`；反模式扫描仅命中 Rust 函数名 `task_abi_prompt` 的假阳性；`.\run.ps1 -Action Build` 通过并生成 release exe、MSI、NSIS；`.\run.ps1 -Action Launch` 通过，最新 release 窗口标题 `V-GENE`，PID `2936`；`cargo check --features cuda` 在当前机器按预期失败，错误为缺少 `nvcc`，说明 CUDA Toolkit/MSVC 前置条件尚未安装。
- 剩余非阻断项：未安装 CUDA Toolkit 与 MSVC Build Tools，因此尚未执行 CUDA feature 编译通过、CUDA parity 测试或 `nvidia-smi` 运行期 GPU util 验收；历史非阻断项仍包括 Browserslist 数据旧、Vite chunk 体积大和 Rust `MutationEngine::mutate` 未用告警。

## 2026-06-21 11:58

- 需求点：按“观测台布局”收口局内游戏界面，解决 HUD 窗口杂乱、背景穿透、面板抢位和 125%/150% 字号下重叠问题。
- 路径：`src/App.tsx`、`src/components/SimulationHud.tsx`、`src/components/DirectorCuePanel.tsx`、`src/components/InterventionDock.tsx`、`src/components/NarrativeFeed.tsx`、`src/components/WorldPulsePanel.tsx`、`src/components/ObservationObjectivesPanel.tsx`、`src/components/PinnedSpecimenPanel.tsx`、`src/components/MealRhythmCard.tsx`、`src/index.css`、`README.md`、`CHANGELOG.md`。
- 关键位置：新增 `SimulationHud` 作为运行页唯一 HUD 布局层，桌面拆成左操作轨、右叙事轨、顶部导演提示和底部控制条，小屏收敛为底部标签抽屉；旧全域星图常驻侧栏移出运行主界面，选中实体改为右轨内检查卡；各 HUD 子组件降级为嵌入式卡片，不再自己写 `absolute top/left/right/bottom`；新增 `hud-panel`、`hud-panel-quiet`、`hud-scroll`、`hud-deco`、`hud-control-bar` 统一背景、滚动、装饰透明度和控制条层级。
- 验证：`.\run.ps1 -Action Check` 已通过；`git diff --check` 通过；TSX `<button>` 跨行扫描无缺 `type=`；反模式扫描仅命中 Rust 函数名 `task_abi_prompt` 的假阳性；`.\run.ps1 -Action Build` 通过并生成 release exe、MSI、NSIS。
- 剩余非阻断项：Browserslist 数据旧、Vite chunk 体积大、Rust `MutationEngine::mutate` 历史未用方法告警；仍需人工在 `1280x720 / 1600x900 / 1920x1080`、`125% / 150%` 字号下做视觉验收，确认选中实体、微观战场、设置和复盘不会遮挡关键操作。

## 2026-06-21 11:23

- 需求点：实现全局 UI 字号比例与游戏界面布局收口，默认字号从硬编码小字体验提升到 `125%`，并在设置页支持百分比调节。
- 路径：`src/types/world.ts`、`src/utils/settings.ts`、`src-tauri/src/settings_commands.rs`、`src/App.tsx`、`src/index.css`、`src/components/SettingsModal.tsx`、`src/components/InterventionDock.tsx`、`src/components/NarrativeFeed.tsx`、`src/components/ObservationObjectivesPanel.tsx`、`src/components/WorldPulsePanel.tsx`、`src/components/PinnedSpecimenPanel.tsx`、`README.md`、`CHANGELOG.md`。
- 关键位置：新增 `fontScale/font_scale` 持久化配置，默认 `1.25`，范围 `0.8-1.5`；App 根层通过 `.vgene-ui-scale` 和 `--vgene-font-scale` 缩放常见 DOM 字号；设置页新增“界面字号”滑杆与 `100%/125%/150%` 快捷按钮，并支持弹窗内实时预览；局内干预栏、事件流、观测目标、世界态势和钉选样本面板扩大宽度并补滚动边界。
- 验证：`git diff --check` 通过；TSX `<button>` 跨行扫描无缺 `type=`；反模式扫描仅命中 Rust 函数名 `task_abi_prompt` 的假阳性；`.\run.ps1 -Action Check` 通过；`.\run.ps1 -Action Build` 通过并生成 release exe、MSI、NSIS；`.\run.ps1 -Action Launch` 通过，最新 release 窗口标题 `V-GENE`，PID `9028`。
- 剩余非阻断项：Browserslist 数据旧、Vite chunk 体积大、Rust `MutationEngine::mutate` 历史未用方法告警；未做人工点击切换 `80%/100%/125%/150%` 的视觉验收。

## 2026-06-21 00:16

- 需求点：进入收口测试，修复下饭局新增模块的构建阻断，并验证脚本级构建与启动链路。
- 路径：`src/components/InterventionDock.tsx`、`src/components/WorldPulsePanel.tsx`、`src/components/PhoenixReview.tsx`、`src/utils/eraChronicle.ts`、`src/utils/mealRunCopyHooks.ts`、`src/utils/mealRunReactions.ts`、`src/utils/mealRunShareBundle.ts`、`src/utils/runChallenges.ts`、`src/utils/runReplayRecipe.ts`、`src-tauri/src/evolution/simulation_engine.rs`、`CHANGELOG.md`。
- 关键位置：替换不存在的 lucide 图标导入；按真实 `WorldEvent` / `RunDiscoveryCue` 类型生成证据和语气；`deriveEraChronicle` 显式返回 `RunEra[]`；修复仿真 loop 运行态判断中 `MutexGuard` 未解引用导致的 `cargo check` 失败；复盘 ID 时间戳改为字符串清洗，消除 Vite CSS 解析告警。
- 验证：`.\run.ps1 -Action Check` 通过；`.\run.ps1 -Action Build` 通过并生成 release exe、MSI、NSIS；`.\run.ps1 -Action Run` 通过，检测到主窗口 `V-GENE`，PID `20536`。
- 剩余非阻断项：Browserslist 数据旧、Vite chunk 体积大、Rust `MutationEngine::mutate` 历史未用方法告警；不影响当前构建和启动。

## 2026-06-19 15:08

- 需求点：继续排查基础软件开启/关闭/复盘闭环，修复复盘后重新开始只清前端、不清后端世界状态的问题。
- 路径：`src-tauri/src/lifecycle_commands.rs`、`src-tauri/src/main.rs`、`src/App.tsx`、`src/components/PhoenixReview.tsx`、`src/components/MotherMachine.tsx`、`README.md`、`AGENTS.md`、`CHANGELOG.md`。
- 关键位置：新增 `reset_sim` Tauri command，停止运行并递增 `run_epoch`，清空实体、谱系和英灵殿；复盘页“重新开启创世”改为等待后端重置成功后再回入口，失败时留在复盘页并展示错误状态；母亲机床全屏配置页补自绘标题栏顶部留白，避免返回按钮和顶部内容被标题栏压住。
- 验证：按用户要求未执行构建、cargo check、cargo test、Tauri 冒烟或人工 UI 测试；待功能完善后统一验证。
- 触发来源：持续目标“修复他们，然后继续完成这个软件的目标”。

## 2026-06-19 15:21

- 需求点：继续修复基础软件入口与复盘子视图的可操作性问题。
- 路径：`src/components/GenesisGate.tsx`、`src/components/HallOfFame.tsx`、`CHANGELOG.md`。
- 关键位置：入口页从固定裁剪改为可滚动全屏，低高度窗口不再直接裁掉初始化/配置/退出操作；硬件 HUD 对缺失 GPU 实时数据和内存总量做数值兜底，避免显示 `NaNMB` 或异常百分比；英灵殿选中 `id=0` 的英雄时也会显示 DNA/WAT 导出按钮。
- 验证：按用户要求未执行构建、cargo check、cargo test、Tauri 冒烟或人工 UI 测试；仅做静态源码检查。
- 触发来源：持续目标“修复他们，然后继续完成这个软件的目标”。

## 2026-06-19 15:34

- 需求点：继续修复基础设置事务和微观战场窗口布局。
- 路径：`src/components/SettingsModal.tsx`、`src/components/MicroArena.tsx`、`README.md`、`CHANGELOG.md`。
- 关键位置：设置保存顺序调整为 `applyDisplaySettings -> onSave(update_settings) -> save_settings`，避免窗口或后端同步失败时先把未生效配置写入持久化文件；微观战场改为 `flex-col` 弹窗，内容区使用 `flex-1 min-h-0`，展开态避开自绘标题栏，避免标题栏和日志区被容器裁掉。
- 验证：按用户要求未执行构建、cargo check、cargo test、Tauri 冒烟或人工 UI 测试；仅做静态源码检查。
- 触发来源：持续目标“修复他们，然后继续完成这个软件的目标”。

## 2026-06-19 15:48

- 需求点：继续修复后端运行态清理边界，避免运行中切换 Phase 1 任务后旧突变任务污染新世界。
- 路径：`src-tauri/src/settings_commands.rs`、`src-tauri/src/evolution/simulation_engine.rs`、`README.md`、`CHANGELOG.md`。
- 关键位置：`update_settings` 在检测到 `task_id` 变化且模拟运行中时递增 `run_epoch`，清空并重播种当前任务种群后启动新 epoch 的 `simulation_engine::run`；仿真 loop 在读配置后、突变回写前和实体 tick 前补 epoch 检查点，旧 loop 和旧异步突变任务会因 epoch 失效停止写回。
- 验证：按用户要求未执行构建、cargo check、cargo test、Tauri 冒烟或人工 UI 测试；仅做静态源码检查和 Rust 格式检查。
- 触发来源：持续目标“修复他们，然后继续完成这个软件的目标”。

## 2026-06-19 16:02

- 需求点：继续修复 Phase 1 有用工作目标链路，避免 AI 突变 prompt 与当前任务 ABI 冲突。
- 路径：`src-tauri/src/evolution/mutation.rs`、`src-tauri/src/evolution/simulation_engine.rs`、`README.md`、`CHANGELOG.md`。
- 关键位置：`MutationEngine` 新增 `mutate_for_task(parent, task_id)`，仿真 loop 将当前 `task_id` 传入突变器；Ollama prompt 按 `freeform/sort_i32/rle` 注入明确导出 ABI，本地突变在非 freeform 任务下不再随机生成只有 `calculate_fitness` 的无效 DNA。
- 验证：按用户要求未执行构建、cargo check、cargo test、Tauri 冒烟或人工 UI 测试；仅做静态源码检查和 Rust 格式检查。
- 触发来源：持续目标“修复他们，然后继续完成这个软件的目标”。

## 2026-06-19 14:55

- 需求点：继续修复基础 AI 配置链路，避免 Ollama 预检和神谕生成受前端 WebView/CORS 影响。
- 路径：`src-tauri/src/ai_commands.rs`、`src-tauri/src/main.rs`、`src/components/SettingsModal.tsx`、`src/components/DivineMandate.tsx`、`README.md`、`AGENTS.md`、`CHANGELOG.md`。
- 关键位置：新增 `check_ollama_models` 与 `generate_divine_mandate` Tauri command，统一由后端 `reqwest` 调用 Ollama `/api/tags` 与 `/api/generate`；设置面板模型预检改用 `invoke('check_ollama_models')`；神谕终端改用 `invoke('generate_divine_mandate')`，保留本地启发式兜底；`main.rs` 只注册 command，不承载具体 AI 逻辑。
- 验证：按用户要求未执行构建、cargo check、cargo test、Tauri 冒烟或人工 UI 测试；仅执行 `cargo fmt` 和静态符号扫描。
- 触发来源：持续目标“修复他们，然后继续完成这个软件的目标”。

## 2026-06-19 14:41

- 需求点：继续修复基础配置链路，避免母亲机床神谕终端忽略用户设置的 Ollama 端点和模型。
- 路径：`src/components/DivineMandate.tsx`、`src/components/MotherMachine.tsx`、`README.md`、`CHANGELOG.md`。
- 关键位置：`DivineMandate` 新增 `ollamaUrl` 与 `modelName` 入参，实际 `/api/generate` 请求不再硬编码 localhost 与固定模型；神谕 prompt 补齐 `envType` 输出约束；`MotherMachine` 将当前配置传入神谕终端，并在预览前用 `normalizeSettings` 归一化 AI/本地启发式结果，避免预览出现未定义环境字段。
- 验证：按用户要求未执行构建、cargo check、cargo test、Tauri 冒烟或人工 UI 测试；仅做静态源码核对。
- 触发来源：持续目标“修复他们，然后继续完成这个软件的目标”。

## 2026-06-19 14:32

- 需求点：继续排查基础软件入口页操作风险，收敛自绘窗口拖拽区域。
- 路径：`src/components/GenesisGate.tsx`、`README.md`、`CHANGELOG.md`。
- 关键位置：移除 `GenesisGate` 整屏根容器、主内容容器和标题区上的 `data-tauri-drag-region`；窗口拖动继续由 `TitleBar` 承担，避免入口页初始化、系统配置和退出按钮命中拖拽区域。
- 验证：按用户要求未执行构建、cargo check、cargo test、Tauri 冒烟或人工 UI 测试；仅做静态源码核对。
- 触发来源：持续目标“修复他们，然后继续完成这个软件的目标”。

## 2026-06-19 14:24

- 需求点：继续排查基础软件操作链路，修复设置切换后前端显示旧世界的问题，并补桌面壳触控/安全区兜底。
- 路径：`src/App.tsx`、`src/index.css`、`README.md`、`CHANGELOG.md`。
- 关键位置：新增统一 `resetWorldView` 与空世界统计工厂；任务切换或 `LocalMock` 与真实后端世界来源切换后，前端同步清空实体、统计、实体检查器和微观战场；主运行页改用安全区 padding，底部控制栏和移动端实体检查器按 `env(safe-area-inset-bottom)` 偏移；全局补 `overscroll-behavior`、`touch-action` 和 tap highlight 控制。
- 验证：按用户要求未执行构建、cargo check、cargo test、Tauri 冒烟或人工 UI 测试；仅做静态源码核对。
- 触发来源：用户追问基础软件打开关闭、前端样式、操作布局是否还有问题。

## 2026-06-19 14:11

- 需求点：继续修复基础世界数据链路，避免前端实体伦理字段与后端真实状态不一致。
- 路径：`src-tauri/src/world_commands.rs`、`src/utils/worldBinary.ts`、`README.md`、`CHANGELOG.md`。
- 关键位置：`get_world_binary` 的实体记录从 36 字节扩展为 40 字节，新增 `ethics.collaboration`；前端 `parseWorldBinary` 同步读取该字段，并保留旧 36 字节记录兼容；后端 buffer capacity 同步纳入统计尾部；解析器只在存在实体记录时识别统计尾，避免异常 12 字节短包被静默当作空世界。
- 验证：按用户要求未执行构建、cargo check、cargo test、Tauri 冒烟或人工 UI 测试；仅执行 `cargo fmt` 和静态协议字段扫描。
- 触发来源：持续目标“修复他们，然后继续完成这个软件的目标”。

## 2026-06-19 14:01

- 需求点：继续补齐基础软件实体详情链路，修复 Phase 1 任务模式下微观战场长期没有真实内存快照的问题。
- 路径：`src-tauri/src/evolution/wasm_runtime.rs`、`README.md`、`CHANGELOG.md`。
- 关键位置：`execute_entity_for_task` 在 `sort_i32/rle` 评分循环中同步带出代表性任务观测，记录 `fuel_consumed` 和前 256 字节 wasm memory snapshot；`score_sort_i32` 与 `score_rle` 的 case runner 统一返回执行结果、fuel 和内存快照，评分公式保持不变且不额外增加一次 wasm 执行。
- 验证：按用户要求未执行构建、cargo check、cargo test、Tauri 冒烟或人工 UI 测试；仅执行 `cargo fmt` 和静态调用点扫描。
- 触发来源：持续目标“修复他们，然后继续完成这个软件的目标”。

## 2026-06-19 13:52

- 需求点：继续修复基础软件打开/关闭可靠性，补齐非自绘按钮触发的窗口关闭路径。
- 路径：`src/utils/windowControls.ts`、`src/components/TitleBar.tsx`、`src-tauri/capabilities/default.json`、`src-tauri/gen/schemas/capabilities.json`、`README.md`、`CHANGELOG.md`。
- 关键位置：新增 `onWindowCloseRequested`，拦截窗口级 close request；Alt+F4/任务栏关闭会复用 `closeAppGracefully`，先写退出日志并调用 `stop_sim`，再用 Tauri `destroy()` 销毁窗口；补充 `core:window:allow-destroy` 权限。
- 验证：按用户要求未执行构建、cargo、Tauri 冒烟或人工 UI 测试；仅做静态链路核对。
- 触发来源：持续目标“修复他们，然后继续完成这个软件的目标”。

## 2026-06-19 13:44

- 需求点：继续修复基础软件前端操作布局，重点处理复盘后子视图在窄屏下的遮挡和文字挤压。
- 路径：`src/components/PhylogeneticTree.tsx`、`src/components/HallOfFame.tsx`、`src/components/MotherMachine.tsx`、`src/components/GenesisGate.tsx`、`src/components/PhoenixReview.tsx`、`src/App.tsx`、`README.md`、`CHANGELOG.md`。
- 关键位置：进化星图标题改为可换行响应式宽度，节点指纹面板在小屏改为底部抽屉并限制高度；英灵殿标题和导出按钮降低小屏字距并允许换行；母亲机床启动按钮降低小屏字距；入口页右下版本信息小屏隐藏；清理触达文件中的负字距 `tracking-tighter/tracking-tight`。
- 验证：按用户要求未执行构建、cargo、Tauri 冒烟或人工 UI 测试；仅做静态样式扫描和源码核对。
- 触发来源：持续目标“修复他们，然后继续完成这个软件的目标”。

## 2026-06-19 13:36

- 需求点：继续排查基础软件 UI/操作闭环，修复复盘页空数据和指标语义误导。
- 路径：`src/components/PhoenixReview.tsx`、`README.md`、`CHANGELOG.md`。
- 关键位置：复盘报告编号从固定 `VGENE-X01` 改为打开复盘时生成的快照编号；指标卡片“最高信息丰度”改为与实际字段一致的“平均适应度”；没有世界统计时柱状图保持 0 并显示空态说明，不再用 5% 最小高度伪造数据；导出的 JSON 同步包含 `reviewId`。
- 验证：按用户要求未执行构建、cargo、Tauri 冒烟或人工 UI 测试；仅做静态源码检查和文档同步。
- 触发来源：用户追问基础软件打开关闭、前端样式、操作布局是否还有问题。

## 2026-06-19 13:28

- 需求点：继续补齐基础软件设置入口，让已经接入后端的演化参数可被用户从普通设置面板直接调整。
- 路径：`src/components/SettingsModal.tsx`、`README.md`、`CHANGELOG.md`。
- 关键位置：设置面板新增“演化动力学”区，暴露突变替换率、熵压强度、胜出规则和环境类型；复用现有 `normalizeSettings -> toBackendSettings -> save_settings -> update_settings` 链路，避免母亲机床和系统配置成为两套参数入口。
- 验证：按用户要求未执行构建、cargo、Tauri 冒烟或人工 UI 测试；仅做静态源码检查和文档同步。
- 触发来源：持续目标“修复他们，然后继续完成这个软件的目标”。

## 2026-06-19 13:19

- 需求点：继续修复基础软件设置链路，避免母亲机床演化参数看似可调但不持久、不进入后端仿真。
- 路径：`src/types/world.ts`、`src/utils/settings.ts`、`src/components/SettingsModal.tsx`、`src-tauri/src/settings_commands.rs`、`src-tauri/src/evolution/environment.rs`、`src-tauri/src/evolution/simulation_engine.rs`、`README.md`、`CHANGELOG.md`。
- 关键位置：`BackendSettings`、`AppSettings`、`EnvConfig` 补齐 `mutationRate/mutation_rate`、`entropyFactor/entropy_factor`、`winningRule/winning_rule`、`envType/env_type`；`SettingsModal` 保存时保留这些字段；`MotherMachine` 启动前持久化同一份 `AppConfig`；`update_settings` 校验并同步到后端环境；演化循环按突变率控制替换比例，按熵因子调整毒素/捕食者压力，按胜出规则选择排序，按环境类型调整实体运动幅度。
- 验证：按用户要求未执行构建、cargo、Tauri 冒烟或人工 UI 测试；仅做静态字段链路检查和文档同步。
- 触发来源：持续目标“修复他们，然后继续完成这个软件的目标”。

## 2026-06-19 13:07

- 需求点：继续修复基础软件层的启动失败、画布点击和微观视图真实性问题。
- 路径：`src/App.tsx`、`src/components/Arena.tsx`、`src/components/MotherMachine.tsx`、`src/components/MicroArena.tsx`、`README.md`、`CHANGELOG.md`。
- 关键位置：`MotherMachine` 启动流程改为等待 `onStart` Promise，后端启动失败会退出遮罩并显示错误；`App.handleStart` 与暂停/恢复捕获失败并回退运行态，设置同步改为后端成功后再切前端状态；`Arena` 实体实例容量跟随实体数，点击空实例不再触发选择，且只有真实后端运行态才调用 `interfere_at`；`MicroArena` 移除固定假 B 对手，缺少 `last_memory_snapshot` 时显示明确空态。
- 验证：按用户要求未执行构建、cargo、Tauri 冒烟或人工 UI 测试；仅做静态源码检查和文档同步。
- 触发来源：持续目标“修复他们，然后继续完成这个软件的目标”。

## 2026-06-19 12:53

- 需求点：继续补齐前端基础产品闭环，避免假数据、假动作和窄屏布局破损。
- 路径：`src/App.tsx`、`src/components/PhoenixReview.tsx`、`src/components/HallOfFame.tsx`、`src/components/PhylogeneticTree.tsx`、`src/components/MicroArena.tsx`、`README.md`、`CHANGELOG.md`。
- 关键位置：`LocalMock` 实体详情从随机 DNA 改为基于实体快照的确定性沙盒 DNA；选中实体跟随世界状态刷新能量/分数等轻量字段；复盘页导出按钮改为真实语义“导出复盘快照”并补窄屏布局；英灵殿卡片支持点击选择，导出按钮不再只依赖 hover；进化星图“注入进化序列”改为真实复制 DNA 片段；微观战场日志从随机节流改为按内存快照签名变化记录，并补小屏宽度约束。
- 验证：按用户要求未执行构建、cargo、Tauri 冒烟或人工 UI 测试；仅执行静态 grep 和文档同步。
- 触发来源：持续目标“修复他们，然后继续完成这个软件的目标”。

## 2026-06-19 12:49

- 需求点：继续瘦身后端入口，让 `main.rs` 收敛为 Tauri bootstrap。
- 路径：`src-tauri/src/main.rs`、`src-tauri/src/lifecycle_commands.rs`、`README.md`、`AGENTS.md`、`CHANGELOG.md`。
- 关键位置：新增 `lifecycle_commands.rs`，承接 `start_sim`、`stop_sim`、`export_logs` 与 `logger`；`main.rs` 现在只保留模块声明、Windows 优先级优化、`AppState` 注入和 `tauri::generate_handler!` 注册；前端 `invoke(...)` 命令名保持不变。
- 验证：按用户要求未执行构建、cargo、Tauri 冒烟或人工 UI 测试；仅执行静态读取与符号扫描。
- 触发来源：持续目标“修复他们，然后继续完成这个软件的目标”。

## 2026-06-19 12:46

- 需求点：继续瘦身后端入口，保持前端 command 名称和设置字段契约不变。
- 路径：`src-tauri/src/main.rs`、`src-tauri/src/settings_commands.rs`、`src-tauri/src/benchmark_commands.rs`、`README.md`、`AGENTS.md`、`CHANGELOG.md`。
- 关键位置：新增 `settings_commands.rs`，承接 `save_settings`、`load_settings`、`update_settings`、运行模式切换和任务切换清理；新增 `benchmark_commands.rs`，承接 `get_benchmark_catalog` 与 `score_benchmark_preview`；`main.rs` 仅保留启动/停止、日志导出、logger 和 handler 注册；前端 `invoke(...)` 命令名保持不变。
- 验证：按用户要求未执行构建、cargo、Tauri 冒烟或人工 UI 测试；仅执行 `cargo fmt` 与静态符号扫描。
- 触发来源：持续目标“修复他们，然后继续完成这个软件的目标”。

## 2026-06-19 12:43

- 需求点：继续修复基础软件启动/停止可靠性，并推进后端入口瘦身。
- 路径：`src-tauri/src/main.rs`、`src-tauri/src/state.rs`、`src-tauri/src/evolution/mod.rs`、`src-tauri/src/evolution/simulation_engine.rs`、`README.md`、`AGENTS.md`、`CHANGELOG.md`。
- 关键位置：新增 `simulation_engine.rs`，将仿真 loop、捕食者注入、Wasm 执行、空间网格碰撞、突变任务、谱系和英灵殿记录从 `main.rs` 移入演化模块；`start_sim`/`stop_sim` 保持 command 名称不变；`AppState` 新增 `run_epoch`，快速 stop/start 后旧 loop 和旧突变任务会因 epoch 失效而停止写回，避免重复仿真循环污染当前世界。
- 验证：按用户要求未执行构建、cargo、Tauri 冒烟或人工 UI 测试；仅执行 `cargo fmt` 与静态符号扫描。
- 触发来源：持续目标“修复他们，然后继续完成这个软件的目标”。

## 2026-06-19 12:37

- 需求点：继续排查并修复基础软件完成度之外的架构边界问题。
- 路径：`src-tauri/src/main.rs`、`src-tauri/src/system_info.rs`、`src-tauri/src/world_commands.rs`、`src/components/TitleBar.tsx`、`README.md`、`AGENTS.md`、`CHANGELOG.md`。
- 关键位置：将 `get_sys_info`、`get_live_stats` 从 `main.rs` 拆到 `system_info.rs` 并修正 Tauri handler 注册；新增 `world_commands.rs`，承接 `get_world_binary`、`get_world_state`、实体详情、谱系、英灵殿和观察者干预 command；保留前端 command 名称与 raw binary 协议不变；补回 `simulation_loop` 仍需的 `LineageRecord` 导入；标题栏窗口 resize 监听清理增加错误兜底，避免开发环境未处理 promise。
- 验证：按用户要求未执行构建、cargo、Tauri 冒烟或人工 UI 测试；仅做静态 grep 与文档同步。
- 触发来源：用户追问基础软件问题与“修复他们”。

## 2026-06-19 12:32

- 需求点：继续修复基础软件完成度，不运行冒烟或测试。
- 路径：`src-tauri/src/runtime_files.rs`、`src-tauri/src/main.rs`、`src/utils/settings.ts`、`src/components/PhoenixReview.tsx`、`src/components/SettingsModal.tsx`、`src/components/DivineMandate.tsx`、`src/components/MotherMachine.tsx`、`src/components/GenesisGate.tsx`、`src/components/HallOfFame.tsx`、`src/components/PhylogeneticTree.tsx`、`README.md`、`AGENTS.md`、`CHANGELOG.md`。
- 关键位置：新增 `runtime_files.rs`，将 app data 路径、旧设置兜底读取、运行日志首行插入和文本写入从 `main.rs` 拆出；`export_logs`、`save_settings` 统一走 runtime 文件层；默认配置从 `LocalMock` 改为 `Local`，初始化默认走 Rust 后端仿真，`LocalMock` 仅作为 `UI 沙盒`；复盘页去掉硬编码崩溃率、突变次数和假日志，改为基于当前 `stats` 快照生成摘要；清理可见加载文案的 `...` 与 `DivineMandate` 输入焦点/命名问题。
- 验证：按用户要求未执行构建、cargo、Tauri 冒烟或人工 UI 测试；仅执行静态文本扫描和 `git diff --check`，当前无 whitespace error，仅保留既有 CRLF 提示。
- 触发来源：持续目标“修复他们，然后继续完成这个软件的目标”。

## 2026-06-19 12:24

- 需求点：修复基础软件体验问题，并在全部功能完善前暂不做冒烟或运行测试。
- 路径：`src/App.tsx`、`src/components/GenesisGate.tsx`、`src/components/MotherMachine.tsx`、`src/components/SettingsModal.tsx`、`src/components/TitleBar.tsx`、`src/components/PhoenixReview.tsx`、`src/components/PhylogeneticTree.tsx`、`src/components/HallOfFame.tsx`、`src/components/MicroArena.tsx`、`src/index.css`、`src-tauri/src/main.rs`、`README.md`、`AGENTS.md`、`CHANGELOG.md`。
- 关键位置：设置保存流程等待 `save_settings -> applyDisplaySettings -> onSave` 全部完成，失败时保留弹窗并显示错误；非 `LocalMock` 配置在暂停/未运行时也同步后端，恢复前会先同步后端；进入复盘前停止后端模拟；“下达突变神谕”从占位 `alert` 改为调用现有干预链路；复盘、谱系树、英灵殿导出/注入占位弹窗改为界面内状态反馈或真实文件下载；标题栏、入口页、配置页、设置弹窗和次级浮窗补 `aria-label/aria-pressed/focus-visible` 与按钮类型；主模拟页、母亲机床和设置弹窗增加窄屏布局兜底；运行时 `run.log/settings.json/export_logs` 默认迁到 `%LOCALAPPDATA%\VGene`，读取设置保留旧相对路径兜底。
- 验证：按用户要求未执行构建、cargo、Tauri 冒烟或人工 UI 测试；仅执行静态文本检查 `git diff --check`，当前无 whitespace error，仅保留既有 CRLF 提示。
- 触发来源：用户要求“修复他们，然后继续完成这个软件的目标，修复过程中，不用去做冒烟或者运行测试”。

## 2026-06-19 12:02

- 需求点：修复当前进度核对中发现的 `cargo fmt --check` 失败、Phase 1 useful-work 未闭环、后端测试缺口。
- 路径：`src-tauri/src/evolution/benchmark.rs`、`src-tauri/src/evolution/wasm_runtime.rs`、`src-tauri/src/evolution/environment.rs`、`src-tauri/src/main.rs`、`README.md`、`docs/phase-1-mvp-code-notes.md`、`CHANGELOG.md`。
- 关键位置：新增 `baseline_dna_for_task` 与 `freeform/sort_i32/rle` 基线 DNA；新增 `WasmEngine::score_dna_for_task`、`validate_and_test_for_task`、`execute_entity_for_task`；`sort_i32` 真实写入 wasm memory 并校验排序样例，`rle` 真实校验 value/count byte pairs；`EnvConfig` 保存当前 `task_id`；仿真执行和突变影子验证按当前任务评分；任务切换后清空旧种群，运行中切换会立即用新任务基线重播种，避免旧 DNA 复用到新任务。
- 验证：先写失败单测确认缺少任务化验证入口；修复后 `cargo test` 通过，当前 3 个 Rust 单测；`cargo fmt --check` 通过；`.\run.ps1 -Action Check -NoPause` 通过，覆盖 `tsc --noEmit`、`vite build`、`cargo check`。
- 触发来源：用户要求“修复他们”。

## 2026-06-13 23:12

- 需求点：修复和优化 `run.ps1`，解决运行没反应、菜单按一次就退出，并顺手检查脚本 bug。
- 路径：`run.ps1`、`scripts/vgene.ps1`、`.gitignore`、`README.md`、`AGENTS.md`、`CHANGELOG.md`。
- 关键位置：交互菜单改为动作完成后返回菜单；新增 `Launch` 快速启动已有 release exe；菜单默认项改为快速启动，缺 exe 才构建；根入口默认菜单退出前暂停，支持 `-NoPause`；release exe 使用 `src-tauri` 作为工作目录，避免运行时 `run.log/settings.json` 散到仓库根目录；Stop 只清理本仓库 Node 进程和 1420 端口进程，避免误杀其他 `vite/tauri` Node；忽略运行时 `run.log/settings.json`。
- 验证：`.\run.ps1 -Action Stop` 通过；`.\run.ps1 -Action Launch` 可直接启动 `Digital Life Platform`；再次 `.\run.ps1 -Action Stop` 可停止；根目录 `run.log` 未再更新，日志写回 `src-tauri/run.log`；`.\run.ps1 -Action Check` 通过。
- 触发来源：用户要求“修复和优化 run.ps1，运行没反应，而且不要按一下就退出很麻烦，顺便检查下有什么bug”。

## 2026-06-13 22:47

- 需求点：修复程序关闭退出、窗口放大/还原、显示模式与参数设置不生效。
- 路径：`src/utils/windowControls.ts`、`src-tauri/capabilities/default.json`、`src-tauri/gen/schemas/capabilities.json`、`src/App.tsx`、`src/components/TitleBar.tsx`、`src/components/GenesisGate.tsx`、`src/components/MotherMachine.tsx`、`src/components/SettingsModal.tsx`、`README.md`、`AGENTS.md`、`CHANGELOG.md`。
- 关键位置：新增统一窗口控制 helper；Tauri v2 capability 显式放行窗口 close/minimize/maximize/fullscreen/resize/center；`GenesisGate` 删除硬编码本地配置，改用 App 单一配置源；`MotherMachine` 继承当前配置并只覆盖演化参数；设置提交改为 normalize -> save_settings -> applyDisplaySettings -> onSave，同步运行中后端参数。
- 验证：`.\run.ps1 -Action Check` 通过；`.\run.ps1 -Action Build` 通过并生成 release exe/MSI/NSIS；release exe 可启动到 `Digital Life Platform` 主窗口并可由 `.\run.ps1 -Action Stop` 停止。实际窗口按钮、退出协议和全屏/无边框/分辨率切换仍需人工手测。
- 触发来源：用户要求实现“关闭退出，窗口放大，参数设置”。

## 2026-06-13 21:10

- 需求点：继续排查 npm/Node 异常，判断是否网络问题，并尽可能修复优化。
- 路径：`scripts/vgene.ps1`、`README.md`、`AGENTS.md`、`CHANGELOG.md`。
- 关键位置：`Resolve-Node` 改为执行 JS probe，不再只信任 `node -v`；新增用户目录便携 Node v24.16.0 安装/校验兜底；`RepairNpm` 默认不再自动跑易卡住的全局 MSI 修复，需设置 `VGENE_REPAIR_GLOBAL_NODE=1` 才强制 winget；新增官方源 + npmmirror 下载路径、SHA256 校验、curl 超时；清理失效 Machine PATH 中的 Trae Node 路径。
- 验证：`C:\Program Files\nodejs\node.exe -e`、`npm-cli.js -v`、`corepack --version` 仍以 `-1073741819` 退出；便携 Node `v24.16.0` 与 npm `11.13.0` 验证通过；`.\run.ps1 -Action RepairNpm` 快速返回；`.\run.ps1 -Action Check` 通过；`.\run.ps1 -Action Build` 通过。
- 触发来源：用户要求“尽可能修复优化，排查下是什么问题，之前都好好的？网络问题？”。

## 2026-06-13 20:30

- 需求点：实现完整暗黑赛博 8-bit 程序化音频系统，并按阶段与模拟状态强联动。
- 路径：`src/utils/audio/`、`src/utils/bgm.ts`、`src/utils/sfx.ts`、`src/App.tsx`、`src/components/SettingsModal.tsx`、`src/types/world.ts`、`src/utils/settings.ts`、`src-tauri/src/main.rs`、`README.md`、`AGENTS.md`、`CHANGELOG.md`。
- 关键位置：新增统一 `audioEngine`、BGM 曲库 presets、SFX recipes；旧 `bgm`/`sfx` 改为兼容门面；设置面板新增音频开关、Master/Music/SFX 音量和强联动开关；`settings.json` 增加音频字段并通过 serde 默认值兼容旧配置。
- 验证：`.\run.ps1 -Action Check` 通过；纯 Vite 浏览器验证受既有 Tauri-only `TitleBar` 窗口 API 依赖限制，需在 Tauri 容器内做最终听感检查。
- 触发来源：用户要求实现游戏配乐优化/创作方案。

## 2026-06-13 19:51

- 需求点：彻底处理 npm 启动/构建不稳定，并提供项目一键交互脚本。
- 路径：`run.ps1`、`scripts/vgene.ps1`、`README.md`、`AGENTS.md`、`CHANGELOG.md`。
- 关键位置：新增根目录 `run.ps1`；新增 `scripts/vgene.ps1`，支持 `Run`、`Check`、`Build`、`Dev`、`Stop`、`RepairNpm`、`OpenOutput`；构建路径直接调用本地 `tsc`、`vite`、`tauri.js`，不依赖全局 npm；`RepairNpm` 输出诊断并尝试通过 winget 修复全局 Node/npm。
- 验证：`.\run.ps1 -Action Check` 通过；`.\run.ps1 -Action Build` 通过并生成 release EXE/MSI/NSIS；`.\run.ps1 -Action Run` 通过并启动 `Digital Life Platform`；`.\run.ps1 -Action RepairNpm` 可输出诊断并超时退出，但当前非管理员环境下全局 npm 仍未修复，需要按脚本提示用管理员 PowerShell 重装 Node.js LTS。
- 触发来源：用户要求实现 Node/npm 修复与 VGene 一键脚本计划。

## 2026-06-13 19:02

- 需求点：继续 Phase 1 MVP 开发，先恢复构建验证，再补齐任务目录前后端契约。
- 路径：`src/components/SettingsModal.tsx`、`src/types/world.ts`、`src/utils/settings.ts`、`src-tauri/src/evolution/benchmark.rs`、`src-tauri/src/main.rs`、`README.md`、`AGENTS.md`、`CHANGELOG.md`。
- 关键位置：设置面板从 `get_benchmark_catalog` 加载任务；`BenchmarkTaskId` 统一 snake_case 序列化；`settings.json` 增加 `task_id`；新增 `score_benchmark_preview` command；修复 `displayMode`、`visualFidelity` 的 TypeScript 联合类型推断错误。
- 验证：`tsc --noEmit` 通过；`vite build` 通过；`cd src-tauri; cargo check` 通过。直接 `npm run build` 因本机 npm 报 `Could not determine Node.js install directory` 未能执行，已用 Codex 内置 Node 分步验证等价构建链路。
- 触发来源：用户要求“继续开发”。

## 2026-06-10 00:01

- 需求点：按“先写代码，不测试”的要求推进 Phase 1 MVP 基础代码。
- 路径：`src/types/world.ts`、`src/utils/settings.ts`、`src/utils/worldBinary.ts`、`src-tauri/src/evolution/benchmark.rs`、`src-tauri/src/evolution/mod.rs`、`src-tauri/src/evolution/mutation.rs`、`docs/phase-1-mvp-code-notes.md`、`CHANGELOG.md`。
- 关键位置：新增前端实体/配置类型、配置字段适配、世界二进制解析器；新增后端 `sort_i32`/`rle` 任务目录、评分结构和 Ollama Phase 1 有用任务提示上下文。
- 验证：按用户要求，本条变更未执行测试，留待次日验证。
- 触发来源：用户要求“开始第一阶段MVP代码构建，只写代码，多写点，不进行测试”。

## 2026-06-10 00:00

- 需求点：优先修复启动、基础构建和明显 bug。
- 路径：`.gitignore`、`src/App.tsx`、`src/components/Arena.tsx`、`src/components/DivineMandate.tsx`、`src/components/GenesisGate.tsx`、`src/components/HallOfFame.tsx`、`src/components/MicroArena.tsx`、`src/components/MotherMachine.tsx`、`src/components/PhoenixReview.tsx`、`src/components/PhylogeneticTree.tsx`、`src/components/SettingsModal.tsx`、`src/utils/i18n.ts`、`src-tauri/src/main.rs`、`README.md`、`CHANGELOG.md`。
- 关键位置：修复 TypeScript 构建错误；统一 `Arena` 实体类型；修正 postprocessing/drei API 使用；Phase 1 将 `get_world_binary` 改为 raw binary，避免前端按 DataView 解析 zstd 压缩数据；忽略 Vite `dist/` 构建产物。
- 验证：`npm run build` 已恢复通过；`cargo check` 后续复验。
- 触发来源：用户要求“先修复启动和一些基本的构建或者明显的bug问题”。

## 2026-06-06 00:02

- 需求点：创建多职能智能体并整合第一阶段开发分工。
- 路径：`docs/superpowers/plans/2026-06-06-phase-1-team-workstreams.md`、`CHANGELOG.md`。
- 关键位置：新增项目经理、技术负责人、后端、前端、算法、QA 的责任矩阵；定义 Sprint 0-4 和优先级。
- 触发来源：用户要求“创建多个智能体分别担任不同职务，开始计划开发”。

## 2026-06-06 00:01

- 需求点：以项目经理视角启动第一阶段 MVP 计划与任务拆解。
- 路径：`docs/superpowers/plans/2026-06-06-phase-1-mvp.md`、`CHANGELOG.md`。
- 关键位置：定义 Phase 1 Definition of Done、任务优先级、涉及文件、验证命令与发布门禁。
- 触发来源：用户要求“开始第一阶段的计划和任务”。

## 2026-06-06 00:00

- 需求点：按 `BOOT.md` 启动协议补建项目长期记忆系统。
- 路径：`BOOT.md`、`AGENTS.md`、`CHANGELOG.md`、`README.md`。
- 关键位置：新增 AI 启动规则、项目硬约束、文档同步触发器；在 README 追加代码核验状态与文档偏差。
- 触发来源：项目存在业务代码与 README，但缺少 `AGENTS.md`、`CHANGELOG.md`，且根目录未持久化 `BOOT.md`。

## 2026-06-19 16:30

- 需求点：继续修复基础软件与 Phase 1 任务链路问题，不执行冒烟或运行测试。
- 路径：`src-tauri/src/evolution/mutation.rs`、`src-tauri/src/evolution/dna_splicer.rs`、`src-tauri/src/evolution/simulation_engine.rs`、`src-tauri/src/state.rs`、`src-tauri/src/settings_commands.rs`、`src/App.tsx`、`README.md`、`AGENTS.md`、`CHANGELOG.md`。
- 关键位置：后端本地突变模式从语义混淆的 `LocalMock` 改为 `Local`；`LocalMock` 保持为前端 UI 沙盒；捕食者 DNA 改为按当前 Phase 1 任务使用基线 DNA；无效 Ollama 突变后的 splicer/fallback 结果会再次按当前任务验证，非 `freeform` 任务不再用通用 splicer 破坏 `sort_i32/rle` ABI；启动流程改为后端同步与启动成功后再保存配置，保存失败会停止刚启动的后端仿真。
- 验证：按用户要求未执行构建、测试、Tauri 冒烟或人工 UI 测试；仅准备后续静态格式检查。

## 2026-06-19 16:42

- 需求点：继续修复基础启动/关闭脚本的误杀风险，不执行冒烟或运行测试。
- 路径：`scripts/vgene.ps1`、`README.md`、`CHANGELOG.md`。
- 关键位置：新增进程可执行路径/CIM 命令行归属判断；`Stop-ReleaseExecutables` 只停止归属当前仓库路径的 release exe；1420 端口占用者只有命令行或可执行路径匹配当前仓库时才会被清理，其他进程仅提示跳过。
- 验证：按用户要求未执行 `.\run.ps1 -Action Stop/Launch`；待统一验证时覆盖。

## 2026-06-19 16:58

- 需求点：继续修复基础设置事务和 3D/Canvas 操作可达性问题，不执行冒烟或运行测试。
- 路径：`src/components/SettingsModal.tsx`、`src/App.tsx`、`src/components/GenesisGate.tsx`、`src/components/Arena.tsx`、`src/components/HallOfFame.tsx`、`src/components/PhylogeneticTree.tsx`、`README.md`、`CHANGELOG.md`。
- 关键位置：`SettingsModal` 在持久化失败时会尝试把显示设置、前端配置和后端运行态回滚到提交前配置；`onSave` 增加可选 `currentConfig` 上下文，解决回滚时 React 闭包仍拿旧配置导致运行态判断错误的问题；`Arena`、`HallOfFame`、`PhylogeneticTree` 增加焦点可见的键盘选择组，补齐 Canvas/3D 点击对象的键盘等价路径；`Arena` 背景层从负 z-index 改为 `z-0`，避免焦点选择栏被压到主界面后方。
- 验证：按用户要求未执行构建、测试、Tauri 冒烟或人工 UI 测试；待统一验证时覆盖设置保存失败回滚、运行中模式切换、Canvas 实体选择、英灵殿选择和谱系节点选择。

## 2026-06-19 17:10

- 需求点：继续修复基础软件信息一致性和系统信息显示问题，不执行冒烟或运行测试。
- 路径：`.gitignore`、`package.json`、`src/components/GenesisGate.tsx`、`src-tauri/src/system_info.rs`、`README.md`、`CHANGELOG.md`。
- 关键位置：前端 `package.json` 和入口页版本显示同步为 Tauri/Cargo 当前版本 `0.1.0`；Windows 内存频率解析改为从 WMIC 多列输出中提取有效数字频率，避免把 `ConfiguredClockSpeed Speed` 双列整行拼成异常显示；`.gitignore` 补充 `src-tauri/run.log` 与 `src-tauri/settings.json`，覆盖 release exe 以 `src-tauri` 为工作目录时产生的运行时文件。
- 验证：按用户要求未执行构建、测试、Tauri 冒烟或人工 UI 测试；待统一验证时覆盖系统信息显示和版本显示。

## 2026-06-19 17:32

- 需求点：继续审查基础桌面软件体验，补齐关闭、导出、错误反馈和依赖复现问题，不执行冒烟或运行测试。
- 路径：`.gitignore`、`src/utils/windowControls.ts`、`src/App.tsx`、`src/components/SettingsModal.tsx`、`src/components/HallOfFame.tsx`、`src/components/PhoenixReview.tsx`、`src/components/PhylogeneticTree.tsx`、`src-tauri/src/runtime_files.rs`、`src-tauri/src/lifecycle_commands.rs`、`README.md`、`AGENTS.md`、`CHANGELOG.md`。
- 关键位置：关闭链路为退出日志、`stop_sim` 和窗口 `destroy()` 增加超时兜底；设置初始化/保存失败日志改为安全写入，避免 logger 二次失败覆盖真实错误；世界状态轮询失败会节流显示到运行页；复盘快照、英灵 DNA/WAT 导出、英灵殿/谱系加载失败都改为界面内状态反馈；`export_logs` 改为同时导出 `run.log` 和谱系数据；`run.log` 保留最新日志并限制历史体积；`.gitignore` 不再忽略 `package-lock.json` 与 `src-tauri/Cargo.lock`，保证发布依赖树可复现。
- 验证：仅执行 `cargo fmt --check`、`git diff --check`、PowerShell AST 解析、TSX button type 静态扫描和基础反模式 grep；按用户要求未执行构建、测试、Tauri 冒烟、应用启动或人工 UI 测试。

## 2026-06-19 17:48

- 需求点：继续修复基础后端稳定性，避免共享状态锁中毒或启动初始化失败时直接 panic，不执行冒烟或运行测试。
- 路径：`src-tauri/src/state.rs`、`src-tauri/src/main.rs`、`src-tauri/src/world_commands.rs`、`src-tauri/src/settings_commands.rs`、`src-tauri/src/lifecycle_commands.rs`、`src-tauri/src/evolution/simulation_engine.rs`、`README.md`、`AGENTS.md`、`CHANGELOG.md`。
- 关键位置：新增 `lock_app_state`，Tauri command 层访问 `entities/env_config/mutation_engine/is_running/run_epoch/lineage_history/hall_of_fame` 时将锁中毒转换为 `Result` 错误；`get_world_binary` 改为可返回错误，前端现有轮询错误状态可接住；仿真 loop 遇到锁中毒会记录日志并停止或跳过写回；排序比较补 `Ordering::Equal` 兜底；`AppState::new` 和 Tauri 主循环启动失败改为显式错误记录，不再使用 `expect(...)`。
- 验证：仅执行 `cargo fmt`、`cargo fmt --check` 和静态 panic/unwrap 反模式扫描；按用户要求未执行构建、测试、Tauri 冒烟、应用启动或人工 UI 测试。

## 2026-06-19 18:02

- 需求点：继续修复基础桌面 WebView 壳体验，去掉默认模板痕迹和远程字体依赖，不执行冒烟或运行测试。
- 路径：`index.html`、`public/vgene-icon.svg`、`src/index.css`、`tailwind.config.js`、`src-tauri/tauri.conf.json`、`src-tauri/icons/*`、`README.md`、`CHANGELOG.md`。
- 关键位置：入口 HTML 语言从 `en` 改为 `zh-CN`，标题改为 `V-GENE`，favicon 改为本地 V-GENE SVG 并补黑色 `theme-color`；Tauri 产品名和窗口标题同步为 `V-GENE`，`identifier` 暂保留原值避免影响既有本地数据/安装标识；原 32/128 PNG 图标实际为 1600x1280，已重建为真实 32x32、128x128、512x512 和同步 ICO；移除 Google Fonts `@import`，Tailwind 字体栈改为 Windows/系统字体，避免桌面应用离线或国内网络下首屏字体依赖远程资源。
- 验证：仅做静态文件核对；按用户要求未执行构建、测试、Tauri 冒烟、应用启动或人工 UI 测试。

## 2026-06-19 18:15

- 需求点：继续修复基础窗口按钮交互错误处理，不执行冒烟或运行测试。
- 路径：`src/components/TitleBar.tsx`、`README.md`、`CHANGELOG.md`。
- 关键位置：标题栏最小化、最大化/还原、关闭按钮从裸 `await` 改为带错误捕获的 handler，失败时写 console 并通过 `aria-live` 隐藏状态给辅助技术反馈，避免 Tauri window API 异常时出现未处理 Promise。
- 验证：仅做静态源码核对；按用户要求未执行构建、测试、Tauri 冒烟、应用启动或人工 UI 测试。

## 2026-06-19 18:34

- 需求点：继续审查基础软件可用性，补齐开启/关闭、弹窗、布局和操作反馈的静态问题，不执行冒烟或运行测试。
- 路径：`src/utils/windowControls.ts`、`src/App.tsx`、`src/components/GenesisGate.tsx`、`src/components/MotherMachine.tsx`、`src/components/SettingsModal.tsx`、`src/components/Arena.tsx`、`src/components/DivineMandate.tsx`、`src/components/MicroArena.tsx`、`README.md`、`CHANGELOG.md`。
- 关键位置：窗口模式分辨率增加最小/最大边界，避免损坏配置导致窗口异常尺寸；设置弹窗补 `dialog` 语义、Escape 关闭和遮罩关闭，保存中禁止误关闭；母亲机床启动进度定时器在离开页面时清理，避免卸载后继续 setState；入口页和运行页硬件/实时负载读取失败改为界面状态；Canvas 观察者干预失败会冒泡到运行页状态；神谕终端日志限制为 200 条并补 `aria-live`；微观战场补 `dialog` 语义和 Escape 关闭。
- 验证：按用户要求未执行构建、测试、Tauri 冒烟、应用启动或人工 UI 测试；后续统一验证需覆盖启动页硬件异常、设置弹窗键盘/遮罩关闭、母亲机床启动失败回退、Canvas 干预失败反馈和微观战场关闭。

## 2026-06-20 00:28

- 需求点：实现“下饭局”玩法第一版，支持局长、倍率、真实世界事件、玩家干预和故事复盘。
- 路径：`src/types/world.ts`、`src/utils/runSession.ts`、`src/utils/worldEvents.ts`、`src/App.tsx`、`src/components/MotherMachine.tsx`、`src/components/Arena.tsx`、`src/components/NarrativeFeed.tsx`、`src/components/InterventionDock.tsx`、`src/components/PhoenixReview.tsx`、`src-tauri/src/world_commands.rs`、`src-tauri/src/main.rs`、`README.md`、`AGENTS.md`、`CHANGELOG.md`。
- 关键位置：局前可选 `Snack / Dinner / LongTable` 与 `1x / 2x / 4x / 8x`，倍率临时折算本局后端 `evolutionThrottle` 而不写入 settings；局内事件只由世界统计、实体快照和玩家干预结果推导；Arena 改为上报点击坐标/实体，App 统一调用 `apply_player_intervention`；后端实现祝福、投毒、隔离、放逐和钉选观察，旧 `interfere_at` 保留兼容；复盘页展示 `RunSummary`、关键事件、干预次数和可复制战报。
- 验证：按用户要求开发阶段未执行构建、cargo、Tauri 冒烟或人工 UI 测试；待统一收口验证时覆盖三种局长、四档倍率、五种干预、自动复盘、手动复盘、暂停/恢复、关闭窗口和窄屏布局。

## 2026-06-20 00:46

- 需求点：继续丰富下饭局游戏内容与本地媒体表现，不执行构建或 Tauri 冒烟。
- 路径：`public/media/meal-run-observatory.svg`、`public/media/phase-ribbon.svg`、`src/components/MotherMachine.tsx`、`src/App.tsx`、`src/components/PhoenixReview.tsx`、`src/types/world.ts`、`src/utils/worldEvents.ts`、`src/utils/audio/types.ts`、`src/utils/audio/sfxPresets.ts`、`src/utils/audio/presets.ts`、`README.md`、`CHANGELOG.md`。
- 关键位置：新增局前/复盘观测席 SVG 与局内阶段纹理 SVG，并接入母亲机床、运行页和凤凰复盘；`worldEvents` 增加资源潮、能量饥荒、代际跃迁、新谱系开创和短暂黄金时代等真实数据触发事件；音频事件新增五种玩家干预独立 SFX，曲库新增 `Meal Run Observatory` 下饭局观测曲目。
- 验证：仅执行静态检查；按用户要求未执行 `npm run build`、`cargo check`、`.\run.ps1 -Action Check`、Tauri 启动或人工 UI 验证。

## 2026-06-20 01:03

- 需求点：继续补强下饭局复盘传播与可商业化留存能力。
- 路径：`public/media/review-card-frame.svg`、`src/utils/runArchive.ts`、`src/components/PhoenixReview.tsx`、`README.md`、`CHANGELOG.md`。
- 关键位置：新增复盘战报卡面 SVG；新增本地战报册工具，使用 `localStorage` 保存最近 24 条 `RunSummary` 归档；复盘页增加“收藏本局”、最近收藏列表、复制收藏战报和删除收藏战报，不进入 settings 持久化链路。
- 验证：仅执行静态检查；按用户要求未执行 `npm run build`、`cargo check`、`.\run.ps1 -Action Check`、Tauri 启动或人工 UI 验证。

## 2026-06-20 01:20

- 需求点：继续补强事件图鉴和文明词条内容层。
- 路径：`src/utils/eventCodex.ts`、`public/media/event-codex-plates.svg`、`src/components/PhoenixReview.tsx`、`README.md`、`CHANGELOG.md`。
- 关键位置：新增全事件类型图鉴，按科学解释、历史类比和玩法意义解释每类真实事件；复盘页新增“事件图鉴”标签，发现进度来自当前 `RunSummary` 与本地收藏战报；新增事件图鉴媒体底板。
- 验证：仅执行静态检查；按用户要求未执行 `npm run build`、`cargo check`、`.\run.ps1 -Action Check`、Tauri 启动或人工 UI 验证。

## 2026-06-20 17:07

- 需求点：继续丰富下饭局局内观看层，让玩家吃饭时能直接读懂文明状态。
- 路径：`src/utils/worldPulse.ts`、`src/components/WorldPulsePanel.tsx`、`public/media/world-pulse-radar.svg`、`src/App.tsx`、`README.md`、`CHANGELOG.md`。
- 关键位置：新增世界脉搏纯逻辑，根据真实实体能量、毒素、协作、掠食比例、顶点适应度和世界统计推导压力态势；运行页新增文明态势 HUD，放在中画面左下并在窄屏隐藏，避免遮挡 Arena、事件流、干预栏和底部控制；新增本地雷达媒体底板。
- 验证：仅执行静态检查；按用户要求未执行 `npm run build`、`cargo check`、`.\run.ps1 -Action Check`、Tauri 启动或人工 UI 验证。

## 2026-06-20 17:11

- 需求点：继续丰富下饭局复盘叙事，让本局出现过的数字生命具备可记忆角色。
- 路径：`src/types/world.ts`、`src/utils/civilizationCast.ts`、`src/utils/runSession.ts`、`src/utils/runArchive.ts`、`src/components/PhoenixReview.tsx`、`public/media/civilization-cast-table.svg`、`src/App.tsx`、`README.md`、`CHANGELOG.md`。
- 关键位置：`RunSummary` 新增 `civilizationCast`；终局复盘按最终实体快照和已触发事件推导顶点个体、谱系开创者、掠食压力源、协作看护者和瓶颈幸存者；复盘页新增“文明主角席”，分享文本和收藏战报复制文本会带上角色摘要；新增文明主角席本地媒体底板。
- 验证：仅执行静态检查；按用户要求未执行 `npm run build`、`cargo check`、`.\run.ps1 -Action Check`、Tauri 启动或人工 UI 验证。

## 2026-06-20 17:30

- 需求点：继续补强下饭局复盘留存，增加真实数据驱动的局后徽章。
- 路径：`src/types/world.ts`、`src/utils/runAchievements.ts`、`src/utils/runSession.ts`、`src/utils/runArchive.ts`、`src/components/PhoenixReview.tsx`、`public/media/run-achievement-medals.svg`、`README.md`、`CHANGELOG.md`。
- 关键位置：`RunSummary` 新增 `achievements`；`runAchievements` 只根据真实事件、终局统计、玩家干预和文明主角席推导徽章；复盘页新增“下饭局徽章”，分享文本和收藏战报复制文本会带上徽章摘要；新增局后徽章本地媒体底板。
- 验证：仅执行静态检查；按用户要求未执行 `npm run build`、`cargo check`、`.\run.ps1 -Action Check`、Tauri 启动或人工 UI 验证。

## 2026-06-20 17:37

- 需求点：继续补强下饭局复盘叙事，把真实事件压缩成可分享的文明纪元轴。
- 路径：`src/types/world.ts`、`src/utils/eraChronicle.ts`、`src/utils/runSession.ts`、`src/utils/runArchive.ts`、`src/components/PhoenixReview.tsx`、`public/media/era-chronicle-strip.svg`、`README.md`、`CHANGELOG.md`。
- 关键位置：`RunSummary` 新增 `eraChronicle`；`eraChronicle` 按真实事件阶段、终局统计和事件严重度生成最多 6 个纪元摘要，低事件局会生成静默观测纪；复盘页新增“文明纪元轴”，分享文本和收藏战报复制文本会带上纪元摘要；新增文明纪元轴本地媒体底板。
- 验证：仅执行静态检查；按用户要求未执行 `npm run build`、`cargo check`、`.\run.ps1 -Action Check`、Tauri 启动或人工 UI 验证。

## 2026-06-20 17:44

- 需求点：继续增强下饭局复盘后的再开局动机，让复盘导向新的可玩目标。
- 路径：`src/types/world.ts`、`src/utils/runChallenges.ts`、`src/utils/runSession.ts`、`src/utils/runArchive.ts`、`src/components/PhoenixReview.tsx`、`src/components/WorldPulsePanel.tsx`、`public/media/next-run-challenges.svg`、`README.md`、`CHANGELOG.md`。
- 关键位置：`RunSummary` 新增 `nextRunChallenges`；`runChallenges` 根据真实结局、事件、干预次数、文明主角、徽章和纪元推导最多 3 个下一局挑战；复盘页新增“再开一局协议”，分享文本和收藏战报复制文本会带上挑战摘要；新增下一局挑战本地媒体底板；顺手修正复盘页与世界脉搏面板的非标准 Tailwind 透明度类。
- 验证：仅执行静态检查；按用户要求未执行 `npm run build`、`cargo check`、`.\run.ps1 -Action Check`、Tauri 启动或人工 UI 验证。

## 2026-06-20 17:50

- 需求点：继续增强下饭局局内可玩性，让玩家吃饭时能看到本局还差什么目标。
- 路径：`src/types/world.ts`、`src/utils/runObjectives.ts`、`src/utils/runSession.ts`、`src/utils/runArchive.ts`、`src/components/ObservationObjectivesPanel.tsx`、`src/components/PhoenixReview.tsx`、`src/App.tsx`、`public/media/observation-objectives.svg`、`README.md`、`CHANGELOG.md`。
- 关键位置：`RunSummary` 新增 `objectives`；`runObjectives` 根据实时统计、实体快照和真实事件推导史官开卷、火种保全、寻找顶点、共生观测和穿越危机等局内目标；运行页新增“观测协议”HUD，复盘页新增“本局观测目标”，分享文本和收藏战报复制文本会带上目标达成数；新增观测目标本地媒体底板。
- 验证：仅执行静态检查；按用户要求未执行 `npm run build`、`cargo check`、`.\run.ps1 -Action Check`、Tauri 启动或人工 UI 验证。

## 2026-06-20 17:56

- 需求点：继续增强局内轻决策，让玩家能根据真实世界状态判断该祝福、隔离、放逐还是纯观察。
- 路径：`src/utils/worldOmens.ts`、`src/components/WorldPulsePanel.tsx`、`public/media/world-omens.svg`、`README.md`、`CHANGELOG.md`。
- 关键位置：新增世界预兆纯逻辑，根据实体能量、代谢毒素、掠食候选、协作候选、顶点适应度、近期危险事件和阶段推导毒潮、饥荒、掠食、共生窗口、顶点信号和连锁崩塌等预兆；世界脉搏面板新增“世界预兆”区和建议干预类型；新增世界预兆本地媒体底板。
- 验证：仅执行静态检查；按用户要求未执行 `npm run build`、`cargo check`、`.\run.ps1 -Action Check`、Tauri 启动或人工 UI 验证。

## 2026-06-20 18:03

- 需求点：继续增强复盘后的下一局闭环，让“再开一局协议”从展示目标变成可直接载入的开局预设。
- 路径：`src/App.tsx`、`src/components/PhoenixReview.tsx`、`src/components/MotherMachine.tsx`、`README.md`、`CHANGELOG.md`。
- 关键位置：`App` 新增临时 `pendingRunPreset`，复盘挑战卡点击后会重置当前世界并回到配置页；`PhoenixReview` 的下一局挑战卡改为可点击按钮；`MotherMachine` 接收挑战推荐的局长、倍率和标题，并在局前显示挑战协议横幅，玩家仍可手动调整，预设不写入持久化 settings。
- 验证：仅执行静态检查；按用户要求未执行 `npm run build`、`cargo check`、`.\run.ps1 -Action Check`、Tauri 启动或人工 UI 验证。

## 2026-06-20 18:13

- 需求点：继续增强下饭局轻操作，把祝福、投毒、隔离、放逐和钉选观察变成有成本、有冷却、有复盘纪律的玩家决策。
- 路径：`src/types/world.ts`、`src/utils/interventionBudget.ts`、`src/utils/runSession.ts`、`src/utils/runArchive.ts`、`src/App.tsx`、`src/components/InterventionDock.tsx`、`src/components/PhoenixReview.tsx`、`public/media/intervention-budget-gauge.svg`、`README.md`、`CHANGELOG.md`。
- 关键位置：新增神谕充能纯逻辑，局长决定容量与恢复节奏，干预类型决定成本与冷却；`App` 在后端干预成功后扣除充能，失败或预算不足不写事件、不扣费，暂停期间不会恢复充能；`InterventionDock` 显示充能条、当前成本和冷却/不足提示；`RunSummary` 新增可选 `interventionBudget`，复盘页与收藏战报展示克制观察者、均衡干预者或强手改史者；新增神谕充能本地媒体底板。
- 验证：仅执行静态检查；按用户要求未执行 `npm run build`、`cargo check`、`.\run.ps1 -Action Check`、Tauri 启动或人工 UI 验证。

## 2026-06-20 18:22

- 需求点：继续增强下饭局观看性，让“钉选观察”成为可追踪的数字生命样本档案。
- 路径：`src/types/world.ts`、`src/utils/specimenDossier.ts`、`src/utils/runSession.ts`、`src/utils/runArchive.ts`、`src/App.tsx`、`src/components/PinnedSpecimenPanel.tsx`、`src/components/PhoenixReview.tsx`、`public/media/pinned-specimen-dossier.svg`、`README.md`、`CHANGELOG.md`。
- 关键位置：新增钉选样本类型与纯逻辑，`PIN_OBSERVE` 命中实体后用真实实体快照创建档案，世界轮询时持续记录适应度、能量、毒素、世代和阶段变化，实体从快照中消失时标记失联；运行页新增右下“样本档案”HUD；`RunSummary` 新增可选 `pinnedSpecimen`，复盘页、分享文本和收藏战报会展示样本存活/失联、峰值适应度和成长变化；新增钉选样本本地媒体底板。
- 验证：仅执行静态检查；按用户要求未执行 `npm run build`、`cargo check`、`.\run.ps1 -Action Check`、Tauri 启动或人工 UI 验证。

## 2026-06-20 18:26

- 需求点：继续增强局内可读性，让玩家吃饭时能直接理解真实事件的科学性、历史性和操作意义。
- 路径：`src/utils/eventInsights.ts`、`src/components/NarrativeFeed.tsx`、`public/media/event-briefing-slate.svg`、`README.md`、`CHANGELOG.md`。
- 关键位置：新增事件讲解纯逻辑，复用 `eventCodex` 的科学解释、历史类比和玩法意义，不新增假事件；`NarrativeFeed` 在事件流顶部显示最新非开场事件的“史官讲解”卡，包含科学解释、历史类比和轻操作建议；新增史官讲解本地媒体底板。
- 验证：仅执行静态检查；按用户要求未执行 `npm run build`、`cargo check`、`.\run.ps1 -Action Check`、Tauri 启动或人工 UI 验证。

## 2026-06-20 18:31

- 需求点：继续增强下饭局轻操作，把世界预兆转成玩家能一键采纳的干预建议。
- 路径：`src/utils/oracleAdvice.ts`、`src/App.tsx`、`src/components/InterventionDock.tsx`、`src/components/WorldPulsePanel.tsx`、`public/media/oracle-advice-panel.svg`、`README.md`、`CHANGELOG.md`。
- 关键位置：新增神谕建议纯逻辑，根据真实世界统计、实体快照、事件、当前阶段、世界预兆和神谕充能推导建议干预类型、可信度、紧急度、成本和余量；`InterventionDock` 新增“神谕建议”卡，可一键采纳建议切换当前干预模式；`WorldPulsePanel` 的预兆建议改为中文干预名；新增神谕建议本地媒体底板。
- 验证：仅执行静态检查；按用户要求未执行 `npm run build`、`cargo check`、`.\run.ps1 -Action Check`、Tauri 启动或人工 UI 验证。

## 2026-06-20 18:40

- 需求点：继续增强下饭局观看体验，让玩家吃饭时知道此刻应该观察哪个实体、集群或全域态势。
- 路径：`src/utils/directorCues.ts`、`src/components/DirectorCuePanel.tsx`、`src/components/ObservationObjectivesPanel.tsx`、`src/App.tsx`、`public/media/director-cue-viewfinder.svg`、`README.md`、`CHANGELOG.md`。
- 关键位置：新增导演镜头纯逻辑，根据真实事件、实体快照、世界统计、局内阶段和钉选样本推导镜头标题、目标、节奏、可信度、证据和观察提示；运行页新增顶部中轴“导演镜头”HUD；本局目标面板从左上干预栏锚点下移，降低局内 HUD 遮挡；新增导演取景框本地媒体底板。
- 验证：仅执行静态检查；按用户要求未执行 `npm run build`、`cargo check`、`.\run.ps1 -Action Check`、Tauri 启动或人工 UI 验证。

## 2026-06-20 18:45

- 需求点：继续增强导演镜头和 3D 画面的关联，让玩家能在 Arena 中直接看到导演建议的实体目标。
- 路径：`src/components/Arena.tsx`、`src/components/DirectorCuePanel.tsx`、`src/App.tsx`、`public/media/director-target-lock.svg`、`README.md`、`CHANGELOG.md`。
- 关键位置：`Arena` 新增导演目标锁定 beacon，使用三轴光环高亮 `directorCue.entityId` 对应的真实实体且不参与点击拾取；`App` 将当前导演提示传入 Arena；`DirectorCuePanel` 在存在实体目标时显示目标锁定符号；实体实例脏检查补充分数与利他值，避免适应度变化但颜色不更新；新增目标锁定本地媒体资产。
- 验证：仅执行静态检查；按用户要求未执行 `npm run build`、`cargo check`、`.\run.ps1 -Action Check`、Tauri 启动或人工 UI 验证。

## 2026-06-20 18:49

- 需求点：继续增强下饭局感官节奏，让导演镜头切换、目标锁定和危机切镜有轻量音频反馈。
- 路径：`src/utils/audio/types.ts`、`src/utils/audio/sfxPresets.ts`、`src/utils/sfx.ts`、`src/App.tsx`、`src/components/DirectorCuePanel.tsx`、`public/media/director-audio-pulse.svg`、`README.md`、`CHANGELOG.md`。
- 关键位置：新增 `director_cue`、`director_target_lock`、`director_danger_cue` 三类 SFX 事件和配方，仍走统一 `audioEngine`；`App` 在下饭局运行中按 session、提示 id、目标实体和 tone 去重播放导演节拍，避免每秒刷音效；`DirectorCuePanel` 新增导演音频脉冲纹理；旧 `sfx` 兼容门面补齐导演音效调用。
- 验证：仅执行静态检查；按用户要求未执行 `npm run build`、`cargo check`、`.\run.ps1 -Action Check`、Tauri 启动或人工 UI 验证。

## 2026-06-20 18:56

- 需求点：继续增强下饭局传播性，让玩家在局内手动标记精彩瞬间并带入复盘/分享。
- 路径：`src/types/world.ts`、`src/utils/runHighlights.ts`、`src/utils/runSession.ts`、`src/utils/runArchive.ts`、`src/App.tsx`、`src/components/DirectorCuePanel.tsx`、`src/components/PhoenixReview.tsx`、`public/media/run-highlight-bookmark.svg`、`README.md`、`CHANGELOG.md`。
- 关键位置：新增 `RunHighlight` 类型和精彩瞬间纯逻辑；导演卡新增标记按钮，按当前导演镜头、最新真实事件和世界指标生成最多 12 条本局高光，不写 settings、不调用后端；`summarizeRun`、分享文本、复盘页和本地收藏战报都展示精彩瞬间；新增精彩瞬间本地媒体底板。
- 验证：仅执行静态检查；按用户要求未执行 `npm run build`、`cargo check`、`.\run.ps1 -Action Check`、Tauri 启动或人工 UI 验证。

## 2026-06-20 19:08

- 需求点：继续增强下饭局“边吃边看”的低负担可玩性，让玩家不用读完整事件流也知道当前该观察、标记还是切换干预。
- 路径：`src/types/world.ts`、`src/utils/mealRhythm.ts`、`src/components/MealRhythmCard.tsx`、`src/components/NarrativeFeed.tsx`、`src/App.tsx`、`src/utils/runSession.ts`、`src/utils/runArchive.ts`、`src/components/PhoenixReview.tsx`、`public/media/meal-rhythm-plate.svg`、`README.md`、`CHANGELOG.md`。
- 关键位置：新增 `MealRhythmCue` 和下饭节奏纯逻辑，根据局内阶段、真实世界事件、统计、实体快照、神谕充能和已标记高光推导观察/标记/干预/忍手节奏；事件流顶部新增节奏卡，可直接触发精彩瞬间标记或切换建议干预类型，但真实干预仍需玩家点击 Arena；`RunSummary`、分享文本、复盘页和本地收藏战报记录节奏历史；新增下饭节奏本地媒体底板。
- 验证：仅执行静态检查；按用户要求未执行 `npm run build`、`cargo check`、`.\run.ps1 -Action Check`、Tauri 启动或人工 UI 验证。

## 2026-06-20 19:18

- 需求点：继续增强下饭局局后传播，把一局真实演化压缩成可复制、可收藏的三幕战报短片。
- 路径：`src/types/world.ts`、`src/utils/runTrailer.ts`、`src/utils/runSession.ts`、`src/utils/runArchive.ts`、`src/components/PhoenixReview.tsx`、`public/media/run-trailer-strip.svg`、`README.md`、`CHANGELOG.md`。
- 关键位置：`RunSummary` 新增 `trailer`；`runTrailer` 只根据真实事件、实体快照、下饭节奏、精彩瞬间、目标、徽章和终局统计生成第一幕、第二幕、第三幕；分享文本和收藏战报复制文本会带上三幕摘要；复盘页新增“三幕战报短片”卡和本地媒体底板，旧收藏战报缺少 `trailer` 时自动降级。
- 验证：仅执行静态检查；按用户要求未执行 `npm run build`、`cargo check`、`.\run.ps1 -Action Check`、Tauri 启动或人工 UI 验证。

## 2026-06-20 19:25

- 需求点：继续增强下饭局收藏和商业化留存，让每局真实演化能产出可记忆的文明遗物。
- 路径：`src/types/world.ts`、`src/utils/runRelics.ts`、`src/utils/runSession.ts`、`src/utils/runArchive.ts`、`src/components/PhoenixReview.tsx`、`public/media/run-relic-vault.svg`、`README.md`、`CHANGELOG.md`。
- 关键位置：`RunSummary` 新增 `relics`；`runRelics` 只根据终局统计、实体主角、真实事件、玩家干预、徽章、精彩瞬间和下饭节奏推导最多 6 个遗物；分享文本、收藏战报复制文本和复盘页新增“文明遗物库”；旧收藏战报缺少 `relics` 时自动降级；新增文明遗物库本地媒体底板。
- 验证：仅执行静态检查；按用户要求未执行 `npm run build`、`cargo check`、`.\run.ps1 -Action Check`、Tauri 启动或人工 UI 验证。

## 2026-06-20 19:31

- 需求点：继续增强下饭局长期收集目标，让文明遗物能跨本地战报形成图鉴发现进度。
- 路径：`src/utils/relicCodex.ts`、`src/components/PhoenixReview.tsx`、`public/media/relic-codex-matrix.svg`、`README.md`、`CHANGELOG.md`。
- 关键位置：新增 `relicCodex` 纯逻辑，按当前 `RunSummary` 与本地战报册归档聚合遗物发现状态、稀有度覆盖和来源覆盖；复盘页“事件图鉴”标签新增“遗物收藏进度”矩阵，旧归档缺少 `relics` 时自动降级；新增遗物图鉴本地媒体底板。
- 验证：仅执行静态检查；按用户要求未执行 `npm run build`、`cargo check`、`.\run.ps1 -Action Check`、Tauri 启动或人工 UI 验证。

## 2026-06-20 19:44

- 需求点：继续增强下饭局可玩性，把观测目标升级成有评级、有复盘价值的饭局委托单。
- 路径：`src/types/world.ts`、`src/utils/runCommissions.ts`、`src/utils/runSession.ts`、`src/utils/runArchive.ts`、`src/components/ObservationObjectivesPanel.tsx`、`src/components/PhoenixReview.tsx`、`public/media/commission-board.svg`、`README.md`、`CHANGELOG.md`。
- 关键位置：新增饭局委托纯逻辑，聚合观测目标、真实事件、实体快照、局内阶段和终局统计生成史官、火种、顶点、共生、危机五类委托评分；`RunSummary` 新增 `commissionBoard`，分享文本和收藏战报会带上委托评级；局内观测目标 HUD 显示综合委托评级；复盘页新增“饭局委托单”卡；旧收藏战报缺少该字段时自动降级；新增饭局委托本地媒体底板。
- 验证：仅执行静态检查；按用户要求未执行 `npm run build`、`cargo check`、`.\run.ps1 -Action Check`、Tauri 启动或人工 UI 验证。

## 2026-06-20 19:51

- 需求点：继续增强 4x/8x 下饭局观看体验，避免事件流在倍速下刷屏。
- 路径：`src/utils/eventDigest.ts`、`src/components/NarrativeFeed.tsx`、`public/media/event-digest-strip.svg`、`README.md`、`CHANGELOG.md`。
- 关键位置：新增事件摘要纯逻辑，按本局倍率选择近期窗口，只聚合已发生的真实 `WorldEvent`，统计危险、压力、正反馈、阶段覆盖和高频事件类型；`NarrativeFeed` 新增“事件摘要”卡，并在摘要存在时减少重复明细展示；新增事件摘要本地媒体底板。
- 验证：仅执行静态检查；按用户要求未执行 `npm run build`、`cargo check`、`.\run.ps1 -Action Check`、Tauri 启动或人工 UI 验证。

## 2026-06-20 20:07

- 需求点：继续增强下饭局可重玩性，让每局开局具备不同观察主题和复盘目标倾向。
- 路径：`src/types/world.ts`、`src/utils/runSession.ts`、`src/utils/runObjectives.ts`、`src/utils/runCommissions.ts`、`src/utils/runChallenges.ts`、`src/utils/runArchive.ts`、`src/App.tsx`、`src/components/MotherMachine.tsx`、`src/components/PhoenixReview.tsx`、`public/media/run-theme-selector.svg`、`README.md`、`CHANGELOG.md`。
- 关键位置：新增 `MealRunTheme` 与 `Random / Ascent / Symbiosis / Catastrophe / Apex` 主题选择；`Random` 在创建 `RunSession` 时解析为真实主题，仍只保存在局内会话态，不写 settings；`MotherMachine` 新增本局主题选择区；观测目标阈值与饭局委托评分会按主题调整；`RunSummary`、分享文本、收藏战报和复盘页展示主题；下一局挑战可回填推荐主题；新增本局主题选择本地媒体底板。
- 验证：仅执行静态检查；按用户要求未执行 `npm run build`、`cargo check`、`.\run.ps1 -Action Check`、Tauri 启动或人工 UI 验证。

## 2026-06-20 20:16

- 需求点：继续增强本局主题的可感知反馈，让主题不只影响目标评分，也能在局内和复盘中形成明确观察主线。
- 路径：`src/types/world.ts`、`src/utils/runThemeProfile.ts`、`src/utils/runSession.ts`、`src/utils/runArchive.ts`、`src/App.tsx`、`src/components/NarrativeFeed.tsx`、`src/components/PhoenixReview.tsx`、`public/media/theme-signal-ribbon.svg`、`README.md`、`CHANGELOG.md`。
- 关键位置：新增主题画像纯逻辑，根据本局主题、真实世界统计、实体快照、近期真实事件和终局关键事件推导主题状态、科学框架、历史类比、建议干预和证据；`NarrativeFeed` 新增“主题信号”卡；`RunSummary`、分享文本、收藏战报和 `PhoenixReview` 新增本局主题画像；旧摘要缺少画像时复盘页会按终局统计降级推导；新增主题信号本地媒体底板。
- 验证：仅执行静态检查；按用户要求未执行 `npm run build`、`cargo check`、`.\run.ps1 -Action Check`、Tauri 启动或人工 UI 验证。

## 2026-06-20 20:28

- 需求点：继续增强下饭局收藏反馈，让玩家在局内就知道真实事件解锁了哪些文明词条，而不是等到复盘才看到图鉴。
- 路径：`src/types/world.ts`、`src/utils/runDiscoveries.ts`、`src/utils/runSession.ts`、`src/utils/runArchive.ts`、`src/components/NarrativeFeed.tsx`、`src/components/PhoenixReview.tsx`、`public/media/codex-discovery-ribbon.svg`、`README.md`、`CHANGELOG.md`。
- 关键位置：新增 `RunDiscoveryCue` 和图鉴发现纯逻辑，只根据本局真实 `WorldEvent` 的首次触发和 `eventCodex` 词条生成发现记录；`NarrativeFeed` 新增“图鉴发现”卡；`RunSummary`、分享文本、收藏战报和 `PhoenixReview` 新增本局图鉴发现列表；新增图鉴发现本地媒体底板。
- 验证：仅执行静态检查；按用户要求未执行 `npm run build`、`cargo check`、`.\run.ps1 -Action Check`、Tauri 启动或人工 UI 验证。

## 2026-06-20 20:43

- 需求点：继续增强下饭局商业化传播，让局后复盘不只复制文本，也能生成可展示、可导出的视觉战报海报。
- 路径：`src/types/world.ts`、`src/utils/runShareCard.ts`、`src/utils/runSession.ts`、`src/utils/runArchive.ts`、`src/components/PhoenixReview.tsx`、`public/media/run-share-poster-frame.svg`、`README.md`、`CHANGELOG.md`。
- 关键位置：新增 `RunShareCard` 数据结构和 SVG 海报生成器，根据终局统计、主题画像、委托评级、图鉴发现、遗物、徽章和三幕战报生成局后海报；`RunSummary`、分享文本和收藏战报记录海报摘要；`PhoenixReview` 报告页新增战报海报预览与 SVG 导出按钮；新增战报海报本地媒体底板。
- 验证：仅执行静态检查；按用户要求未执行 `npm run build`、`cargo check`、`.\run.ps1 -Action Check`、Tauri 启动或人工 UI 验证。

## 2026-06-20 20:55

- 需求点：继续增强局前可玩性，让玩家不必逐项调参，也能直接选择一套有明确观看口味的下饭开局。
- 路径：`src/types/world.ts`、`src/utils/mealRunMenu.ts`、`src/components/MotherMachine.tsx`、`public/media/meal-run-menu.svg`、`README.md`、`CHANGELOG.md`。
- 关键位置：新增 `MealRunMenuCard` 和 `mealRunMenu` 纯逻辑，按日期轮转三张“今日下饭菜单”；菜单只套用本局局长、倍率、主题和少量生态参数 patch，仍经 `normalizeSettings` 归一化，不写入 settings、不生成伪事件；`MotherMachine` 在局长/倍率选择前新增菜单卡区，并保留所有手动调参入口；新增局前菜单本地媒体底板。
- 验证：仅执行静态检查；按用户要求未执行 `npm run build`、`cargo check`、`.\run.ps1 -Action Check`、Tauri 启动或人工 UI 验证。

## 2026-06-20 21:08

- 需求点：继续增强局前可读性，让玩家在吃饭前能快速判断这局该看什么、风险多高、第一手该保留哪种干预。
- 路径：`src/types/world.ts`、`src/utils/runStartForecast.ts`、`src/components/MotherMachine.tsx`、`public/media/run-start-forecast.svg`、`README.md`、`CHANGELOG.md`。
- 关键位置：新增 `RunStartForecast` 类型和餐前观测简报纯逻辑，只根据局长、倍率、主题、种群规模、突变率、熵压、胜利协议和环境类型推导压力等级、观察焦点、科学框架、历史类比、阶段提示和建议先手干预；`MotherMachine` 主题选择后新增实时简报面板，玩家调参时即时更新；该简报不写 settings、不生成 `WorldEvent`、不替代真实事件流；新增餐前观测简报本地媒体底板。
- 验证：仅执行静态检查；按用户要求未执行 `npm run build`、`cargo check`、`.\run.ps1 -Action Check`、Tauri 启动或人工 UI 验证。

## 2026-06-20 21:24

- 需求点：继续增强下饭局可传播与可复盘价值，让每局真实演化有一个可读、可分享的“下饭指数”。
- 路径：`src/types/world.ts`、`src/utils/mealRunScorecard.ts`、`src/utils/runSession.ts`、`src/utils/runArchive.ts`、`src/components/PhoenixReview.tsx`、`public/media/meal-run-scorecard.svg`、`README.md`、`CHANGELOG.md`。
- 关键位置：新增 `MealRunScorecard` 与四轴评分，按真实事件、终局统计、玩家高光、下饭节奏、饭局委托、图鉴发现、遗物和徽章计算历史密度、戏剧张力、玩家参与和科学可读性；`RunSummary`、分享文本、本地归档复制文本和复盘页展示下饭指数；旧摘要缺少该字段时复盘页按已保存真实数据降级推导；新增下饭指数本地媒体底板。
- 验证：仅执行静态检查；按用户要求未执行 `npm run build`、`cargo check`、`.\run.ps1 -Action Check`、Tauri 启动或人工 UI 验证。

## 2026-06-20 21:39

- 需求点：继续增强下饭局长期留存，让本地战报册形成跨局档案，而不是只保存单局列表。
- 路径：`src/types/world.ts`、`src/utils/mealTableLegacy.ts`、`src/components/PhoenixReview.tsx`、`public/media/meal-table-legacy.svg`、`README.md`、`CHANGELOG.md`。
- 关键位置：新增 `MealTableLegacy` 类型和饭桌传承纯逻辑，聚合当前复盘与本地收藏战报，推导局数、最高下饭局、收藏物数量、主题覆盖、传承等级、里程碑和下一局建议；复盘页在本地战报册前展示跨局档案；该逻辑只读当前 `RunSummary` 与 `localStorage` 归档，不新增 settings 字段、不伪造历史；新增饭桌传承本地媒体底板。
- 验证：仅执行静态检查；按用户要求未执行 `npm run build`、`cargo check`、`.\run.ps1 -Action Check`、Tauri 启动或人工 UI 验证。

## 2026-06-20 21:53

- 需求点：继续增强跨局留存，把饭桌传承档案的下一局建议升级成可直接载入的玩法挑战。
- 路径：`src/types/world.ts`、`src/utils/mealTableLegacy.ts`、`src/components/PhoenixReview.tsx`、`public/media/legacy-challenge-seal.svg`、`README.md`、`CHANGELOG.md`。
- 关键位置：`MealTableLegacy` 新增 `recommendedChallenge`，按主题缺口、收藏物数量、平均下饭指数和跨局样本数生成 `NextRunChallenge`；复盘页传承档案卡新增“载入传承挑战”按钮，复用现有挑战入口回填推荐局长、倍率和主题到 `MotherMachine`，不写 settings、不伪造历史；新增传承挑战本地封印素材。
- 验证：仅执行静态检查；按用户要求未执行 `npm run build`、`cargo check`、`.\run.ps1 -Action Check`、Tauri 启动或人工 UI 验证。

## 2026-06-20 22:07

- 需求点：继续增强下饭局传播表达，让真实复盘能生成一段可复制的桌边旁白稿。
- 路径：`src/types/world.ts`、`src/utils/mealRunBroadcast.ts`、`src/utils/runSession.ts`、`src/utils/runArchive.ts`、`src/components/PhoenixReview.tsx`、`public/media/meal-run-broadcast.svg`、`README.md`、`CHANGELOG.md`。
- 关键位置：新增 `MealRunBroadcast` 类型和下饭播报纯逻辑，根据三幕战报、真实事件、主题画像、下饭指数、饭局委托、收藏物和终局统计生成开场、转折、解释、收束四段播报；`RunSummary`、分享文本、本地归档复制文本和复盘页接入播报稿；复盘页新增“复制播报稿”按钮；旧摘要缺少播报字段时按已保存真实复盘降级推导；新增下饭播报本地媒体底板。
- 验证：仅执行静态检查；按用户要求未执行 `npm run build`、`cargo check`、`.\run.ps1 -Action Check`、Tauri 启动或人工 UI 验证。

## 2026-06-20 22:22

- 需求点：继续增强复盘后的可玩闭环，让一次下饭局能直接沉淀为下一局可复制、可载入的复开配方。
- 路径：`src/types/world.ts`、`src/utils/runReplayRecipe.ts`、`src/utils/runSession.ts`、`src/utils/runArchive.ts`、`src/components/PhoenixReview.tsx`、`public/media/run-replay-recipe.svg`、`README.md`、`CHANGELOG.md`。
- 关键位置：新增 `RunReplayRecipe` 类型和复开配方纯逻辑，根据真实事件、终局统计、下一局挑战、主题画像、下饭指数、桌边播报和玩家干预计数生成推荐局长、倍率、主题、目标、步骤和证据；`RunSummary`、分享文本、本地归档复制文本和复盘页接入配方；复盘页新增“复制配方”和“按配方再开”按钮，复用现有挑战回填入口，不写 settings、不伪造事件；新增复开配方本地媒体底板。
- 验证：仅执行静态检查；按用户要求未执行 `npm run build`、`cargo check`、`.\run.ps1 -Action Check`、Tauri 启动或人工 UI 验证。

## 2026-06-20 22:38

- 需求点：继续增强下饭局传播和收藏颗粒度，让复盘能直接产出三张可复制的饭点名场面卡。
- 路径：`src/types/world.ts`、`src/utils/mealMoments.ts`、`src/utils/mealRunBroadcast.ts`、`src/utils/runSession.ts`、`src/utils/runArchive.ts`、`src/components/PhoenixReview.tsx`、`public/media/meal-moment-cards.svg`、`README.md`、`CHANGELOG.md`。
- 关键位置：新增 `MealMomentDeck` 与 `MealMomentCard` 类型，按三幕战报、真实 `WorldEvent`、玩家高光、桌边播报和终局统计生成开场、转折、手痕/收束名场面；`RunSummary`、分享文本、本地归档复制文本和复盘页接入卡包；复盘页新增“饭点名场面卡包”和“复制卡包”按钮；旧摘要缺少该字段时按已保存真实复盘降级推导，不写 settings、不伪造事件；新增饭点名场面本地媒体底板。
- 验证：仅执行静态检查；按用户要求未执行 `npm run build`、`cargo check`、`.\run.ps1 -Action Check`、Tauri 启动或人工 UI 验证。

## 2026-06-20 22:55

- 需求点：继续增强局后快速识别和分享，让玩家一眼知道本局到底是什么“口味”。
- 路径：`src/types/world.ts`、`src/utils/mealRunFlavor.ts`、`src/utils/runSession.ts`、`src/utils/runArchive.ts`、`src/components/PhoenixReview.tsx`、`public/media/meal-run-flavor-tags.svg`、`README.md`、`CHANGELOG.md`。
- 关键位置：新增 `MealRunFlavorProfile` 与 `MealRunFlavorTag` 类型，根据本局主题、局长倍率、终局统计、真实事件、玩家干预、下饭指数、图鉴、遗物、徽章和名场面推导最多 6 个口味标签；`RunSummary`、分享文本、本地归档复制文本和复盘页接入口味标签；复盘页新增“饭局口味标签”和“复制口味”按钮；旧摘要缺少该字段时按已保存真实复盘降级推导，不写 settings、不伪造事件；新增饭局口味本地媒体底板。
- 验证：仅执行静态检查；按用户要求未执行 `npm run build`、`cargo check`、`.\run.ps1 -Action Check`、Tauri 启动或人工 UI 验证。

## 2026-06-20 23:08

- 需求点：继续增强下饭局商业化传播，让局后复盘能一眼看到哪些素材已经可发布、哪些还缺真实演化证据。
- 路径：`src/types/world.ts`、`src/utils/mealRunShareBundle.ts`、`src/utils/runSession.ts`、`src/utils/runArchive.ts`、`src/components/PhoenixReview.tsx`、`public/media/meal-run-share-bundle.svg`、`README.md`、`CHANGELOG.md`。
- 关键位置：新增 `MealRunShareBundle` 与 `MealRunShareAsset` 类型，聚合战报海报、口味标签、桌边播报、名场面卡包、复开配方、文明遗物、图鉴发现和再开挑战；`RunSummary`、分享文本、本地归档复制文本和复盘页接入传播素材包；复盘页新增“传播素材包”和“复制素材包”按钮，旧摘要缺少字段时按已保存真实复盘降级推导；缺失素材只标记为待补，不伪造事件、不写 settings；新增传播素材包本地媒体底板。
- 验证：仅执行静态检查；按用户要求未执行 `npm run build`、`cargo check`、`.\run.ps1 -Action Check`、Tauri 启动或人工 UI 验证。

## 2026-06-20 23:20

- 需求点：继续增强下饭局传播转化，让玩家复盘后不用再自己想标题，能直接复制三条不同场景的传播文案。
- 路径：`src/types/world.ts`、`src/utils/mealRunCopyHooks.ts`、`src/utils/runSession.ts`、`src/utils/runArchive.ts`、`src/components/PhoenixReview.tsx`、`public/media/meal-run-copy-hooks.svg`、`README.md`、`CHANGELOG.md`。
- 关键位置：新增 `MealRunCopyHookPack` 与 `MealRunCopyHook` 类型，根据真实结局、终局统计、关键事件、口味标签、传播素材包、下饭指数、名场面和播报生成群聊、短视频、收藏册三条传播标题；`RunSummary`、分享文本、本地归档复制文本和复盘页接入标题组；复盘页新增“传播标题组”和“复制标题组”按钮；旧摘要缺少字段时按已保存真实复盘降级推导，不写 settings、不伪造事件；新增传播标题组本地媒体底板。
- 验证：仅执行静态检查；按用户要求未执行 `npm run build`、`cargo check`、`.\run.ps1 -Action Check`、Tauri 启动或人工 UI 验证。

## 2026-06-20 23:34

- 需求点：继续增强下饭局短视频传播能力，让复盘能直接生成 15/30/60 秒的分镜脚本，而不是只有标题和长战报。
- 路径：`src/types/world.ts`、`src/utils/mealRunSocialClips.ts`、`src/utils/runSession.ts`、`src/utils/runArchive.ts`、`src/components/PhoenixReview.tsx`、`public/media/meal-run-social-clips.svg`、`README.md`、`CHANGELOG.md`。
- 关键位置：新增 `MealRunSocialClipPack`、`MealRunSocialClip` 和 `MealRunSocialClipSegment` 类型，根据三幕战报、真实事件、饭点名场面、桌边播报、传播标题组、传播素材包和下饭指数生成 15/30/60 秒分镜；`RunSummary`、分享文本、本地归档复制文本和复盘页接入社交切片脚本；复盘页新增“社交切片脚本”和“复制脚本”按钮；旧摘要缺少字段时按已保存真实复盘降级推导，不写 settings、不伪造事件；新增社交切片本地媒体底板。
- 验证：仅执行静态检查；按用户要求未执行 `npm run build`、`cargo check`、`.\run.ps1 -Action Check`、Tauri 启动或人工 UI 验证。

## 2026-06-20 23:48

- 需求点：继续增强下饭局饭桌传播和二次观看转化，让玩家能直接复制基于本局证据生成的弹幕/群聊反应。
- 路径：`src/types/world.ts`、`src/utils/mealRunReactions.ts`、`src/utils/runSession.ts`、`src/utils/runArchive.ts`、`src/components/PhoenixReview.tsx`、`public/media/meal-run-reactions.svg`、`README.md`、`CHANGELOG.md`。
- 关键位置：新增 `MealRunReactionPack` 与 `MealRunReaction` 类型，根据真实事件、终局统计、饭局口味、传播素材包、传播标题组、社交切片脚本、复开配方、文明遗物和图鉴发现生成惊叹、解释、战术、收藏、二刷和金句六类饭桌弹幕；`RunSummary`、分享文本、本地归档复制文本和复盘页接入反应包；复盘页新增“饭桌弹幕反应包”和“复制弹幕”按钮；旧摘要缺少字段时按已保存真实复盘降级推导，不写 settings、不伪造真实观众评论；新增饭桌弹幕本地媒体底板。
- 验证：仅执行静态检查；按用户要求未执行 `npm run build`、`cargo check`、`.\run.ps1 -Action Check`、Tauri 启动或人工 UI 验证。

## 2026-06-21 00:06

- 需求点：继续增强下饭局可重玩性，让复盘不只给一条挑战，而是沉淀为可复制、可点击载入的三路线下局牌组。
- 路径：`src/types/world.ts`、`src/utils/mealRunVariants.ts`、`src/utils/runSession.ts`、`src/utils/runArchive.ts`、`src/components/PhoenixReview.tsx`、`public/media/meal-run-variant-deck.svg`、`README.md`、`CHANGELOG.md`。
- 关键位置：新增 `MealRunVariantDeck`、`MealRunVariantRoute` 与 `MealRunVariantKind` 类型，根据真实结局、终局统计、真实事件、玩家干预、复开配方、弹幕反应和社交切片生成复现、反事实和高压三条路线；`RunSummary`、分享文本、本地归档复制文本和复盘页接入变体牌组；复盘页新增“复制牌组”和“载入变体”按钮，复用现有 `NextRunChallenge` 回填局长、倍率和主题，不写 settings、不伪造事件；新增下局变体本地媒体底板。
- 验证：仅执行静态检查；按用户要求未执行 `npm run build`、`cargo check`、`.\run.ps1 -Action Check`、Tauri 启动或人工 UI 验证。

## 2026-06-21 00:18

- 需求点：继续增强下饭局可玩目标感，让复盘把真实演化结果压成一张能追逐、能复制的 3x3 下饭宾果卡。
- 路径：`src/types/world.ts`、`src/utils/mealRunBingo.ts`、`src/utils/runSession.ts`、`src/utils/runArchive.ts`、`src/components/PhoenixReview.tsx`、`public/media/meal-run-bingo-board.svg`、`README.md`、`CHANGELOG.md`。
- 关键位置：新增 `MealRunBingoBoard`、`MealRunBingoCell` 与 `MealRunBingoCellKind` 类型，根据真实统计、真实事件、玩家干预、观测目标、图鉴发现、遗物、徽章、口味标签和下局变体生成 9 格达成盘；未达成格子只作为下一局追逐目标，不伪造成已发生；`RunSummary`、分享文本、本地归档复制文本和复盘页接入宾果卡；复盘页新增“复制宾果”按钮与本地视觉底板。
- 验证：仅执行静态检查；按用户要求未执行 `npm run build`、`cargo check`、`.\run.ps1 -Action Check`、Tauri 启动或人工 UI 验证。

## 2026-06-21 00:34

- 需求点：继续增强开局前的可玩选择，让玩家在吃饭前不只是选局长/倍率，还能选一个会被终局真实结果判定的餐前押题。
- 路径：`src/types/world.ts`、`src/utils/mealRunPredictions.ts`、`src/utils/runSession.ts`、`src/utils/runArchive.ts`、`src/App.tsx`、`src/components/MotherMachine.tsx`、`src/components/PhoenixReview.tsx`、`public/media/meal-run-prediction-slip.svg`、`README.md`、`CHANGELOG.md`。
- 关键位置：新增 `MealRunPrediction` 与 `MealRunPredictionResult` 类型；`mealRunPredictions` 按局前配置、局长、倍率、主题和餐前观测简报生成存续、历史密度、主题信号、手痕和收藏五类押题；`MotherMachine` 新增“餐前押题”选择区，选择结果只随本局 `RunSession` 带入；`summarizeRun` 终局按真实事件、终局统计、玩家干预和收藏物判定命中/落空；复盘页新增押题结果卡和复制按钮；本地归档复制文本同步押题结果；新增餐前押题本地媒体底板。
- 验证：仅执行静态检查；按用户要求未执行 `npm run build`、`cargo check`、`.\run.ps1 -Action Check`、Tauri 启动或人工 UI 验证。

## 2026-06-20 23:20

- 需求点：继续把餐前押题从复盘结果前移到局内观看过程，让玩家能边吃边追押题命中进度。
- 路径：`src/types/world.ts`、`src/utils/mealRunPredictionProgress.ts`、`src/App.tsx`、`src/components/NarrativeFeed.tsx`、`public/media/meal-run-prediction-progress.svg`、`README.md`、`CHANGELOG.md`。
- 关键位置：新增 `MealRunPredictionProgress` 类型和纯前端押题进度推导；局内进度只读取 `WorldStats` 与真实 `WorldEvent[]`，不写 settings、不新增后端状态、不伪造事件；`NarrativeFeed` 新增“押题进度”卡，展示命中分、目标、实时证据和建议干预；新增局内押题进度本地媒体底板。
- 验证：仅执行静态检查；按用户要求未执行 `npm run build`、`cargo check`、`.\run.ps1 -Action Check`、Tauri 启动或人工 UI 验证。

## 2026-06-20 23:25

- 需求点：继续增强下饭局的科学性和历史感，让玩家不只看单条事件，还能看到真实事件之间的因果线索。
- 路径：`src/types/world.ts`、`src/utils/worldEventCausality.ts`、`src/components/NarrativeFeed.tsx`、`public/media/event-causality-chain.svg`、`README.md`、`CHANGELOG.md`。
- 关键位置：新增 `WorldEventCausality` 类型和事件因果链纯逻辑；按真实 `WorldEvent[]` 的前后顺序从最近事件倒查前因，给出标题、解释、置信度和证据，不生成事件、不写 settings；`NarrativeFeed` 新增“文明因果链”卡；新增局内因果链本地媒体底板。
- 验证：仅执行静态检查；按用户要求未执行 `npm run build`、`cargo check`、`.\run.ps1 -Action Check`、Tauri 启动或人工 UI 验证。

## 2026-06-20 23:31

- 需求点：继续增强玩家轻操作反馈，让祝福、投毒、隔离、放逐和钉选观察不只是事件记录，而能在局内形成可观看的“手痕回响”。
- 路径：`src/types/world.ts`、`src/utils/playerImpactTrace.ts`、`src/components/NarrativeFeed.tsx`、`public/media/player-impact-trace.svg`、`README.md`、`CHANGELOG.md`。
- 关键位置：新增 `PlayerImpactTrace` 类型和玩家手痕回响纯逻辑；按最近一次玩家干预后的真实事件、当前世界统计和受影响实体数推导待定、救场、压制、压力或过量回响；`NarrativeFeed` 新增“手痕回响”卡，展示置信度、后续事件、正向/压力计数和证据；新增局内手痕回响本地媒体底板；不新增后端状态、不写 settings、不伪造干预结果。
- 验证：仅执行静态检查；按用户要求未执行 `npm run build`、`cargo check`、`.\run.ps1 -Action Check`、Tauri 启动或人工 UI 验证。

## 2026-06-20 23:36

- 需求点：继续增强数字生命互助、攻击和进化的可观看性，让玩家能在局内看到当前世界形成了哪些“阵营”。
- 路径：`src/types/world.ts`、`src/utils/civilizationFactions.ts`、`src/components/WorldPulsePanel.tsx`、`public/media/civilization-faction-ledger.svg`、`README.md`、`CHANGELOG.md`。
- 关键位置：新增 `CivilizationFaction` 与 `CivilizationFactionLedger` 类型；新增阵营谱纯逻辑，按实体协作、利他、能量、毒素、代际和适应度真实快照推导看护者、掠食压力源、代际先锋、稳态幸存者和濒压个体；`WorldPulsePanel` 新增紧凑“阵营谱”区，显示占比、领头实体、建议干预和证据；新增局内阵营谱本地媒体底板；不新增后端状态、不写 settings、不伪造实体关系。
- 验证：仅执行静态检查；按用户要求未执行 `npm run build`、`cargo check`、`.\run.ps1 -Action Check`、Tauri 启动或人工 UI 验证。

## 2026-06-20 23:41

- 需求点：继续增强下饭局观看张力，让玩家能在局内看到当前世界更可能走向灭绝、黄金时代、顶点突破、稳态收束还是高波动结局。
- 路径：`src/types/world.ts`、`src/utils/endgameForecast.ts`、`src/App.tsx`、`src/components/WorldPulsePanel.tsx`、`public/media/endgame-forecast-scope.svg`、`README.md`、`CHANGELOG.md`。
- 关键位置：新增 `RunEndgameForecast` 类型和终局走向预报纯逻辑；按本局剩余时间、真实 `WorldStats`、实体快照和最近真实事件推导结局倾向、置信度、动量条、建议干预和证据；`WorldPulsePanel` 新增“终局走向”卡，`App` 只传入当前 `RunSession` 与局内时钟；新增终局预报本地媒体底板；不新增后端状态、不写 settings、不把未来伪造成已发生事件。
- 验证：仅执行静态检查；按用户要求未执行 `npm run build`、`cargo check`、`.\run.ps1 -Action Check`、Tauri 启动或人工 UI 验证。

## 2026-06-20 23:47

- 需求点：继续增强下饭局观看目标感，让玩家在局内知道哪些数字生命正在成为顶点主角、协作看护者、瓶颈幸存者或威胁源。
- 路径：`src/types/world.ts`、`src/utils/liveProtagonists.ts`、`src/App.tsx`、`src/components/DirectorCuePanel.tsx`、`public/media/live-protagonist-radar.svg`、`README.md`、`CHANGELOG.md`。
- 关键位置：新增 `LiveProtagonistRadar` 与候选主角类型；新增纯前端主角雷达推导器，只按真实实体快照、世界统计和最近真实事件评分，不生成事件、不写 settings；`App` 统一推导后传给 `DirectorCuePanel`，导演镜头 HUD 新增紧凑“主角雷达”区，显示候选角色、实体编号、置信度、核心指标和建议干预；新增局内主角雷达本地媒体底板。
- 验证：仅执行静态检查；按用户要求未执行 `npm run build`、`cargo check`、`.\run.ps1 -Action Check`、Tauri 启动或人工 UI 验证。

## 2026-06-20 23:54

- 需求点：继续增强数字生命互助和攻击的可观看性，让玩家能看到当前哪两个实体正在形成互助、能量转移、掠食或毒性冲突。
- 路径：`src/types/world.ts`、`src/utils/liveInteractions.ts`、`src/components/WorldPulsePanel.tsx`、`public/media/live-interaction-network.svg`、`README.md`、`CHANGELOG.md`。
- 关键位置：新增 `LiveInteractionNetwork` 与交互边类型；新增纯前端交互网络推导器，按实体距离、能量、毒素、适应度、利他和协作扫描近邻配对，并结合最近真实事件增强信号；`WorldPulsePanel` 新增紧凑“交互网络”区，显示互助/攻击比例、实体对、强度、距离和建议干预，并给态势面板增加视口内滚动，降低小高度窗口遮挡风险；新增交互网络本地媒体底板；不新增后端状态、不写 settings、不伪造已发生事件。
- 验证：仅执行静态检查；按用户要求未执行 `npm run build`、`cargo check`、`.\run.ps1 -Action Check`、Tauri 启动或人工 UI 验证。

## 2026-06-21 3A 可玩核心垂直切片

- 需求点：把下饭局从“观测叙事 + 复盘包装”推进到真实可玩核心，强化玩家干预因果、实体命运线、Arena 可读冲突和 Local 有用工作演化。
- 路径：`src-tauri/src/evolution/benchmark.rs`、`src-tauri/src/evolution/wasm_runtime.rs`、`src-tauri/src/evolution/mutation.rs`、`src-tauri/src/evolution/dna_splicer.rs`、`src-tauri/src/evolution/entity.rs`、`src-tauri/src/evolution/simulation_engine.rs`、`src/types/world.ts`、`src/utils/interventionTrace.ts`、`src/utils/runSession.ts`、`src/utils/runObjectives.ts`、`src/App.tsx`、`src/components/Arena.tsx`、`src/components/SimulationHud.tsx`、`src/components/NarrativeFeed.tsx`、`src/components/PhoenixReview.tsx`、`README.md`、`CHANGELOG.md`。
- 关键位置：新增八类 useful-work 任务评分与 baseline DNA；Local 突变为任务 DNA 追加可验证变体标记并刷新实体策略倾向；新增 `InterventionTrace` 与 `EntityFateLine`，把祝福、投毒、隔离、放逐、钉选的后续 90 秒结果追踪到 UI 与复盘；Arena 新增互助/攻击/资源转移交互线、干预印记、濒死/高毒/顶点实体状态；局内目标压成三项主目标并加入“改写命运”目标。
- 验证：`cd src-tauri; cargo test` 通过；`.\run.ps1 -Action Check -NoPause` 通过；`cargo check --features cuda` 仍因当前机器缺少 `nvcc` 与 MSVC `cl` 失败，CUDA 只保留 CPU fallback 状态，不能宣称已交付。

## 2026-06-21 5A 局内体验导演与音画操作收口

- 需求点：继续按 5A 方向优化音乐、美术、操作、逻辑、代码实现和交互体验，让局内反馈从零散卡片变成统一的音画操作闭环。
- 路径：`src/utils/experienceDirector.ts`、`src/utils/useRunHotkeys.ts`、`src/components/ExperienceDirectorPanel.tsx`、`src/App.tsx`、`src/components/Arena.tsx`、`src/components/SimulationHud.tsx`、`src/utils/audio/types.ts`、`src/utils/audio/engine.ts`、`src/utils/audio/sfxPresets.ts`、`src/utils/audio/presets.ts`、`README.md`、`CHANGELOG.md`。
- 关键位置：新增体验导演纯逻辑，按真实统计、实体、目标、交互网络、押题进度、下饭节奏和玩家手痕推导危机、升温、改命、熄火等局内态势；新增体验导演 HUD 卡；Arena 增加低透明压力场和随态势变色的灯光；音频引擎加入压力、交互热度和手痕动量混音，新增危机、目标完成和命运结算 SFX 以及 `Causality Engine` 演化曲目；新增局内快捷键 hook，支持暂停/恢复、选择五种干预、标记高光和复盘，且避开输入框、按钮、设置弹窗和微观战场。
- 验证：`.\run.ps1 -Action Check -NoPause` 通过；后续仍需 Tauri 实机手测快捷键、HUD 遮挡、音频播放和 1280x720/1600x900/1920x1080 视口。

## 2026-06-21 多智能体 5A 局内闭环审查修复

- 需求点：按音乐、美术/可读性、玩法系统和代码架构四个智能体审查结果，继续修复会造成“假手痕”、弱音频反馈、HUD 遮挡和轮询性能风险的问题。
- 路径：`src/App.tsx`、`src/components/Arena.tsx`、`src/components/InterventionDock.tsx`、`src/components/SimulationHud.tsx`、`src/types/world.ts`、`src/utils/audio/engine.ts`、`src/utils/liveInteractions.ts`、`src/utils/runObjectives.ts`、`src/utils/useRunHotkeys.ts`、`README.md`、`CHANGELOG.md`。
- 关键位置：局内干预改为“选择类型 + 武装后下一次点击生效”，普通实体点击默认只观察，成功/暂停/复盘/Esc 会解除武装；干预事件写入 `entityId`、`traceId`、命中实体和 affected 指标，`改写命运` 目标只统计命中实体的玩家事件，交互线不再被无实体玩家事件全局抬高；真实世界大事件接入 SFX 耳标；音频关闭后重开会按当前阶段恢复 BGM，并取消过期延迟切歌；世界轮询改为递归 timeout + in-flight guard；Arena 增加宽屏图例并减少热路径 `THREE.Color` 分配；1024-1279 宽度改用底部 HUD 抽屉。
- 验证：`.\run.ps1 -Action Check -NoPause` 通过；后续仍需人工 Tauri 验证武装干预、空点击、快捷键、音频耳标、150% 字号和 1280x720 视口。

## 2026-06-21 多智能体 5A 音画可读性二次收口

- 需求点：继续按叙事 HUD、程序化音乐和 Arena 性能三个智能体审查结果优化局内体验，降低信息墙、随机音乐漂移和高密度渲染噪声。
- 路径：`src/components/NarrativeFeed.tsx`、`src/components/SimulationHud.tsx`、`src/components/Arena.tsx`、`src/App.tsx`、`src/utils/audio/types.ts`、`src/utils/audio/engine.ts`、`src/utils/audio/presets.ts`、`README.md`、`CHANGELOG.md`。
- 关键位置：`NarrativeFeed` 改为局内状态 + 最新关键事件首屏展示，押题、下饭节奏、手痕、主题、图鉴、事件摘要、因果链和史官讲解进入可展开情报层，旧事件进入折叠历史；小屏 HUD 的事件页优先显示叙事流；`AudioGameState` 增加本局主题、阶段、体验 tone 和最新事件信号，演化曲目补 tags，音频引擎按真实局势打分并用稳定 hash 兜底选曲；Arena 水波纹改为 Three ref 动画，实体实例容量分桶，高密度下降星空、Bloom 和自发光，并只为可见交互边建立实体索引。
- 验证：待执行 `git diff --check`、TSX button 扫描、反模式扫描、`cd src-tauri; cargo test`、`.\run.ps1 -Action Check -NoPause`。

## 2026-06-21 多智能体 5A 二局动机与操作防误触收口

- 需求点：继续按玩法制片、战场美术、交互手感和技术架构四个智能体审查结果，修复二局挑战断链、Arena 事件不可见、快捷键误触和局内高频派生风险。
- 路径：`src/types/world.ts`、`src/utils/runSession.ts`、`src/utils/runObjectives.ts`、`src/utils/useRunHotkeys.ts`、`src/utils/experienceDirector.ts`、`src/utils/audio/engine.ts`、`src/components/MotherMachine.tsx`、`src/components/NarrativeFeed.tsx`、`src/components/Arena.tsx`、`src/App.tsx`、`README.md`、`CHANGELOG.md`。
- 关键位置：复盘挑战可作为 `loadedChallenge` 进入 `RunSession`，开局事件记录挑战标题，局内目标会置顶追踪挑战进度且只读取真实统计、事件、有效干预和实体快照；下饭节奏进入标记或干预窗口时自动展开操作追踪层；Arena 最新事件信标支持按事件类型多点标记高毒、低能、高协作、高能、高分或高代际实体簇；武装干预点击成功或失败后不再继续触发实体详情读取；暂停中数字键不能武装干预，手动终结复盘需要二次确认；Arena 实例脏检查纳入 instance index，降低实体顺序变化导致的矩阵/点击错位风险；体验导演 cue id 纳入最新真实事件和饭点节奏，音频自适应混音按量化签名降采样。
- 验证：待执行 `git diff --check`、TSX button 扫描、反模式扫描、`cd src-tauri; cargo test`、`.\run.ps1 -Action Check -NoPause`。

## 2026-06-21 多智能体 5A HUD 连续观看与战场符号收口

- 需求点：继续按 HUD/UX、设置操作反馈和 Arena 战场符号三个智能体审查结果，修复选中实体吞掉事件流、设置误丢修改和手痕/交互方向不够可读的问题。
- 路径：`src/components/SimulationHud.tsx`、`src/components/SettingsModal.tsx`、`src/components/Arena.tsx`、`README.md`、`CHANGELOG.md`。
- 关键位置：桌面右轨选中实体时改为紧凑检查卡 + 事件流 + 钉选样本共存；小屏 HUD 新增“实体”标签并保留事件/干预/态势标签，抽屉改为 flex 滚动区并加入安全区偏移；设置弹窗新增未保存关闭确认、重置草稿确认和保存中表单锁定；Arena 交互线新增源/目标端点标记，玩家手痕新增到受影响实体的因果连线与实体光环，宽屏图例补充能量转移、投毒手痕和钉选颜色。
- 验证：待执行 `git diff --check`、TSX button 扫描、反模式扫描、`cd src-tauri; cargo test`、`.\run.ps1 -Action Check -NoPause`。

## 2026-06-21 多智能体 5A HUD 连续观看与战场符号验证

- 验证：`git diff --check` 通过，仅有 CRLF 提示；TSX button type 扫描无命中；反模式扫描仅命中 `task_abi_prompt(...)` 函数名误报；`cd src-tauri; cargo test` 通过，3 个 Wasm useful-work 测试全过；`.\run.ps1 -Action Check -NoPause` 通过。
- 非阻塞警告：Vite 提示 Browserslist 数据旧和单 chunk 体积较大；Rust 仍提示 `MutationEngine::mutate` 未使用。

## 2026-06-21 多智能体 5A 挑战规则与后端边界收口

- 需求点：继续把“二局动机”和“5A 可玩闭环”从复盘卡片推进为真实规则，同时修复 HUD 重复派生和后端 settings 过度信任前端的问题。
- 路径：`src/types/world.ts`、`src/utils/challengeRules.ts`、`src/utils/runChallenges.ts`、`src/App.tsx`、`src/components/MotherMachine.tsx`、`src/components/InterventionDock.tsx`、`src/components/SimulationHud.tsx`、`src/components/WorldPulsePanel.tsx`、`src/components/ObservationObjectivesPanel.tsx`、`src-tauri/src/settings_commands.rs`、`README.md`、`CHANGELOG.md`。
- 关键位置：新增 `NextRunChallengeRules`，复盘挑战现在携带允许干预、主动干预上限和本局临时生态参数 patch；`App.tsx` 开局时只把挑战 patch 应用到运行态配置，不写入 settings，并在干预选择、Arena 落点和强制突变入口统一拦截违反挑战规则的操作；`InterventionDock` 和 `MotherMachine` 显示规则说明、禁用锁定和挑战 setup；`SimulationHud` 改为桌面轨/移动抽屉二选一渲染，并复用 App 已推导的目标和交互网络；后端 `save_settings`、`load_settings`、`update_settings` 增加 settings 归一化防线，限制实体上限、tick 间隔、字号、突变率、熵压、音量、视觉档位、胜利规则、环境类型、任务 id 和 CUDA feature 不可用时的后端请求。
- 验证：`cargo test settings_commands` 通过，新增 3 个 settings 边界测试；`cd src-tauri; cargo check` 通过；`cargo fmt --check` 通过；`cd src-tauri; cargo test` 通过，16 个 Rust 测试全过；`.\run.ps1 -Action Check -NoPause` 通过；`.\run.ps1 -Action Build -NoPause` 通过并产出 release exe、MSI 与 NSIS 安装包；跨行 TSX button type 扫描无命中；反模式扫描无命中；`git diff --check` 通过，仅有 CRLF 提示。

## 2026-06-21 多智能体 5A 首屏拆包与音画同源收口

- 需求点：继续按 5A 方向优化代码实现、交互体验和音乐氛围，处理 Vite 主 chunk 过大、复盘重型 tab 静态加载、微观战场二次渲染和 BGM 事件口径不一致的问题。
- 路径：`src/App.tsx`、`src/components/GenesisGate.tsx`、`src/components/PhoenixReview.tsx`、`src/components/MicroArena.tsx`、`README.md`、`CHANGELOG.md`。
- 关键位置：`App.tsx` 对 `MotherMachine`、`Arena`、`SimulationHud`、`PhoenixReview`、`SettingsModal` 和 `MicroArena` 做阶段级 `React.lazy`，并按 hover/focus/阶段切换预加载；`GenesisGate` 的系统配置弹窗改为按需加载；`PhoenixReview` 的进化星图和万神殿改为 tab 级懒加载；`MicroArena` 的真实内存网格改为 `useMemo` 从实体快照派生，避免 effect 派生 state 造成打开后再渲染；BGM recent event 改用与 Arena 焦点同源的有效世界事件，排除开局/终局和未命中干预。
- 构建结果：Vite 由单一约 1.84MB JS 主包拆成多个 chunk；当前主要 chunk 包括 `index` 约 1.27MB、`PhoenixReview` 约 134KB、`HallOfFame` 约 126KB、`SimulationHud` 约 91KB、`Arena` 约 88KB、`MotherMachine` 约 43KB、`SettingsModal` 约 34KB、`MicroArena` 约 5KB、`PhylogeneticTree` 约 6KB。主包仍偏大，下一步应抽 `SimulationStage` 继续迁出运行态派生逻辑。
- 验证：`.\run.ps1 -Action Check -NoPause` 通过；跨行 TSX button type 扫描无命中；反模式扫描无命中。后续仍需执行 `git diff --check`、Rust 全量测试和 release build 收口。

## 2026-06-21 多智能体 5A 因果目标与音效秩序收口

- 需求点：继续把“能看”推进到“能玩”，修复挑战可被单事件提前完成、自然事件单帧噪声过敏和多源 SFX 同帧叠音的问题。
- 路径：`src/utils/runObjectives.ts`、`src/utils/worldEvents.ts`、`src/utils/audio/types.ts`、`src/utils/audio/engine.ts`、`src/utils/audio/sfxPresets.ts`、`README.md`、`CHANGELOG.md`。
- 关键位置：`runObjectives.ts` 的挑战结算现在要求更硬的真实后果：黄金时代复现需进入终局窗口，共生保护需同时满足协作事件与至少 2 个协作候选并进入稳定观察窗，放逐暴君需掠食事件、已结算放逐 trace 和放逐后的协作/资源/黄金时代正向信号；主动手痕 trace 不再仅凭 `RESOLVED` 状态完成，必须有能量、毒素、分数、代际、救活、伤害或消亡等结果信号；`worldEvents.ts` 为自然事件加入 12 秒观测 warmup、上一窗口跨阈值/持续信号和首个顶点/掠食候选的前后窗口证据；音频 `SfxRecipe` 增加 `route` 与 `priority`，导演、危机、目标完成和命运结算类 SFX 进入 stinger 队列，同一 JS tick 只播放最高优先级提示，点击、错误和干预命中仍即时播放。
- 验证：`.\run.ps1 -Action Check -NoPause` 通过；`git diff --check` 通过，仅有 CRLF 提示；跨行 TSX button type 扫描无命中；反模式扫描无命中；`cd src-tauri; cargo test` 通过，16 个 Rust 测试全过。后续仍需 Tauri 实机手测 125%/150% 字号下的事件触发节奏、放逐挑战链路和实际音频叠音观感。

## 2026-06-21 多智能体 5A 证据窗口与复盘角色验真

- 需求点：继续修复“看起来像发生了但证据不够硬”的玩法问题，并降低局内同一危机被多路音效重复放大的疲劳感。
- 路径：`src/App.tsx`、`src/utils/worldEvents.ts`、`src/utils/civilizationCast.ts`、`README.md`、`CHANGELOG.md`。
- 关键位置：`worldEvents.ts` 新增 `WorldEventEvidenceSample`、样本创建与窗口压缩 helper；`App.tsx` 在世界轮询中维护最近 30 秒轻量证据窗口并传给 `deriveWorldEvents`，自然事件现在优先用窗口首尾、趋势和稳定实体候选判定，且在开局、启动失败、重置、切换世界视图时清空证据，避免跨局污染；`civilizationCast.ts` 为复盘主角席的 `CARETAKER` 与 `PREDATOR` 增加硬阈值，避免普通排名标签污染“共生保护局”或“放逐暴君局”；`App.tsx` 新增叙事音频仲裁，世界事件、导演 cue、体验 cue、本刻焦点、目标完成和熵警告在 4.5 秒内按优先级收束，操作反馈仍即时播放。
- 验证：`.\run.ps1 -Action Check -NoPause` 通过；`git diff --check` 通过，仅有 CRLF 提示；跨行 TSX button type 扫描无命中；反模式扫描无命中；`cd src-tauri; cargo test` 通过，16 个 Rust 测试全过。后续仍需 Tauri 实机手测事件触发节奏、复盘挑战推荐和叙事音效仲裁听感。

## 2026-06-21 多智能体 5A SimulationStage 架构减重

- 需求点：继续优化代码实现、操作闭环和局内性能，把 `App.tsx` 从“主状态机 + 局内重推导 + HUD/Arena 组合”拆回生命周期入口。
- 路径：`src/App.tsx`、`src/components/SimulationStage.tsx`、`README.md`、`CHANGELOG.md`。
- 关键位置：新增 `SimulationStage.tsx`，集中承载 Arena、SimulationHud、微观战场、底部控制条、局内快捷键、目标完成提示、节奏记录、高光标记、导演/体验/本刻焦点派生和局内音乐状态；`App.tsx` 只保留后端轮询、设置、运行生命周期、复盘汇总和全局音频闸口；HUD 派生使用约 750ms 快照节流，Arena 仍使用实时实体快照，减少高频轮询时左右 HUD 重算压力。
- 构建结果：`.\run.ps1 -Action Check -NoPause` 通过；Vite 产出独立 `SimulationStage` chunk 约 39.86KB，`Arena` 约 88.49KB，`SimulationHud` 约 101.25KB，主 `index` chunk 降至约 1.23MB；主包仍超过 500KB，后续需继续拆共享复盘/媒体工具和重型可视化依赖。

## 2026-06-21 多智能体 5A 复盘汇总按需加载

- 需求点：继续压缩主包并清理架构坏味道，避免轻量会话/格式化工具把复盘传播、宾果、反应包、短视频脚本等重型模块静态拖入局内路径。
- 路径：`src/utils/runSession.ts`、`src/utils/runSummary.ts`、`src/App.tsx`、`README.md`、`CHANGELOG.md`。
- 关键位置：新增 `runSummary.ts` 承载 `summarizeRun` 与复盘汇总依赖；`runSession.ts` 回归局长、倍率、阶段、倒计时和文案格式化；`App.tsx` 在 `preloadReviewStage` 和终局复盘时动态加载 `runSummary`，普通开局/局内 HUD 不再因 `formatIntervention` 等轻函数拉入整条复盘工具链。
- 构建结果：`.\run.ps1 -Action Check -NoPause` 通过；Vite 产出独立 `runSummary` chunk 约 37.61KB，并拆出 `runObjectives`、`runCommissions`、`mealRunBingo` 等复盘相关 chunk；主 `index` chunk 进一步降至约 1.10MB，仍需继续拆 `PhoenixReview` 内部媒体和重型可视化依赖。

## 2026-06-22 多智能体 5A 真实性与首屏性能收口

- 需求点：继续按 5A 垂直切片推进，修复未命中干预污染复盘、实体检查器“突变神谕”误导、入口 Three/R3F 首屏静态加载和 CUDA/Local 能力宣传过度的问题。
- 路径：`src/utils/interventionKinds.ts`、`src/utils/runSummary.ts`、`src/utils/mealRunPredictionProgress.ts`、`src/utils/playerImpactTrace.ts`、`src/utils/liveInteractions.ts`、`src/App.tsx`、`src/components/SimulationHud.tsx`、`src/components/GenesisGate.tsx`、`src/components/SettingsModal.tsx`、`src/components/WorldPulsePanel.tsx`、`README.md`、`CHANGELOG.md`。
- 关键位置：`interventionKinds.ts` 统一玩家干预事件映射、空计数和 `affected > 0` 有效事件判断；复盘汇总、实时押题、挑战规则、玩家手痕回响和交互网络只把真实命中的祝福/投毒/隔离/放逐/钉选计入玩家手痕；实体检查器按钮改为实际行为“定点祝福”；入口页先渲染 CSS 轻量背景，再延迟 lazy 加载 `NeuralBackground`，避免 `GenesisGate -> NeuralBackground -> three/R3F/drei` 静态进入主包；CUDA UI 改为 `CUDA EXPERIMENTAL`，README 明确 Local 突变当前只证明字节码差异和 public cases，不证明 hidden 泛化或 useful-work 正增益。
- 验证：`git diff --check` 通过，仅有 CRLF 提示；TSX button type 扫描无命中；空 `catch`、`alert/prompt/confirm/fetch`、`transition-all` 反模式扫描无命中；`.\run.ps1 -Action Check -NoPause` 通过，Vite 主 `index` chunk 降至约 272.90KB，`NeuralBackground` 拆为约 4.23KB 独立 chunk，但仍有约 822.74KB 的共享 constants/vendor chunk；`cd src-tauri; cargo test` 通过，16 个 Rust 测试全过；`cargo check --features cuda` 因 `nvcc` 不在 PATH 失败，`where.exe nvcc` 与 `where.exe cl` 均未找到工具链，`nvidia-smi` 确认可用硬件为 RTX 3080 / driver 596.49 / 10GB VRAM / compute capability 8.6。

## 2026-06-22 多智能体 5A 语义进化与假入口收口

- 需求点：继续把 5A 核心从包装推进到真实系统，修复 Local helper-only 伪进化、旧干预接口绕过玩家手痕链路、世界事件推导残留伪干预参数和 README 能力口径过度宣传的问题。
- 路径：`src-tauri/src/evolution/wasm_runtime.rs`、`src-tauri/src/evolution/simulation_engine.rs`、`src-tauri/src/world_commands.rs`、`src/types/world.ts`、`src/utils/worldEvents.ts`、`src/utils/interventionTrace.ts`、`src/components/NarrativeFeed.tsx`、`src/components/PhoenixReview.tsx`、`README.md`、`AGENTS.md`、`CHANGELOG.md`。
- 关键位置：Phase 1 useful-work 评分加入 hidden/edge corpus，覆盖 sort/rle/sum/max/find/checksum/count 边界；RLE 评分支持输出容量不足返回 `-1`；突变写回队列前加入语义准入，任务子代必须有可执行变化、通过当前任务验证且 final score 不低于父代容差；旧 `interfere_at` 改为兼容转发同一套运行态检查和 BLESS 结果口径；`deriveWorldEvents` 删除未使用的 `latestIntervention` 事件造入口；玩家手痕 trace 新增相似未命中对照组、净能量/净分数/净毒素和 `PENDING/POSITIVE/NEGATIVE/INCONCLUSIVE/OBSERVATIONAL` 审计结论，局内 HUD 与复盘展示审计结果；文明关联链 UI 改为同窗关联符号并明确不宣称唯一因果；README 顶部新增当前交付口径矩阵，PoUW/PVP/Merkle/`vgene://`/OffscreenCanvas 继续标为愿景/未交付，AGENTS 增加 score 不退化硬规则。
- 验证：待执行 `git diff --check`、TSX button type 扫描、反模式扫描、`cd src-tauri; cargo test`、`.\run.ps1 -Action Check -NoPause`。
