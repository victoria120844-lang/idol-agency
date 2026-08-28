/**
 * Comeback settlement.
 *
 * Turns four weeks of logs into the six headline numbers, the grade, and every
 * piece of generated Korean copy on the results screen. Pure — it takes a
 * snapshot and returns a `ComebackResult`; the store commits it onto the album.
 */

import {
  ALBUM_CONCEPTS,
  AGENCY_TIERS,
  COMEBACK,
  DEBUT_GOALS,
  ECONOMY,
  RELATION_TYPES,
  RESULTS,
} from './constants';
import {
  agencyTier,
  agencyTierIndex,
  clamp,
  clampScore,
  formatCount,
  formatWon,
  josa,
  scoreToGrade,
} from './formulas';
import { randFloat, shuffle, type Rng } from './rng';
import { STAT_KEYS } from './types';
import type {
  ActivityType,
  Album,
  AgencyTierId,
  ComebackResult,
  Company,
  Fandom,
  Grade,
  Group,
  Id,
  Member,
  PersonalityTagId,
  MemberResult,
  RelationshipDiff,
  Stats,
  WeekLog,
  WeekSeriesPoint,
} from './types';

// ---------------------------------------------------------------------------
// Building blocks
// ---------------------------------------------------------------------------

/** How many times an activity was booked across the whole promotion. */
export function countActivity(logs: readonly WeekLog[], activity: ActivityType): number {
  return logs.reduce(
    (n, log) => n + log.slots.filter((s) => s.activity === activity).length,
    0,
  );
}

/** Team stats weighted by the album concept, 0-100. */
export function weightedTeamStats(teamStats: Stats, album: Album): number {
  const weights = ALBUM_CONCEPTS[album.concept].weights;
  let weighted = 0;
  let total = 0;
  for (const key of STAT_KEYS) {
    weighted += teamStats[key] * weights[key];
    total += weights[key];
  }
  return total === 0 ? 0 : weighted / total;
}

/**
 * baseQuality — the number every other metric leans on.
 *
 * Weighted team stats, bent by how well the group fits the concept, how much
 * of the budget went to producing, and how well the room is getting along.
 */
export function baseQuality(params: {
  teamStats: Stats;
  album: Album;
  conceptFitPct: number;
  teamwork: number;
}): number {
  const { teamStats, album, conceptFitPct, teamwork } = params;
  const weighted = weightedTeamStats(teamStats, album);
  const fit = RESULTS.qualityConceptFloor + conceptFitPct * RESULTS.qualityConceptSpan;
  const producing = 0.7 + album.allocation.producing / 100;
  const chemistry = 0.8 + teamwork / 250;
  return clamp(weighted * fit * producing * chemistry, 0, 100);
}

/** 초동 — first-week physical sales. */
export function firstWeekSales(params: {
  rng: Rng;
  fandom: Fandom;
  fanSignings: number;
  salesPressure: number;
}): number {
  const { rng, fandom, fanSignings, salesPressure } = params;
  const core = fandom.size * (fandom.coreRatio / 100);
  const signingBonus = 1 + fanSignings * RESULTS.salesPerFanSigning;
  const loyaltyBonus = 1 + fandom.loyalty / RESULTS.salesLoyaltyDivisor;
  const pressureBonus = 1 + salesPressure / RESULTS.salesPressureDivisor;
  const luck = randFloat(rng, RESULTS.salesRandomMin, RESULTS.salesRandomMax);
  return Math.round(core * signingBonus * loyaltyBonus * pressureBonus * luck);
}

/**
 * Chart score, then the rank it maps to.
 *
 * Returns 0 for "차트인 실패" — a small label with a quiet single genuinely
 * does not chart, and hiding that behind a 100th place would be a lie.
 */
export function chartPeak(params: {
  quality: number;
  killingVocalRap: number;
  shortforms: number;
  awareness: number;
  sentiment: number;
  streams: number;
}): { rank: number; score: number } {
  const { quality, killingVocalRap, shortforms, awareness, sentiment, streams } = params;

  let score =
    quality * RESULTS.chartQualityWeight +
    killingVocalRap * RESULTS.chartKillingWeight +
    shortforms * RESULTS.chartShortformWeight +
    awareness * RESULTS.chartAwarenessWeight +
    sentiment * RESULTS.chartSentimentWeight +
    streams * RESULTS.chartStreamWeight;

  if (awareness < RESULTS.smallLabelAwareness) score -= RESULTS.smallLabelChartPenalty;
  score = clamp(score, 0, 120);

  if (score < RESULTS.chartEntryScore) return { rank: 0, score };
  if (score >= RESULTS.chartTopScore) return { rank: 1, score };

  // Linear between the entry score and the top score, 100th down to 1st.
  const span = RESULTS.chartTopScore - RESULTS.chartEntryScore;
  const t = (score - RESULTS.chartEntryScore) / span;
  return { rank: Math.max(1, Math.round(100 - t * 99)), score };
}

/** 뮤직비디오 4주 누적 조회수. */
export function mvViews(params: {
  mvPct: number;
  centerVisualCharisma: number;
  awareness: number;
  buzz: number;
}): number {
  const { mvPct, centerVisualCharisma, awareness, buzz } = params;
  const budget = 1 + (mvPct / 100) * RESULTS.mvBudgetWeight;
  const center = 1 + centerVisualCharisma * RESULTS.mvCenterWeight;
  const reach = 1 + awareness * RESULTS.mvAwarenessWeight;
  return Math.round(RESULTS.mvBaseViews * budget * center * reach + buzz * RESULTS.mvBuzzWeight);
}

export interface Settlement {
  revenue: number;
  expense: number;
  profit: number;
}

/** 수익 — album, streaming and activity income against every cost. */
export function settleMoney(params: {
  sales: number;
  streams: number;
  albumBudget: number;
  logs: readonly WeekLog[];
}): Settlement {
  const { sales, streams, albumBudget, logs } = params;

  // Retail price and platform payout, times the label's share of each.
  const albumRevenue = sales * ECONOMY.wonPerAlbum * RESULTS.labelAlbumMargin;
  const streamRevenue =
    (streams / RESULTS.streamsPerSettlementUnit) *
    ECONOMY.wonPerThousandStreams *
    RESULTS.labelStreamMargin;

  // Weekly cashflow: positive weeks earned (fan signings, CF shoots).
  const activityIncome = logs.reduce((n, l) => n + Math.max(0, l.wonDelta), 0);
  const activityCost = logs.reduce((n, l) => n + Math.max(0, -l.wonDelta), 0);

  const gross = albumRevenue + streamRevenue;
  const memberShare = gross * RESULTS.memberRevenueShare;

  const revenue = Math.round(gross + activityIncome);
  const expense = Math.round(albumBudget + activityCost + memberShare);

  return { revenue, expense, profit: revenue - expense };
}

// ---------------------------------------------------------------------------
// Grade
// ---------------------------------------------------------------------------

/** Normalise a raw metric onto 0-100 against its reference point. */
function normalise(value: number, reference: number): number {
  return clamp((value / reference) * 100, 0, 100);
}

/** The 0-100 composite behind the letter grade. */
export function comebackScore(params: {
  sales: number;
  chartRank: number;
  mvViews: number;
  fandomGain: number;
  awarenessGain: number;
  profit: number;
}): number {
  const w = RESULTS.gradeWeights;
  const ref = RESULTS.gradeReference;

  // A rank of 0 (did not chart) scores zero; 1st place scores 100.
  const chartScore = params.chartRank === 0 ? 0 : clamp(100 - (params.chartRank - 1), 0, 100);

  const raw =
    normalise(params.sales, ref.sales) * w.sales +
    chartScore * w.chart +
    normalise(params.mvViews, ref.mvViews) * w.mv +
    normalise(params.fandomGain, ref.fandomGain) * w.fandom +
    normalise(params.awarenessGain, ref.awarenessGain) * w.awareness +
    normalise(Math.max(0, params.profit), ref.profit) * w.profit;

  // Expand around the observed centre, then compress the top; see
  // RESULTS.scoreCurve for why both halves are needed.
  const { center, gain, softenAbove, softenGain } = RESULTS.scoreCurve;
  const expanded = 50 + (raw - center) * gain;
  const curved =
    expanded > softenAbove ? softenAbove + (expanded - softenAbove) * softenGain : expanded;
  return clampScore(curved);
}

// ---------------------------------------------------------------------------
// Generated copy
// ---------------------------------------------------------------------------

/** How the public is talking, which decides the tone of every generated line. */
export function reactionTone(grade: Grade): 'hyped' | 'warm' | 'flat' | 'harsh' {
  if (grade === 'SS' || grade === 'S') return 'hyped';
  if (grade === 'A' || grade === 'B') return 'warm';
  if (grade === 'C') return 'flat';
  return 'harsh';
}

const HEADLINE_POOLS = {
  hyped: [
    '{group}, 데뷔 앨범으로 신인 판도 뒤집었다',
    '"신인 맞나" — {group} 초동 {sales} 돌파',
    '{group} 「{album}」, 음원·음반 동시 강세',
    '{company}의 반전… {group} 신인상 유력 후보로',
  ],
  warm: [
    '{group}, 첫 컴백 무난한 성적표',
    '{group} 「{album}」 초동 {sales}… 팬덤 결집 확인',
    '신인 {group}, 다음 앨범이 분수령',
    '{company} {group}, 조용하지만 단단한 출발',
  ],
  flat: [
    '{group} 「{album}」, 기대에는 못 미쳐',
    '{group} 초동 {sales}… 대중 인지도 확보가 과제',
    '중소 신인의 한계? {group} 성적 정체',
    '{company}, {group} 다음 활동 전략 재검토',
  ],
  harsh: [
    '{group} 「{album}」, 사실상 실패',
    '초동 {sales}… {group} 존재감 없었다',
    '{company} 자금난 우려… {group} 성적 부진',
    '데뷔 앨범 묻힌 {group}, 재정비 불가피',
  ],
} as const;

const REACTION_POOLS = {
  hyped: [
    '와 이번 앨범 진짜 미쳤다 무한재생 중',
    '얘네 소속사 소형이라며?? 퀄리티 뭐야',
    '{center} 센터 미쳤음 직캠 조회수 봐라',
    '음방 1위 가자 총공 준비함',
    '초동 이거 신인 맞아? 다음 앨범 기대된다',
    '{killing} 파트 나올 때마다 소름',
  ],
  warm: [
    '무난하게 잘 뽑혔다 다음이 더 기대됨',
    '{center} 비주얼은 확실히 먹히는 듯',
    '팬덤 늘어나는 게 눈에 보임',
    '음원은 좀 아쉬운데 무대는 좋았음',
    '이 정도면 신인치고 선방 아닌가',
    '{killing} 목소리 좋아서 계속 듣게 됨',
  ],
  flat: [
    '나쁘진 않은데 뭔가 임팩트가 없음',
    '노래는 괜찮은데 홍보가 너무 안 된 듯',
    '{center} 얼굴 아까움 회사가 못 밀어줌',
    '음방에서 처음 봤는데 왜 이제 알았지',
    '다음 앨범에 회사가 돈 좀 썼으면',
    '멤버들은 열심히 하는데 안 뜨네',
  ],
  harsh: [
    '이걸 왜 냈지 진심 궁금함',
    '회사가 애들 갈아넣기만 하고 아무것도 안 해줌',
    '{center} 불쌍하다 다른 회사 갔으면',
    '차트인도 못 했는데 컴백을 왜 했냐',
    '멤버들 컨디션 안 좋아 보이던데 일정 좀 줄여라',
    '홍보 하나도 안 하면서 성적 나오길 바라는 건가',
  ],
} as const;

function fill(
  template: string,
  ctx: { group: string; company: string; album: string; sales: string; center: string; killing: string },
): string {
  return template
    .replaceAll('{group}', ctx.group)
    .replaceAll('{company}', ctx.company)
    .replaceAll('{album}', ctx.album)
    .replaceAll('{sales}', ctx.sales)
    .replaceAll('{center}', ctx.center)
    .replaceAll('{killing}', ctx.killing);
}


/** Everything the note generator needs about one member's comeback. */
interface MemberNoteContext {
  rank: number;
  total: number;
  isCenter: boolean;
  isKilling: boolean;
  share: number;
  solos: number;
}

/**
 * One Korean sentence about this member's comeback.
 *
 * Checked most-specific first, so a member is described by whatever was
 * actually distinctive about their four weeks. The generic fallbacks vary by
 * rank rather than repeating one line down the whole roster — five identical
 * sentences read as a bug, not a settlement.
 */
export function memberNote(member: Member, ctx: MemberNoteContext): string {
  const { rank, total, isCenter, isKilling, share, solos } = ctx;
  const has = (tag: PersonalityTagId) => member.personality.includes(tag);

  if (isCenter && isKilling) {
    return `센터와 킬링파트를 혼자 짊어졌습니다. 화제성 ${rank}위.`;
  }
  if (isCenter) return `센터로 4주를 버텼습니다. 화제성 ${rank}위.`;
  if (isKilling) return `킬링파트가 매 무대 화제였습니다. 화제성 ${rank}위.`;

  if (share === 0) return '이번 앨범에서 파트를 받지 못했습니다. 다음 앨범에서는 기회가 필요합니다.';

  if (member.fatigue >= COMEBACK.fatigueInjuryThreshold) {
    return `피로도 ${member.fatigue}. 결국 병원부터 가야 할 상태입니다.`;
  }
  if (member.fatigue >= COMEBACK.fatigueStrainThreshold) {
    return `피로도 ${member.fatigue}로 후반 무대가 눈에 띄게 흔들렸습니다.`;
  }

  if (solos > 0) return `개인 스케줄 ${solos}회로 혼자 이름을 알렸습니다. 화제성 ${rank}위.`;
  if (rank === 1) return `센터가 아닌데도 화제성 1위를 가져갔습니다.`;
  if (rank === total && total > 2) return `${total}명 중 가장 조명을 못 받았습니다.`;

  if (has('grinder')) return '연습실에 가장 늦게까지 남아 있었습니다.';
  if (has('star_quality')) return '카메라가 유난히 자주 잡았습니다.';
  if (has('funny')) return '예능에서 분량을 확실히 챙겼습니다.';
  if (has('fragile')) return '악플을 혼자 오래 들여다봤다고 합니다.';
  if (has('lazy')) return '스케줄 사이사이 요령이 늘었습니다.';
  if (has('leadership')) return '멤버들 컨디션을 먼저 챙겼습니다.';
  if (has('professional')) return '4주 내내 한 번도 일정을 놓치지 않았습니다.';

  return `파트 ${share}%를 큰 흔들림 없이 소화했습니다.`;
}

// ---------------------------------------------------------------------------
// The settlement
// ---------------------------------------------------------------------------

export interface SettleInput {
  company: Company;
  group: Group;
  fandom: Fandom;
  album: Album;
  logs: readonly WeekLog[];
  teamStats: Stats;
  conceptFitPct: number;
  /** Accumulated over the four weeks. */
  buzz: number;
  salesPressure: number;
  streams: number;
  musicShowWins: number;
  /** State captured when the comeback started. */
  fandomBefore: number;
  awarenessBefore: number;
  cycle: number;
}

export function settleComeback(rng: Rng, input: SettleInput): ComebackResult {
  const {
    company,
    group,
    fandom,
    album,
    logs,
    teamStats,
    conceptFitPct,
    buzz,
    salesPressure,
    streams,
    musicShowWins,
    fandomBefore,
    awarenessBefore,
    cycle,
  } = input;

  const fanSignings = countActivity(logs, 'fan_signing');
  const shortforms = countActivity(logs, 'shortform');
  const musicShows = countActivity(logs, 'music_show');
  const varieties = countActivity(logs, 'variety');
  const preRecords = countActivity(logs, 'pre_record');
  const selfContents = countActivity(logs, 'self_content');
  const cfShoots = countActivity(logs, 'cf_shoot');

  const quality = baseQuality({ teamStats, album, conceptFitPct, teamwork: group.teamwork });

  const center = group.members.find((m) => m.id === album.centerMemberId) ?? group.members[0];
  const killing =
    group.members.find((m) => m.id === album.killingPartMemberId) ?? group.members[0];

  // ---- the six numbers ----
  const sales = firstWeekSales({ rng, fandom, fanSignings, salesPressure });

  const chart = chartPeak({
    quality,
    killingVocalRap: (killing.stats.vocal + killing.stats.rap) / 2,
    shortforms,
    awareness: company.awareness,
    sentiment: fandom.sentiment,
    streams,
  });

  const views = mvViews({
    mvPct: album.allocation.mv,
    centerVisualCharisma: (center.stats.visual + center.stats.charisma) / 2,
    awareness: company.awareness,
    buzz,
  });

  const fandomGain = fandom.size - fandomBefore;
  const awarenessGain = company.awareness - awarenessBefore;

  const money = settleMoney({
    sales,
    streams,
    albumBudget: album.budget,
    logs,
  });

  const score = comebackScore({
    sales,
    chartRank: chart.rank,
    mvViews: views,
    fandomGain,
    awarenessGain,
    profit: money.profit,
  });
  const grade = scoreToGrade(score);

  // ---- goal ----
  const goalMet =
    album.cycle >= 0 &&
    (group.goal === 'music_show_win'
      ? musicShowWins > 0
      : group.goal === 'first_week_100k'
        ? sales >= RESULTS.goalFirstWeek
        : company.awareness >= RESULTS.goalAwareness);

  const goalInfo = DEBUT_GOALS[group.goal];
  const goalText = goalMet
    ? `데뷔 목표 「${goalInfo.label}」 달성.`
    : group.goal === 'music_show_win'
      ? `데뷔 목표 「${goalInfo.label}」 미달. 4주 동안 1위를 하지 못했습니다.`
      : group.goal === 'first_week_100k'
        ? `데뷔 목표 「${goalInfo.label}」 미달. 초동 ${formatCount(sales, '장')}에 그쳤습니다.`
        : `데뷔 목표 「${goalInfo.label}」 미달. 현재 인지도 ${company.awareness}입니다.`;

  // ---- metric explanations ----
  const metrics: ComebackResult['metrics'] = {
    firstWeekSales: {
      value: formatCount(sales, '장'),
      raw: sales,
      reason:
        fanSignings > 0
          ? `팬사인회 ${fanSignings}회와 충성도 ${fandom.loyalty}이 초동을 끌어올렸습니다.`
          : `팬사인회를 한 번도 열지 않아 코어 팬 ${formatCount(
              Math.round(fandom.size * (fandom.coreRatio / 100)),
              '명',
            )}의 구매력에만 의존했습니다.`,
    },
    chartPeak: {
      value: chart.rank === 0 ? '차트인 실패' : `${chart.rank}위`,
      raw: chart.rank,
      reason:
        chart.rank === 0
          ? company.awareness < RESULTS.smallLabelAwareness
            ? `대중 인지도 ${company.awareness}로는 차트에 이름을 올리지 못했습니다.`
            : '음원 화력이 부족해 100위 안에 들지 못했습니다.'
          : shortforms > 0
            ? `숏폼 챌린지 ${shortforms}회와 ${josa(killing.name, '이가')} 킬링파트를 끌고 갔습니다.`
            : `곡 완성도가 순위를 만들었지만 숏폼 확산이 없어 더 오르지 못했습니다.`,
    },
    mvViews: {
      value: formatCount(views, '회'),
      raw: views,
      reason: `뮤직비디오 예산 ${album.allocation.mv}%와 센터 ${center.name}의 화면 장악력이 조회수를 만들었습니다.`,
    },
    fandom: {
      value: formatCount(fandom.size, '명'),
      raw: fandom.size,
      delta: fandomGain,
      deltaLabel: `${fandomGain >= 0 ? '+' : ''}${formatCount(fandomGain, '명')}`,
      reason:
        selfContents + preRecords > 0
          ? `자체 콘텐츠 ${selfContents}회와 사전녹화 ${preRecords}회가 팬덤을 불렸습니다.`
          : '팬덤 접점 스케줄이 없어 유입이 제한적이었습니다.',
    },
    awareness: {
      value: `${company.awareness} / 100`,
      raw: company.awareness,
      delta: awarenessGain,
      deltaLabel: `${awarenessGain >= 0 ? '+' : ''}${awarenessGain}`,
      reason: `음악방송 ${musicShows}회 · 예능 ${varieties}회 · 광고 ${cfShoots}회 노출에 마케팅 예산 ${album.allocation.marketing}%가 더해졌습니다.`,
    },
    profit: {
      value: formatWon(money.profit),
      raw: money.profit,
      delta: money.profit,
      deltaLabel: `잔고 ${formatWon(company.won + money.profit)}`,
      reason:
        money.profit >= 0
          ? `앨범·음원 정산이 제작비 ${formatWon(album.budget)}를 넘겼습니다.`
          : `제작비 ${formatWon(album.budget)}와 활동비를 회수하지 못했습니다.`,
    },
  };

  // ---- series ----
  // Absolute snapshots, so the last point always equals the headline number.
  const series: WeekSeriesPoint[] = logs.map((log) => ({
    promoWeek: log.promoWeek,
    fandom: log.fandomAfter,
    buzz: log.buzzAfter,
  }));

  // ---- member results ----
  const ranked = [...group.members].sort((a, b) => b.personalFans - a.personalFans);
  const soloCounts = new Map<Id, number>();
  for (const log of logs) {
    for (const slot of log.slots) {
      if (slot.activity === 'solo_schedule' && slot.memberId) {
        soloCounts.set(slot.memberId, (soloCounts.get(slot.memberId) ?? 0) + 1);
      }
    }
  }

  const memberResults: MemberResult[] = ranked.map((m, i) => ({
    memberId: m.id,
    name: m.name,
    personalFans: m.personalFans,
    fanGain: m.personalFans,
    buzzRank: i + 1,
    note: memberNote(m, {
      rank: i + 1,
      total: ranked.length,
      isCenter: m.id === album.centerMemberId,
      isKilling: m.id === album.killingPartMemberId,
      share: album.partShares[m.id] ?? 0,
      solos: soloCounts.get(m.id) ?? 0,
    }),
  }));

  // ---- relationship diff ----
  const cycleWeeks = new Set(logs.map((l) => l.week));
  const relationshipDiffs: RelationshipDiff[] = [];
  for (const r of group.relationships) {
    const entries = r.log.filter((e) => cycleWeeks.has(e.week));
    if (entries.length === 0) continue;

    const delta = entries.reduce((n, e) => n + e.affinityDelta, 0);
    const changed = entries.find((e) => e.becameType);
    // Only surface pairs that actually moved — a 2-point drift is not a story.
    if (!changed && Math.abs(delta) < 8) continue;

    const nameA = group.members.find((m) => m.id === r.a)?.name ?? '멤버';
    const nameB = group.members.find((m) => m.id === r.b)?.name ?? '멤버';
    const label = RELATION_TYPES[r.type].label;

    const diff: RelationshipDiff = {
      a: r.a,
      b: r.b,
      nameA,
      nameB,
      type: r.type,
      affinityDelta: delta,
      text: changed
        ? `${nameA} · ${nameB} — ${RELATION_TYPES[changed.becameType!].label} 관계가 되었습니다.`
        : delta > 0
          ? `${nameA} · ${nameB} — ${label} 관계가 눈에 띄게 가까워졌습니다.`
          : `${nameA} · ${nameB} — ${label} 관계가 더 멀어졌습니다.`,
    };
    if (changed?.becameType) diff.becameType = changed.becameType;
    relationshipDiffs.push(diff);
  }
  relationshipDiffs.sort((a, b) => Math.abs(b.affinityDelta) - Math.abs(a.affinityDelta));
  relationshipDiffs.splice(6);

  // ---- generated copy ----
  const tone = reactionTone(grade);
  const ctx = {
    group: group.name,
    company: company.name,
    album: album.title,
    sales: formatCount(sales, '장'),
    center: center.name,
    killing: killing.name,
  };

  const headlines = shuffle(rng, HEADLINE_POOLS[tone])
    .slice(0, 3)
    .map((t) => fill(t, ctx));
  const reactions = shuffle(rng, REACTION_POOLS[tone])
    .slice(0, 5)
    .map((t) => fill(t, ctx));

  // ---- tier promotion ----
  const tierAfter = agencyTier(company.awareness);
  const tierBefore = agencyTier(awarenessBefore);
  const promoted = agencyTierIndex(tierAfter) > agencyTierIndex(tierBefore);

  return {
    albumId: album.id,
    cycle,
    firstWeekSales: sales,
    chartPeak: chart.rank,
    mvViews: views,
    streams,
    musicShowWins,
    fandomBefore,
    fandomAfter: fandom.size,
    awarenessBefore,
    awarenessAfter: company.awareness,
    revenue: money.revenue,
    expense: money.expense,
    profit: money.profit,
    wonAfter: company.won + money.profit,
    metrics,
    score,
    grade,
    goal: group.goal,
    goalMet,
    goalText,
    series,
    memberResults,
    relationshipDiffs,
    headlines,
    reactions,
    promotedFrom: promoted ? tierBefore : undefined,
    promotedTo: promoted ? tierAfter : undefined,
  };
}

/** Korean text summary for the copy button, including a hashtag line. */
export function resultSummaryText(
  companyName: string,
  group: Group,
  album: Album,
  result: ComebackResult,
): string {
  const tierLine = result.promotedTo
    ? `\n🏢 ${AGENCY_TIERS.find((t) => t.id === result.promotedTo)?.label}로 승격!`
    : '';

  return [
    `[${companyName}] ${group.name} 「${album.title}」 컴백 결산`,
    '',
    `종합 등급 ${result.grade}`,
    `초동 ${formatCount(result.firstWeekSales, '장')}`,
    `음원 최고 순위 ${result.chartPeak === 0 ? '차트인 실패' : `${result.chartPeak}위`}`,
    `MV 조회수 ${formatCount(result.mvViews, '회')}`,
    `팬덤 ${formatCount(result.fandomAfter, '명')} (${result.fandomAfter - result.fandomBefore >= 0 ? '+' : ''}${formatCount(result.fandomAfter - result.fandomBefore, '명')})`,
    `대중 인지도 ${result.awarenessAfter}/100`,
    `순이익 ${formatWon(result.profit)}`,
    result.goalText + tierLine,
    '',
    '#아이돌기획사시뮬레이터 #IDOLAGENCYSIMULATOR',
  ].join('\n');
}

/** One extra line the results screen shows when the label moved up a tier. */
export function promotionText(from: AgencyTierId, to: AgencyTierId): string {
  const a = AGENCY_TIERS.find((t) => t.id === from)?.label ?? '';
  const b = AGENCY_TIERS.find((t) => t.id === to)?.label ?? '';
  return `${a}에서 ${josa(b, '으로로')} 승격했습니다.`;
}
