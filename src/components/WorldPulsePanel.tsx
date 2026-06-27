import React, { useMemo } from 'react';
import { Activity, Cpu, Gauge, Network, Radio, ScanSearch, Users } from 'lucide-react';
import type { ComputeStatus, EntityView, LiveInteractionNetwork, RunPhase, RunSession, WorldEvent, WorldStats } from '../types/world';
import { formatIntervention } from '../utils/runSession';
import { deriveCivilizationFactionLedger } from '../utils/civilizationFactions';
import { deriveEndgameForecast } from '../utils/endgameForecast';
import { deriveLiveInteractionNetwork } from '../utils/liveInteractions';
import { deriveWorldOmens, type WorldOmenTone } from '../utils/worldOmens';
import { deriveWorldPulse, type PulseTone } from '../utils/worldPulse';

interface WorldPulsePanelProps {
  stats: WorldStats;
  entities: EntityView[];
  events: WorldEvent[];
  phase?: RunPhase;
  session?: RunSession | null;
  now: number;
  computeStatus: ComputeStatus;
  interactionNetwork?: LiveInteractionNetwork | null;
}

const toneClass: Record<PulseTone, string> = {
  calm: 'text-white/60 border-white/10',
  growth: 'text-emerald-300 border-emerald-300/30',
  warning: 'text-yellow-300 border-yellow-300/30',
  danger: 'text-red-400 border-red-400/40',
  ascend: 'text-neon-purple border-neon-purple/40',
};

const barClass: Record<PulseTone, string> = {
  calm: 'bg-white/40',
  growth: 'bg-emerald-300',
  warning: 'bg-yellow-300',
  danger: 'bg-red-400',
  ascend: 'bg-neon-purple',
};

const textToneClass: Record<PulseTone, string> = {
  calm: 'text-white/60',
  growth: 'text-emerald-300',
  warning: 'text-yellow-300',
  danger: 'text-red-400',
  ascend: 'text-neon-purple',
};

const omenToneClass: Record<WorldOmenTone, string> = {
  calm: 'border-white/10 text-white/60',
  growth: 'border-emerald-300/30 text-emerald-300',
  warning: 'border-yellow-300/30 text-yellow-300',
  danger: 'border-red-400/40 text-red-400',
};

const factionToneClass: Record<WorldEvent['severity'], string> = {
  info: 'border-white/10 text-white/60',
  good: 'border-emerald-300/30 text-emerald-300',
  warning: 'border-yellow-300/30 text-yellow-300',
  danger: 'border-red-400/40 text-red-400',
};

const forecastToneClass: Record<WorldEvent['severity'], string> = {
  info: 'border-white/10 text-white/60',
  good: 'border-emerald-300/30 text-emerald-300',
  warning: 'border-yellow-300/30 text-yellow-300',
  danger: 'border-red-400/40 text-red-400',
};

const interactionKindLabel = {
  MUTUAL_AID: '互助',
  RESOURCE_TRANSFER: '转移',
  PREDATION: '掠食',
  TOXIC_CONFLICT: '冲突',
} as const;

const WorldPulsePanel: React.FC<WorldPulsePanelProps> = ({
  stats,
  entities,
  events,
  phase,
  session = null,
  now,
  computeStatus,
  interactionNetwork: providedInteractionNetwork = null,
}) => {
  const pulse = useMemo(
    () => deriveWorldPulse({ stats, entities, events, phase }),
    [entities, events, phase, stats],
  );
  const omens = useMemo(
    () => deriveWorldOmens({ stats, entities, events, phase }),
    [entities, events, phase, stats],
  );
  const factionLedger = useMemo(
    () => deriveCivilizationFactionLedger({ stats, entities, events }),
    [entities, events, stats],
  );
  const endgameForecast = useMemo(
    () => deriveEndgameForecast({ session, stats, entities, events, now }),
    [entities, events, now, session, stats],
  );
  const interactionNetwork = useMemo(
    () => providedInteractionNetwork ?? deriveLiveInteractionNetwork({ stats, entities, events }),
    [entities, events, providedInteractionNetwork, stats],
  );

  return (
    <section
      aria-label="文明态势"
      className="w-full"
    >
      <div className="hud-panel p-4">
        <img
          src="/media/world-pulse-radar.svg"
          alt=""
          aria-hidden="true"
          className="hud-deco"
        />
        <img
          src="/media/world-omens.svg"
          alt=""
          aria-hidden="true"
          className="pointer-events-none absolute inset-x-0 bottom-0 h-28 w-full object-cover opacity-10"
        />

        <div className="relative space-y-4">
          <div className="flex items-start justify-between gap-4">
            <div className="min-w-0">
              <div className="flex items-center gap-2 text-[9px] font-mono uppercase tracking-[0.14em] text-white/35">
                <Radio size={10} aria-hidden="true" />
                世界脉搏
              </div>
              <h2 className="mt-1 truncate text-sm font-black uppercase italic tracking-normal text-white">
                {pulse.title}
              </h2>
              <p className="mt-1 text-[9px] font-mono leading-relaxed text-white/45">{pulse.subtitle}</p>
            </div>
            <div className={`shrink-0 border px-2 py-1 text-right ${toneClass[pulse.pressureTone]}`}>
              <div className="text-[9px] font-mono uppercase tracking-[0.14em]">压力</div>
              <div className="mt-0.5 text-[10px] font-black">{pulse.pressure}</div>
            </div>
          </div>

          <div className={`border p-3 ${
            computeStatus.active_backend === 'CUDA'
              ? 'border-green-300/30 bg-green-300/[0.06] text-green-200'
              : 'border-yellow-300/20 bg-yellow-300/[0.04] text-yellow-200'
          }`}>
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <div className="flex items-center gap-2 text-[9px] font-mono uppercase tracking-[0.14em] text-white/45">
                  <Cpu size={10} aria-hidden="true" />
                  <span>计算后端</span>
                </div>
                <p className="mt-1 truncate text-[11px] font-black uppercase tracking-normal">
                  {computeStatus.active_backend === 'CUDA' ? 'CUDA EXPERIMENTAL' : 'CPU FALLBACK'}
                  <span className="ml-2 font-mono text-[9px] text-white/45">
                    req {computeStatus.requested_backend}
                  </span>
                </p>
              </div>
              <span className="shrink-0 font-mono text-[9px] uppercase tracking-[0.12em] text-white/50">
                {computeStatus.adaptive_scale.toFixed(2)}x
              </span>
            </div>
            <div className="mt-3 grid grid-cols-2 gap-2 text-[9px] font-mono text-white/45">
              <span>GPU {computeStatus.gpu_load}%</span>
              <span>T {computeStatus.temperature}°C</span>
              <span>VRAM {Math.round(computeStatus.vram_free / 1024 / 1024)}MB</span>
              <span>K {computeStatus.last_kernel_ms.toFixed(2)}ms</span>
            </div>
            {computeStatus.fallback_reason && computeStatus.active_backend !== 'CUDA' && (
              <p className="mt-2 text-[9px] font-mono leading-relaxed text-yellow-200/65">
                {computeStatus.fallback_reason}
              </p>
            )}
          </div>

          <div className="grid grid-cols-2 gap-2">
            {pulse.metrics.map((metric) => (
              <div key={metric.label} className="border border-white/5 bg-black/40 p-2">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-[9px] font-mono uppercase tracking-[0.14em] text-white/35">{metric.label}</span>
                  <span className={`text-[9px] font-bold ${textToneClass[metric.tone]}`}>{metric.value}</span>
                </div>
                <div className="mt-2 h-1 bg-white/10">
                  <div
                    className={`h-full ${barClass[metric.tone]} transition-[width] duration-500`}
                    style={{ width: `${Math.round(metric.ratio * 100)}%` }}
                  />
                </div>
              </div>
            ))}
          </div>

          <div className="grid grid-cols-[1.2rem_1fr] gap-3 border-t border-white/5 pt-3">
            <Gauge size={14} aria-hidden="true" className="mt-0.5 text-neon-blue/70" />
            <div>
              <p className="text-[9px] font-bold leading-relaxed text-white/75">{pulse.dominantPattern}</p>
              <p className="mt-1 line-clamp-2 text-[9px] font-mono leading-relaxed text-white/35">{pulse.latestHistory}</p>
            </div>
          </div>

          {endgameForecast && (
            <div className={`relative overflow-hidden border-l-2 bg-black/35 px-3 py-2 ${forecastToneClass[endgameForecast.tone]}`}>
              <img
                src="/media/endgame-forecast-scope.svg"
                alt=""
                aria-hidden="true"
                className="hud-deco"
              />
              <div className="relative">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 text-[9px] font-mono uppercase tracking-[0.14em] text-white/35">
                      <ScanSearch size={10} aria-hidden="true" />
                      终局走向
                    </div>
                    <h3 className="mt-1 truncate text-[10px] font-black text-white">{endgameForecast.title}</h3>
                  </div>
                  <span className="shrink-0 border border-current px-2 py-1 text-[9px] font-mono uppercase tracking-[0.14em]">
                    {endgameForecast.confidence}%
                  </span>
                </div>
                <p className="mt-2 line-clamp-2 text-[9px] font-mono leading-relaxed text-white/50">{endgameForecast.detail}</p>
                <div className="mt-2 h-1 bg-white/10">
                  <div
                    className="h-full bg-current transition-[width] duration-500"
                    style={{ width: `${Math.round(endgameForecast.momentum * 100)}%` }}
                  />
                </div>
                <div className="mt-2 grid grid-cols-4 gap-1.5 text-[9px] font-mono text-white/40">
                  <span>P {endgameForecast.metrics.population}</span>
                  <span>危 {endgameForecast.metrics.dangerEvents}</span>
                  <span>荣 {endgameForecast.metrics.goodEvents}</span>
                  <span>顶 {endgameForecast.metrics.apexCandidates}</span>
                </div>
                <p className="mt-2 truncate border-t border-white/5 pt-2 text-[9px] font-mono text-white/35">
                  建议：{formatIntervention(endgameForecast.suggestedIntervention)} / {endgameForecast.evidence}
                </p>
              </div>
            </div>
          )}

          {factionLedger.factions.length > 0 && (
            <div className="relative overflow-hidden border-t border-white/5 pt-3">
              <img
                src="/media/civilization-faction-ledger.svg"
                alt=""
                aria-hidden="true"
                className="hud-deco"
              />
              <div className="relative">
                <div className="mb-2 flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 text-[9px] font-mono uppercase tracking-[0.14em] text-white/35">
                      <Network size={10} aria-hidden="true" />
                      阵营谱
                    </div>
                    <h3 className="mt-1 truncate text-[10px] font-black text-white">{factionLedger.title}</h3>
                  </div>
                  <span className={`shrink-0 border px-2 py-1 text-[9px] font-mono uppercase tracking-[0.14em] ${factionToneClass[factionLedger.tone]}`}>
                    {factionLedger.total}
                  </span>
                </div>
                <p className="mb-2 line-clamp-2 text-[9px] font-mono leading-relaxed text-white/40">{factionLedger.subtitle}</p>
                <div className="space-y-1.5">
                  {factionLedger.factions.slice(0, 3).map((faction) => (
                    <article key={faction.id} className={`border-l-2 bg-black/35 px-2 py-1.5 ${factionToneClass[faction.tone]}`}>
                      <div className="flex items-center justify-between gap-2">
                        <span className="min-w-0 truncate text-[9px] font-bold text-white/80">
                          {faction.label} #{faction.leaderId ?? '--'}
                        </span>
                        <span className="shrink-0 text-[9px] font-mono">{Math.round(faction.ratio * 100)}%</span>
                      </div>
                      <div className="mt-1 h-1 bg-white/10">
                        <div
                          className="h-full bg-current transition-[width] duration-500"
                          style={{ width: `${Math.round(faction.ratio * 100)}%` }}
                        />
                      </div>
                      <p className="mt-1 truncate text-[9px] font-mono text-white/35">
                        建议：{formatIntervention(faction.suggestedIntervention)} / {faction.evidence}
                      </p>
                    </article>
                  ))}
                </div>
                <p className="mt-2 truncate text-[9px] font-mono text-white/30">{factionLedger.evidence}</p>
              </div>
            </div>
          )}

          {interactionNetwork && (
            <div className={`relative overflow-hidden border-l-2 bg-black/35 px-3 py-2 ${factionToneClass[interactionNetwork.tone]}`}>
              <img
                src="/media/live-interaction-network.svg"
                alt=""
                aria-hidden="true"
                className="hud-deco"
              />
              <div className="relative">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 text-[9px] font-mono uppercase tracking-[0.14em] text-white/35">
                      <Activity size={10} aria-hidden="true" />
                      交互网络
                    </div>
                    <h3 className="mt-1 truncate text-[10px] font-black text-white">{interactionNetwork.title}</h3>
                  </div>
                  <span className="shrink-0 border border-current px-2 py-1 text-[9px] font-mono uppercase tracking-[0.14em]">
                    实 {interactionNetwork.metrics.observedEdges}
                  </span>
                </div>
                <p className="mt-1 line-clamp-2 text-[9px] font-mono leading-relaxed text-white/40">{interactionNetwork.subtitle}</p>
                <div className="mt-2 space-y-1.5">
                  {interactionNetwork.edges.slice(0, 3).map((edge) => (
                    <article key={`${edge.kind}-${edge.sourceId}-${edge.targetId}`} className={`border-l-2 bg-black/35 px-2 py-1.5 ${factionToneClass[edge.tone]}`}>
                      <div className="flex items-center justify-between gap-2">
                        <span className="min-w-0 truncate text-[9px] font-bold text-white/80">
                          {edge.source === 'OBSERVED' ? '实测' : '预测'} {interactionKindLabel[edge.kind]} #{edge.sourceId} {'->'} #{edge.targetId}
                        </span>
                        <span className="shrink-0 text-[9px] font-mono">{edge.strength}%</span>
                      </div>
                      <p className="mt-1 truncate text-[9px] font-mono text-white/35">
                        d {edge.distance.toFixed(1)} / 建议：{formatIntervention(edge.suggestedIntervention)} / {edge.detail}
                      </p>
                    </article>
                  ))}
                </div>
                <p className="mt-2 truncate border-t border-white/5 pt-2 text-[9px] font-mono text-white/30">{interactionNetwork.evidence}</p>
              </div>
            </div>
          )}

          <div className="border-t border-white/5 pt-3">
            <div className="mb-2 flex items-center gap-2 text-[9px] font-mono uppercase tracking-[0.14em] text-white/35">
              <ScanSearch size={10} aria-hidden="true" />
              世界预兆
            </div>
            <div className="space-y-2">
              {omens.map((omen) => (
                <article key={omen.id} className={`border-l-2 bg-black/40 px-2 py-1.5 ${omenToneClass[omen.tone]}`}>
                  <div className="flex items-start justify-between gap-3">
                    <h3 className="min-w-0 truncate text-[10px] font-bold text-white">{omen.title}</h3>
                    <span className="shrink-0 text-[9px] font-mono">{Math.round(omen.confidence * 100)}%</span>
                  </div>
                  <p className="mt-1 line-clamp-2 text-[9px] font-mono leading-relaxed text-white/45">{omen.detail}</p>
                  <p className="mt-1 truncate text-[9px] font-mono text-white/35">
                    {omen.suggestedIntervention ? `建议：${formatIntervention(omen.suggestedIntervention)} / ` : ''}{omen.evidence}
                  </p>
                </article>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-[1.2rem_1fr] gap-3">
            <Users size={14} aria-hidden="true" className="mt-0.5 text-white/40" />
            <div className="space-y-1">
              {pulse.signals.map((signal) => (
                <div key={signal} className="flex items-center gap-2 text-[9px] font-mono text-white/45">
                  <Activity size={8} aria-hidden="true" className="text-neon-blue/50" />
                  <span>{signal}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default WorldPulsePanel;
