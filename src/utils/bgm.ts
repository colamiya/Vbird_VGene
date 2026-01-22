/**
 * V-GENE 高维 8-bit 音乐合成引擎 v4.0 (The Cosmic Symphony - Addictive Groove Edition)
 * 具备虚拟侧链压限、动态 Swing 律动、多通道空间混音及史诗级节奏演化逻辑。
 */

export type TrackType = 'STARTUP' | 'CONFIG' | 'EVOLUTION' | 'NONE';

type PartType = 'INTRO' | 'VERSE' | 'PRE_CHORUS' | 'CHORUS' | 'INTERLUDE' | 'BRIDGE' | 'OUTRO';

const SONG_STRUCTURE: PartType[] = [
  'INTRO', 'VERSE', 'PRE_CHORUS', 'CHORUS', 
  'INTERLUDE', 'VERSE', 'PRE_CHORUS', 'CHORUS', 
  'BRIDGE', 'CHORUS', 'OUTRO'
];

interface PartData {
  lead?: (number | null)[];    // 16分音符旋律
  bass?: (number | null)[];    // 8分音符/16分音符低音
  pad?: (number | null)[];     // 长音和声
  arp?: (number | null)[];     // 高速琶音装饰
  drums?: number[];            // 1:Kick, 2:Snare, 3:Hats, 4:OpenHats, 5:Perc
}

interface Composition {
  name: string;
  description: string;
  root: string;
  scale: number[];
  tempo: number;
  swing: number;               // 0-1 律动感
  sidechain: number;           // 0-1 侧链泵感强度
  parts: Partial<Record<PartType, PartData>>;
}

class BgmManager {
  private ctx: AudioContext | null = null;
  private masterGain: GainNode | null = null;
  private filter: BiquadFilterNode | null = null;
  private compressor: DynamicsCompressorNode | null = null;
  
  // 通道混音器
  private channels: Record<string, { gain: GainNode; panner: StereoPannerNode }> = {};
  
  private currentTrack: TrackType = 'NONE';
  private currentCompIndex: number = 0;
  private currentPartIndex: number = 0;
  private currentStep: number = 0;
  private isPlaying: boolean = false;
  private nextNoteTime: number = 0;
  private timerId: number | null = null;

  private readonly LOOKAHEAD = 25.0;
  private readonly SCHEDULE_AHEAD = 0.1;
  private readonly STEPS_PER_PART = 32;

  private readonly FREQS: Record<string, number> = {
    'C2': 65.41, 'C#2': 69.30, 'D2': 73.42, 'D#2': 77.78, 'E2': 82.41, 'F2': 87.31, 'F#2': 92.50, 'G2': 98.00, 'G#2': 103.83, 'A2': 110.00, 'A#2': 116.54, 'B2': 123.47,
    'C3': 130.81, 'C#3': 138.59, 'D3': 146.83, 'D#3': 155.56, 'E3': 164.81, 'F3': 174.61, 'F#3': 185.00, 'G3': 196.00, 'G#3': 207.65, 'A3': 220.00, 'A#3': 233.08, 'B3': 246.94,
    'C4': 261.63, 'C#4': 277.18, 'D4': 293.66, 'D#4': 311.13, 'E4': 329.63, 'F4': 349.23, 'F#4': 369.99, 'G4': 392.00, 'G#4': 415.30, 'A4': 440.00, 'A#4': 466.16, 'B4': 493.88,
    'C5': 523.25, 'C#5': 554.37, 'D5': 587.33, 'D#5': 622.25, 'E5': 659.25, 'F5': 698.46, 'F#5': 739.99, 'G5': 783.99, 'G#5': 830.61, 'A5': 880.00, 'A#5': 932.33, 'B5': 987.77
  };

  private readonly DORIAN = [0, 2, 3, 5, 7, 9, 10, 12];
  private readonly AEOLIAN = [0, 2, 3, 5, 7, 8, 10, 12];
  private readonly PHRYGIAN = [0, 1, 3, 5, 7, 8, 10, 12];
  private readonly LYDIAN = [0, 2, 4, 6, 7, 9, 11, 12];

  private readonly COMPS: Composition[] = [
    {
      name: "生命起源 (Primordial)",
      description: "Quiet start, building addictive groove.",
      root: 'D3', scale: this.AEOLIAN, tempo: 124, swing: 0.1, sidechain: 0.5,
      parts: {
        INTRO: { pad: [0, null, null, null, 7, null, null, null], drums: [1, 0, 3, 0, 0, 0, 3, 0] },
        VERSE: { lead: [0, 2, 3, 5, 7, 5, 3, 2], bass: [0, 0, 0, 0, -5, -5, -7, -7], drums: [1, 3, 2, 3] },
        CHORUS: { 
          lead: [12, 10, 7, 10, 12, 12, 10, 15], 
          bass: [0, 0, 0, 0, 3, 3, 5, 5], 
          drums: [1, 3, 2, 3, 1, 3, 2, 3],
          arp: [12, 15, 17, 19, 24, 19, 17, 15]
        }
      }
    },
    {
      name: "模拟加速 (Acceleration)",
      description: "High energy, storm-like percussion.",
      root: 'E3', scale: this.PHRYGIAN, tempo: 142, swing: 0.2, sidechain: 0.8,
      parts: {
        INTRO: { lead: [0, 1, 0, 1], bass: [0, 0, 0, 0], drums: [1, 1, 1, 1] },
        CHORUS: { 
          lead: [7, 8, 10, 12, 13, 12, 10, 8], 
          bass: [0, 1, 3, 4, 3, 1, 0, 0], 
          drums: [1, 3, 2, 3, 1, 4, 2, 3],
          arp: [0, 12, 0, 12, 1, 13, 1, 13]
        }
      }
    },
    {
      name: "熵增定律 (Entropy)",
      description: "Distorted groove, increasing chaos.",
      root: 'D3', scale: this.DORIAN, tempo: 128, swing: 0.3, sidechain: 0.7,
      parts: {
        CHORUS: { lead: [0, 7, 12, 7, 5, 3, 2, 0], bass: [0, 0, 3, 3, 5, 5, 7, 7], drums: [1, 3, 2, 3, 1, 5, 2, 4] }
      }
    },
    {
      name: "适者生存 (Survival)",
      description: "Aggressive speed, pulsing sidechain.",
      root: 'E3', scale: this.PHRYGIAN, tempo: 155, swing: 0.15, sidechain: 0.9,
      parts: {
        CHORUS: { lead: [12, 13, 15, 12, 13, 15, 17, 15], bass: [0, 0, 0, 0, 1, 1, 1, 1], drums: [1, 2, 1, 2, 1, 2, 1, 2] }
      }
    },
    {
      name: "基因突变 (Mutation)",
      description: "Unpredictable glitched beats.",
      root: 'G3', scale: this.AEOLIAN, tempo: 138, swing: 0.4, sidechain: 0.6,
      parts: {
        CHORUS: { lead: [0, 12, 7, 15, 5, 17, 10, 24], bass: [0, -5, -2, -7], drums: [1, 5, 2, 3, 5, 1, 2, 4] }
      }
    },
    {
      name: "自然选择 (Selection)",
      description: "Steady precision, massive kick.",
      root: 'A3', scale: this.DORIAN, tempo: 120, swing: 0.05, sidechain: 0.8,
      parts: {
        CHORUS: { lead: [12, 12, 7, 7, 12, 12, 7, 7], bass: [0, 0, 0, 0], drums: [1, 0, 2, 0, 1, 0, 2, 0] }
      }
    },
    {
      name: "共生演化 (Symbiosis)",
      description: "Harmonized twin leads, flowing rhythm.",
      root: 'C3', scale: this.LYDIAN, tempo: 118, swing: 0.25, sidechain: 0.5,
      parts: {
        CHORUS: { lead: [0, 7, 12, 7, 5, 9, 14, 9], bass: [0, 5, 7, 5], drums: [1, 3, 2, 3, 1, 3, 2, 3] }
      }
    },
    {
      name: "资源瓶颈 (Scarcity)",
      description: "Minimalist, haunting space.",
      root: 'B2', scale: this.PHRYGIAN, tempo: 90, swing: 0.1, sidechain: 0.4,
      parts: {
        CHORUS: { lead: [0, null, 1, null, 0, null, 3, null], bass: [0, null, -12, null], drums: [1, 0, 0, 0, 1, 0, 2, 0] }
      }
    },
    {
      name: "指数增长 (Exponential)",
      description: "Escalating tempo and intensity.",
      root: 'D3', scale: this.AEOLIAN, tempo: 145, swing: 0.2, sidechain: 0.85,
      parts: {
        CHORUS: { lead: [0, 2, 3, 5, 7, 8, 10, 12], bass: [0, 3, 5, 7, 8, 10, 12, 15], drums: [1, 3, 2, 3, 1, 3, 2, 3] }
      }
    },
    {
      name: "神经塑性 (Plasticity)",
      description: "Fluid, shifting melodies.",
      root: 'F3', scale: this.DORIAN, tempo: 126, swing: 0.35, sidechain: 0.6,
      parts: {
        CHORUS: { lead: [12, 7, 5, 0, 7, 12, 17, 12], bass: [0, -5, 0, 3], drums: [1, 3, 2, 3, 1, 3, 2, 3] }
      }
    },
    {
      name: "全域竞争 (Competition)",
      description: "Brutal, crashing saws.",
      root: 'G3', scale: this.PHRYGIAN, tempo: 165, swing: 0.1, sidechain: 0.95,
      parts: {
        CHORUS: { lead: [0, 1, 0, 1, 3, 4, 3, 4], bass: [0, 0, 0, 0, 1, 1, 1, 1], drums: [1, 2, 1, 2, 1, 2, 1, 2] }
      }
    },
    {
      name: "生殖隔离 (Isolation)",
      description: "Split frequency bands, cold rhythm.",
      root: 'D3', scale: this.AEOLIAN, tempo: 112, swing: 0.2, sidechain: 0.7,
      parts: {
        CHORUS: { lead: [24, 24, 24, 24, 26, 26, 26, 26], bass: [-12, -12, -12, -12], drums: [1, 0, 2, 0, 1, 0, 2, 0] }
      }
    },
    {
      name: "代谢阈值 (Metabolism)",
      description: "Heavy pulse, organic heartbeats.",
      root: 'C2', scale: this.PHRYGIAN, tempo: 85, swing: 0.3, sidechain: 0.6,
      parts: {
        CHORUS: { lead: [0, 1, 3, 1, 0, 1, 3, 1], bass: [0, 0, 0, 0], drums: [1, 0, 0, 0, 1, 0, 0, 0] }
      }
    },
    {
      name: "稳态平衡 (Homeostasis)",
      description: "Pure order, zen-like loop.",
      root: 'E3', scale: this.AEOLIAN, tempo: 122, swing: 0, sidechain: 0.3,
      parts: {
        CHORUS: { lead: [0, 7, 12, 7, 0, 7, 12, 7], bass: [0, 0, 0, 0], drums: [3, 3, 3, 3] }
      }
    },
    {
      name: "红皇后假说 (Red Queen)",
      description: "Never-ending run, rising tension.",
      root: 'A3', scale: this.DORIAN, tempo: 148, swing: 0.1, sidechain: 0.8,
      parts: {
        CHORUS: { lead: [0, 2, 3, 5, 7, 9, 10, 12], bass: [0, 0, 0, 0, 2, 2, 2, 2], drums: [1, 3, 2, 3, 1, 3, 2, 3] }
      }
    },
    {
      name: "水平基因转移 (Horizontal)",
      description: "Cross-over fusion, shifting beats.",
      root: 'G3', scale: this.DORIAN, tempo: 132, swing: 0.3, sidechain: 0.65,
      parts: {
        CHORUS: { lead: [0, 5, 12, 7, 17, 12, 7, 5], bass: [0, -7, 0, 5], drums: [1, 3, 2, 3, 1, 3, 2, 3] }
      }
    },
    {
      name: "表观遗传 (Epigenetics)",
      description: "Echoes of the past, layered groove.",
      root: 'D3', scale: this.AEOLIAN, tempo: 116, swing: 0.2, sidechain: 0.55,
      parts: {
        CHORUS: { lead: [0, 7, 0, 7, 3, 10, 3, 10], bass: [0, -12, 0, -12], drums: [1, 3, 2, 3, 1, 3, 2, 3] }
      }
    },
    {
      name: "间断平衡 (Equilibrium)",
      description: "Silent pauses followed by explosions.",
      root: 'E3', scale: this.DORIAN, tempo: 140, swing: 0.15, sidechain: 0.9,
      parts: {
        CHORUS: { lead: [12, 12, 12, 12, 12, 12, 12, 12], bass: [0, 3, 5, 7], drums: [1, 2, 1, 2, 1, 2, 1, 2] }
      }
    },
    {
      name: "信息梯度 (Info Gradient)",
      description: "Increasing complexity, rapid growth.",
      root: 'B3', scale: this.PHRYGIAN, tempo: 125, swing: 0.25, sidechain: 0.75,
      parts: {
        CHORUS: { lead: [0, 1, 3, 1, 5, 7, 8, 7, 12, 13, 15, 13], bass: [0, -12, 3, -9], drums: [1, 3, 2, 3, 1, 3, 2, 3] }
      }
    },
    {
      name: "协同进化 (Co-evolution)",
      description: "Call and response, interlocking beats.",
      root: 'D3', scale: this.DORIAN, tempo: 128, swing: 0.2, sidechain: 0.6,
      parts: {
        CHORUS: { lead: [0, 7, 0, 7, 12, 5, 12, 5], bass: [0, 5, 7, 5], drums: [1, 3, 2, 3, 1, 3, 2, 3] }
      }
    },
    {
      name: "欧米伽点 (Omega Point)",
      description: "The end of time, divine resonance.",
      root: 'G4', scale: this.AEOLIAN, tempo: 80, swing: 0.1, sidechain: 0.2,
      parts: {
        CHORUS: { lead: [0, 7, 12, 19, 24, 17, 12, 7], bass: [0, -12], drums: [1, 0, 0, 0, 3, 0, 0, 0] }
      }
    },
    {
      name: "逻辑归一 (Singularity)",
      description: "The final unity, infinite vibration.",
      root: 'D2', scale: this.DORIAN, tempo: 60, swing: 0, sidechain: 0.1,
      parts: {
        CHORUS: { lead: [0, null, 12, null], bass: [0, 0, 0, 0], drums: [1, 0, 0, 0, 1, 0, 0, 0] }
      }
    }
  ];

  constructor() {}

  private init() {
    if (!this.ctx) {
      this.ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
      this.masterGain = this.ctx.createGain();
      this.filter = this.ctx.createBiquadFilter();
      this.compressor = this.ctx.createDynamicsCompressor();
      
      this.filter.type = 'lowpass';
      this.filter.frequency.value = 2500;
      
      this.compressor.threshold.setValueAtTime(-24, this.ctx.currentTime);
      this.compressor.knee.setValueAtTime(30, this.ctx.currentTime);
      this.compressor.ratio.setValueAtTime(12, this.ctx.currentTime);
      this.compressor.attack.setValueAtTime(0.003, this.ctx.currentTime);
      this.compressor.release.setValueAtTime(0.25, this.ctx.currentTime);

      // 初始化通道
      ['lead', 'bass', 'pad', 'arp', 'drums'].forEach(name => {
        const gain = this.ctx!.createGain();
        const panner = this.ctx!.createStereoPanner();
        panner.connect(this.masterGain!);
        gain.connect(panner);
        this.channels[name] = { gain, panner };
      });

      this.masterGain.connect(this.filter);
      this.filter.connect(this.compressor);
      this.compressor.connect(this.ctx.destination);
      this.masterGain.gain.setValueAtTime(0, this.ctx.currentTime);
    }
  }

  private playNote(freq: number, time: number, duration: number, type: OscillatorType = 'square', volume = 0.1, channelName: string) {
    if (!this.ctx) return;
    const channel = this.channels[channelName];
    if (!channel) return;

    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    
    osc.type = type;
    osc.frequency.setValueAtTime(freq, time);

    // 为 Lead 增加颤音和微调音，增加厚度
    if (channelName === 'lead' || channelName === 'arp') {
      const vibrato = this.ctx.createOscillator();
      const vibratoGain = this.ctx.createGain();
      vibrato.frequency.setValueAtTime(6, time);
      vibratoGain.gain.setValueAtTime(freq * 0.004, time);
      vibrato.connect(vibratoGain);
      vibratoGain.connect(osc.frequency);
      vibrato.start(time);
      vibrato.stop(time + duration + 0.2);

      // 微弱的 detune 模拟复古感
      osc.detune.setValueAtTime(Math.random() * 4 - 2, time);
    }

    // ADSR
    const attack = 0.01;
    const decay = 0.1;
    const sustain = 0.7;
    const release = 0.15;
    
    gain.gain.setValueAtTime(0, time);
    gain.gain.linearRampToValueAtTime(volume, time + attack);
    gain.gain.linearRampToValueAtTime(volume * sustain, time + attack + decay);
    gain.gain.exponentialRampToValueAtTime(0.001, time + duration + release);

    osc.connect(gain);
    gain.connect(channel.gain);
    
    osc.start(time);
    osc.stop(time + duration + release);
  }

  private playDrum(time: number, type: number, volume = 0.1) {
    if (!this.ctx) return;
    const channel = this.channels['drums'];

    if (type === 1) { // Kick (Punchy)
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.frequency.setValueAtTime(180, time);
      osc.frequency.exponentialRampToValueAtTime(40, time + 0.1);
      gain.gain.setValueAtTime(volume * 1.5, time);
      gain.gain.exponentialRampToValueAtTime(0.001, time + 0.15);
      osc.connect(gain);
      gain.connect(channel.gain);
      osc.start(time);
      osc.stop(time + 0.15);

      // 触发虚拟侧链
      const comp = this.COMPS[this.currentCompIndex];
      const sc = comp.sidechain || 0.5;
      ['bass', 'pad'].forEach(name => {
        const ch = this.channels[name];
        ch.gain.gain.setTargetAtTime(1.0 - sc, time, 0.01);
        ch.gain.gain.setTargetAtTime(1.0, time + 0.1, 0.05);
      });

    } else if (type === 2) { // Snare (Crispy)
      const noise = this.ctx.createBufferSource();
      const buffer = this.ctx.createBuffer(1, this.ctx.sampleRate * 0.1, this.ctx.sampleRate);
      const data = buffer.getChannelData(0);
      for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1;
      noise.buffer = buffer;
      const gain = this.ctx.createGain();
      gain.gain.setValueAtTime(volume, time);
      gain.gain.exponentialRampToValueAtTime(0.001, time + 0.1);
      noise.connect(gain);
      gain.connect(channel.gain);
      noise.start(time);
      noise.stop(time + 0.1);
    } else if (type === 3) { // Closed Hats
      const osc = this.ctx.createOscillator();
      osc.type = 'square';
      osc.frequency.setValueAtTime(10000, time);
      const gain = this.ctx.createGain();
      gain.gain.setValueAtTime(volume * 0.4, time);
      gain.gain.exponentialRampToValueAtTime(0.001, time + 0.02);
      osc.connect(gain);
      gain.connect(channel.gain);
      osc.start(time);
      osc.stop(time + 0.02);
    } else if (type === 4) { // Open Hats
      const osc = this.ctx.createOscillator();
      osc.type = 'square';
      osc.frequency.setValueAtTime(8000, time);
      const gain = this.ctx.createGain();
      gain.gain.setValueAtTime(volume * 0.3, time);
      gain.gain.exponentialRampToValueAtTime(0.001, time + 0.15);
      osc.connect(gain);
      gain.connect(channel.gain);
      osc.start(time);
      osc.stop(time + 0.15);
    }
  }

  private scheduler() {
    if (!this.ctx) return;
    while (this.nextNoteTime < this.ctx.currentTime + this.SCHEDULE_AHEAD) {
      this.scheduleStep(this.currentStep, this.nextNoteTime);
      this.advanceStep();
    }
    this.timerId = window.setTimeout(() => this.scheduler(), this.LOOKAHEAD);
  }

  private advanceStep() {
    const comp = this.COMPS[this.currentCompIndex];
    const secondsPerBeat = 60.0 / comp.tempo;
    
    // Swing 逻辑
    const isOffBeat = this.currentStep % 2 === 1;
    const swingOffset = isOffBeat ? (comp.swing * 0.125 * secondsPerBeat) : 0;
    
    this.nextNoteTime += 0.25 * secondsPerBeat + swingOffset;
    this.currentStep++;

    if (this.currentStep >= this.STEPS_PER_PART) {
      this.currentStep = 0;
      this.currentPartIndex++;
      if (this.currentPartIndex >= SONG_STRUCTURE.length) {
        this.currentPartIndex = 0;
        if (this.currentTrack === 'EVOLUTION') {
          if (Math.random() < 0.9) {
            this.currentCompIndex = 2 + Math.floor(Math.random() * (this.COMPS.length - 2));
          }
        }
      }
    }
  }

  private scheduleStep(step: number, time: number) {
    const comp = this.COMPS[this.currentCompIndex];
    const partType = SONG_STRUCTURE[this.currentPartIndex];
    const part = comp.parts[partType] || comp.parts['CHORUS'] || comp.parts['VERSE'] || comp.parts['INTRO']!;

    // 声场自动化
    ['lead', 'arp'].forEach(name => {
      const ch = this.channels[name];
      ch.panner.pan.setTargetAtTime(Math.sin(time * 2) * 0.5, time, 0.1);
    });

    // 1. Lead
    if (part.lead) {
      const interval = part.lead[step % part.lead.length];
      if (interval !== null && interval !== undefined) {
        const freq = this.getFreqFromInterval(comp.root, interval, comp.scale);
        this.playNote(freq, time, 0.15, 'square', 0.08, 'lead');
      }
    }

    // 2. Bass
    if (part.bass) {
      const interval = part.bass[step % part.bass.length];
      if (interval !== null && interval !== undefined) {
        const freq = this.getFreqFromInterval(comp.root, interval - 12, comp.scale);
        this.playNote(freq, time, 0.2, 'sawtooth', 0.12, 'bass');
      }
    }

    // 3. Pad
    if (part.pad && step % 8 === 0) {
      const interval = part.pad[step % part.pad.length];
      if (interval !== null && interval !== undefined) {
        const freq = this.getFreqFromInterval(comp.root, interval - 12, comp.scale);
        this.playNote(freq, time, 1.5, 'triangle', 0.06, 'pad');
      }
    }

    // 4. Arp (高速装饰)
    if (part.arp) {
      const interval = part.arp[step % part.arp.length];
      if (interval !== null && interval !== undefined) {
        const freq = this.getFreqFromInterval(comp.root, interval + 12, comp.scale);
        this.playNote(freq, time, 0.05, 'sine', 0.04, 'arp');
      }
    }

    // 5. Drums
    if (part.drums) {
      const drumType = part.drums[step % part.drums.length];
      if (drumType > 0) {
        this.playDrum(time, drumType, 0.1);
      }
    }
  }

  private getFreqFromInterval(root: string, interval: number, scale: number[]) {
    const rootFreq = this.FREQS[root] || 440;
    const octave = Math.floor(interval / scale.length);
    const index = ((interval % scale.length) + scale.length) % scale.length;
    const semitones = scale[index] + octave * 12;
    return rootFreq * Math.pow(2, semitones / 12);
  }

  async play(track: TrackType) {
    this.init();
    if (!this.ctx || !this.masterGain) return;
    if (this.currentTrack === track && track !== 'EVOLUTION') return;

    if (this.ctx.state === 'suspended') await this.ctx.resume();
    this.masterGain.gain.setTargetAtTime(0.001, this.ctx.currentTime, 0.1);
    
    setTimeout(() => {
      this.currentTrack = track;
      if (track === 'STARTUP') this.currentCompIndex = 0;
      else if (track === 'CONFIG') this.currentCompIndex = 1;
      else if (track === 'EVOLUTION') {
        this.currentCompIndex = 2 + Math.floor(Math.random() * (this.COMPS.length - 2));
      }
      this.currentStep = 0;
      this.currentPartIndex = 0;
      this.nextNoteTime = this.ctx!.currentTime;
      if (track !== 'NONE') {
        if (!this.isPlaying) {
          this.isPlaying = true;
          this.scheduler();
        }
        this.masterGain!.gain.setTargetAtTime(1, this.ctx!.currentTime, 0.5);
      } else {
        this.stop();
      }
    }, 200);
  }

  stop() {
    if (this.timerId) {
      clearTimeout(this.timerId);
      this.timerId = null;
    }
    this.isPlaying = false;
    this.currentTrack = 'NONE';
    if (this.masterGain) this.masterGain.gain.setTargetAtTime(0, this.ctx?.currentTime || 0, 0.1);
  }

  getCurrentLaw() {
    return this.COMPS[this.currentCompIndex];
  }
}

export const bgm = new BgmManager();
