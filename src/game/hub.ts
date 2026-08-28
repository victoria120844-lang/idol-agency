/**
 * Between-cycle systems for the agency hub.
 *
 * Everything that happens *between* comebacks lives here: operating costs,
 * the crisis and closure path, condition recovery, departure risk and 강습.
 * Pure — the store commits what these return.
 */

import {
  AGENCY_TIERS,
  DISTRICTS,
  ECONOMY,
  HUB,
  TRAINING,
} from './constants';
import { agencyTier, agencyTierIndex, clampScore, formatWon, josa } from './formulas';
import { randChance, randId, type Rng } from './rng';
import type {
  AgencyTierId,
  Album,
  Company,
  Fandom,
  GameOver,
  Group,
  Grade,
  Id,
  Member,
  PendingDeparture,
  PotentialGrade,
  StatKey,
  Trainee,
} from './types';

// ---------------------------------------------------------------------------
// Operating costs
// ---------------------------------------------------------------------------

export interface OperatingCosts {
  /** Rent, utilities, practice rooms — scaled by the founding district. */
  overhead: number;
  /** Undebuted trainees. */
  trainees: number;
  /** Debuted members. */
  members: number;
  total: number;
}

/**
 * What one cycle costs to keep the lights on.
 *
 * Charged when the player returns to the hub, not weekly — the comeback screen
 * already has enough moving numbers, and a single lump sum between cycles is
 * what makes the "did that album pay for itself" question legible.
 */
export function operatingCosts(
  company: Company,
  traineeCount: number,
  memberCount: number,
): OperatingCosts {
  const overhead = Math.round(
    ECONOMY.weeklyOverhead *
      HUB.overheadWeeksPerCycle *
      DISTRICTS[company.district].overheadMul,
  );
  const trainees = traineeCount * HUB.traineeUpkeepPerCycle;
  const members = memberCount * HUB.memberUpkeepPerCycle;
  return { overhead, trainees, members, total: overhead + trainees + members };
}

// ---------------------------------------------------------------------------
// Departures
// ---------------------------------------------------------------------------

/** A member's average 호감도 toward everyone else in the group. */
export function averageAffinity(group: Group, memberId: Id): number {
  const pairs = group.relationships.filter((r) => r.a === memberId || r.b === memberId);
  if (pairs.length === 0) return 0;
  return Math.round(pairs.reduce((n, r) => n + r.affinity, 0) / pairs.length);
}

/**
 * Members unhappy enough to ask out.
 *
 * The roll is per member and deliberately forgiving — one rough comeback
 * should scare the player, not gut the lineup.
 */
export function rollDepartures(rng: Rng, group: Group): PendingDeparture[] {
  const out: PendingDeparture[] = [];

  for (const member of group.members) {
    const avg = averageAffinity(group, member.id);
    if (avg > HUB.departureAffinity) continue;
    if (!randChance(rng, HUB.departureChance)) continue;

    out.push({
      id: randId(rng, 'dp'),
      memberId: member.id,
      memberName: member.name,
      averageAffinity: avg,
      reason:
        avg <= -60
          ? `${josa(member.name, '은는')} 팀 안에서 완전히 고립됐습니다. 재계약 의사가 없다고 합니다.`
          : `${josa(member.name, '이가')} 팀 분위기를 이유로 재계약을 망설이고 있습니다.`,
      persuadeCost: HUB.persuadeCost,
    });
  }

  return out;
}

// ---------------------------------------------------------------------------
// Rest
// ---------------------------------------------------------------------------

/** Members recover between cycles; condition follows fatigue. */
export function restMembers(members: readonly Member[]): Member[] {
  return members.map((m) => {
    const fatigue = clampScore(m.fatigue - HUB.restRecovery);
    return { ...m, fatigue, condition: clampScore(100 - fatigue) };
  });
}

// ---------------------------------------------------------------------------
// Training
// ---------------------------------------------------------------------------

/** The ceiling this trainee's potential grade allows on any one stat. */
export function trainingCeiling(grade: PotentialGrade): number {
  return TRAINING.ceilings[grade];
}

export type TrainingBlock =
  | { kind: 'ok'; gain: number }
  | { kind: 'already_trained' }
  | { kind: 'at_ceiling'; ceiling: number }
  | { kind: 'insufficient_funds'; cost: number };

/**
 * What one lesson would do, or why it cannot run.
 *
 * Growth scales with the potential grade and stops dead at that grade's
 * ceiling — money cannot turn a D into an ace, which is the whole point of the
 * hidden grade being worth paying to reveal.
 */
export function trainingOutcome(
  trainee: Trainee,
  stat: StatKey,
  cycle: number,
  won: number,
): TrainingBlock {
  if (trainee.lastTrainedCycle >= cycle) return { kind: 'already_trained' };
  if (won < TRAINING.cost) return { kind: 'insufficient_funds', cost: TRAINING.cost };

  const ceiling = trainingCeiling(trainee.potentialGrade);
  const current = trainee.stats[stat];
  if (current >= ceiling) return { kind: 'at_ceiling', ceiling };

  const raw = Math.round(TRAINING.baseGain * POTENTIAL_GROWTH[trainee.potentialGrade]);
  return { kind: 'ok', gain: Math.max(1, Math.min(raw, ceiling - current)) };
}

/** Growth multiplier per grade. Mirrors POTENTIAL_GRADES without importing it. */
const POTENTIAL_GROWTH: Record<PotentialGrade, number> = {
  S: 1.8,
  A: 1.45,
  B: 1.2,
  C: 1.0,
  D: 0.8,
};

/** Apply a lesson. The caller has already checked `trainingOutcome`. */
export function applyTraining(
  trainee: Trainee,
  stat: StatKey,
  gain: number,
  cycle: number,
): Trainee {
  return {
    ...trainee,
    stats: { ...trainee.stats, [stat]: clampScore(trainee.stats[stat] + gain) },
    // A lesson is a week of training, which is also what reveals the grade.
    trainedWeeks: trainee.trainedWeeks + 1,
    lastTrainedCycle: cycle,
  };
}

// ---------------------------------------------------------------------------
// Tier progress
// ---------------------------------------------------------------------------

export interface TierProgress {
  current: AgencyTierId;
  next: AgencyTierId | null;
  /** Awareness the next tier needs. */
  requiredAwareness: number;
  /** 0-1 toward the next tier. */
  progress: number;
  /** Korean line for the dashboard. */
  note: string;
}

export function tierProgress(awareness: number): TierProgress {
  const current = agencyTier(awareness);
  const index = agencyTierIndex(current);
  const next = AGENCY_TIERS[index + 1];

  if (!next) {
    return {
      current,
      next: null,
      requiredAwareness: 100,
      progress: 1,
      note: '더 오를 등급이 없습니다.',
    };
  }

  const floor = AGENCY_TIERS[index].minAwareness;
  const span = next.minAwareness - floor;
  const progress = span <= 0 ? 1 : Math.max(0, Math.min(1, (awareness - floor) / span));

  return {
    current,
    next: next.id,
    requiredAwareness: next.minAwareness,
    progress,
    note: `${next.label}까지 인지도 ${Math.max(0, next.minAwareness - awareness)} 남았습니다.`,
  };
}

// ---------------------------------------------------------------------------
// Cycle settlement
// ---------------------------------------------------------------------------

export interface CycleSettlementInput {
  company: Company;
  group: Group | null;
  fandom: Fandom | null;
  trainees: readonly Trainee[];
  albums: readonly Album[];
  cycle: number;
  week: number;
}

export interface CycleSettlement {
  company: Company;
  group: Group | null;
  costs: OperatingCosts;
  departures: PendingDeparture[];
  /** Korean lines describing what the settlement did. */
  lines: string[];
  /** True when funds went negative this cycle. */
  inDeficit: boolean;
  gameOver: GameOver | null;
}

/**
 * Close the books on a cycle.
 *
 * Runs once when the player first reaches the hub after a comeback — the
 * `settledCycle` marker in the store keeps it from charging twice on a
 * re-render or a refresh.
 */
export function settleCycle(rng: Rng, input: CycleSettlementInput): CycleSettlement {
  const { company, group, fandom, trainees, albums, cycle, week } = input;

  const undebuted = trainees.filter((t) => !t.debuted).length;
  const memberCount = group?.members.length ?? 0;
  const costs = operatingCosts(company, undebuted, memberCount);

  const won = company.won - costs.total;
  const inDeficit = won < 0;
  const deficitCycles = inDeficit ? company.deficitCycles + 1 : 0;

  const lines: string[] = [
    `연습실 임대와 운영비로 ${formatWon(costs.overhead)}이 나갔습니다.`,
    undebuted > 0
      ? `연습생 ${undebuted}명 유지비 ${formatWon(costs.trainees)}.`
      : '유지 중인 연습생이 없습니다.',
    memberCount > 0 ? `멤버 ${memberCount}명 정산 ${formatWon(costs.members)}.` : '',
  ].filter(Boolean);

  let nextCompany: Company = {
    ...company,
    won,
    deficitCycles,
    tier: agencyTier(company.awareness),
  };

  // Members rest between cycles regardless of how the books look.
  const restedGroup = group ? { ...group, members: restMembers(group.members) } : null;

  const departures = restedGroup ? rollDepartures(rng, restedGroup) : [];
  if (departures.length > 0) {
    lines.push(
      `${departures.map((d) => d.memberName).join(', ')} 재계약 의사를 밝히지 않았습니다.`,
    );
  }

  if (inDeficit) {
    lines.push(
      deficitCycles >= HUB.deficitCyclesToClose
        ? '두 사이클 연속 적자입니다. 더 버틸 수 없습니다.'
        : `자금이 ${formatWon(won)}입니다. 다음 사이클에도 적자면 문을 닫아야 합니다.`,
    );
  }

  const gameOver =
    deficitCycles >= HUB.deficitCyclesToClose
      ? buildGameOver(nextCompany, group, fandom, albums, cycle, week)
      : null;

  if (gameOver) nextCompany = { ...nextCompany, won };

  return {
    company: nextCompany,
    group: restedGroup,
    costs,
    departures,
    lines,
    inDeficit,
    gameOver,
  };
}

/** The closure screen's content, assembled from the whole run. */
export function buildGameOver(
  company: Company,
  group: Group | null,
  fandom: Fandom | null,
  albums: readonly Album[],
  cycle: number,
  week: number,
): GameOver {
  const results = albums.map((a) => a.result).filter((r): r is NonNullable<typeof r> => Boolean(r));
  const gradeOrder: Grade[] = ['F', 'D', 'C', 'B', 'A', 'S', 'SS'];

  let bestGrade: Grade | null = null;
  let bestFirstWeek = 0;
  for (const r of results) {
    if (!bestGrade || gradeOrder.indexOf(r.grade) > gradeOrder.indexOf(bestGrade)) {
      bestGrade = r.grade;
    }
    bestFirstWeek = Math.max(bestFirstWeek, r.firstWeekSales);
  }

  const lines = [
    `${josa(company.name, '은는')} ${cycle}번째 사이클에서 자금이 바닥났습니다.`,
    group
      ? `${group.name}의 멤버들은 각자의 길을 찾아 흩어졌습니다.`
      : '데뷔조를 꾸리기도 전에 문을 닫았습니다.',
    fandom && fandom.size > 0
      ? `마지막까지 남아 있던 ${fandom.name} ${fandom.size.toLocaleString('ko-KR')}명에게는 공지 한 장만 남았습니다.`
      : '기다려 준 팬은 없었습니다.',
    '연습실 임대 계약이 해지되었습니다.',
  ];

  return {
    reason: 'bankruptcy',
    title: '폐업',
    lines,
    cycles: cycle,
    weeks: week,
    bestGrade,
    bestFirstWeek,
    finalFandom: fandom?.size ?? 0,
    totalRevenue: company.totalRevenue,
  };
}
