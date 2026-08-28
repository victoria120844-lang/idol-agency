/**
 * Pure game math and display formatting.
 *
 * Nothing in this file may import React, touch the store, or read the clock.
 * Every function takes its inputs explicitly and returns a new value.
 */

import {
  AGENCY_TIERS,
  ALBUM_CONCEPTS,
  ALBUM_TUNING,
  ALBUM_TYPES,
  BUDGET_CHANNELS,
  BUDGET_CHANNEL_ORDER,
  GRADE_THRESHOLDS,
  GROUP_CONCEPTS,
  NON_UNIQUE_POSITIONS,
  POSITION_PRIMARY_STAT,
  QUALITY_GRADE_THRESHOLDS,
  RECRUIT,
  RELATION_TUNING,
} from './constants';
import { STAT_KEYS } from './types';
import type {
  AgencyTierId,
  AlbumConcept,
  AlbumType,
  BudgetAllocation,
  BudgetChannel,
  Concept,
  Id,
  Member,
  QualityGrade,
  Track,
  Grade,
  Position,
  Relationship,
  StatKey,
  Stats,
  Trainee,
} from './types';

// ---------------------------------------------------------------------------
// Number formatting (Korean conventions)
// ---------------------------------------------------------------------------

/** "₩5,000,000" — the canonical currency renderer for the whole UI. */
export function formatWon(n: number): string {
  const sign = n < 0 ? '-' : '';
  return `${sign}₩${Math.abs(Math.round(n)).toLocaleString('ko-KR')}`;
}

/**
 * Compact Won using 만/억, for tight spaces like stat chips.
 * 5_000_000 -> "500만", 120_000_000 -> "1억 2,000만"
 */
export function formatWonShort(n: number): string {
  const sign = n < 0 ? '-' : '';
  const abs = Math.abs(Math.round(n));
  if (abs < 10_000) return `${sign}₩${abs.toLocaleString('ko-KR')}`;

  const eok = Math.floor(abs / 100_000_000);
  const man = Math.floor((abs % 100_000_000) / 10_000);
  const parts: string[] = [];
  if (eok > 0) parts.push(`${eok.toLocaleString('ko-KR')}억`);
  if (man > 0) parts.push(`${man.toLocaleString('ko-KR')}만`);
  return `${sign}₩${parts.join(' ')}`;
}

/**
 * Counts with a Korean unit suffix: 123_400 + "장" -> "12만 3,400장".
 * Below 10,000 it stays a plain grouped number.
 */
export function formatCount(n: number, unit = ''): string {
  const sign = n < 0 ? '-' : '';
  const abs = Math.abs(Math.round(n));
  if (abs < 10_000) return `${sign}${abs.toLocaleString('ko-KR')}${unit}`;

  const eok = Math.floor(abs / 100_000_000);
  const man = Math.floor((abs % 100_000_000) / 10_000);
  const rest = abs % 10_000;
  const parts: string[] = [];
  if (eok > 0) parts.push(`${eok.toLocaleString('ko-KR')}억`);
  if (man > 0) parts.push(`${man.toLocaleString('ko-KR')}만`);
  if (rest > 0) parts.push(rest.toLocaleString('ko-KR'));
  return `${sign}${parts.join(' ')}${unit}`;
}

/** "12.3%" with one decimal, for rates and shares. */
export function formatPercent(ratio: number, digits = 1): string {
  return `${(ratio * 100).toFixed(digits)}%`;
}

/** "3주차" style week label. */
export function formatWeek(week: number): string {
  return `${week}주차`;
}

// ---------------------------------------------------------------------------
// Korean particles
// ---------------------------------------------------------------------------

/**
 * Does the last character carry a 받침 (final consonant)?
 *
 * Hangul syllables are laid out so that `(code - 0xAC00) % 28` is the final
 * consonant index, and 0 means there is none. Anything that is not a Hangul
 * syllable — a Latin word, a digit — is treated as having one, which is the
 * usual convention for names like "FIRST LIGHT".
 */
export function hasFinalConsonant(word: string): boolean {
  const trimmed = word.trim();
  if (trimmed.length === 0) return true;
  const code = trimmed.charCodeAt(trimmed.length - 1);
  if (code < 0xac00 || code > 0xd7a3) return true;
  return (code - 0xac00) % 28 !== 0;
}

/** Particle pairs, written 받침-form first. */
const JOSA_PAIRS = {
  은는: ['은', '는'],
  이가: ['이', '가'],
  을를: ['을', '를'],
  과와: ['과', '와'],
  으로로: ['으로', '로'],
  이라는: ['이라는', '라는'],
} as const;

export type JosaPair = keyof typeof JOSA_PAIRS;

/**
 * Append the right Korean particle for a word.
 *
 * Generated sentences splice names in constantly, and a wrong 은/는 is the
 * fastest way to make Korean copy read as machine output. Always build these
 * sentences with `josa`, never by hardcoding a particle after a variable.
 */
export function josa(word: string, pair: JosaPair): string {
  const [withBatchim, withoutBatchim] = JOSA_PAIRS[pair];
  return `${word}${hasFinalConsonant(word) ? withBatchim : withoutBatchim}`;
}

// ---------------------------------------------------------------------------
// Math helpers
// ---------------------------------------------------------------------------

export function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

/** Clamp to the 0-100 stat range and round. */
export function clampScore(value: number): number {
  return Math.round(clamp(value, 0, 100));
}

export function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * clamp(t, 0, 1);
}

/** Diminishing-returns curve: fast early growth, slow near the ceiling. */
export function diminish(value: number, ceiling: number): number {
  if (ceiling <= 0) return 0;
  return 1 - clamp(value / ceiling, 0, 1) ** 2;
}

// ---------------------------------------------------------------------------
// Stat aggregation
// ---------------------------------------------------------------------------

export function emptyStats(): Stats {
  return {
    vocal: 0,
    dance: 0,
    rap: 0,
    visual: 0,
    charisma: 0,
    mental: 0,
  };
}

/** Unweighted mean of all stats. */
export function averageStats(stats: Stats): number {
  let sum = 0;
  for (const key of STAT_KEYS) sum += stats[key];
  return sum / STAT_KEYS.length;
}

/** Add two stat blocks, clamped back into 0-100. */
export function addStats(base: Stats, delta: Partial<Stats>): Stats {
  const out = { ...base };
  for (const key of STAT_KEYS) {
    const d = delta[key];
    if (d !== undefined) out[key] = clampScore(out[key] + d);
  }
  return out;
}

/** Cap each stat at its matching potential value. */
export function capByPotential(stats: Stats, potential: Stats): Stats {
  const out = { ...stats };
  for (const key of STAT_KEYS) {
    out[key] = Math.min(out[key], potential[key]);
  }
  return out;
}

/** 종합 — the headline number on a trainee card. */
export function traineeOverall(stats: Stats): number {
  return Math.round(averageStats(stats));
}

/** The stat key with the highest value; ties resolve in STAT_KEYS order. */
export function bestStat(stats: Stats): StatKey {
  let best: StatKey = STAT_KEYS[0];
  for (const key of STAT_KEYS) {
    if (stats[key] > stats[best]) best = key;
  }
  return best;
}

// ---------------------------------------------------------------------------
// Recruitment
// ---------------------------------------------------------------------------

/**
 * What the next audition costs, given how many trainees have been recruited
 * so far. The first `freeSlots` auditions are free; every one after that is a
 * flat fee.
 */
export function recruitCost(recruitedCount: number): number {
  return recruitedCount < RECRUIT.freeSlots ? 0 : RECRUIT.costAfterFree;
}

/** Free auditions still available. */
export function freeSlotsLeft(recruitedCount: number): number {
  return Math.max(0, RECRUIT.freeSlots - recruitedCount);
}

export type RecruitBlock = 'roster_full' | 'insufficient_funds' | null;

/** Why the next audition cannot run, or null when it can. */
export function recruitBlock(recruitedCount: number, won: number): RecruitBlock {
  if (recruitedCount >= RECRUIT.maxRoster) return 'roster_full';
  if (won < recruitCost(recruitedCount)) return 'insufficient_funds';
  return null;
}

/** True once the grade is visible — trained long enough, or paid for. */
export function isPotentialVisible(trainee: Trainee): boolean {
  return trainee.potentialRevealed || trainee.trainedWeeks >= RECRUIT.revealAfterWeeks;
}

// ---------------------------------------------------------------------------
// Group composition
// ---------------------------------------------------------------------------

/** Per-stat mean across a lineup. Empty lineups return zeroed stats. */
export function averageTeamStats(lineup: readonly { stats: Stats }[]): Stats {
  const out = emptyStats();
  if (lineup.length === 0) return out;
  for (const key of STAT_KEYS) {
    let sum = 0;
    for (const m of lineup) sum += m.stats[key];
    out[key] = Math.round(sum / lineup.length);
  }
  return out;
}

/**
 * 컨셉 적합도 — the team's stats scored through the concept's weights.
 *
 * A weighted mean rather than a raw one: a concept that cares about dance at
 * 1.3 and rap at 0.7 rewards a lineup that leans the same way, so the number
 * moves as members are added and answers "does this group fit this concept".
 */
export function conceptFit(teamStats: Stats, concept: Concept): number {
  const weights = GROUP_CONCEPTS[concept].weights;
  let weighted = 0;
  let total = 0;
  for (const key of STAT_KEYS) {
    weighted += teamStats[key] * weights[key];
    total += weights[key];
  }
  return total === 0 ? 0 : clampScore(weighted / total);
}

/**
 * The concept's ideal shape, drawn behind the team radar. Weights are scaled so
 * the heaviest stat sits at 100 — it is a shape to aim at, not a target score.
 */
export function conceptIdealShape(concept: Concept): Stats {
  const weights = GROUP_CONCEPTS[concept].weights;
  let max = 0;
  for (const key of STAT_KEYS) max = Math.max(max, weights[key]);
  const out = emptyStats();
  if (max === 0) return out;
  for (const key of STAT_KEYS) out[key] = Math.round((weights[key] / max) * 100);
  return out;
}

/** Group 종합 — the plain mean of the team's six stats. */
export function groupOverall(teamStats: Stats): number {
  return Math.round(averageStats(teamStats));
}

/** True when this position may be held by more than one member. */
export function isPositionUnique(position: Position): boolean {
  return !NON_UNIQUE_POSITIONS.includes(position);
}

/**
 * True when a position asks for a stat the member is not actually best at.
 * Allowed, but worth a soft warning in the UI.
 */
export function isPositionMismatch(position: Position, stats: Stats): boolean {
  const wanted = POSITION_PRIMARY_STAT[position];
  if (!wanted) return false;
  return bestStat(stats) !== wanted;
}

// ---------------------------------------------------------------------------
// Album production
// ---------------------------------------------------------------------------

/** What this album format costs to produce. */
export function albumCost(type: AlbumType): number {
  return ALBUM_TYPES[type].cost;
}

/** Won still missing to afford this format, or 0 when it is affordable. */
export function albumShortfall(type: AlbumType, won: number): number {
  return Math.max(0, albumCost(type) - won);
}

/** Sum of a budget allocation. Should always be 100. */
export function allocationTotal(alloc: BudgetAllocation): number {
  return BUDGET_CHANNEL_ORDER.reduce((sum, key) => sum + alloc[key], 0);
}

/** The default split, as declared in BUDGET_CHANNELS. */
export function defaultAllocation(): BudgetAllocation {
  return {
    producing: BUDGET_CHANNELS.producing.defaultPct,
    mv: BUDGET_CHANNELS.mv.defaultPct,
    choreography: BUDGET_CHANNELS.choreography.defaultPct,
    styling: BUDGET_CHANNELS.styling.defaultPct,
    marketing: BUDGET_CHANNELS.marketing.defaultPct,
  };
}

/**
 * Move one channel to `value` and absorb the difference across the others,
 * proportionally to what they already hold.
 *
 * This is why the sliders can never drift off 100: the total is a property of
 * the function, not something the UI has to police. Rounding is settled by
 * pushing the remainder onto the largest untouched channel.
 */
export function rebalanceAllocation(
  alloc: BudgetAllocation,
  key: BudgetChannel,
  value: number,
): BudgetAllocation {
  const next = clamp(Math.round(value), 0, 100);
  const others = BUDGET_CHANNEL_ORDER.filter((k) => k !== key);
  const remaining = 100 - next;
  const othersTotal = others.reduce((sum, k) => sum + alloc[k], 0);

  const out = { ...alloc, [key]: next } as BudgetAllocation;

  if (othersTotal <= 0) {
    // Everything else was at zero: spread the remainder evenly.
    const each = Math.floor(remaining / others.length);
    others.forEach((k) => {
      out[k] = each;
    });
  } else {
    others.forEach((k) => {
      out[k] = Math.round((alloc[k] / othersTotal) * remaining);
    });
  }

  // Settle rounding drift on whichever other channel is largest.
  const drift = 100 - allocationTotal(out);
  if (drift !== 0) {
    const target = others.reduce((a, b) => (out[a] >= out[b] ? a : b));
    out[target] = clamp(out[target] + drift, 0, 100);
  }

  return out;
}

/**
 * Expected quality of the title track, 0-100.
 *
 * Reads the concept's stat weights against the team, then bends the result by
 * how much of the budget went to producing, how well the group fits the album
 * concept, and how well the members are getting along. The player only ever
 * sees the grade this maps to — the numbers stay behind the curtain.
 */
export function titleTrackQuality(params: {
  teamStats: Stats;
  concept: AlbumConcept;
  conceptFitPct: number;
  producingPct: number;
  teamwork: number;
}): number {
  const { teamStats, concept, conceptFitPct, producingPct, teamwork } = params;
  const weights = ALBUM_CONCEPTS[concept].weights;

  let weighted = 0;
  let totalWeight = 0;
  for (const key of STAT_KEYS) {
    weighted += teamStats[key] * weights[key];
    totalWeight += weights[key];
  }
  const base = totalWeight === 0 ? 0 : weighted / totalWeight;

  const producing =
    (producingPct - ALBUM_TUNING.producingBaseline) * ALBUM_TUNING.producingWeight;
  const fit = (conceptFitPct - 50) * ALBUM_TUNING.conceptFitWeight;
  const chemistry = (teamwork - 50) * ALBUM_TUNING.teamworkWeight;

  return clampScore(base + producing + fit + chemistry);
}

/**
 * How well the group's stats fit the **album** concept, 0-100.
 *
 * Same weighted mean as `conceptFit`, but read against the album's own weight
 * table — the two concepts are chosen independently, so they need separate
 * scores.
 */
export function albumConceptFit(teamStats: Stats, concept: AlbumConcept): number {
  const weights = ALBUM_CONCEPTS[concept].weights;
  let weighted = 0;
  let total = 0;
  for (const key of STAT_KEYS) {
    weighted += teamStats[key] * weights[key];
    total += weights[key];
  }
  return total === 0 ? 0 : clampScore(weighted / total);
}

/** Map a 0-100 score onto the five-step D~S ladder. */
export function qualityGrade(score: number): QualityGrade {
  for (const tier of QUALITY_GRADE_THRESHOLDS) {
    if (score >= tier.min) return tier.grade;
  }
  return 'D';
}

/** Zero-based rung of the five-step ladder, for rendering the gauge. */
export function qualityGradeIndex(grade: QualityGrade): number {
  const order: QualityGrade[] = ['D', 'C', 'B', 'A', 'S'];
  return Math.max(0, order.indexOf(grade));
}

/** Members credited on a track whose 특기 is 작사 or 작곡. */
export function writingCredits(participantIds: readonly Id[], members: readonly Member[]): number {
  return participantIds.filter((id) => {
    const m = members.find((x) => x.id === id);
    return m?.specialty === 'lyrics' || m?.specialty === 'composing';
  }).length;
}

/** Album quality: the title track counts several times as much as a b-side. */
export function albumQuality(tracks: readonly Track[], titleTrackId: Id): number {
  if (tracks.length === 0) return 0;
  let weighted = 0;
  let total = 0;
  for (const t of tracks) {
    const w = t.id === titleTrackId ? ALBUM_TUNING.titleTrackWeight : 1;
    weighted += t.quality * w;
    total += w;
  }
  return clampScore(weighted / total);
}

// ---------------------------------------------------------------------------
// Part distribution
// ---------------------------------------------------------------------------

/** An even split across `ids`, with the rounding remainder given to the first. */
export function evenShares(ids: readonly Id[]): Record<Id, number> {
  const out: Record<Id, number> = {};
  if (ids.length === 0) return out;
  const each = Math.floor(100 / ids.length);
  ids.forEach((id) => {
    out[id] = each;
  });
  out[ids[0]] += 100 - each * ids.length;
  return out;
}

/** Same proportional-absorption trick as the budget sliders. */
export function rebalanceShares(
  shares: Record<Id, number>,
  id: Id,
  value: number,
): Record<Id, number> {
  const ids = Object.keys(shares);
  const others = ids.filter((x) => x !== id);
  if (others.length === 0) return { [id]: 100 };

  const next = clamp(Math.round(value), 0, 100);
  const remaining = 100 - next;
  const othersTotal = others.reduce((sum, k) => sum + shares[k], 0);

  const out: Record<Id, number> = { ...shares, [id]: next };
  if (othersTotal <= 0) {
    const each = Math.floor(remaining / others.length);
    others.forEach((k) => {
      out[k] = each;
    });
  } else {
    others.forEach((k) => {
      out[k] = Math.round((shares[k] / othersTotal) * remaining);
    });
  }

  const drift = 100 - others.reduce((s, k) => s + out[k], out[id]);
  if (drift !== 0) {
    const target = others.reduce((a, b) => (out[a] >= out[b] ? a : b));
    out[target] = clamp(out[target] + drift, 0, 100);
  }
  return out;
}

export interface PartSkew {
  /** Id of the member holding the largest share. */
  topId: Id | null;
  topShare: number;
  /** True once one member is visibly hogging the title track. */
  skewed: boolean;
  /** Members left with no lines at all. */
  silentCount: number;
}

/**
 * Read the distribution for the warning. A skew is not forbidden — it buys the
 * top member 개인 팬 at the cost of 팀워크 and a 파트 분배 논란 risk.
 */
export function partSkew(shares: Record<Id, number>): PartSkew {
  const ids = Object.keys(shares);
  if (ids.length === 0) return { topId: null, topShare: 0, skewed: false, silentCount: 0 };

  const topId = ids.reduce((a, b) => (shares[a] >= shares[b] ? a : b));
  const topShare = shares[topId];
  const silentCount = ids.filter((id) => shares[id] <= 0).length;

  return {
    topId,
    topShare,
    skewed: topShare >= ALBUM_TUNING.skewShareThreshold || silentCount > 0,
    silentCount,
  };
}

// ---------------------------------------------------------------------------
// Team chemistry
// ---------------------------------------------------------------------------

export interface TeamChemistry {
  teamwork: number;
  conflictIndex: number;
  scandalRisk: number;
}

/**
 * Roll the relationship matrix up into the three team-level numbers.
 *
 * 팀워크 tracks average affinity; 갈등 지수 is the share of pairs sitting in
 * negative territory; 스캔들 리스크 combines romance with a fraying team, which
 * is where a real label actually gets burned.
 */
export function teamChemistry(relationships: readonly Relationship[]): TeamChemistry {
  if (relationships.length === 0) {
    return { teamwork: RELATION_TUNING.teamworkBase, conflictIndex: 0, scandalRisk: 0 };
  }

  let affinitySum = 0;
  let negative = 0;
  let dating = 0;
  let crush = 0;

  for (const r of relationships) {
    affinitySum += r.affinity;
    if (r.affinity < 0) negative += 1;
    if (r.type === 'dating') dating += 1;
    if (r.type === 'crush') crush += 1;
  }

  const avgAffinity = affinitySum / relationships.length;
  const teamwork = clampScore(
    RELATION_TUNING.teamworkBase + avgAffinity * RELATION_TUNING.teamworkFromAffinity,
  );
  const conflictIndex = clampScore((negative / relationships.length) * 100);
  const scandalRisk = clampScore(
    dating * RELATION_TUNING.riskPerDating +
      crush * RELATION_TUNING.riskPerCrush +
      (100 - teamwork) * RELATION_TUNING.riskFromLowTeamwork,
  );

  return { teamwork, conflictIndex, scandalRisk };
}

// ---------------------------------------------------------------------------
// Grading
// ---------------------------------------------------------------------------

/** Map a 0-100 comeback score onto a letter grade. */
export function scoreToGrade(score: number): Grade {
  for (const tier of GRADE_THRESHOLDS) {
    if (score >= tier.min) return tier.grade;
  }
  return 'F';
}

// ---------------------------------------------------------------------------
// Agency tier
// ---------------------------------------------------------------------------

/**
 * Size tier derived from 회사 인지도. Tier is never stored as the source of
 * truth — `Company.tier` is a cached read of this, refreshed when awareness
 * changes.
 */
export function agencyTier(awareness: number): AgencyTierId {
  let current: AgencyTierId = AGENCY_TIERS[0].id;
  for (const tier of AGENCY_TIERS) {
    if (awareness >= tier.minAwareness) current = tier.id;
  }
  return current;
}

/** The tier record, for its Korean label and English name. */
export function agencyTierInfo(id: AgencyTierId) {
  return AGENCY_TIERS.find((t) => t.id === id) ?? AGENCY_TIERS[0];
}

/** Zero-based ladder position, for rendering the 5-step tier meter. */
export function agencyTierIndex(id: AgencyTierId): number {
  const i = AGENCY_TIERS.findIndex((t) => t.id === id);
  return i < 0 ? 0 : i;
}

// ---------------------------------------------------------------------------
// In-world identifiers
// ---------------------------------------------------------------------------

/**
 * Business registration number for the license preview, in the Korean
 * ###-##-##### format. Derived from the save seed rather than drawn from the
 * RNG stream, so the preview can render before the game starts and still match
 * the number stored on the finished company.
 */
export function businessNumber(seed: number): string {
  const s = seed >>> 0;
  const a = String(100 + (s % 899)).padStart(3, '0');
  const b = String(10 + ((s >>> 9) % 89)).padStart(2, '0');
  const c = String((s >>> 16) % 100000).padStart(5, '0');
  return `${a}-${b}-${c}`;
}
