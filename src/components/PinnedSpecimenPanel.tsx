import React, { useMemo } from 'react';
import { Crosshair, Dna, Radio, TrendingUp, X } from 'lucide-react';
import type { PinnedSpecimen } from '../types/world';
import { formatRunDuration, formatRunPhase } from '../utils/runSession';
import { summarizePinnedSpecimen } from '../utils/specimenDossier';

interface PinnedSpecimenPanelProps {
  specimen: PinnedSpecimen | null;
  now: number;
  onClear: () => void;
}

const PinnedSpecimenPanel: React.FC<PinnedSpecimenPanelProps> = ({ specimen, now, onClear }) => {
  const summary = useMemo(() => summarizePinnedSpecimen(specimen, now), [now, specimen]);

  if (!specimen || !summary) return null;

  const statusTone = summary.status === 'SURVIVED'
    ? 'border-neon-blue/30 text-neon-blue'
    : 'border-red-400/40 text-red-400';
  const scoreDelta = summary.final.score - summary.first.score;

  return (
    <section
      aria-label="钉选样本档案"
      className="w-full"
    >
      <div className="hud-panel p-4">
        <img
          src="/media/pinned-specimen-dossier.svg"
          alt=""
          aria-hidden="true"
          className="hud-deco"
        />
        <div className="relative">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <div className="flex items-center gap-2 text-[9px] font-mono uppercase tracking-[0.14em] text-white/35">
                <Crosshair size={10} aria-hidden="true" />
                样本档案
              </div>
              <h2 className="mt-1 truncate text-sm font-black uppercase italic tracking-normal text-white">
                #{specimen.entityId} 观察焦点
              </h2>
            </div>
            <button
              type="button"
              aria-label="清除钉选样本"
              onClick={onClear}
              className="interactive-focus border border-white/10 p-2 text-white/40 hover:border-red-400/40 hover:text-red-400"
            >
              <X size={12} aria-hidden="true" />
            </button>
          </div>

          <div className={`mt-4 border border-t-2 bg-white/[0.02] p-3 ${statusTone}`}>
            <div className="flex items-center justify-between gap-3">
              <span className="text-[9px] font-black text-white">{summary.title}</span>
              <span className="text-[9px] font-mono uppercase tracking-[0.14em]">
                {summary.status === 'SURVIVED' ? 'Tracking' : 'Lost'}
              </span>
            </div>
            <p className="mt-2 text-[9px] font-mono leading-relaxed text-white/45">{summary.detail}</p>
          </div>

          <div className="mt-3 grid grid-cols-3 gap-2">
            <div className="border border-white/5 bg-black/30 p-2">
              <div className="flex items-center gap-1 text-[9px] font-mono uppercase tracking-[0.14em] text-white/35">
                <TrendingUp size={10} aria-hidden="true" />
                峰值
              </div>
              <div className="mt-1 text-[11px] font-black text-neon-blue">{summary.peakScore.toFixed(1)}</div>
            </div>
            <div className="border border-white/5 bg-black/30 p-2">
              <div className="flex items-center gap-1 text-[9px] font-mono uppercase tracking-[0.14em] text-white/35">
                <Dna size={10} aria-hidden="true" />
                世代
              </div>
              <div className="mt-1 text-[11px] font-black text-white">
                {summary.generationGain >= 0 ? '+' : ''}{summary.generationGain}
              </div>
            </div>
            <div className="border border-white/5 bg-black/30 p-2">
              <div className="flex items-center gap-1 text-[9px] font-mono uppercase tracking-[0.14em] text-white/35">
                <Radio size={10} aria-hidden="true" />
                追踪
              </div>
              <div className="mt-1 text-[11px] font-black text-white">{formatRunDuration(summary.trackedMs)}</div>
            </div>
          </div>

          <div className="mt-3 border-t border-white/5 pt-3">
            <div className="flex items-center justify-between text-[9px] font-mono text-white/35">
              <span>{formatRunPhase(summary.first.phase)}</span>
              <span>{formatRunPhase(summary.final.phase)}</span>
            </div>
            <div className="mt-2 h-1 bg-white/10">
              <div
                className={scoreDelta >= 0 ? 'h-full bg-neon-blue' : 'h-full bg-red-400'}
                style={{ width: `${Math.min(100, Math.max(8, Math.abs(scoreDelta) * 3))}%` }}
              />
            </div>
            <div className="mt-2 grid grid-cols-2 gap-2 text-[9px] font-mono text-white/45">
              <span>适应度 {summary.first.score.toFixed(1)} {'->'} {summary.final.score.toFixed(1)}</span>
              <span>毒素 {summary.first.toxin.toFixed(2)} {'->'} {summary.final.toxin.toFixed(2)}</span>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default PinnedSpecimenPanel;
