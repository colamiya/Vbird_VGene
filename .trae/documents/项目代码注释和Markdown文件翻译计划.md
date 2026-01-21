# 项目代码注释和Markdown文件翻译计划

## 翻译范围

### Markdown文件
1. **AGENTS.md** - 项目说明文档
2. **BUILD_INSTRUCTIONS.md** - 构建说明文档

### 代码文件注释
1. **前端代码**
   - `src/App.tsx`
   - `src/components/Arena.tsx`
   - `src/components/SettingsModal.tsx` (如果存在)

2. **后端代码**
   - `src-tauri/src/main.rs`
   - `src-tauri/src/evolution/entity.rs`
   - `src-tauri/src/evolution/environment.rs`
   - `src-tauri/src/evolution/mod.rs`
   - `src-tauri/src/evolution/mutation.rs`
   - `src-tauri/src/evolution/wasm_runtime.rs`
   - `src-tauri/src/state.rs`

## 翻译原则

1. **技术准确性** - 保持技术术语的准确性，确保翻译后的内容不会改变代码的含义
2. **可读性** - 使用自然流畅的中文表达，使中文读者能够轻松理解
3. **一致性** - 对相同的技术术语使用统一的翻译
4. **保留格式** - 保持原文件的格式和结构不变
5. **代码不变** - 只翻译注释部分，不修改任何代码逻辑

## 翻译方法

1. **Markdown文件** - 逐行翻译，保持Markdown格式
2. **代码注释** - 仅翻译注释部分，保持代码本身不变
3. **命名保持** - 变量名、函数名、类名等保持英文不变
4. **术语表** - 建立简单的术语对照表，确保翻译一致性

## 预期结果

- 所有Markdown文件都有完整的中文翻译
- 所有代码文件中的注释都被翻译成中文
- 翻译后的内容保持技术准确性和可读性
- 项目结构和代码功能不受任何影响