import React from 'react';
import { BookmarkPlus, Eye, PauseCircle, Sparkles, Utensils, Wand2 } from 'lucide-react';
import type { MealRhythmAction, MealRhythmCue, PlayerInterventionKind } from '../types/world';
import { formatIntervention } from '../utils/runSession';

interface MealRhythmCardProps {
  cue: MealRhythmCue | null;
  disabled?: boolean;
  onBookmark?: () => void;
  onSelectIntervention?: (kind: PlayerInterventionKind) => void;
}

const toneClass: Record<MealRhythmCue['tone'], string> = {
  info: 'border-t-neon-blue text-neon-blue',
  good: 'border-t-emerald-300 text-emerald-300',
  warning: 'border-t-yellow-300 text-yellow-300',
  danger: 'border-t-red-400 text-red-400',
};

const actionIcon: Record<MealRhythmAction, React.ReactNode> = {
  WATCH: <Eye size={11} aria-hidden="true" />,
  MARK: <BookmarkPlus size={11} aria-hidden="true" />,
  INTERVENE: <Wand2 size={11} aria-hidden="true" />,
  HOLD: <PauseCircle size={11} aria-hidden="true" />,
};

const actionLabel: Record<MealRhythmAction, string> = {
  WATCH: '观察',
  MARK: '标记',
  INTERVENE: '干预',
  HOLD: '忍手',
};

const MealRhythmCard: React.FC<MealRhythmCardProps> = ({
  cue,
  disabled = false,
  onBookmark,
  onSelectIntervention,
}) => {
  if (!cue) return null;

  const canBookmark = !disabled && cue.action === 'MARK' && Boolean(onBookmark);
  const canSelectIntervention = !disabled && cue.action === 'INTERVENE' && Boolean(cue.suggestedIntervention) && Boolean(onSelectIntervention);

  return (
    <article className={`hud-panel-quiet border-t-2 p-3 ${toneClass[cue.tone]}`}>
      <img
        src="/media/meal-rhythm-plate.svg"
        alt=""
        aria-hidden="true"
        className="hud-deco"
      />
      <div className="relative">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <div className="flex items-center gap-2 text-[9px] font-mono uppercase tracking-[0.14em] text-white/35">
              <Utensils size={10} aria-hidden="true" />
              下饭节奏
            </div>
            <h3 className="mt-1 truncate text-[11px] font-black text-white">{cue.title}</h3>
          </div>
          <span className="flex shrink-0 items-center gap-1 border border-current px-2 py-1 text-[9px] font-mono uppercase tracking-[0.14em]">
            {actionIcon[cue.action]}
            {actionLabel[cue.action]}
          </span>
        </div>

        <p className="mt-2 line-clamp-2 text-[9px] font-mono leading-relaxed text-white/60">{cue.detail}</p>
        <div className="mt-2 grid grid-cols-[1fr_auto] items-center gap-3 border-t border-white/5 pt-2">
          <p className="min-w-0 truncate text-[9px] font-mono text-white/35">{cue.evidence}</p>
          <span className="text-[9px] font-mono uppercase tracking-[0.14em]">{Math.round(cue.confidence * 100)}%</span>
        </div>

        {(canBookmark || canSelectIntervention) && (
          <button
            type="button"
            disabled={disabled}
            onClick={() => {
              if (canBookmark) {
                onBookmark?.();
                return;
              }
              if (canSelectIntervention && cue.suggestedIntervention) {
                onSelectIntervention?.(cue.suggestedIntervention);
              }
            }}
            className="interactive-focus mt-3 flex min-h-10 w-full items-center justify-center gap-2 border border-current px-3 py-2 text-[9px] font-mono uppercase tracking-[0.14em] transition-[background-color,opacity] hover:bg-white/5 disabled:cursor-not-allowed disabled:opacity-45"
          >
            <Sparkles size={10} aria-hidden="true" />
            {canSelectIntervention && cue.suggestedIntervention ? `切到${formatIntervention(cue.suggestedIntervention)}` : cue.prompt}
          </button>
        )}
      </div>
    </article>
  );
};

export default MealRhythmCard;
