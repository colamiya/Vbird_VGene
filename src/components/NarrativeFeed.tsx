import React, { useEffect, useMemo, useState } from 'react';
import { BookOpen, ChevronDown, ClipboardCheck, Clock3, Compass, Fingerprint, FlaskConical, Gauge, GitBranch, Landmark, Layers3, Radio, Wand2 } from 'lucide-react';
import MealRhythmCard from './MealRhythmCard';
import type { EntityView, InterventionTrace, MealRhythmCue, MealRunPredictionProgress, PlayerInterventionKind, RunSession, WorldEvent, WorldStats } from '../types/world';
import { formatIntervention, formatRunDuration, formatRunLength, formatRunPhase, formatRunSpeed, getRemainingRunMs } from '../utils/runSession';
import { selectLatestEventInsight } from '../utils/eventInsights';
import { deriveEventDigest, selectNarrativeEvents } from '../utils/eventDigest';
import { deriveRunThemeProfile } from '../utils/runThemeProfile';
import { selectLatestRunDiscoveryCue } from '../utils/runDiscoveries';
import { deriveWorldEventCausality } from '../utils/worldEventCausality';
import { derivePlayerImpactTrace } from '../utils/playerImpactTrace';
import { latestActionableTrace } from '../utils/interventionTrace';
import type { ActiveMoment } from '../utils/activeMoment';

interface NarrativeFeedProps {
  session: RunSession | null;
  stats: WorldStats;
  entities: EntityView[];
  events: WorldEvent[];
  interventionTraces?: InterventionTrace[];
  now: number;
  mealRhythm?: MealRhythmCue | null;
  predictionProgress?: MealRunPredictionProgress | null;
  activeMoment?: ActiveMoment | null;
  disabled?: boolean;
  onBookmarkRhythm?: () => void;
  onSelectRhythmIntervention?: (kind: PlayerInterventionKind) => void;
}

const severityClass: Record<WorldEvent['severity'], string> = {
  info: 'border-white/10 text-white/60',
  good: 'border-neon-blue/30 text-neon-blue',
  warning: 'border-yellow-400/30 text-yellow-300',
  danger: 'border-red-500/40 text-red-400',
};

const digestToneClass: Record<WorldEvent['severity'], string> = {
  info: 'border-t-white/30 text-white/60',
  good: 'border-t-neon-blue text-neon-blue',
  warning: 'border-t-yellow-300 text-yellow-300',
  danger: 'border-t-red-400 text-red-400',
};

const themeToneClass: Record<WorldEvent['severity'], string> = {
  info: 'border-t-white/30 text-white/60',
  good: 'border-t-emerald-300 text-emerald-300',
  warning: 'border-t-yellow-300 text-yellow-300',
  danger: 'border-t-red-400 text-red-400',
};

const insightAccentClass = {
  cyan: 'border-t-neon-blue text-neon-blue',
  green: 'border-t-emerald-300 text-emerald-300',
  yellow: 'border-t-yellow-300 text-yellow-300',
  red: 'border-t-red-400 text-red-400',
  purple: 'border-t-neon-purple text-neon-purple',
  white: 'border-t-white/40 text-white/60',
} as const;

const activeMomentToneClass: Record<WorldEvent['severity'], string> = {
  info: 'border-t-neon-blue text-neon-blue',
  good: 'border-t-emerald-300 text-emerald-300',
  warning: 'border-t-yellow-300 text-yellow-300',
  danger: 'border-t-red-400 text-red-400',
};

const traceSampleCount = (trace: InterventionTrace) =>
  Math.max(trace.history?.length ?? 0, trace.latest?.length ?? 0, trace.before?.length ?? 0);

interface CollapsibleIntelSectionProps {
  title: string;
  eyebrow: string;
  count?: number;
  defaultOpen?: boolean;
  autoOpen?: boolean;
  children: React.ReactNode;
}

const CollapsibleIntelSection: React.FC<CollapsibleIntelSectionProps> = ({
  title,
  eyebrow,
  count,
  defaultOpen = false,
  autoOpen = false,
  children,
}) => {
  const [open, setOpen] = useState(defaultOpen);

  useEffect(() => {
    if (autoOpen) setOpen(true);
  }, [autoOpen]);

  return (
    <section className="hud-panel-quiet p-2.5">
      <button
        type="button"
        aria-expanded={open}
        onClick={() => setOpen((current) => !current)}
        className="interactive-focus flex min-h-10 w-full items-center justify-between gap-3 border border-white/10 bg-black/35 px-3 py-2 text-left transition-[border-color,background-color,color] hover:border-neon-blue/30 hover:bg-neon-blue/10"
      >
        <span className="min-w-0">
          <span className="block text-[9px] font-mono uppercase tracking-[0.14em] text-white/35">{eyebrow}</span>
          <span className="mt-0.5 block truncate text-[11px] font-black text-white">{title}</span>
        </span>
        <span className="flex shrink-0 items-center gap-2 text-[9px] font-mono uppercase tracking-[0.12em] text-white/45">
          {typeof count === 'number' && <span>{count}</span>}
          <ChevronDown
            size={14}
            aria-hidden="true"
            className={`transition-transform duration-200 ${open ? 'rotate-180 text-neon-blue' : ''}`}
          />
        </span>
      </button>
      {open && (
        <div className="mt-2 space-y-2">
          {children}
        </div>
      )}
    </section>
  );
};

const NarrativeEventCard: React.FC<{ event: WorldEvent; featured?: boolean }> = ({ event, featured = false }) => (
  <article
    aria-live={featured ? 'polite' : undefined}
    className={`border-l-2 bg-black/70 px-3 py-2 ${severityClass[event.severity]} ${featured ? 'hud-panel p-4' : ''}`}
  >
    <div className="flex items-center justify-between gap-3">
      <h3 className={`min-w-0 truncate font-black text-white/85 ${featured ? 'text-sm' : 'text-[10px]'}`}>{event.title}</h3>
      <span className="shrink-0 text-[9px] font-mono text-white/30">
        {new Date(event.timestamp).toLocaleTimeString('zh-CN', { hour12: false })}
      </span>
    </div>
    <p className={`mt-1 font-mono leading-relaxed text-white/55 ${featured ? 'line-clamp-3 text-[10px]' : 'line-clamp-2 text-[9px]'}`}>
      {event.detail}
    </p>
    {featured && event.entityId !== undefined && (
      <p className="mt-2 border-t border-white/5 pt-2 text-[9px] font-mono uppercase tracking-[0.12em] text-white/35">
        Focus entity #{event.entityId}
      </p>
    )}
  </article>
);

const ActiveMomentCard: React.FC<{
  moment: ActiveMoment;
  disabled?: boolean;
  onSelectIntervention?: (kind: PlayerInterventionKind) => void;
}> = ({ moment, disabled = false, onSelectIntervention }) => (
  <article className={`hud-panel-quiet border-t-2 p-3 ${activeMomentToneClass[moment.tone]}`}>
    <div className="relative">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex items-center gap-2 text-[9px] font-mono uppercase tracking-[0.14em] text-white/35">
            <Compass size={10} aria-hidden="true" />
            本刻焦点
          </div>
          <h3 className="mt-1 line-clamp-2 text-sm font-black text-white">{moment.title}</h3>
        </div>
        <span className="shrink-0 text-[9px] font-mono uppercase tracking-[0.12em] text-white/35">
          {moment.tone}
        </span>
      </div>
      <p className="mt-2 line-clamp-3 text-[10px] font-mono leading-relaxed text-white/65">{moment.detail}</p>
      <div className="mt-3 flex flex-wrap items-center gap-2 border-t border-white/5 pt-2 text-[9px] font-mono uppercase tracking-[0.12em] text-white/35">
        {typeof moment.target?.entityId === 'number' && (
          <span className="border border-white/10 bg-black/30 px-2 py-1 text-white/55">实体 #{moment.target.entityId}</span>
        )}
        {moment.target?.traceId && (
          <span className="border border-cyan-300/20 bg-cyan-300/10 px-2 py-1 text-cyan-200">Arena 命运线</span>
        )}
        {moment.suggestedIntervention && (
          onSelectIntervention ? (
            <button
              type="button"
              disabled={disabled}
              onClick={() => onSelectIntervention(moment.suggestedIntervention!)}
              className="interactive-focus border border-neon-blue/25 bg-neon-blue/10 px-2 py-1 text-neon-blue transition-[border-color,background-color,color,opacity] hover:border-neon-blue hover:bg-neon-blue/20 disabled:cursor-not-allowed disabled:opacity-45"
            >
              {formatIntervention(moment.suggestedIntervention)}
            </button>
          ) : (
            <span className="border border-neon-blue/20 bg-neon-blue/10 px-2 py-1 text-neon-blue">
              {formatIntervention(moment.suggestedIntervention)}
            </span>
          )
        )}
      </div>
      {moment.target?.traceId && (
        <p className="mt-2 text-[9px] font-mono leading-relaxed text-cyan-100/70">
          不是预测，是最近手痕后的生存轨迹。
        </p>
      )}
      <p className="mt-2 line-clamp-2 border-t border-white/5 pt-2 text-[9px] font-mono leading-relaxed text-white/35">
        {moment.evidence}
      </p>
    </div>
  </article>
);

const NarrativeFeed: React.FC<NarrativeFeedProps> = ({
  session,
  stats,
  entities,
  events,
  interventionTraces = [],
  now,
  mealRhythm = null,
  predictionProgress = null,
  activeMoment = null,
  disabled = false,
  onBookmarkRhythm,
  onSelectRhythmIntervention,
}) => {
  const eventDigest = useMemo(
    () => session ? deriveEventDigest({ session, events, now }) : null,
    [events, now, session],
  );
  const visibleEvents = useMemo(
    () => selectNarrativeEvents(events, eventDigest),
    [eventDigest, events],
  );
  const featuredEvent = visibleEvents[0] ?? null;
  const olderNarrativeEvents = visibleEvents.slice(1, 5);
  const insight = useMemo(() => selectLatestEventInsight(events), [events]);
  const impactTrace = useMemo(
    () => derivePlayerImpactTrace({ events, stats, now }),
    [events, now, stats],
  );
  const latestTrace = useMemo(
    () => latestActionableTrace(interventionTraces),
    [interventionTraces],
  );
  const causality = useMemo(() => deriveWorldEventCausality(events), [events]);
  const themeProfile = useMemo(
    () => session ? deriveRunThemeProfile({ session, stats, entities, events, now }) : null,
    [entities, events, now, session, stats],
  );
  const discoveryCue = useMemo(
    () => session ? selectLatestRunDiscoveryCue({ session, events }) : null,
    [events, session],
  );
  const trackingCount = [
    mealRhythm,
    predictionProgress,
    latestTrace ?? impactTrace,
  ].filter(Boolean).length;
  const intelligenceCount = [
    themeProfile,
    discoveryCue,
    eventDigest,
    causality,
    insight,
  ].filter(Boolean).length;

  if (!session) return null;

  return (
    <section
      aria-label="下饭局历史事件"
      className="w-full space-y-3"
    >
      <div className="hud-panel p-4">
        <div className="grid grid-cols-3 gap-3">
          <div>
            <div className="flex items-center gap-1 text-[9px] font-mono uppercase tracking-[0.14em] text-white/35">
              <Clock3 size={10} aria-hidden="true" />
              倒计时
            </div>
            <div className="mt-1 text-sm font-black text-white">{formatRunDuration(getRemainingRunMs(session, now))}</div>
          </div>
          <div>
            <div className="flex items-center gap-1 text-[9px] font-mono uppercase tracking-[0.14em] text-white/35">
              <Gauge size={10} aria-hidden="true" />
              倍率
            </div>
            <div className="mt-1 text-sm font-black text-neon-blue">{formatRunSpeed(session.speed)}</div>
          </div>
          <div>
            <div className="flex items-center gap-1 text-[9px] font-mono uppercase tracking-[0.14em] text-white/35">
              <Radio size={10} aria-hidden="true" />
              阶段
            </div>
            <div className="mt-1 text-sm font-black text-white">{formatRunPhase(session.phase)}</div>
          </div>
        </div>
        <div className="mt-3 border-t border-white/5 pt-3 text-[9px] font-mono uppercase tracking-[0.14em] text-white/40">
          {formatRunLength(session.length)}
        </div>
      </div>

      {activeMoment && (
        <ActiveMomentCard
          moment={activeMoment}
          disabled={disabled}
          onSelectIntervention={disabled ? undefined : onSelectRhythmIntervention}
        />
      )}

      {featuredEvent ? (
        <NarrativeEventCard event={featuredEvent} featured />
      ) : (
        <article className="hud-panel p-4">
          <div className="flex items-center gap-2 text-[9px] font-mono uppercase tracking-[0.14em] text-white/35">
            <Radio size={10} aria-hidden="true" />
            最新事件
          </div>
          <h3 className="mt-2 text-sm font-black text-white">等待第一条真实事件</h3>
          <p className="mt-1 text-[10px] font-mono leading-relaxed text-white/45">
            事件流只会在仿真统计、实体变化、谱系或玩家干预产生证据后更新。
          </p>
        </article>
      )}

      {trackingCount > 0 && (
        <CollapsibleIntelSection
          title="下饭节奏与玩家手痕"
          eyebrow="操作追踪"
          count={trackingCount}
          autoOpen={mealRhythm?.action === 'INTERVENE' || mealRhythm?.action === 'MARK'}
        >
          <MealRhythmCard
            cue={mealRhythm}
            disabled={disabled}
            onBookmark={disabled ? undefined : onBookmarkRhythm}
            onSelectIntervention={disabled ? undefined : onSelectRhythmIntervention}
          />
          {predictionProgress && (
          <article className={`hud-panel-quiet border-t-2 p-3 ${digestToneClass[predictionProgress.tone]}`}>
            <img
              src="/media/meal-run-prediction-progress.svg"
              alt=""
              aria-hidden="true"
              className="hud-deco"
            />
            <div className="relative">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="flex items-center gap-2 text-[9px] font-mono uppercase tracking-[0.14em] text-white/35">
                    <ClipboardCheck size={10} aria-hidden="true" />
                    押题进度
                  </div>
                  <h3 className="mt-1 truncate text-[11px] font-black text-white">{predictionProgress.title}</h3>
                </div>
                <span className="shrink-0 border border-current px-2 py-1 text-[9px] font-mono uppercase tracking-[0.14em]">
                  {predictionProgress.score}%
                </span>
              </div>
              <p className="mt-2 line-clamp-2 text-[9px] font-mono leading-relaxed text-white/60">
                {predictionProgress.detail}
              </p>
              <div className="mt-3 h-1 overflow-hidden bg-white/10">
                <span
                  className="block h-full bg-current transition-[width] duration-500"
                  style={{ width: `${predictionProgress.score}%` }}
                />
              </div>
              <div className="mt-2 grid grid-cols-3 gap-1.5 text-[9px] font-mono text-white/40">
                <span>当前 {predictionProgress.current}</span>
                <span>目标 {predictionProgress.target}</span>
                <span>事件 {predictionProgress.metrics.events}</span>
              </div>
              <p className="mt-2 line-clamp-2 border-t border-white/5 pt-2 text-[9px] font-mono leading-relaxed text-white/35">
                {predictionProgress.targetLabel} / 建议 {formatIntervention(predictionProgress.prediction.suggestedIntervention)} / {predictionProgress.evidence}
              </p>
            </div>
          </article>
          )}
          {latestTrace && (
          <article className={`hud-panel-quiet border-t-2 p-3 ${digestToneClass[latestTrace.tone]}`}>
            <img
              src="/media/player-impact-trace.svg"
              alt=""
              aria-hidden="true"
              className="hud-deco"
            />
            <div className="relative">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="flex items-center gap-2 text-[9px] font-mono uppercase tracking-[0.14em] text-white/35">
                    <Fingerprint size={10} aria-hidden="true" />
                    实体手痕
                  </div>
                  <h3 className="mt-1 truncate text-[11px] font-black text-white">{latestTrace.title}</h3>
                </div>
                <span className="shrink-0 border border-current px-2 py-1 text-[9px] font-mono uppercase tracking-[0.14em]">
                  采样 {traceSampleCount(latestTrace)}
                </span>
              </div>
              <p className="mt-2 line-clamp-2 text-[9px] font-mono leading-relaxed text-white/60">
                {latestTrace.detail}
              </p>
              <div className="mt-2 grid grid-cols-4 gap-1.5 text-[9px] font-mono text-white/40">
                <span>命中 {latestTrace.metrics.affected}</span>
                <span>存活 {latestTrace.metrics.alive}</span>
                <span>增益 {latestTrace.metrics.rescued}</span>
                <span>压力 {latestTrace.metrics.harmed}</span>
              </div>
              <div className="mt-2 grid grid-cols-3 gap-1.5 text-[9px] font-mono text-white/40">
                <span>dE {latestTrace.metrics.energyDelta.toFixed(1)}</span>
                <span>dS {latestTrace.metrics.scoreDelta.toFixed(1)}</span>
                <span>dT {(latestTrace.metrics.toxinDelta * 100).toFixed(1)}%</span>
              </div>
              {latestTrace.causalAudit && (
                <div className="mt-2 grid grid-cols-[auto_1fr_auto] items-center gap-2 border border-white/10 bg-black/30 px-2 py-1.5 text-[9px] font-mono text-white/40">
                  <span className="uppercase text-current">方向 {latestTrace.causalAudit.verdict}</span>
                  <span className="truncate">
                    净E {latestTrace.causalAudit.netEnergyDelta >= 0 ? '+' : ''}{latestTrace.causalAudit.netEnergyDelta.toFixed(1)}
                    {' / '}
                    净S {latestTrace.causalAudit.netScoreDelta >= 0 ? '+' : ''}{latestTrace.causalAudit.netScoreDelta.toFixed(1)}
                    {' / '}
                    对照 {latestTrace.causalAudit.controlSize}
                  </span>
                  <span>{latestTrace.causalAudit.confidence}%</span>
                </div>
              )}
              <p className="mt-2 truncate border-t border-white/5 pt-2 text-[9px] font-mono text-white/35">
                {latestTrace.evidence}
              </p>
            </div>
          </article>
          )}
          {!latestTrace && impactTrace && (
          <article className={`hud-panel-quiet border-t-2 p-3 ${digestToneClass[impactTrace.tone]}`}>
            <img
              src="/media/player-impact-trace.svg"
              alt=""
              aria-hidden="true"
              className="hud-deco"
            />
            <div className="relative">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="flex items-center gap-2 text-[9px] font-mono uppercase tracking-[0.14em] text-white/35">
                    <Fingerprint size={10} aria-hidden="true" />
                    手痕回响
                  </div>
                  <h3 className="mt-1 truncate text-[11px] font-black text-white">{impactTrace.title}</h3>
                </div>
                <span className="shrink-0 border border-current px-2 py-1 text-[9px] font-mono uppercase tracking-[0.14em]">
                  后续 {impactTrace.metrics.eventsAfter}
                </span>
              </div>
              <p className="mt-2 line-clamp-2 text-[9px] font-mono leading-relaxed text-white/60">
                {impactTrace.detail}
              </p>
              <div className="mt-2 grid grid-cols-4 gap-1.5 text-[9px] font-mono text-white/40">
                <span>影响 {impactTrace.metrics.affected}</span>
                <span>后续 {impactTrace.metrics.eventsAfter}</span>
                <span>正向 {impactTrace.metrics.helpfulEvents}</span>
                <span>压力 {impactTrace.metrics.harmfulEvents}</span>
              </div>
              <p className="mt-2 truncate border-t border-white/5 pt-2 text-[9px] font-mono text-white/35">
                {impactTrace.evidence}
              </p>
            </div>
          </article>
          )}
        </CollapsibleIntelSection>
      )}

      {intelligenceCount > 0 && (
        <CollapsibleIntelSection title="科学解释、主题与历史关联" eyebrow="情报层" count={intelligenceCount}>
          {themeProfile && (
          <article className={`hud-panel-quiet border-t-2 p-3 ${themeToneClass[themeProfile.tone]}`}>
            <img
              src="/media/theme-signal-ribbon.svg"
              alt=""
              aria-hidden="true"
              className="hud-deco"
            />
            <div className="relative">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="flex items-center gap-2 text-[9px] font-mono uppercase tracking-[0.14em] text-white/35">
                    <Compass size={10} aria-hidden="true" />
                    主题信号
                  </div>
                  <h3 className="mt-1 truncate text-[11px] font-black text-white">
                    {themeProfile.label} · {themeProfile.headline}
                  </h3>
                </div>
                <span className="shrink-0 border border-current px-2 py-1 text-[9px] font-mono uppercase tracking-[0.14em]">
                  {themeProfile.shortLabel}
                </span>
              </div>
              <p className="mt-2 line-clamp-2 text-[9px] font-mono leading-relaxed text-white/60">
                {themeProfile.detail}
              </p>
              <div className="mt-2 grid grid-cols-3 gap-1.5 text-[9px] font-mono text-white/40">
                <span>协作 {themeProfile.metrics.cooperators}</span>
                <span>高压 {themeProfile.metrics.stressedEntities}</span>
                <span>事件 {themeProfile.metrics.matchingEventCount}</span>
              </div>
              <p className="mt-2 truncate border-t border-white/5 pt-2 text-[9px] font-mono text-white/35">
                建议 {formatIntervention(themeProfile.suggestedIntervention)} / {themeProfile.evidence}
              </p>
            </div>
          </article>
          )}
          {discoveryCue && (
          <article className={`hud-panel-quiet border-t-2 p-3 ${insightAccentClass[discoveryCue.accent]}`}>
            <img
              src="/media/codex-discovery-ribbon.svg"
              alt=""
              aria-hidden="true"
              className="hud-deco"
            />
            <div className="relative">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="flex items-center gap-2 text-[9px] font-mono uppercase tracking-[0.14em] text-white/35">
                    <BookOpen size={10} aria-hidden="true" />
                    图鉴发现
                  </div>
                  <h3 className="mt-1 truncate text-[11px] font-black text-white">{discoveryCue.name}</h3>
                </div>
                <span className="shrink-0 border border-current px-2 py-1 text-[9px] font-mono uppercase tracking-[0.14em]">
                  {discoveryCue.discoveryIndex}/{discoveryCue.totalDiscoveries}
                </span>
              </div>
              <p className="mt-2 line-clamp-2 text-[9px] font-mono leading-relaxed text-white/60">
                {discoveryCue.detail}
              </p>
              <div className="mt-2 flex flex-wrap gap-1.5 text-[9px] font-mono">
                <span className="border border-current px-1.5 py-0.5 uppercase tracking-widest text-white/40">
                  {discoveryCue.domain}
                </span>
                <span className="border border-current px-1.5 py-0.5 uppercase tracking-widest text-white/40">
                  {discoveryCue.rarity}
                </span>
              </div>
              <p className="mt-2 truncate border-t border-white/5 pt-2 text-[9px] font-mono text-white/35">
                {discoveryCue.evidence}
              </p>
            </div>
          </article>
          )}
          {eventDigest && (
          <article className={`hud-panel-quiet border-t-2 p-3 ${digestToneClass[eventDigest.tone]}`}>
            <img
              src="/media/event-digest-strip.svg"
              alt=""
              aria-hidden="true"
              className="hud-deco"
            />
            <div className="relative">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="flex items-center gap-2 text-[9px] font-mono uppercase tracking-[0.14em] text-white/35">
                    <Layers3 size={10} aria-hidden="true" />
                    事件摘要
                  </div>
                  <h3 className="mt-1 truncate text-[11px] font-black text-white">{eventDigest.title}</h3>
                </div>
                <span className="shrink-0 border border-current px-2 py-1 text-[9px] font-mono uppercase tracking-[0.14em]">
                  {eventDigest.total}x
                </span>
              </div>
              <p className="mt-2 line-clamp-2 text-[9px] font-mono leading-relaxed text-white/60">{eventDigest.detail}</p>
              <div className="mt-2 flex flex-wrap gap-1.5">
                {eventDigest.topKinds.map((kind) => (
                  <span
                    key={kind.kind}
                    className="border border-current px-1.5 py-0.5 text-[9px] font-mono uppercase tracking-[0.14em] text-white/45"
                  >
                    {kind.count}x {kind.title}
                  </span>
                ))}
              </div>
              <p className="mt-2 truncate border-t border-white/5 pt-2 text-[9px] font-mono text-white/35">
                {eventDigest.evidence}
              </p>
            </div>
          </article>
          )}
          {causality && (
          <article className={`hud-panel-quiet border-t-2 p-3 ${digestToneClass[causality.tone]}`}>
            <img
              src="/media/event-causality-chain.svg"
              alt=""
              aria-hidden="true"
              className="hud-deco"
            />
            <div className="relative">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="flex items-center gap-2 text-[9px] font-mono uppercase tracking-[0.14em] text-white/35">
                    <GitBranch size={10} aria-hidden="true" />
                    文明关联链
                  </div>
                  <h3 className="mt-1 truncate text-[11px] font-black text-white">{causality.title}</h3>
                </div>
                <span className="shrink-0 border border-current px-2 py-1 text-[9px] font-mono uppercase tracking-[0.14em]">
                  关联 {causality.confidence}%
                </span>
              </div>
              <p className="mt-2 line-clamp-2 text-[9px] font-mono leading-relaxed text-white/60">
                {causality.detail}
              </p>
              <div className="mt-2 grid grid-cols-[1fr_auto_1fr] items-center gap-2 text-[9px] font-mono text-white/40">
                <span className="truncate">{causality.source.title}</span>
                <span className="text-white/20">~</span>
                <span className="truncate text-right">{causality.target.title}</span>
              </div>
              <p className="mt-2 truncate border-t border-white/5 pt-2 text-[9px] font-mono text-white/35">
                同窗关联，不宣称唯一因果 / {causality.evidence}
              </p>
            </div>
          </article>
          )}
          {insight && (
          <article className={`hud-panel-quiet border-t-2 p-3 ${insightAccentClass[insight.accent]}`}>
            <img
              src="/media/event-briefing-slate.svg"
              alt=""
              aria-hidden="true"
              className="hud-deco"
            />
            <div className="relative">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="flex items-center gap-2 text-[9px] font-mono uppercase tracking-[0.14em] text-white/35">
                    <BookOpen size={10} aria-hidden="true" />
                    史官讲解
                  </div>
                  <h3 className="mt-1 truncate text-[11px] font-black text-white">{insight.name}</h3>
                </div>
                <span className="shrink-0 border border-current px-2 py-1 text-[9px] font-mono uppercase tracking-[0.14em]">
                  {insight.domain}
                </span>
              </div>
              <div className="mt-3 space-y-2 text-[9px] font-mono leading-relaxed text-white/45">
                <p className="flex gap-2">
                  <FlaskConical size={10} className="mt-0.5 shrink-0 text-neon-blue" aria-hidden="true" />
                  <span>{insight.science}</span>
                </p>
                <p className="flex gap-2">
                  <Landmark size={10} className="mt-0.5 shrink-0 text-yellow-300" aria-hidden="true" />
                  <span>{insight.history}</span>
                </p>
                <p className="flex gap-2">
                  <Wand2 size={10} className="mt-0.5 shrink-0 text-emerald-300" aria-hidden="true" />
                  <span>{insight.gameplay}</span>
                </p>
              </div>
            </div>
          </article>
          )}
        </CollapsibleIntelSection>
      )}

      {olderNarrativeEvents.length > 0 && (
        <CollapsibleIntelSection title="最近历史事件" eyebrow="事件回放" count={olderNarrativeEvents.length}>
          {olderNarrativeEvents.map((event) => (
            <NarrativeEventCard key={event.id} event={event} />
          ))}
        </CollapsibleIntelSection>
      )}
    </section>
  );
};

export default NarrativeFeed;
