import type { AudioEvent, SfxRecipe } from './types';

export const SFX_RECIPES: Record<AudioEvent, SfxRecipe> = {
  hover: {
    event: 'hover',
    cooldownMs: 25,
    steps: [
      { kind: 'tone', start: 0, duration: 0.055, fromFreq: 1040, toFreq: 660, wave: 'sine', volume: 0.045, pan: 0.25 },
    ],
  },
  click: {
    event: 'click',
    cooldownMs: 35,
    steps: [
      { kind: 'tone', start: 0, duration: 0.12, fromFreq: 160, toFreq: 55, wave: 'square', volume: 0.09, pan: -0.05 },
      { kind: 'noise', start: 0.01, duration: 0.045, volume: 0.025, pan: 0.15 },
    ],
  },
  start: {
    event: 'start',
    cooldownMs: 400,
    steps: [
      { kind: 'tone', start: 0, duration: 0.18, fromFreq: 110, toFreq: 220, wave: 'sawtooth', volume: 0.11 },
      { kind: 'tone', start: 0.12, duration: 0.28, fromFreq: 330, toFreq: 880, wave: 'square', volume: 0.065, pan: 0.22 },
      { kind: 'noise', start: 0.04, duration: 0.12, volume: 0.03, pan: -0.2 },
    ],
  },
  pause: {
    event: 'pause',
    cooldownMs: 250,
    steps: [
      { kind: 'tone', start: 0, duration: 0.18, fromFreq: 440, toFreq: 110, wave: 'triangle', volume: 0.07 },
      { kind: 'noise', start: 0.05, duration: 0.08, volume: 0.018 },
    ],
  },
  resume: {
    event: 'resume',
    cooldownMs: 250,
    steps: [
      { kind: 'tone', start: 0, duration: 0.1, fromFreq: 220, toFreq: 440, wave: 'square', volume: 0.075 },
      { kind: 'tone', start: 0.08, duration: 0.12, fromFreq: 440, toFreq: 660, wave: 'square', volume: 0.055, pan: 0.18 },
    ],
  },
  entity_select: {
    event: 'entity_select',
    cooldownMs: 80,
    steps: [
      { kind: 'tone', start: 0, duration: 0.08, fromFreq: 720, toFreq: 960, wave: 'sine', volume: 0.06, pan: -0.18 },
      { kind: 'tone', start: 0.055, duration: 0.1, fromFreq: 360, toFreq: 240, wave: 'triangle', volume: 0.045, pan: 0.18 },
    ],
  },
  mutation_surge: {
    event: 'mutation_surge',
    cooldownMs: 800,
    route: 'stinger',
    priority: 60,
    steps: [
      { kind: 'tone', start: 0, duration: 0.3, fromFreq: 92, toFreq: 46, wave: 'sawtooth', volume: 0.13 },
      { kind: 'tone', start: 0.025, duration: 0.16, fromFreq: 310, toFreq: 620, wave: 'triangle', volume: 0.046, pan: 0.14 },
      { kind: 'tone', start: 0.055, duration: 0.22, fromFreq: 620, toFreq: 1480, wave: 'square', volume: 0.074, pan: -0.3 },
      { kind: 'tone', start: 0.16, duration: 0.12, fromFreq: 1480, toFreq: 980, wave: 'square', volume: 0.048, pan: 0.28 },
      { kind: 'noise', start: 0.075, duration: 0.22, volume: 0.052, pan: 0.28 },
    ],
  },
  intervention_bless: {
    event: 'intervention_bless',
    cooldownMs: 220,
    steps: [
      { kind: 'tone', start: 0, duration: 0.12, fromFreq: 196, toFreq: 392, wave: 'triangle', volume: 0.048, pan: -0.08 },
      { kind: 'tone', start: 0.015, duration: 0.08, fromFreq: 392, toFreq: 784, wave: 'triangle', volume: 0.062, pan: -0.2 },
      { kind: 'tone', start: 0.075, duration: 0.18, fromFreq: 784, toFreq: 1175, wave: 'sine', volume: 0.054, pan: 0.22 },
      { kind: 'tone', start: 0.19, duration: 0.18, fromFreq: 1175, toFreq: 1568, wave: 'sine', volume: 0.032, pan: 0.04 },
    ],
  },
  intervention_poison: {
    event: 'intervention_poison',
    cooldownMs: 260,
    steps: [
      { kind: 'tone', start: 0, duration: 0.22, fromFreq: 190, toFreq: 62, wave: 'sawtooth', volume: 0.088, pan: -0.22 },
      { kind: 'tone', start: 0.035, duration: 0.12, fromFreq: 760, toFreq: 430, wave: 'square', volume: 0.046, pan: 0.24 },
      { kind: 'tone', start: 0.12, duration: 0.16, fromFreq: 315, toFreq: 118, wave: 'triangle', volume: 0.036, pan: -0.08 },
      { kind: 'noise', start: 0.015, duration: 0.2, volume: 0.046, pan: 0.28 },
    ],
  },
  intervention_quarantine: {
    event: 'intervention_quarantine',
    cooldownMs: 260,
    steps: [
      { kind: 'tone', start: 0, duration: 0.07, fromFreq: 220, toFreq: 220, wave: 'square', volume: 0.052, pan: -0.3 },
      { kind: 'tone', start: 0.08, duration: 0.07, fromFreq: 294, toFreq: 294, wave: 'square', volume: 0.05, pan: 0.3 },
      { kind: 'tone', start: 0.16, duration: 0.07, fromFreq: 370, toFreq: 370, wave: 'square', volume: 0.046, pan: -0.12 },
      { kind: 'tone', start: 0.22, duration: 0.16, fromFreq: 440, toFreq: 330, wave: 'triangle', volume: 0.048 },
      { kind: 'noise', start: 0.02, duration: 0.08, volume: 0.018, pan: 0.1 },
    ],
  },
  intervention_exile: {
    event: 'intervention_exile',
    cooldownMs: 320,
    steps: [
      { kind: 'tone', start: 0, duration: 0.28, fromFreq: 700, toFreq: 82, wave: 'square', volume: 0.09, pan: 0.2 },
      { kind: 'tone', start: 0.045, duration: 0.16, fromFreq: 175, toFreq: 48, wave: 'sawtooth', volume: 0.062, pan: -0.16 },
      { kind: 'tone', start: 0.18, duration: 0.1, fromFreq: 1200, toFreq: 360, wave: 'square', volume: 0.036, pan: 0.28 },
      { kind: 'noise', start: 0.04, duration: 0.25, volume: 0.052, pan: -0.2 },
    ],
  },
  intervention_pin: {
    event: 'intervention_pin',
    cooldownMs: 120,
    steps: [
      { kind: 'tone', start: 0, duration: 0.045, fromFreq: 1320, toFreq: 1480, wave: 'sine', volume: 0.046, pan: -0.14 },
      { kind: 'tone', start: 0.04, duration: 0.06, fromFreq: 740, toFreq: 740, wave: 'triangle', volume: 0.038, pan: 0.14 },
      { kind: 'tone', start: 0.075, duration: 0.08, fromFreq: 370, toFreq: 330, wave: 'triangle', volume: 0.026 },
    ],
  },
  director_cue: {
    event: 'director_cue',
    cooldownMs: 2600,
    route: 'stinger',
    priority: 20,
    steps: [
      { kind: 'tone', start: 0, duration: 0.07, fromFreq: 740, toFreq: 880, wave: 'sine', volume: 0.032, pan: -0.18 },
      { kind: 'tone', start: 0.08, duration: 0.09, fromFreq: 440, toFreq: 660, wave: 'triangle', volume: 0.026, pan: 0.18 },
      { kind: 'tone', start: 0.18, duration: 0.14, fromFreq: 660, toFreq: 990, wave: 'sine', volume: 0.018 },
    ],
  },
  director_target_lock: {
    event: 'director_target_lock',
    cooldownMs: 2200,
    route: 'stinger',
    priority: 35,
    steps: [
      { kind: 'tone', start: 0, duration: 0.045, fromFreq: 1180, toFreq: 1180, wave: 'sine', volume: 0.038, pan: -0.22 },
      { kind: 'tone', start: 0.055, duration: 0.045, fromFreq: 1180, toFreq: 890, wave: 'sine', volume: 0.034, pan: 0.22 },
      { kind: 'tone', start: 0.12, duration: 0.08, fromFreq: 445, toFreq: 445, wave: 'triangle', volume: 0.028 },
      { kind: 'tone', start: 0.19, duration: 0.12, fromFreq: 222, toFreq: 180, wave: 'triangle', volume: 0.024 },
    ],
  },
  director_danger_cue: {
    event: 'director_danger_cue',
    cooldownMs: 4200,
    route: 'stinger',
    priority: 82,
    steps: [
      { kind: 'tone', start: 0, duration: 0.1, fromFreq: 620, toFreq: 410, wave: 'square', volume: 0.058, pan: -0.26 },
      { kind: 'tone', start: 0.11, duration: 0.1, fromFreq: 620, toFreq: 410, wave: 'square', volume: 0.056, pan: 0.26 },
      { kind: 'tone', start: 0.22, duration: 0.16, fromFreq: 155, toFreq: 72, wave: 'sawtooth', volume: 0.056 },
      { kind: 'tone', start: 0.28, duration: 0.1, fromFreq: 980, toFreq: 530, wave: 'square', volume: 0.034, pan: -0.12 },
      { kind: 'noise', start: 0.03, duration: 0.22, volume: 0.026 },
    ],
  },
  entropy_warning: {
    event: 'entropy_warning',
    cooldownMs: 6000,
    route: 'stinger',
    priority: 85,
    steps: [
      { kind: 'tone', start: 0, duration: 0.13, fromFreq: 520, toFreq: 470, wave: 'square', volume: 0.078, pan: -0.25 },
      { kind: 'tone', start: 0.17, duration: 0.13, fromFreq: 520, toFreq: 470, wave: 'square', volume: 0.08, pan: 0.25 },
      { kind: 'tone', start: 0.34, duration: 0.15, fromFreq: 520, toFreq: 390, wave: 'square', volume: 0.07 },
      { kind: 'tone', start: 0.02, duration: 0.5, fromFreq: 104, toFreq: 78, wave: 'triangle', volume: 0.04 },
      { kind: 'noise', start: 0.025, duration: 0.38, volume: 0.026 },
    ],
  },
  crisis_surge: {
    event: 'crisis_surge',
    cooldownMs: 5200,
    route: 'stinger',
    priority: 100,
    steps: [
      { kind: 'tone', start: 0, duration: 0.32, fromFreq: 104, toFreq: 38, wave: 'sawtooth', volume: 0.145, pan: -0.12 },
      { kind: 'tone', start: 0.035, duration: 0.18, fromFreq: 740, toFreq: 370, wave: 'square', volume: 0.072, pan: 0.24 },
      { kind: 'tone', start: 0.19, duration: 0.18, fromFreq: 520, toFreq: 185, wave: 'square', volume: 0.058, pan: -0.28 },
      { kind: 'tone', start: 0.28, duration: 0.26, fromFreq: 72, toFreq: 44, wave: 'triangle', volume: 0.055 },
      { kind: 'noise', start: 0.018, duration: 0.36, volume: 0.052, pan: 0.08 },
    ],
  },
  objective_complete: {
    event: 'objective_complete',
    cooldownMs: 1200,
    route: 'stinger',
    priority: 65,
    steps: [
      { kind: 'tone', start: 0, duration: 0.12, fromFreq: 196, toFreq: 294, wave: 'triangle', volume: 0.046 },
      { kind: 'tone', start: 0.02, duration: 0.1, fromFreq: 392, toFreq: 587, wave: 'triangle', volume: 0.066, pan: -0.18 },
      { kind: 'tone', start: 0.095, duration: 0.14, fromFreq: 587, toFreq: 880, wave: 'sine', volume: 0.057, pan: 0.18 },
      { kind: 'tone', start: 0.22, duration: 0.2, fromFreq: 880, toFreq: 1175, wave: 'sine', volume: 0.044 },
      { kind: 'noise', start: 0.04, duration: 0.05, volume: 0.014, pan: -0.05 },
    ],
  },
  fate_resolved: {
    event: 'fate_resolved',
    cooldownMs: 1800,
    route: 'stinger',
    priority: 62,
    steps: [
      { kind: 'tone', start: 0, duration: 0.08, fromFreq: 660, toFreq: 990, wave: 'sine', volume: 0.042, pan: -0.26 },
      { kind: 'tone', start: 0.08, duration: 0.16, fromFreq: 330, toFreq: 495, wave: 'triangle', volume: 0.052, pan: 0.26 },
      { kind: 'tone', start: 0.18, duration: 0.22, fromFreq: 248, toFreq: 196, wave: 'triangle', volume: 0.032 },
      { kind: 'noise', start: 0.03, duration: 0.07, volume: 0.016 },
    ],
  },
  review: {
    event: 'review',
    cooldownMs: 800,
    steps: [
      { kind: 'tone', start: 0, duration: 0.16, fromFreq: 196, toFreq: 262, wave: 'triangle', volume: 0.05 },
      { kind: 'tone', start: 0.02, duration: 0.18, fromFreq: 392, toFreq: 523, wave: 'triangle', volume: 0.074 },
      { kind: 'tone', start: 0.16, duration: 0.22, fromFreq: 523, toFreq: 784, wave: 'triangle', volume: 0.057, pan: 0.16 },
      { kind: 'tone', start: 0.34, duration: 0.34, fromFreq: 784, toFreq: 659, wave: 'sine', volume: 0.047, pan: -0.12 },
      { kind: 'noise', start: 0.1, duration: 0.09, volume: 0.012, pan: 0.05 },
    ],
  },
  success: {
    event: 'success',
    cooldownMs: 300,
    steps: [
      { kind: 'tone', start: 0, duration: 0.08, fromFreq: 262, toFreq: 392, wave: 'triangle', volume: 0.04, pan: -0.12 },
      { kind: 'tone', start: 0.025, duration: 0.09, fromFreq: 523, toFreq: 659, wave: 'square', volume: 0.054 },
      { kind: 'tone', start: 0.1, duration: 0.14, fromFreq: 659, toFreq: 1046, wave: 'square', volume: 0.052, pan: 0.22 },
      { kind: 'tone', start: 0.22, duration: 0.16, fromFreq: 1046, toFreq: 1318, wave: 'sine', volume: 0.024, pan: -0.06 },
    ],
  },
  error: {
    event: 'error',
    cooldownMs: 300,
    steps: [
      { kind: 'tone', start: 0, duration: 0.16, fromFreq: 220, toFreq: 92, wave: 'sawtooth', volume: 0.08 },
      { kind: 'noise', start: 0.02, duration: 0.1, volume: 0.035 },
    ],
  },
};
