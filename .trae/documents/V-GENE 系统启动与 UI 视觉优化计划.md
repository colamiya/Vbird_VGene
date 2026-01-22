## 1. 启动界面与窗口管理优化
- **GenesisGate.tsx**: 在最外层 `div` 添加 `data-tauri-drag-region` 属性，解决非全屏无法拖动的问题。
- **tauri.conf.json**: 在窗口配置中添加 `"center": true`，并确认 `"decorations": false` 的正确性。
- **布局调整**: 调整 `GenesisGate.tsx` 中“主机环境”卡片的样式，使其在不同分辨率下显示更和谐。

## 2. 系统配置模态框修复与 AI 对接
- **SettingsModal.tsx**: 
    - 补全缺失的图标导入（`Zap`, `Activity`, `Monitor`），修复点击配置导致黑屏的渲染错误。
    - 重新排版 Ollama 配置项，使其在进入设置时更加直观。
    - 检查并优化 `handleResolutionChange` 函数，确保分辨率调整即时生效。

## 3. 模拟界面视觉增强（解决右侧黑空）
- **App.tsx**: 
    - 导入并集成 `PhylogeneticTree` 组件。
    - 修改右侧侧边栏逻辑：当未选中实体时，默认显示“进化星图”（即谱系树），实现用户要求的“续期/谱系”展示效果，填补黑色空白区域。

## 4. 验证与自检
- 启动项目检查窗口拖动功能。
- 点击“系统配置”确保模态框正常弹出。
- 开启“数据化大爆炸”后，检查右侧是否正确渲染进化星图。