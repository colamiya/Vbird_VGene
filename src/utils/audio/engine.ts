import { COMPOSITIONS, FREQS, SONG_STRUCTURE, getCompositionsForTrack } from './presets';
import { SFX_RECIPES } from './sfxPresets';
import type {
  AudioEvent,
  AudioGameState,
  AudioPressureBand,
  AudioSettings,
  ChannelName,
  Composition,
  NowPlaying,
  PartData,
  SfxRecipe,
  SfxStep,
  TrackType,
} from './types';

const DEFAULT_AUDIO_SETTINGS: AudioSettings = {
  audioEnabled: true,
  masterVolume: 0.75,
  musicVolume: 0.55,
  sfxVolume: 0.8,
  adaptiveMusic: true,
};

const DEFAULT_GAME_STATE: AudioGameState = {
  stage: 'SPLASH',
  isRunning: false,
  entropy: 0,
  avgGeneration: 0,
  avgScore: 0,
  population: 0,
  pressure: 0,
  interactionHeat: 0,
  interventionMomentum: 0,
};

const CHANNELS: ChannelName[] = ['lead', 'bass', 'pad', 'arp', 'drums', 'texture'];

class AudioEngine {
  private ctx: AudioContext | null = null;
  private masterGain: GainNode | null = null;
  private musicGain: GainNode | null = null;
  private sfxGain: GainNode | null = null;
  private filter: BiquadFilterNode | null = null;
  private compressor: DynamicsCompressorNode | null = null;
  private channels: Record<ChannelName, { gain: GainNode; panner: StereoPannerNode }> | null = null;

  private settings: AudioSettings = DEFAULT_AUDIO_SETTINGS;
  private gameState: AudioGameState = DEFAULT_GAME_STATE;
  private currentTrack: TrackType = 'NONE';
  private currentComp: Composition = COMPOSITIONS[0];
  private currentSelectionSignature = '';
  private currentPartIndex = 0;
  private currentStep = 0;
  private isPlaying = false;
  private nextNoteTime = 0;
  private timerId: number | null = null;
  private pendingTrackTimerId: number | null = null;
  private playGeneration = 0;
  private lastEventAt = new Map<AudioEvent, number>();
  private stingerQueue = new Map<AudioEvent, SfxRecipe>();
  private stingerFlushScheduled = false;
  private lastAdaptiveMixAt = 0;
  private lastAdaptiveMixSignature = '';
  private lastError = '';
  private transitionStingerSignature = '';

  private readonly lookaheadMs = 25;
  private readonly scheduleAheadSeconds = 0.12;
  private readonly stepsPerPart = 32;

  setSettings(settings: Partial<AudioSettings>) {
    const wasAudioEnabled = this.settings.audioEnabled;
    this.settings = {
      ...this.settings,
      ...settings,
      masterVolume: this.clampVolume(settings.masterVolume ?? this.settings.masterVolume),
      musicVolume: this.clampVolume(settings.musicVolume ?? this.settings.musicVolume),
      sfxVolume: this.clampVolume(settings.sfxVolume ?? this.settings.sfxVolume),
      audioEnabled: settings.audioEnabled ?? this.settings.audioEnabled,
      adaptiveMusic: settings.adaptiveMusic ?? this.settings.adaptiveMusic,
    };

    if (!this.settings.audioEnabled) {
      this.stop();
      this.applyGains();
      return;
    }

    if (this.ctx) {
      this.applyGains();
      this.applyAdaptiveMix();
    }

    if (!wasAudioEnabled && this.settings.audioEnabled) {
      void this.play(this.trackForStage(this.gameState.stage));
    }
  }

  setGameState(state: Partial<AudioGameState>) {
    this.gameState = { ...this.gameState, ...state };
    const nextTrack = this.trackForStage(this.gameState.stage);

    if (nextTrack !== this.currentTrack) {
      void this.play(nextTrack);
    } else {
      this.applyAdaptiveMix();
    }
  }

  async play(track: TrackType) {
    if (track === 'NONE') {
      this.stop();
      return;
    }

    if (!this.settings.audioEnabled) return;

    try {
      this.init();
      if (!this.ctx || !this.masterGain) return;
      if (this.ctx.state === 'suspended') await this.ctx.resume();
      this.lastError = '';
    } catch (error) {
      this.reportFailure(`play:${track}`, error);
      return;
    }

    if (this.currentTrack === track && this.isPlaying) {
      this.applyAdaptiveMix();
      return;
    }

    this.musicGain?.gain.setTargetAtTime(0.001, this.ctx.currentTime, 0.08);
    if (this.pendingTrackTimerId !== null) {
      window.clearTimeout(this.pendingTrackTimerId);
      this.pendingTrackTimerId = null;
    }
    const playToken = ++this.playGeneration;

    this.pendingTrackTimerId = window.setTimeout(() => {
      this.pendingTrackTimerId = null;
      if (!this.ctx || !this.settings.audioEnabled) return;
      if (playToken !== this.playGeneration) return;

      this.currentTrack = track;
      this.currentSelectionSignature = this.selectionSignature(track);
      this.currentComp = this.pickComposition(track, this.currentSelectionSignature);
      this.currentPartIndex = 0;
      this.currentStep = 0;
      this.nextNoteTime = this.ctx.currentTime + 0.02;

      if (!this.isPlaying) {
        this.isPlaying = true;
        this.scheduler();
      }

      this.applyGains();
      this.applyAdaptiveMix();
    }, 110);
  }

  stop() {
    this.playGeneration += 1;
    if (this.pendingTrackTimerId !== null) {
      window.clearTimeout(this.pendingTrackTimerId);
      this.pendingTrackTimerId = null;
    }
    if (this.timerId !== null) {
      window.clearTimeout(this.timerId);
      this.timerId = null;
    }

    this.isPlaying = false;
    this.currentTrack = 'NONE';

    if (this.ctx) {
      this.musicGain?.gain.setTargetAtTime(0, this.ctx.currentTime, 0.08);
    }
  }

  async emit(event: AudioEvent) {
    if (!this.settings.audioEnabled) return;

    try {
      this.init();
      if (!this.ctx) return;
      if (this.ctx.state === 'suspended') await this.ctx.resume();
      this.lastError = '';
    } catch (error) {
      this.reportFailure(`emit:${event}`, error);
      return;
    }

    const recipe = SFX_RECIPES[event];
    if (!recipe) return;

    if (recipe.route === 'stinger') {
      this.enqueueStinger(recipe);
      return;
    }

    this.playRecipe(recipe);
  }

  getNowPlaying(): NowPlaying {
    return {
      id: this.currentComp.id,
      name: this.currentComp.name,
      description: this.currentComp.description,
      track: this.currentTrack,
      intensity: this.getIntensity(),
      error: this.lastError || undefined,
    };
  }

  private init() {
    if (this.ctx) return;

    this.ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
    this.masterGain = this.ctx.createGain();
    this.musicGain = this.ctx.createGain();
    this.sfxGain = this.ctx.createGain();
    this.filter = this.ctx.createBiquadFilter();
    this.compressor = this.ctx.createDynamicsCompressor();
    this.channels = {} as Record<ChannelName, { gain: GainNode; panner: StereoPannerNode }>;

    this.filter.type = 'lowpass';
    this.filter.frequency.setValueAtTime(this.currentComp.filterBase, this.ctx.currentTime);
    this.filter.Q.setValueAtTime(0.7, this.ctx.currentTime);

    this.compressor.threshold.setValueAtTime(-22, this.ctx.currentTime);
    this.compressor.knee.setValueAtTime(24, this.ctx.currentTime);
    this.compressor.ratio.setValueAtTime(10, this.ctx.currentTime);
    this.compressor.attack.setValueAtTime(0.004, this.ctx.currentTime);
    this.compressor.release.setValueAtTime(0.2, this.ctx.currentTime);

    CHANNELS.forEach((name) => {
      const gain = this.ctx!.createGain();
      const panner = this.ctx!.createStereoPanner();
      gain.connect(panner);
      panner.connect(this.musicGain!);
      this.channels![name] = { gain, panner };
    });

    this.musicGain.connect(this.filter);
    this.filter.connect(this.compressor);
    this.sfxGain.connect(this.compressor);
    this.compressor.connect(this.masterGain);
    this.masterGain.connect(this.ctx.destination);

    this.applyGains(true);
  }

  private scheduler() {
    if (!this.ctx || !this.isPlaying) return;

    while (this.nextNoteTime < this.ctx.currentTime + this.scheduleAheadSeconds) {
      this.scheduleStep(this.currentStep, this.nextNoteTime);
      this.advanceStep();
    }

    this.timerId = window.setTimeout(() => this.scheduler(), this.lookaheadMs);
  }

  private advanceStep() {
    const secondsPerBeat = 60 / this.getEffectiveTempo();
    const isOffBeat = this.currentStep % 2 === 1;
    const swingOffset = isOffBeat ? this.currentComp.swing * 0.12 * secondsPerBeat : 0;

    this.nextNoteTime += 0.25 * secondsPerBeat + swingOffset;
    this.currentStep += 1;

    if (this.currentStep >= this.stepsPerPart) {
      this.currentStep = 0;
      this.currentPartIndex += 1;

      if (this.currentPartIndex >= SONG_STRUCTURE.length) {
        this.currentPartIndex = 0;
      }

      if (this.currentTrack === 'EVOLUTION' && this.settings.adaptiveMusic) {
        const nextSignature = this.selectionSignature('EVOLUTION');
        if (nextSignature !== this.currentSelectionSignature) {
          if (nextSignature !== this.transitionStingerSignature) {
            this.transitionStingerSignature = nextSignature;
            this.playTransitionStinger(this.nextNoteTime);
          }
        }
      }

      if (this.currentPartIndex === 0) {
        if (this.currentTrack === 'EVOLUTION') {
          const nextSignature = this.selectionSignature('EVOLUTION');
          if (nextSignature !== this.currentSelectionSignature) {
            const nextComp = this.pickComposition('EVOLUTION', nextSignature);
            this.crossfadeMusicBed(this.nextNoteTime);
            this.currentSelectionSignature = nextSignature;
            this.transitionStingerSignature = '';
            this.currentComp = nextComp;
            this.applyAdaptiveMix();
          }
        }
      }
    }
  }

  private playTransitionStinger(time: number) {
    if (!this.ctx || !this.sfxGain) return;

    const pressure = this.getPressureBand();
    const phase = this.gameState.runPhase;
    if (pressure === 'terminal' || phase === 'CRISIS') {
      this.playSineZap(time, 160, 48, 0.42, 0.105, this.sfxGain, 'sawtooth', -0.12);
      this.playNoise(time + 0.04, 0.24, 0.038, this.sfxGain, 0.16);
      return;
    }

    if (phase === 'ASCENSION') {
      this.playSineZap(time, 392, 1175, 0.34, 0.078, this.sfxGain, 'triangle', 0.18);
      this.playSineZap(time + 0.12, 587, 1568, 0.28, 0.052, this.sfxGain, 'sine', -0.18);
      return;
    }

    this.playSineZap(time, 330, 660, 0.18, 0.046, this.sfxGain, 'triangle');
  }

  private crossfadeMusicBed(time: number) {
    if (!this.musicGain) return;
    const target = this.settings.audioEnabled ? this.settings.musicVolume : 0;
    this.musicGain.gain.setTargetAtTime(Math.max(0.001, target * 0.42), time, 0.12);
    this.musicGain.gain.setTargetAtTime(target, time + 0.5, 0.22);
  }

  private reportFailure(action: string, error: unknown) {
    const message = error instanceof Error ? error.message : String(error);
    this.lastError = `${action}: ${message}`;
    console.warn(`[V-GENE audio] ${this.lastError}`);
    window.dispatchEvent(new CustomEvent('vgene:audio-error', {
      detail: {
        action,
        message,
      },
    }));
  }

  private scheduleStep(step: number, time: number) {
    if (!this.ctx || !this.channels) return;

    const partType = SONG_STRUCTURE[this.currentPartIndex];
    const part =
      this.currentComp.parts[partType] ||
      this.currentComp.parts.CHORUS ||
      this.currentComp.parts.VERSE ||
      this.currentComp.parts.INTRO;

    if (!part) return;

    const intensity = this.getIntensity();

    this.channels.lead.panner.pan.setTargetAtTime(Math.sin(time * 1.7) * 0.42, time, 0.12);
    this.channels.arp.panner.pan.setTargetAtTime(Math.sin(time * 2.4) * -0.55, time, 0.12);
    this.channels.texture.panner.pan.setTargetAtTime(Math.sin(time * 0.8) * 0.35, time, 0.2);

    this.scheduleMelody(part, 'lead', step, time, 0.14, 'square', 0.07 + intensity * 0.018);
    this.scheduleMelody(part, 'bass', step, time, 0.22, 'sawtooth', 0.1 + intensity * 0.02, -12);
    this.scheduleMelody(part, 'arp', step, time, 0.045, 'sine', 0.032 + intensity * 0.018, 12);

    if (step % 8 === 0) {
      this.scheduleMelody(part, 'pad', step, time, 1.3, 'triangle', 0.04 + intensity * 0.016, -12);
    }

    if (part.texture && (step % 4 === 0 || intensity > 1.05)) {
      this.scheduleMelody(part, 'texture', step, time, 0.42, 'triangle', 0.028 + intensity * 0.012, 12);
    }

    if (part.drums) {
      const drumType = part.drums[step % part.drums.length];
      if (drumType > 0 && this.shouldPlayDrum(step, intensity)) {
        this.playDrum(time, drumType, 0.085 + intensity * 0.045);
      }
    }
  }

  private scheduleMelody(
    part: PartData,
    channelName: Exclude<ChannelName, 'drums'>,
    step: number,
    time: number,
    duration: number,
    wave: OscillatorType,
    volume: number,
    octaveOffset = 0,
  ) {
    const pattern = part[channelName];
    if (!pattern) return;

    const interval = pattern[step % pattern.length];
    if (interval === null || interval === undefined) return;

    const freq = this.getFreqFromInterval(this.currentComp.root, interval + octaveOffset, this.currentComp.scale);
    this.playNote(freq, time, duration, wave, volume, channelName);
  }

  private playNote(
    freq: number,
    time: number,
    duration: number,
    wave: OscillatorType,
    volume: number,
    channelName: Exclude<ChannelName, 'drums'>,
  ) {
    if (!this.ctx || !this.channels) return;

    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    const channel = this.channels[channelName];
    const release = channelName === 'pad' || channelName === 'texture' ? 0.35 : 0.12;
    const attack = channelName === 'pad' ? 0.06 : 0.006;
    const driveDetune = this.currentComp.drive * 8;

    osc.type = wave;
    osc.frequency.setValueAtTime(freq, time);
    osc.detune.setValueAtTime(Math.random() * driveDetune - driveDetune / 2, time);

    if (channelName === 'lead' || channelName === 'arp') {
      const vibrato = this.ctx.createOscillator();
      const vibratoGain = this.ctx.createGain();
      vibrato.frequency.setValueAtTime(5.5 + this.currentComp.drive * 5, time);
      vibratoGain.gain.setValueAtTime(freq * (0.002 + this.currentComp.drive * 0.004), time);
      vibrato.connect(vibratoGain);
      vibratoGain.connect(osc.frequency);
      vibrato.start(time);
      vibrato.stop(time + duration + release);
    }

    gain.gain.setValueAtTime(0.0001, time);
    gain.gain.linearRampToValueAtTime(volume, time + attack);
    gain.gain.exponentialRampToValueAtTime(Math.max(0.001, volume * 0.45), time + duration);
    gain.gain.exponentialRampToValueAtTime(0.001, time + duration + release);

    osc.connect(gain);
    gain.connect(channel.gain);
    osc.start(time);
    osc.stop(time + duration + release);
  }

  private playDrum(time: number, type: number, volume: number) {
    if (!this.ctx || !this.channels) return;

    const channel = this.channels.drums;

    if (type === 1) {
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(170, time);
      osc.frequency.exponentialRampToValueAtTime(42, time + 0.12);
      gain.gain.setValueAtTime(volume * 1.45, time);
      gain.gain.exponentialRampToValueAtTime(0.001, time + 0.16);
      osc.connect(gain);
      gain.connect(channel.gain);
      osc.start(time);
      osc.stop(time + 0.17);
      this.applySidechain(time);
      return;
    }

    if (type === 2) {
      this.playNoise(time, 0.11, volume * 0.78, channel.gain);
      this.playSineZap(time, 210, 120, 0.08, volume * 0.35, channel.gain);
      return;
    }

    if (type === 3) {
      this.playSineZap(time, 9200, 7600, 0.026, volume * 0.28, channel.gain, 'square');
      return;
    }

    if (type === 4) {
      this.playSineZap(time, 7600, 4200, 0.16, volume * 0.24, channel.gain, 'square');
      return;
    }

    if (type === 5) {
      this.playNoise(time, 0.06, volume * 0.45, channel.gain);
      this.playSineZap(time, 1400, 260, 0.09, volume * 0.28, channel.gain, 'sawtooth');
    }
  }

  private playSfxStep(step: SfxStep, time: number) {
    if (!this.ctx || !this.sfxGain) return;

    if (step.kind === 'noise') {
      this.playNoise(time, step.duration, step.volume, this.sfxGain, step.pan);
      return;
    }

    this.playSineZap(
      time,
      step.fromFreq ?? 440,
      step.toFreq ?? step.fromFreq ?? 440,
      step.duration,
      step.volume,
      this.sfxGain,
      step.wave ?? 'square',
      step.pan,
    );
  }

  private enqueueStinger(recipe: SfxRecipe) {
    if (this.isEventCoolingDown(recipe)) return;

    this.stingerQueue.set(recipe.event, recipe);
    if (this.stingerFlushScheduled) return;

    this.stingerFlushScheduled = true;
    const flush = () => this.flushStingerQueue();
    if (typeof window.queueMicrotask === 'function') {
      window.queueMicrotask(flush);
    } else {
      window.setTimeout(flush, 0);
    }
  }

  private flushStingerQueue() {
    this.stingerFlushScheduled = false;
    if (!this.ctx) {
      this.stingerQueue.clear();
      return;
    }

    const recipe = Array.from(this.stingerQueue.values())
      .filter((item) => !this.isEventCoolingDown(item))
      .sort((a, b) => (b.priority ?? 0) - (a.priority ?? 0))[0];

    this.stingerQueue.clear();
    if (recipe) this.playRecipe(recipe);
  }

  private playRecipe(recipe: SfxRecipe) {
    if (!this.ctx || this.isEventCoolingDown(recipe)) return;

    this.lastEventAt.set(recipe.event, Date.now());
    const startTime = this.ctx.currentTime;
    recipe.steps.forEach((step) => this.playSfxStep(step, startTime + step.start));
  }

  private playSineZap(
    time: number,
    fromFreq: number,
    toFreq: number,
    duration: number,
    volume: number,
    destination: AudioNode,
    wave: OscillatorType = 'sine',
    pan = 0,
  ) {
    if (!this.ctx) return;

    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    const panner = this.ctx.createStereoPanner();

    osc.type = wave;
    osc.frequency.setValueAtTime(fromFreq, time);
    osc.frequency.exponentialRampToValueAtTime(Math.max(1, toFreq), time + duration);

    panner.pan.setValueAtTime(pan, time);
    gain.gain.setValueAtTime(Math.max(0.0001, volume), time);
    gain.gain.exponentialRampToValueAtTime(0.001, time + duration);

    osc.connect(gain);
    gain.connect(panner);
    panner.connect(destination);
    osc.start(time);
    osc.stop(time + duration + 0.02);
  }

  private playNoise(time: number, duration: number, volume: number, destination: AudioNode, pan = 0) {
    if (!this.ctx) return;

    const source = this.ctx.createBufferSource();
    const buffer = this.ctx.createBuffer(1, Math.max(1, this.ctx.sampleRate * duration), this.ctx.sampleRate);
    const data = buffer.getChannelData(0);
    const filter = this.ctx.createBiquadFilter();
    const gain = this.ctx.createGain();
    const panner = this.ctx.createStereoPanner();

    for (let i = 0; i < data.length; i += 1) {
      data[i] = (Math.random() * 2 - 1) * (1 - i / data.length);
    }

    source.buffer = buffer;
    filter.type = 'highpass';
    filter.frequency.setValueAtTime(1200, time);
    panner.pan.setValueAtTime(pan, time);
    gain.gain.setValueAtTime(volume, time);
    gain.gain.exponentialRampToValueAtTime(0.001, time + duration);

    source.connect(filter);
    filter.connect(gain);
    gain.connect(panner);
    panner.connect(destination);
    source.start(time);
    source.stop(time + duration);
  }

  private applySidechain(time: number) {
    if (!this.channels) return;

    const duck = 1 - this.currentComp.sidechain * (0.35 + this.getIntensity() * 0.2);
    (['bass', 'pad', 'texture'] as ChannelName[]).forEach((name) => {
      const channel = this.channels?.[name];
      channel?.gain.gain.setTargetAtTime(Math.max(0.18, duck), time, 0.01);
      channel?.gain.gain.setTargetAtTime(1, time + 0.1, 0.055);
    });
  }

  private applyGains(immediate = false) {
    if (!this.ctx || !this.masterGain || !this.musicGain || !this.sfxGain) return;

    const time = this.ctx.currentTime;
    const targetMaster = this.settings.audioEnabled ? this.settings.masterVolume : 0;
    const targetMusic = this.settings.musicVolume;
    const targetSfx = this.settings.sfxVolume;
    if (immediate) {
      this.masterGain.gain.setValueAtTime(targetMaster, time);
      this.musicGain.gain.setValueAtTime(targetMusic, time);
      this.sfxGain.gain.setValueAtTime(targetSfx, time);
      return;
    }

    this.masterGain.gain.setTargetAtTime(targetMaster, time, 0.08);
    this.musicGain.gain.setTargetAtTime(targetMusic, time, 0.08);
    this.sfxGain.gain.setTargetAtTime(targetSfx, time, 0.08);
  }

  private applyAdaptiveMix() {
    if (!this.ctx || !this.filter || !this.channels) return;

    const intensity = this.getIntensity();
    const signature = [
      this.currentComp.id,
      this.gameState.stage,
      this.gameState.isRunning ? 1 : 0,
      Math.round(intensity * 20),
      Math.round((this.gameState.pressure ?? 0) * 20),
      Math.round((this.gameState.interactionHeat ?? 0) * 20),
      Math.round((this.gameState.interventionMomentum ?? 0) * 20),
    ].join(':');
    const nowMs = Date.now();
    if (signature === this.lastAdaptiveMixSignature && nowMs - this.lastAdaptiveMixAt < 180) return;
    this.lastAdaptiveMixSignature = signature;
    this.lastAdaptiveMixAt = nowMs;

    const filterTarget = this.settings.adaptiveMusic
      ? this.currentComp.filterBase + intensity * 1800 + this.gameState.entropy * 18 + (this.gameState.pressure ?? 0) * 900
      : this.currentComp.filterBase;

    this.filter.frequency.setTargetAtTime(Math.min(7200, filterTarget), this.ctx.currentTime, 0.2);
    this.filter.Q.setTargetAtTime(0.7 + intensity * 0.65 + this.currentComp.drive + (this.gameState.interactionHeat ?? 0) * 0.35, this.ctx.currentTime, 0.2);

    const paused = this.gameState.stage === 'SIMULATION' && !this.gameState.isRunning;
    this.channels.drums.gain.gain.setTargetAtTime(paused ? 0.35 : 0.82 + intensity * 0.18, this.ctx.currentTime, 0.18);
    this.channels.arp.gain.gain.setTargetAtTime(paused ? 0.25 : 0.72 + intensity * 0.28, this.ctx.currentTime, 0.18);
    this.channels.lead.gain.gain.setTargetAtTime(0.72 + intensity * 0.2 + (this.gameState.interventionMomentum ?? 0) * 0.14, this.ctx.currentTime, 0.18);
    this.channels.pad.gain.gain.setTargetAtTime(0.64 + (1 - intensity) * 0.16, this.ctx.currentTime, 0.18);
    this.channels.texture.gain.gain.setTargetAtTime(0.55 + intensity * 0.3 + (this.gameState.pressure ?? 0) * 0.12, this.ctx.currentTime, 0.18);
  }

  private getFreqFromInterval(root: string, interval: number, scale: number[]) {
    const rootFreq = FREQS[root] ?? 440;
    const octave = Math.floor(interval / scale.length);
    const index = ((interval % scale.length) + scale.length) % scale.length;
    const semitones = scale[index] + octave * 12;
    return rootFreq * Math.pow(2, semitones / 12);
  }

  private getEffectiveTempo() {
    if (!this.settings.adaptiveMusic) return this.currentComp.tempo;

    const intensity = this.getIntensity();
    const pausedDrag = this.gameState.stage === 'SIMULATION' && !this.gameState.isRunning ? 0.78 : 1;
    return this.currentComp.tempo * pausedDrag * (0.94 + intensity * 0.12);
  }

  private getIntensity() {
    if (!this.settings.adaptiveMusic) return 0.75;

    const entropy = this.clamp(this.gameState.entropy / 100, 0, 1);
    const generation = this.clamp(this.gameState.avgGeneration / 20, 0, 1);
    const score = this.clamp(this.gameState.avgScore / 100, 0, 1);
    const pressure = this.clamp(this.gameState.pressure ?? 0, 0, 1);
    const interactionHeat = this.clamp(this.gameState.interactionHeat ?? 0, 0, 1);
    const interventionMomentum = this.clamp(this.gameState.interventionMomentum ?? 0, 0, 1);
    const running = this.gameState.stage === 'SIMULATION' && this.gameState.isRunning ? 0.25 : 0;
    const idlePenalty = this.gameState.stage === 'SIMULATION' && !this.gameState.isRunning ? -0.28 : 0;

    return this.clamp(
      0.45 +
      entropy * 0.32 +
      generation * 0.2 +
      score * 0.1 +
      pressure * 0.22 +
      interactionHeat * 0.14 +
      interventionMomentum * 0.12 +
      running +
      idlePenalty,
      0.25,
      1.42,
    );
  }

  private shouldPlayDrum(step: number, intensity: number) {
    if (this.gameState.stage !== 'SIMULATION' || this.gameState.isRunning) return true;
    return step % 4 === 0 || intensity > 0.95;
  }

  private pickComposition(track: Exclude<TrackType, 'NONE'>, signature = this.selectionSignature(track)) {
    const options = getCompositionsForTrack(track);
    if (options.length === 0) return COMPOSITIONS[0];
    if (track !== 'EVOLUTION') return options[0];

    return options
      .map((composition) => ({
        composition,
        score: this.scoreComposition(composition),
        tieBreak: this.stableHash(`${signature}:${composition.id}`),
      }))
      .sort((a, b) => b.score - a.score || b.tieBreak - a.tieBreak)
      [0]?.composition ?? options[0];
  }

  private scoreComposition(composition: Composition) {
    const tags = composition.tags;
    if (!tags) return 0;

    const pressureBand = this.getPressureBand();
    let score = 0;

    if (this.gameState.runTheme && tags.themes?.includes(this.gameState.runTheme)) score += 7;
    if (this.gameState.cueTone && tags.tones?.includes(this.gameState.cueTone)) score += 4;
    if (this.gameState.recentEventKind && tags.eventKinds?.includes(this.gameState.recentEventKind)) score += 6;
    if (tags.pressure?.includes(pressureBand)) score += 3;

    if (this.gameState.runPhase === 'CRISIS' && tags.tones?.some((tone) => tone === 'danger' || tone === 'void')) score += 4;
    if (this.gameState.runPhase === 'ASCENSION' && tags.tones?.includes('triumph')) score += 4;
    if ((this.gameState.runPhase === 'BURST' || this.gameState.runPhase === 'DIVERGENCE') && tags.tones?.includes('momentum')) score += 2;

    if (this.gameState.recentEventSeverity === 'danger' && tags.tones?.some((tone) => tone === 'danger' || tone === 'void')) score += 5;
    if (this.gameState.recentEventSeverity === 'warning' && tags.tones?.some((tone) => tone === 'danger' || tone === 'momentum')) score += 3;
    if (this.gameState.recentEventSeverity === 'good' && tags.tones?.some((tone) => tone === 'triumph' || tone === 'calm')) score += 3;

    if (this.gameState.population <= 0 && tags.eventKinds?.includes('RUN_ENDED')) score += 8;
    if (this.gameState.avgGeneration >= 12 && tags.eventKinds?.includes('GENERATION_LEAP')) score += 2;
    if (this.gameState.avgScore >= 75 && tags.themes?.includes('Apex')) score += 2;

    return score;
  }

  private selectionSignature(track: Exclude<TrackType, 'NONE'>) {
    if (track !== 'EVOLUTION') return track;
    return [
      this.gameState.runId ?? 'no-run',
      this.gameState.runTheme ?? 'no-theme',
      this.gameState.runPhase ?? 'no-phase',
      this.gameState.cueTone ?? 'no-tone',
      this.gameState.recentEventKind ?? 'no-event',
      this.gameState.recentEventSeverity ?? 'no-severity',
      this.getPressureBand(),
    ].join(':');
  }

  private getPressureBand(): AudioPressureBand {
    const pressure = Math.max(
      this.clamp(this.gameState.pressure ?? 0, 0, 1),
      this.clamp(this.gameState.entropy / 100, 0, 1),
      this.clamp(this.gameState.interactionHeat ?? 0, 0, 1),
    );

    if (this.gameState.stage === 'SIMULATION' && this.gameState.population <= 0) return 'terminal';
    if (pressure >= 0.88) return 'terminal';
    if (pressure >= 0.62) return 'high';
    if (pressure >= 0.28) return 'mid';
    return 'low';
  }

  private stableHash(value: string) {
    let hash = 2166136261;
    for (let i = 0; i < value.length; i += 1) {
      hash ^= value.charCodeAt(i);
      hash = Math.imul(hash, 16777619);
    }
    return hash >>> 0;
  }

  private trackForStage(stage: AudioGameState['stage']): TrackType {
    if (stage === 'SPLASH') return 'STARTUP';
    if (stage === 'CONFIG') return 'CONFIG';
    if (stage === 'REVIEW') return 'REVIEW';
    return 'EVOLUTION';
  }

  private isEventCoolingDown(recipe: SfxRecipe) {
    const cooldown = recipe.cooldownMs ?? 0;
    if (cooldown <= 0) return false;

    const last = this.lastEventAt.get(recipe.event) ?? 0;
    return Date.now() - last < cooldown;
  }

  private clampVolume(value: number) {
    return this.clamp(Number.isFinite(value) ? value : 0, 0, 1);
  }

  private clamp(value: number, min: number, max: number) {
    return Math.min(max, Math.max(min, value));
  }
}

export const audioEngine = new AudioEngine();
export type { AudioSettings, AudioGameState, AudioEvent, TrackType, NowPlaying };
