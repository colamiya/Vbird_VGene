import type {
  MealMomentCard,
  MealMomentDeck,
  MealMomentRole,
  MealRunBroadcast,
  MealRunScorecard,
  RunHighlight,
  RunPhase,
  RunSession,
  RunTrailer,
  RunTrailerScene,
  WorldEvent,
  WorldStats,
} from '../types/world';
import { formatRunDuration, formatRunTheme } from './runSession';

interface MealMomentsInput {
  session: RunSession;
  stats: WorldStats;
  events: WorldEvent[];
  highlights?: RunHighlight[];
  trailer: RunTrailer;
  outcomeTitle: string;
  outcomeReason: string;
  endedAt: number;
  broadcast?: MealRunBroadcast;
  mealRunScore?: MealRunScorecard;
}

const ROLE_LABEL: Record<MealMomentRole, string> = {
  HOOK: '开场名场面',
  TURN: '转折名场面',
  HUMAN: '人类手痕',
  AFTERMATH: '终局收束',
};

const TONE_RANK: Record<WorldEvent['severity'], number> = {
  info: 1,
  good: 2,
  warning: 3,
  danger: 4,
};

function statsMetrics(stats: WorldStats) {
  return {
    population: stats.population,
    avgScore: stats.avgScore,
    avgGeneration: stats.avgGeneration,
    entropy: stats.entropy,
  };
}

function statsLine(stats: WorldStats) {
  return `P=${stats.population} / S=${stats.avgScore.toFixed(2)} / G=${stats.avgGeneration.toFixed(1)} / E=${stats.entropy.toFixed(1)}%`;
}

function eventEvidence(event: WorldEvent) {
  const target = typeof event.entityId === 'number' ? `entity=#${event.entityId}` : 'entity=none';
  const metric = typeof event.metric === 'number' ? `metric=${event.metric.toFixed(2)}` : `kind=${event.kind}`;
  return `${target}, ${metric}, phase=${event.phase}`;
}

function compactLine(text: string, limit = 96) {
  const line = text.replace(/\s+/g, ' ').trim();
  return line.length <= limit ? line : `${line.slice(0, limit - 1)}…`;
}

function phaseAt(input: MealMomentsInput, timestamp: number): RunPhase {
  const scene = input.trailer.scenes.find((item) => Math.abs(item.timestamp - timestamp) < 1000);
  return scene?.role === 'HOOK'
    ? 'GENESIS'
    : scene?.role === 'TURN'
      ? 'DIVERGENCE'
      : scene?.role === 'AFTERMATH'
        ? 'ASCENSION'
        : input.session.phase;
}

function buildCopyText(card: Omit<MealMomentCard, 'copyText'>) {
  const target = typeof card.entityId === 'number' ? ` / #${card.entityId}` : '';
  return [
    `饭点名场面：${card.title}`,
    `${ROLE_LABEL[card.role]}${target} / ${card.kicker}`,
    card.line,
    `证据：${card.evidence}`,
  ].join('\n');
}

function makeCard(card: Omit<MealMomentCard, 'copyText'>): MealMomentCard {
  return {
    ...card,
    copyText: buildCopyText(card),
  };
}

function cardFromScene(input: MealMomentsInput, scene: RunTrailerScene, role: MealMomentRole): MealMomentCard {
  const line = role === 'AFTERMATH'
    ? `${input.outcomeTitle}。${input.outcomeReason}`
    : scene.detail;
  return makeCard({
    id: `moment-scene-${role}-${scene.id}`,
    role,
    title: scene.title,
    kicker: `${ROLE_LABEL[role]} / T+${formatRunDuration(Math.max(0, scene.timestamp - input.session.startedAt))}`,
    line: compactLine(line),
    detail: scene.subtitle,
    timestamp: scene.timestamp,
    phase: phaseAt(input, scene.timestamp),
    tone: scene.tone,
    evidence: scene.evidence,
    metrics: statsMetrics(input.stats),
  });
}

function cardFromEvent(input: MealMomentsInput, event: WorldEvent): MealMomentCard {
  return makeCard({
    id: `moment-event-${event.id}`,
    role: 'TURN',
    title: event.title,
    kicker: `${event.kind} / T+${formatRunDuration(Math.max(0, event.timestamp - input.session.startedAt))}`,
    line: compactLine(event.detail),
    detail: '来自真实世界事件流。',
    timestamp: event.timestamp,
    phase: event.phase,
    tone: event.severity,
    evidence: eventEvidence(event),
    entityId: event.entityId,
    metrics: statsMetrics(input.stats),
  });
}

function cardFromHighlight(input: MealMomentsInput, highlight: RunHighlight): MealMomentCard {
  return makeCard({
    id: `moment-highlight-${highlight.id}`,
    role: 'HUMAN',
    title: highlight.title,
    kicker: `${highlight.source} / T+${formatRunDuration(Math.max(0, highlight.timestamp - input.session.startedAt))}`,
    line: compactLine(highlight.detail),
    detail: '来自玩家手动标记或导演镜头。',
    timestamp: highlight.timestamp,
    phase: highlight.phase,
    tone: highlight.tone,
    evidence: highlight.evidence,
    entityId: highlight.entityId,
    metrics: highlight.metrics,
  });
}

function eventPriority(event: WorldEvent) {
  const entityBoost = typeof event.entityId === 'number' ? 12 : 0;
  return TONE_RANK[event.severity] * 100 + entityBoost + Math.min(30, event.metric ?? 0);
}

function chooseTurnEvent(events: WorldEvent[]) {
  return events
    .filter((event) => event.kind !== 'RUN_STARTED')
    .sort((a, b) => eventPriority(b) - eventPriority(a))[0];
}

function chooseHumanMoment(input: MealMomentsInput) {
  const highlight = (input.highlights ?? [])
    .slice()
    .sort((a, b) => TONE_RANK[b.tone] - TONE_RANK[a.tone] || b.timestamp - a.timestamp)[0];
  if (highlight) return cardFromHighlight(input, highlight);

  const closing = input.broadcast?.segments.find((segment) => segment.role === 'CLOSING');
  if (closing) {
    return makeCard({
      id: 'moment-broadcast-closing',
      role: 'HUMAN',
      title: closing.title,
      kicker: '播报收束',
      line: compactLine(closing.line),
      detail: '来自桌边播报稿的终局总结。',
      timestamp: input.endedAt,
      phase: 'ASCENSION',
      tone: closing.tone,
      evidence: closing.evidence,
      metrics: statsMetrics(input.stats),
    });
  }

  return null;
}

function dedupeCards(cards: MealMomentCard[]) {
  const seen = new Set<string>();
  return cards.filter((card) => {
    const key = `${card.role}-${card.title}-${card.timestamp}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function deckTone(cards: MealMomentCard[], score?: MealRunScorecard) {
  if (score && score.score >= 82) return 'good';
  return cards.reduce<WorldEvent['severity']>((tone, card) => (
    TONE_RANK[card.tone] > TONE_RANK[tone] ? card.tone : tone
  ), 'info');
}

export function deriveMealMoments(input: MealMomentsInput): MealMomentDeck {
  const hookScene = input.trailer.scenes[0];
  const turnScene = input.trailer.scenes[1];
  const aftermathScene = input.trailer.scenes[2];
  const turnEvent = chooseTurnEvent(input.events);
  const cards = dedupeCards([
    hookScene ? cardFromScene(input, hookScene, 'HOOK') : null,
    turnEvent ? cardFromEvent(input, turnEvent) : turnScene ? cardFromScene(input, turnScene, 'TURN') : null,
    chooseHumanMoment(input),
    aftermathScene ? cardFromScene(input, aftermathScene, 'AFTERMATH') : null,
  ].filter((card): card is MealMomentCard => Boolean(card))).slice(0, 3);
  const title = '饭点名场面卡包';
  const subtitle = `${formatRunTheme(input.session.theme)} / ${input.mealRunScore ? `${input.mealRunScore.score}/100` : '未评级'} / ${cards.length} 张`;
  const tone = deckTone(cards, input.mealRunScore);
  const copyText = [
    `V-GENE ${title}`,
    subtitle,
    ...cards.map((card, index) => `${index + 1}. ${card.title}：${card.line}`),
  ].join('\n');

  return {
    title,
    subtitle,
    tone,
    cards,
    copyText,
    evidence: `events=${input.events.length}, highlights=${input.highlights?.length ?? 0}, cards=${cards.length}, ${statsLine(input.stats)}`,
  };
}

export function formatMealMomentsForShare(deck?: MealMomentDeck | null) {
  if (!deck || deck.cards.length === 0) return '';
  return [
    '饭点名场面：',
    ...deck.cards.map((card) => `- ${card.title}：${card.line}`),
  ].join('\n');
}
