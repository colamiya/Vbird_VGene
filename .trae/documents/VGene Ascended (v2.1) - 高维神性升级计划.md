## 1. 维度跃迁：后端核心加固 (Backend Core Enhancement)
- **谱系追踪 (Lineage Tracking)**: 
    - 更新 [entity.rs](file:///d:/Code/Vbird_VGene/src-tauri/src/evolution/entity.rs) 增加 `parent_id` 字段。
    - 在 [state.rs](file:///d:/Code/Vbird_VGene/src-tauri/src/state.rs) 中增加 `lineage_history` 记录进化树。
- **神谕指令 (Divine Commands)**:
    - 实现 `get_lineage`: 提供真实的进化树数据给前端。
    - 实现 `interfere_at`: 支持 Law #18 观察者干扰，点击屏幕影响该区域变异率。
    - 实现 `get_hall_of_fame`: 从后端持久化记录中提取传奇实体。
- **环境同步**: 补全 [main.rs](file:///d:/Code/Vbird_VGene/src-tauri/src/main.rs) 中的 `update_settings`，支持 `evolution_throttle` 和 `visual_fidelity` 的动态生效。

## 2. 神谕界面：3A级视觉与交互 (Frontend UI/UX Overhaul)
- **系统状态 HUD**: 在侧边栏集成硬件负载（CPU/RAM）实时监测，增强科幻感。
- **真实进化星图**: 彻底重构 [PhylogeneticTree.tsx](file:///d:/Code/Vbird_VGene/src/components/PhylogeneticTree.tsx)，将其与后端真实谱系数据对接，使用更震撼的 3D 星系视觉效果。
- **英灵殿 (Hall of Fame)**: 连通后端数据，使“下载 DNA”和“克隆英雄”功能真实可用。
- **设置面板补全**: 确保 [SettingsModal.tsx](file:///d:/Code/Vbird_VGene/src/components/SettingsModal.tsx) 的所有滑动条和开关均能实时控制后端引擎参数。
- **交互干扰 (Observer Effect)**: 在 [Arena.tsx](file:///d:/Code/Vbird_VGene/src/components/Arena.tsx) 增加点击波纹反馈，并将干扰信号实时发送给后端。

## 3. 跨学科科学细节 (Scientific & Aesthetic Polish)
- **热寂进度条 (Entropy Meter)**: 在 UI 顶部添加基于全域燃料消耗计算的熵增监视器。
- **科学术语升级**: 全面审查 UI 文本，将其转化为涵盖生物学、物理学和信息论的专业术语（如：代谢通量、信息熵、量子退相干）。
- **视觉反馈增强**: 为大规模灭绝、高效变异等事件添加电影级的视觉抖动与发光特效。

## 4. 实施顺序 (Execution Order)
1. **后端数据结构与指令集更新**（Lineage, Interfere, Hall of Fame）。
2. **设置面板与 App 状态机连通**。
3. **前端各功能模块（进化树、英灵殿、神谕终端）的真实数据对接与视觉升级**。
4. **最终的全局科学美化与交互动效打磨**。
