import type {
  MealRunLength,
  RunAchievement,
  RunCommissionBoard,
  RunDiscoveryCue,
  RunRelic,
  RunSession,
  RunShareCard,
  RunTrailer,
  RunThemeProfile,
  WorldEvent,
  WorldStats,
} from '../types/world';

interface RunShareCardInput {
  session: Pick<RunSession, 'length' | 'speed' | 'theme' | 'startedAt'>;
  stats: WorldStats;
  outcomeTitle: string;
  outcomeReason: string;
  endedAt: number;
  trailer?: RunTrailer;
  themeProfile?: RunThemeProfile | null;
  commissionBoard?: RunCommissionBoard | null;
  discoveries?: RunDiscoveryCue[];
  relics?: RunRelic[];
  achievements?: RunAchievement[];
  keyEvents?: WorldEvent[];
}

const LENGTH_LABELS: Record<MealRunLength, string> = {
  Snack: '下饭短局',
  Dinner: '正餐局',
  LongTable: '长桌局',
};

const THEME_LABELS: Record<RunSession['theme'], string> = {
  Ascent: '文明崛起',
  Symbiosis: '共生网络',
  Catastrophe: '灾变压力',
  Apex: '顶点谱系',
};

const TONE_ACCENT: Record<RunShareCard['tone'], RunShareCard['accent']> = {
  info: 'cyan',
  good: 'green',
  warning: 'yellow',
  danger: 'red',
};

const ACCENT_COLORS: Record<RunShareCard['accent'], { primary: string; secondary: string; muted: string }> = {
  cyan: { primary: '#38BDF8', secondary: '#14B8A6', muted: '#164E63' },
  green: { primary: '#34D399', secondary: '#A3E635', muted: '#14532D' },
  yellow: { primary: '#FACC15', secondary: '#FB923C', muted: '#713F12' },
  red: { primary: '#FB7185', secondary: '#F97316', muted: '#7F1D1D' },
  purple: { primary: '#C084FC', secondary: '#38BDF8', muted: '#581C87' },
  white: { primary: '#F8FAFC', secondary: '#94A3B8', muted: '#334155' },
};

function clampText(value: string, max = 48) {
  if (value.length <= max) return value;
  return `${value.slice(0, max - 1)}…`;
}

function escapeXml(value: string) {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

function wrapText(value: string, maxChars: number, maxLines: number) {
  const clean = value.replace(/\s+/g, ' ').trim();
  const lines: string[] = [];
  let cursor = clean;
  while (cursor.length > 0 && lines.length < maxLines) {
    if (cursor.length <= maxChars) {
      lines.push(cursor);
      break;
    }
    const hardSlice = cursor.slice(0, maxChars);
    const splitAt = Math.max(hardSlice.lastIndexOf('，'), hardSlice.lastIndexOf('。'), hardSlice.lastIndexOf(' '));
    const take = splitAt >= Math.floor(maxChars * 0.45) ? splitAt + 1 : maxChars;
    lines.push(cursor.slice(0, take).trim());
    cursor = cursor.slice(take).trim();
  }
  if (cursor.length > 0 && lines.length === maxLines) {
    lines[maxLines - 1] = `${lines[maxLines - 1].slice(0, Math.max(0, maxChars - 1))}…`;
  }
  return lines;
}

function toneForStats(stats: WorldStats, fallback: RunShareCard['tone'] = 'info'): RunShareCard['tone'] {
  if (stats.population <= 2) return 'danger';
  if (stats.entropy >= 78 || stats.avgScore < 18) return 'warning';
  if (stats.avgScore >= 70 || stats.population >= 45) return 'good';
  return fallback;
}

function formatDate(timestamp: number) {
  return new Date(timestamp).toLocaleDateString('zh-CN', {
    month: '2-digit',
    day: '2-digit',
  });
}

export function deriveRunShareCard(input: RunShareCardInput): RunShareCard {
  const tone = toneForStats(input.stats, input.trailer?.tone ?? 'info');
  const accent = input.themeProfile?.tone ? TONE_ACCENT[input.themeProfile.tone] : TONE_ACCENT[tone];
  const discoveries = input.discoveries ?? [];
  const relics = input.relics ?? [];
  const achievements = input.achievements ?? [];
  const keyEvents = input.keyEvents ?? [];
  const firstScene = input.trailer?.scenes[0];
  const lastScene = input.trailer?.scenes[input.trailer.scenes.length - 1];
  const badges = [
    THEME_LABELS[input.session.theme],
    input.commissionBoard ? `委托 ${input.commissionBoard.title}` : '',
    discoveries.length > 0 ? `图鉴 ${discoveries.length}` : '',
    relics.length > 0 ? `遗物 ${relics.length}` : '',
    achievements[0]?.title ?? '',
  ].filter(Boolean).slice(0, 5);
  const storyLines = [
    firstScene ? firstScene.title : input.themeProfile?.headline,
    input.trailer?.tagline,
    lastScene ? lastScene.title : relics[0]?.title,
    discoveries[0] ? `发现 ${discoveries[0].name}` : keyEvents[0]?.title,
  ].filter(Boolean).map((line) => clampText(String(line), 34)).slice(0, 4);

  return {
    title: input.outcomeTitle,
    kicker: 'V-GENE MEAL RUN REPORT',
    subtitle: `${LENGTH_LABELS[input.session.length]} / ${input.session.speed}x / ${THEME_LABELS[input.session.theme]}`,
    outcome: input.outcomeReason,
    narrative: input.trailer?.title ?? input.themeProfile?.detail ?? input.outcomeReason,
    theme: THEME_LABELS[input.session.theme],
    lengthLabel: LENGTH_LABELS[input.session.length],
    speedLabel: `${input.session.speed}x`,
    tone,
    accent,
    metrics: [
      { label: '种群', value: String(Math.round(input.stats.population)), detail: 'Population' },
      { label: '适应度', value: input.stats.avgScore.toFixed(1), detail: 'Fitness' },
      { label: '世代', value: input.stats.avgGeneration.toFixed(1), detail: 'Generation' },
      { label: '熵', value: `${input.stats.entropy.toFixed(1)}%`, detail: 'Entropy' },
    ],
    badges,
    storyLines,
    evidence: input.themeProfile?.evidence ?? keyEvents.slice(-1)[0]?.title ?? '终局统计快照',
    footer: `RUN ${formatDate(input.session.startedAt)}-${formatDate(input.endedAt)} / LOCAL SIMULATION / NO NETWORK`,
    generatedAt: input.endedAt,
  };
}

export function formatShareCardForShare(card?: RunShareCard | null) {
  if (!card) return '';
  return `战报海报：${card.title} / ${card.subtitle} / ${card.badges.slice(0, 3).join(' · ')}`;
}

function svgLine(text: string, x: number, y: number, size: number, fill: string, weight = 500, extra = '') {
  return `<text x="${x}" y="${y}" font-size="${size}" font-weight="${weight}" fill="${fill}" ${extra}>${escapeXml(text)}</text>`;
}

export function buildRunShareCardSvg(card: RunShareCard) {
  const colors = ACCENT_COLORS[card.accent];
  const narrativeLines = wrapText(card.narrative, 28, 3);
  const outcomeLines = wrapText(card.outcome, 30, 4);
  const storyLines = card.storyLines.length > 0 ? card.storyLines : ['等待下一次文明信号'];
  const badgeTexts = card.badges.length > 0 ? card.badges : [card.theme, card.lengthLabel, card.speedLabel];

  return `<svg width="1080" height="1350" viewBox="0 0 1080 1350" fill="none" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <linearGradient id="bg" x1="80" y1="40" x2="1000" y2="1290" gradientUnits="userSpaceOnUse">
      <stop offset="0" stop-color="#020617"/>
      <stop offset="0.45" stop-color="${colors.muted}"/>
      <stop offset="1" stop-color="#020617"/>
    </linearGradient>
    <radialGradient id="core" cx="0" cy="0" r="1" gradientUnits="userSpaceOnUse" gradientTransform="translate(560 500) rotate(90) scale(420 390)">
      <stop offset="0" stop-color="${colors.primary}" stop-opacity="0.34"/>
      <stop offset="0.55" stop-color="${colors.secondary}" stop-opacity="0.08"/>
      <stop offset="1" stop-color="#020617" stop-opacity="0"/>
    </radialGradient>
    <pattern id="grid" width="54" height="54" patternUnits="userSpaceOnUse">
      <path d="M54 0H0V54" stroke="#F8FAFC" stroke-opacity="0.055"/>
      <path d="M27 0V54M0 27H54" stroke="#F8FAFC" stroke-opacity="0.026"/>
    </pattern>
  </defs>
  <rect width="1080" height="1350" fill="url(#bg)"/>
  <rect width="1080" height="1350" fill="url(#grid)"/>
  <rect width="1080" height="1350" fill="url(#core)"/>
  <path d="M100 102H980V1248H100V102Z" stroke="#F8FAFC" stroke-opacity="0.18" stroke-width="2"/>
  <path d="M138 146H942V1204H138V146Z" stroke="${colors.primary}" stroke-opacity="0.52" stroke-width="2"/>
  <path d="M180 356L540 150L900 356V768L540 974L180 768V356Z" stroke="${colors.primary}" stroke-opacity="0.28" stroke-width="3"/>
  <path d="M244 396L540 226L836 396V736L540 906L244 736V396Z" stroke="#F8FAFC" stroke-opacity="0.1" stroke-width="2"/>
  <circle cx="540" cy="566" r="118" fill="${colors.primary}" fill-opacity="0.08" stroke="${colors.primary}" stroke-opacity="0.55" stroke-width="3"/>
  <path d="M450 566H630M540 476V656" stroke="#F8FAFC" stroke-opacity="0.32" stroke-width="4" stroke-linecap="round"/>
  ${svgLine(card.kicker, 170, 210, 24, colors.primary, 700, 'letter-spacing="5"')}
  ${svgLine(card.title, 170, 294, 68, '#F8FAFC', 900)}
  ${svgLine(card.subtitle, 172, 346, 28, '#CBD5E1', 700, 'letter-spacing="2"')}
  ${narrativeLines.map((line, index) => svgLine(line, 170, 1034 + index * 36, 26, '#E2E8F0', 600)).join('\n  ')}
  ${outcomeLines.map((line, index) => svgLine(line, 170, 1134 + index * 28, 20, '#94A3B8', 500)).join('\n  ')}
  ${card.metrics.map((metric, index) => {
    const x = 170 + index * 188;
    return `<g>
      <rect x="${x}" y="780" width="150" height="132" fill="#020617" fill-opacity="0.56" stroke="#F8FAFC" stroke-opacity="0.12"/>
      ${svgLine(metric.label, x + 18, 820, 18, '#94A3B8', 600)}
      ${svgLine(metric.value, x + 18, 866, 38, '#F8FAFC', 900)}
      ${svgLine(metric.detail, x + 18, 896, 14, colors.primary, 700, 'letter-spacing="2"')}
    </g>`;
  }).join('\n  ')}
  ${badgeTexts.slice(0, 5).map((badge, index) => {
    const y = 418 + index * 44;
    return `<g>
      <rect x="720" y="${y - 25}" width="190" height="32" fill="${colors.primary}" fill-opacity="0.1" stroke="${colors.primary}" stroke-opacity="0.38"/>
      ${svgLine(clampText(badge, 12), 736, y - 3, 16, '#F8FAFC', 700)}
    </g>`;
  }).join('\n  ')}
  ${storyLines.slice(0, 4).map((line, index) => svgLine(`0${index + 1} / ${line}`, 170, 438 + index * 44, 22, '#CBD5E1', 700)).join('\n  ')}
  <path d="M170 952H910" stroke="${colors.primary}" stroke-opacity="0.5" stroke-width="2"/>
  ${svgLine(card.evidence, 170, 1236, 16, '#64748B', 500)}
  ${svgLine(card.footer, 170, 1278, 18, '#94A3B8', 700, 'letter-spacing="3"')}
  ${svgLine('V-GENE', 770, 1278, 30, colors.primary, 900, 'letter-spacing="6"')}
</svg>`;
}

export function downloadRunShareCardSvg(card: RunShareCard, filename: string) {
  const svg = buildRunShareCardSvg(card);
  const blob = new Blob([svg], { type: 'image/svg+xml;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = filename;
  anchor.click();
  URL.revokeObjectURL(url);
}
