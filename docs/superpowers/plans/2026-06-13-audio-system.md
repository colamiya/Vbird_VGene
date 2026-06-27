# VGene Audio System Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans or equivalent task-by-task execution. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a complete dark cyber 8-bit procedural audio system for VGene without adding binary audio assets or third-party audio libraries.

**Architecture:** Keep Web Audio as the only sound runtime. Move music data, SFX recipes, shared types, scheduling, mixing, and compatibility wrappers into clear modules under `src/utils/audio`, then wire settings and game state into the existing React/Tauri settings path.

**Tech Stack:** React 18, TypeScript, Web Audio API, Tauri v2 Rust settings serialization.

---

### Task 1: Audio Module Boundary

**Files:**
- Create: `src/utils/audio/types.ts`
- Create: `src/utils/audio/presets.ts`
- Create: `src/utils/audio/sfxPresets.ts`
- Create: `src/utils/audio/engine.ts`
- Modify: `src/utils/bgm.ts`
- Modify: `src/utils/sfx.ts`

- [ ] Define shared audio types for tracks, stages, game state, settings, composition parts, and event names.
- [ ] Add dark cyber 8-bit composition presets: startup, config, review, and at least 8 evolution variants.
- [ ] Add SFX recipes for hover, click, start, pause, resume, entity selection, mutation surge, entropy warning, review, success, and error.
- [ ] Implement `audioEngine` with one AudioContext, master/music/sfx gains, BGM scheduler, adaptive intensity, event cooldowns, and `getNowPlaying()`.
- [ ] Replace old `bgm.ts` and `sfx.ts` contents with compatibility exports that delegate to `audioEngine`.

### Task 2: Settings Contract

**Files:**
- Modify: `src/types/world.ts`
- Modify: `src/utils/settings.ts`
- Modify: `src-tauri/src/main.rs`

- [ ] Add `audioEnabled`, `masterVolume`, `musicVolume`, `sfxVolume`, and `adaptiveMusic` to frontend config and backend saved settings.
- [ ] Normalize camelCase and snake_case audio fields with default values and `0..1` volume clamps.
- [ ] Add serde defaults to Rust `AppSettings` so old `settings.json` files continue loading.

### Task 3: React Integration

**Files:**
- Modify: `src/App.tsx`
- Modify: `src/components/SettingsModal.tsx`

- [ ] Feed `stage`, `isRunning`, and `stats` into `audioEngine.setGameState`.
- [ ] Emit SFX for start, pause, resume, entity selection, review, and high-entropy warnings.
- [ ] Add settings UI for audio enable, adaptive music, master volume, music volume, and SFX volume.
- [ ] Save/load audio settings through the existing settings modal flow.

### Task 4: Documentation and Verification

**Files:**
- Modify: `README.md`
- Modify: `AGENTS.md`
- Modify: `CHANGELOG.md`

- [ ] Document the canonical audio module entry points.
- [ ] Add an AGENTS hard rule forbidding scattered AudioContext/SFX implementations outside `src/utils/audio`.
- [ ] Append the audio system rollout to `CHANGELOG.md`.
- [ ] Run `.\run.ps1 -Action Check`; if global npm remains broken, verify via the existing Node fallback path.
