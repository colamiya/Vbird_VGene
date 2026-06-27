import React from 'react';
import { Activity, Crosshair, Gauge, Radio } from 'lucide-react';
import type { ExperienceDirectorCue, ExperienceTone } from '../utils/experienceDirector';
import { formatIntervention } from '../utils/runSession';

interface ExperienceDirectorPanelProps {
  cue: ExperienceDirectorCue | null;
}

const toneClass: Record<ExperienceTone, string> = {
  calm: 'border-t-white/25 text-white/60',
  momentum: 'border-t-neon-blue text-neon-blue',
  danger: 'border-t-red-400 text-red-400',
  triumph: 'border-t-emerald-300 text-emerald-300',
  void: 'border-t-yellow-300 text-yellow-300',
};

const barClass: Record<ExperienceTone, string> = {
  calm: 'bg-white/50',
  momentum: 'bg-neon-blue',
  danger: 'bg-red-400',
  triumph: 'bg-emerald-300',
  void: 'bg-yellow-300',
};

const ExperienceDirectorPanel: React.FC<ExperienceDirectorPanelProps> = ({ cue }) => {
  if (!cue) return null;

  return (
    <section aria-label="体验导演" className="w-full">
      <div className={`hud-panel-quiet border-t-2 p-3 ${toneClass[cue.tone]}`}>
        <div className="pointer-events-none absolute inset-0 opacity-70">
          <div className="absolute inset-x-4 top-1/2 h-px bg-current/10" />
          <div className="absolute left-6 top-4 h-16 w-px bg-current/10" />
          <div className="absolute right-8 bottom-4 h-10 w-px bg-current/10" />
        </div>
        <div className="relative">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <div className="flex items-center gap-2 text-[9px] font-mono uppercase tracking-[0.14em] text-white/35">
                <Radio size={10} aria-hidden="true" />
                体验导演
              </div>
              <h2 className="mt-1 truncate text-sm font-black uppercase italic tracking-normal text-white">
                {cue.title}
              </h2>
            </div>
            <div className="shrink-0 border border-current px-2 py-1 text-right">
              <div className="flex items-center justify-end gap-1 text-[9px] font-mono uppercase tracking-[0.12em]">
                <Gauge size={10} aria-hidden="true" />
                强度
              </div>
              <div className="mt-0.5 text-[10px] font-black">{Math.round(cue.intensity * 100)}%</div>
            </div>
          </div>

          <p className="mt-2 line-clamp-2 text-[10px] font-bold leading-relaxed text-white/80">{cue.subtitle}</p>
          <div className="mt-3 h-1 bg-white/10">
            <div
              className={`h-full transition-[width] duration-500 ${barClass[cue.tone]}`}
              style={{ width: `${Math.round(cue.intensity * 100)}%` }}
            />
          </div>

          <div className="mt-3 grid grid-cols-[1rem_1fr] gap-2 border-t border-white/5 pt-3">
            <Crosshair size={12} aria-hidden="true" className="mt-0.5 text-current" />
            <div className="min-w-0">
              <p className="line-clamp-2 text-[9px] font-mono leading-relaxed text-white/50">{cue.action}</p>
              <p className="mt-1 truncate text-[9px] font-mono text-white/30">
                当前手势：{formatIntervention(cue.recommendedIntervention)}
              </p>
            </div>
          </div>

          <div className="mt-2 flex items-center gap-2 truncate border-t border-white/5 pt-2 text-[9px] font-mono text-white/30">
            <Activity size={10} aria-hidden="true" className="shrink-0" />
            <span className="truncate">{cue.evidence}</span>
          </div>
        </div>
      </div>
    </section>
  );
};

export default ExperienceDirectorPanel;
