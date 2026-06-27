import React from 'react';
import { Activity, BookmarkPlus, Crosshair, Eye, Radio } from 'lucide-react';
import type { LiveProtagonistRadar, LiveProtagonistRole, WorldEvent } from '../types/world';
import type { DirectorCue, DirectorCueTone } from '../utils/directorCues';
import { formatIntervention } from '../utils/runSession';

interface DirectorCuePanelProps {
  cue: DirectorCue | null;
  protagonistRadar?: LiveProtagonistRadar | null;
  highlightCount?: number;
  bookmarkDisabled?: boolean;
  compact?: boolean;
  onBookmark?: () => void;
}

const toneClass: Record<DirectorCueTone, string> = {
  calm: 'border-t-white/40 text-white/60',
  growth: 'border-t-emerald-300 text-emerald-300',
  warning: 'border-t-yellow-300 text-yellow-300',
  danger: 'border-t-red-400 text-red-400',
  ascend: 'border-t-neon-purple text-neon-purple',
};

const iconToneClass: Record<DirectorCueTone, string> = {
  calm: 'text-white/40',
  growth: 'text-emerald-300',
  warning: 'text-yellow-300',
  danger: 'text-red-400',
  ascend: 'text-neon-purple',
};

const severityClass: Record<WorldEvent['severity'], string> = {
  info: 'border-white/10 text-white/60',
  good: 'border-emerald-300/30 text-emerald-300',
  warning: 'border-yellow-300/30 text-yellow-300',
  danger: 'border-red-400/40 text-red-400',
};

const roleLabel: Record<LiveProtagonistRole, string> = {
  APEX: '顶点',
  CARETAKER: '看护',
  SURVIVOR: '幸存',
  THREAT: '威胁',
};

const DirectorCuePanel: React.FC<DirectorCuePanelProps> = ({
  cue,
  protagonistRadar = null,
  highlightCount = 0,
  bookmarkDisabled = false,
  compact = false,
  onBookmark,
}) => {
  if (!cue) return null;

  return (
    <section
      aria-label="导演镜头提示"
      className="pointer-events-auto w-full"
    >
      <div className={`hud-panel-quiet border-t-2 p-3 ${toneClass[cue.tone]}`}>
        <img
          src="/media/director-cue-viewfinder.svg"
          alt=""
          aria-hidden="true"
          className="hud-deco"
        />
        {typeof cue.entityId === 'number' && (
          <img
            src="/media/director-target-lock.svg"
            alt=""
            aria-hidden="true"
            className="pointer-events-none absolute right-8 top-6 h-16 w-16 object-contain opacity-10"
          />
        )}
        <img
          src="/media/director-audio-pulse.svg"
          alt=""
          aria-hidden="true"
          className="pointer-events-none absolute inset-x-0 bottom-0 h-12 w-full object-cover opacity-10"
        />
        <div className="relative">
          <div className="flex items-start justify-between gap-4">
            <div className="min-w-0">
              <div className="flex items-center gap-2 text-[9px] font-mono uppercase tracking-[0.14em] text-white/35">
                <Eye size={10} aria-hidden="true" />
                导演镜头
              </div>
              <h2 className="mt-1 truncate text-sm font-black uppercase italic tracking-normal text-white">
                {cue.title}
              </h2>
            </div>
            <div className="shrink-0 border border-current px-2 py-1 text-right">
              <div className="text-[9px] font-mono uppercase tracking-[0.14em]">可信</div>
              <div className="mt-0.5 text-[10px] font-black">{Math.round(cue.confidence * 100)}%</div>
            </div>
          </div>

          <p className={`${compact ? 'line-clamp-1' : ''} mt-3 text-[10px] font-bold leading-relaxed text-white/85`}>{cue.directive}</p>
          <p className={`${compact ? 'line-clamp-1' : 'line-clamp-2'} mt-2 text-[9px] font-mono leading-relaxed text-white/45`}>{cue.cameraHint}</p>

          {!compact && protagonistRadar && (
            <div className={`relative mt-3 overflow-hidden border-l-2 bg-black/35 px-3 py-2 ${severityClass[protagonistRadar.tone]}`}>
              <img
                src="/media/live-protagonist-radar.svg"
                alt=""
                aria-hidden="true"
                className="hud-deco"
              />
              <div className="relative">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 text-[9px] font-mono uppercase tracking-[0.14em] text-white/30">
                      <Radio size={10} aria-hidden="true" />
                      主角雷达
                    </div>
                    <h3 className="mt-1 truncate text-[10px] font-black text-white">{protagonistRadar.title}</h3>
                  </div>
                  <span className="shrink-0 border border-current px-2 py-1 text-[9px] font-mono uppercase tracking-[0.14em]">
                    {protagonistRadar.candidates.length}
                  </span>
                </div>
                <p className="mt-1 line-clamp-2 text-[9px] font-mono leading-relaxed text-white/40">{protagonistRadar.subtitle}</p>
                <div className="mt-2 grid gap-1.5">
                  {protagonistRadar.candidates.slice(0, 3).map((candidate) => (
                    <article key={`${candidate.role}-${candidate.entityId}`} className={`border-l-2 bg-black/35 px-2 py-1.5 ${severityClass[candidate.tone]}`}>
                      <div className="flex items-center justify-between gap-2">
                        <span className="min-w-0 truncate text-[9px] font-bold text-white/80">
                          {roleLabel[candidate.role]} #{candidate.entityId}
                        </span>
                        <span className="shrink-0 text-[9px] font-mono">{candidate.confidence}%</span>
                      </div>
                      <p className="mt-1 truncate text-[9px] font-mono text-white/40">
                        S {candidate.metrics.fitness.toFixed(1)} / E {candidate.metrics.energy.toFixed(1)} / 建议 {formatIntervention(candidate.suggestedIntervention)}
                      </p>
                    </article>
                  ))}
                </div>
                <p className="mt-2 truncate border-t border-white/5 pt-2 text-[9px] font-mono text-white/30">{protagonistRadar.evidence}</p>
              </div>
            </div>
          )}

          <div className="mt-3 grid grid-cols-[1fr_auto] items-center gap-3 border-t border-white/5 pt-3">
            <div className="min-w-0 space-y-1">
              <p className="flex items-center gap-2 truncate text-[9px] font-mono text-white/40">
                <Crosshair size={10} aria-hidden="true" className="shrink-0 text-neon-blue/70" />
                <span className="truncate">{cue.targetLabel}</span>
              </p>
              <p className="flex items-center gap-2 truncate text-[9px] font-mono text-white/40">
                <Activity size={10} aria-hidden="true" className="shrink-0 text-white/40" />
                <span className="truncate">{cue.evidence}</span>
              </p>
            </div>
            <div className="flex shrink-0 items-center gap-2">
              <div className="flex items-center gap-2 border border-white/10 px-2 py-1 text-[9px] font-mono uppercase tracking-[0.14em] text-white/60">
                <Radio size={10} aria-hidden="true" className={iconToneClass[cue.tone]} />
                {cue.tempo}
              </div>
              {onBookmark && (
                <button
                  type="button"
                  aria-label="标记当前精彩瞬间"
                  disabled={bookmarkDisabled}
                  onClick={onBookmark}
                  className="interactive-focus flex items-center gap-1 border border-white/10 px-2 py-1 text-[9px] font-mono uppercase tracking-[0.14em] text-white/65 transition-[border-color,color,background-color,opacity] hover:border-neon-blue/40 hover:bg-neon-blue/10 hover:text-neon-blue disabled:cursor-not-allowed disabled:opacity-40"
                >
                  <BookmarkPlus size={10} aria-hidden="true" />
                  {highlightCount}
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default DirectorCuePanel;
