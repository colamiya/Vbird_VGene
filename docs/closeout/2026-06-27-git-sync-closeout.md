# 2026-06-27 Git 同步前收口说明

## 当前结论

当前工作树可以进入 git 同步准备阶段：前端可构建，Rust 可检查和测试，Tauri release 可打包，release exe 可启动并由脚本停止。

这不是功能成品验收。尚未完成的部分主要是 CUDA 工具链交付、人工 UI 视觉验收、算法级 useful-work 搜索深化和 Three vendor 体积治理。

## 已通过验证

```powershell
npx skills ls -g
git diff --check
cd src-tauri; cargo fmt --check
npm run build
cd src-tauri; cargo check
cd src-tauri; cargo test
.\run.ps1 -Action Check -NoPause
.\run.ps1 -Action Build -NoPause
.\run.ps1 -Action Launch -NoPause
.\run.ps1 -Action Stop -NoPause
```

补充静态扫描已通过：

- TSX `<button>` 跨行 `type=` 扫描。
- 空 `catch` 扫描。
- `alert/prompt/confirm/fetch` 扫描。
- `transition-all` 扫描。

## 构建产物

```text
src-tauri\target\release\digital-life-platform.exe
src-tauri\target\release\bundle\msi\V-GENE_0.1.0_x64_en-US.msi
src-tauri\target\release\bundle\nsis\V-GENE_0.1.0_x64-setup.exe
```

启动烟测结果：

```text
.\run.ps1 -Action Launch -NoPause
=> Running PID=21700 Window='V-GENE'

.\run.ps1 -Action Stop -NoPause
=> Stop complete
```

## CUDA 状态

硬件存在：

```text
NVIDIA GeForce RTX 3080, driver 596.49, 10240 MiB VRAM, compute capability 8.6
```

工具链缺失：

```text
where.exe nvcc
=> not found

where.exe cl
=> not found

cd src-tauri; cargo check --features cuda
=> failed: CUDA feature enabled but nvcc was not found in PATH.
```

结论：CUDA 仍是实验入口，当前不能作为已交付性能后端宣传或验收。

## 非阻断警告

- `git diff --check` 只有 CRLF 将被 Git 转换为 LF 的提示，没有 whitespace error。
- Vite 提示 Browserslist/caniuse-lite 数据旧。
- `vendor-three` chunk 约 `708.97KB`，仍触发 Vite `500KB` chunk 警告。

## 当前工作树注意事项

当前工作树包含大量历史开发改动和新增文件，`git status --short` 会显示大量 modified/untracked 项。这是前面多轮功能开发累积，不代表本次收口失败。

同步前建议至少包含：

- `README.md`
- `CHANGELOG.md`
- `AGENTS.md`
- `BOOT.md`
- `package.json`
- `package-lock.json`
- `src-tauri/Cargo.lock`
- `run.ps1`
- `scripts/`
- `src/`
- `src-tauri/src/`
- `src-tauri/capabilities/`
- `public/`
- `docs/`

谨慎处理：

- `dist/` 和 `src-tauri/target/` 是构建产物，通常不需要纳入 Git。
- `src-tauri/run.log` 与根目录 `run.log` 是运行日志，通常不需要纳入 Git，除非你要保留本地调试证据。

## 下一步验收建议

1. 人工 UI 验收：`1280x720 / 1600x900 / 1920x1080`，字号 `125% / 150%`，覆盖局前、局内、设置、复盘。
2. 游戏闭环验收：三种局长、四档倍率、五种干预、暂停/恢复、手动复盘、自动复盘、关闭窗口。
3. CUDA 交付前置：安装 CUDA Toolkit 与 MSVC Build Tools 后重新跑 `cd src-tauri; cargo check --features cuda`。
4. 下一轮技术债：Three vendor chunk、Local 非 freeform 任务的算法级突变、CUDA/CPU 交互 parity。
