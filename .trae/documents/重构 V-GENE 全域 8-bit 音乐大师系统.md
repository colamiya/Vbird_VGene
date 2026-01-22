## 1. 重构音效引擎 (Engine Overhaul)
- 在 [bgm.ts](file:///d:/Code/Vbird_VGene/src/utils/bgm.ts) 中升级 `BgmManager`。
- 实现 `ADSR` 包络函数，解决音效刺耳问题。
- 增加 `LowPassFilter` 动态控制，为 8-bit 增加深度感。
- 引入多通道混音器（Lead, Bass, Pad, Drums）。

## 2. 构建曲谱数据结构 (Music Data Structure)
- 定义 `Song` 和 `Part` 接口，支持 11 段式结构。
- 编写 22 首曲目的核心旋律“基因”（包含音阶、节奏模式）。
- 特别设计启动页（宁静中孕育爆发）和配置页（急促的暴风雨前奏）的曲谱。

## 3. 实现进化突变逻辑 (Evolutionary Logic)
- 开发 `mutatePattern` 函数，在播放过程中根据 `mutationFactor` 动态改变旋律。
- 实现 90%/10% 的智能切歌算法。
- 确保所有曲目之间基于 BPM (140) 和 D Dorian 基调的无缝衔接。

## 4. 集成与 UI 联动 (Integration)
- 修改 [App.tsx](file:///d:/Code/Vbird_VGene/src/App.tsx) 中的状态监听，根据 `stage` 切换对应的曲目（STARTUP, CONFIG, EVOLUTION）。
- 在 UI 上实时显示当前播放曲目所属的“进化铁律”及其变奏状态。

## 5. 验证与调优 (Verification)
- 进行长时间循环测试，确保单曲循环和跨曲切换的“默契衔接”。
- 调整增益平衡，确保音量适中且动态范围丰富。
