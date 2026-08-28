/**
 * Balance simulation.
 *
 * Runs 200 seeded playthroughs of a first comeback end to end — found the
 * agency, recruit, debut, name the fandom, produce, play four weeks, settle —
 * and reports the grade and 초동 distributions.
 *
 * This is only possible because every rule lives in `src/game/` as a pure
 * function: the simulation drives the same code the UI does, with no DOM.
 *
 *   npm run test:balance
 */

import { describe, expect, it } from 'vitest';

import {
  ACTIVITY_ORDER,
  ALBUM_TYPES,
  COMEBACK,
  ECONOMY,
  GROUP_CONCEPTS,
  RECRUIT,
} from '../constants';
import {
  albumConceptFit,
  averageTeamStats,
  defaultAllocation,
  evenShares,
  recruitCost,
} from '../formulas';
import {
  createAlbum,
  createCompany,
  createMember,
  foundFandom,
  generateRelationships,
  generateTrainee,
} from '../generators';
import { createRng, randInt, randPick, randSample, type Rng } from '../rng';
import { settleComeback } from '../settle';
import { resolveWeek, type WorldSlice } from '../week';
import { operatingCosts } from '../hub';
import type {
  ActivityType,
  AlbumType,
  Concept,
  Grade,
  Group,
  Id,
  Position,
  ScheduleSlot,
} from '../types';

const RUNS = 200;

/**
 * Schedules an average player would actually build: promotion-led, one rest
 * when the group is visibly tired, no attempt at an optimal loop. Weighted so
 * the common bookings dominate.
 */
const AVERAGE_POOL: ActivityType[] = [
  'music_show',
  'music_show',
  'fan_signing',
  'fan_signing',
  'pre_record',
  'variety',
  'radio',
  'self_content',
  'shortform',
  'photoshoot',
  'rest',
];

const POSITIONS: readonly Position[] = [
  'leader',
  'main_vocal',
  'main_dancer',
  'rapper',
  'visual',
  'center',
  'lead_vocal',
  'maknae',
  'sub_vocal',
];

interface RunResult {
  grade: Grade;
  score: number;
  firstWeekSales: number;
  chartPeak: number;
  profit: number;
  wonAfter: number;
  /** Won left after the hub charges the next cycle's operating costs. */
  wonAfterRent: number;
  memberCount: number;
  albumType: AlbumType;
}

/** Build a week of five slots the average player might book. */
function buildWeek(rng: Rng, awareness: number, memberIds: readonly Id[]): ScheduleSlot[] {
  const slots: ScheduleSlot[] = [];
  const used = new Map<ActivityType, number>();

  for (let i = 0; i < COMEBACK.slotsPerWeek; i += 1) {
    let activity: ActivityType = 'radio';

    // A handful of attempts to find something the rules allow in this slot.
    for (let attempt = 0; attempt < 12; attempt += 1) {
      const candidate = randPick(rng, AVERAGE_POOL);
      const count = used.get(candidate) ?? 0;
      const config = ACTIVITY_ORDER.includes(candidate) ? candidate : 'radio';

      const smallLabelCapped =
        config === 'music_show' && awareness < 30 && count >= 1;
      const cfBlocked = config === 'cf_shoot' && awareness < 20;

      if (!smallLabelCapped && !cfBlocked) {
        activity = config;
        break;
      }
    }

    used.set(activity, (used.get(activity) ?? 0) + 1);
    slots.push({
      index: i,
      activity,
      memberId: activity === 'solo_schedule' ? randPick(rng, memberIds) : undefined,
    });
  }

  return slots;
}

/** One complete first comeback, driven entirely through the pure game logic. */
function simulate(seed: number): RunResult {
  const rng = createRng({ seed, cursor: 0 });

  // ---- found ----
  let company = createCompany(rng, {
    name: '스타라인',
    ceoName: '김대표',
    slogan: '',
    ciColor: '#FF1F3D',
    district: randPick(rng, ['gangnam', 'hongdae', 'seongsu', 'yeouido', 'pangyo'] as const),
  });

  // ---- recruit ----
  const memberCount = randInt(rng, 4, 7);
  const traineeCount = memberCount + randInt(rng, 1, 4);
  const trainees = [];
  for (let i = 0; i < traineeCount; i += 1) {
    const cost = recruitCost(i);
    company = { ...company, won: company.won - cost };
    trainees.push(
      generateTrainee(rng, {
        name: `연습생${i + 1}`,
        gender: randPick(rng, ['female', 'male'] as const),
        joinedWeek: 1,
        recruitCost: cost,
      }),
    );
  }

  // ---- debut ----
  const picked = randSample(rng, trainees, memberCount);
  const members = picked.map((t, i) => createMember(rng, t, POSITIONS[i] ?? 'sub_vocal'));
  const relationships = generateRelationships(rng, members);

  const concept = randPick(rng, Object.keys(GROUP_CONCEPTS) as Concept[]);
  const teamStatsAtDebut = averageTeamStats(members);

  let group: Group = {
    id: 'gr_sim',
    name: '아이리스',
    concept,
    goal: 'music_show_win',
    memberIds: members.map((m) => m.id),
    members,
    relationships,
    debutWeek: 1,
    teamwork: 50,
    conflictIndex: 0,
    scandalRisk: 0,
    conceptFit: 0,
    overall: Math.round(
      Object.values(teamStatsAtDebut).reduce((a, b) => a + b, 0) / 6,
    ),
    colorHex: company.ciColor,
  };

  // ---- fandom ----
  const founded = foundFandom(rng, { name: '별빛', color: '#7FD4FF', lightstickName: '', slogan: '' }, members, 1);
  let fandom = founded.fandom;
  group = { ...group, members: founded.members };

  // ---- produce ----
  const affordable = (Object.keys(ALBUM_TYPES) as AlbumType[]).filter(
    (t) => ALBUM_TYPES[t].cost <= company.won,
  );
  const albumType: AlbumType = affordable.length > 0 ? randPick(rng, affordable) : 'single';

  // Average players nudge the default split rather than optimising it.
  const allocation = defaultAllocation();
  const nudge = randInt(rng, -10, 10);
  allocation.producing = Math.max(5, Math.min(60, allocation.producing + nudge));
  allocation.mv = Math.max(5, 100 - allocation.producing - allocation.choreography -
    allocation.styling - allocation.marketing);

  const teamStats = averageTeamStats(group.members);
  const albumConcept = randPick(rng, [
    'summer', 'noir', 'citypop', 'highteen_romance',
    'hard_hiphop', 'dreampop', 'band_rock', 'festival_edm',
  ] as const);

  const album = createAlbum(rng, {
    draft: {
      title: 'FIRST LIGHT',
      concept: albumConcept,
      type: albumType,
      allocation,
      titleTrack: { title: '새벽 세 시', genre: 'dance_pop', bpm: 120, moods: [] },
      bSides: [],
      centerMemberId: group.members[0].id,
      killingPartMemberId: group.members[Math.min(1, group.members.length - 1)].id,
      partShares: evenShares(group.memberIds),
    },
    group,
    teamStats,
    conceptFitPct: albumConceptFit(teamStats, albumConcept),
    week: 1,
    cycle: 1,
  });

  company = { ...company, won: company.won - album.budget };

  // ---- four weeks ----
  const fandomBefore = fandom.size;
  const awarenessBefore = company.awareness;
  let world: WorldSlice = { company, group, fandom, buzz: 0, sales: 0, streams: 0 };
  let benched: Id[] = [];
  const logs = [];

  for (let promoWeek = 1; promoWeek <= COMEBACK.weeks; promoWeek += 1) {
    const slots = buildWeek(rng, world.company.awareness, world.group.memberIds);
    const outcome = resolveWeek(rng, {
      world,
      slots,
      benchedIds: benched,
      killingPartId: album.killingPartMemberId,
      centerId: album.centerMemberId,
      week: promoWeek,
      promoWeek,
      eventEntries: [],
      eventIds: [],
    });
    world = outcome.world;
    benched = outcome.benchedIds;
    logs.push(outcome.log);
  }

  // ---- settle ----
  const finalTeamStats = averageTeamStats(world.group.members);
  const result = settleComeback(rng, {
    company: world.company,
    group: world.group,
    fandom: world.fandom,
    album,
    logs,
    teamStats: finalTeamStats,
    conceptFitPct: albumConceptFit(finalTeamStats, album.concept),
    buzz: world.buzz,
    salesPressure: world.sales,
    streams: world.streams,
    musicShowWins: 0,
    fandomBefore,
    awarenessBefore,
    cycle: 1,
  });

  const wonAfter = world.company.won + result.profit;
  const rent = operatingCosts(
    world.company,
    trainees.length - memberCount,
    world.group.members.length,
  ).total;

  return {
    grade: result.grade,
    score: result.score,
    firstWeekSales: result.firstWeekSales,
    chartPeak: result.chartPeak,
    profit: result.profit,
    wonAfter,
    wonAfterRent: wonAfter - rent,
    memberCount,
    albumType,
  };
}

/** Percentile from a sorted array. */
function percentile(sorted: readonly number[], p: number): number {
  if (sorted.length === 0) return 0;
  const i = Math.min(sorted.length - 1, Math.max(0, Math.round((sorted.length - 1) * p)));
  return sorted[i];
}

describe('balance', () => {
  it('produces the intended grade distribution over 200 playthroughs', () => {
    const runs: RunResult[] = [];
    for (let i = 0; i < RUNS; i += 1) {
      runs.push(simulate(0x51b1 + i * 7919));
    }

    const grades: Grade[] = ['F', 'D', 'C', 'B', 'A', 'S', 'SS'];
    const counts = new Map<Grade, number>(grades.map((g) => [g, 0]));
    for (const r of runs) counts.set(r.grade, (counts.get(r.grade) ?? 0) + 1);

    const sales = runs.map((r) => r.firstWeekSales).sort((a, b) => a - b);
    const scores = runs.map((r) => r.score).sort((a, b) => a - b);
    const profits = runs.map((r) => r.profit).sort((a, b) => a - b);
    const charted = runs.filter((r) => r.chartPeak > 0).length;
    const solvent = runs.filter((r) => r.wonAfter >= 0).length;
    const survives = runs.filter((r) => r.wonAfterRent >= 0).length;

    const pct = (n: number) => `${((n / RUNS) * 100).toFixed(1)}%`;

    console.log('\n=== BALANCE — 200 simulated first comebacks ===\n');
    console.log('종합 등급 분포');
    for (const g of grades) {
      const n = counts.get(g) ?? 0;
      const bar = '█'.repeat(Math.round((n / RUNS) * 60));
      console.log(`  ${g.padEnd(2)} ${String(n).padStart(3)}  ${pct(n).padStart(6)}  ${bar}`);
    }

    console.log('\n초동 (장)');
    console.log(`  최저   ${sales[0].toLocaleString('ko-KR')}`);
    console.log(`  25%    ${percentile(sales, 0.25).toLocaleString('ko-KR')}`);
    console.log(`  중앙값 ${percentile(sales, 0.5).toLocaleString('ko-KR')}`);
    console.log(`  75%    ${percentile(sales, 0.75).toLocaleString('ko-KR')}`);
    console.log(`  최고   ${sales[sales.length - 1].toLocaleString('ko-KR')}`);

    console.log('\n종합 점수');
    console.log(`  중앙값 ${percentile(scores, 0.5)}  (25% ${percentile(scores, 0.25)} · 75% ${percentile(scores, 0.75)})`);

    console.log('\n순이익 (원)');
    console.log(`  25%    ${percentile(profits, 0.25).toLocaleString('ko-KR')}`);
    console.log(`  중앙값 ${percentile(profits, 0.5).toLocaleString('ko-KR')}`);
    console.log(`  75%    ${percentile(profits, 0.75).toLocaleString('ko-KR')}`);

    console.log(`\n차트인 성공  ${charted}/${RUNS}  ${pct(charted)}`);
    console.log(`데뷔 후 흑자 ${solvent}/${RUNS}  ${pct(solvent)}`);
    console.log(`다음 사이클 운영비까지 감당 ${survives}/${RUNS}  ${pct(survives)}`);
    console.log(`시작 자금    ${ECONOMY.startingWon.toLocaleString('ko-KR')}원`);
    console.log(`모집 무료    ${RECRUIT.freeSlots}명\n`);

    // ---- the distribution contract ----
    const share = (g: Grade) => (counts.get(g) ?? 0) / RUNS;

    // Target: F 10 / D 20 / C 30 / B 25 / A 12 / S 3, with generous tolerance —
    // this is a shape check, not a fingerprint.
    expect(share('F')).toBeGreaterThanOrEqual(0.02);
    expect(share('F')).toBeLessThanOrEqual(0.22);
    expect(share('D')).toBeGreaterThanOrEqual(0.08);
    expect(share('D')).toBeLessThanOrEqual(0.34);
    expect(share('C')).toBeGreaterThanOrEqual(0.16);
    expect(share('C')).toBeLessThanOrEqual(0.44);
    expect(share('B')).toBeGreaterThanOrEqual(0.12);
    expect(share('B')).toBeLessThanOrEqual(0.4);
    expect(share('A') + share('S') + share('SS')).toBeGreaterThanOrEqual(0.03);
    expect(share('A') + share('S') + share('SS')).toBeLessThanOrEqual(0.3);

    // The middle of the distribution must actually be the middle grades.
    expect(share('C') + share('B')).toBeGreaterThan(0.35);

    // A first comeback on ₩5,000,000 should be winnable but tight. The honest
    // measure is not "did the album turn a profit" but "can the agency pay
    // next cycle's rent" — most runs clear it, a real minority do not.
    expect(survives / RUNS).toBeGreaterThan(0.45);
    expect(survives / RUNS).toBeLessThan(0.92);
  });

  it('rewards a well-played run over a badly-played one', () => {
    // Same seeds, opposite schedules — the only variable is what was booked.
    const seeds = Array.from({ length: 40 }, (_, i) => 0x5eed + i * 104729);

    const play = (seed: number, pool: readonly ActivityType[]) => {
      // The simulator reads the module-level pool; swap it for this run.
      const original = AVERAGE_POOL.slice();
      AVERAGE_POOL.length = 0;
      AVERAGE_POOL.push(...pool);
      const r = simulate(seed);
      AVERAGE_POOL.length = 0;
      AVERAGE_POOL.push(...original);
      return r;
    };

    const good = seeds.map((s) =>
      play(s, ['music_show', 'fan_signing', 'shortform', 'pre_record', 'self_content']),
    );
    const bad = seeds.map((s) => play(s, ['rest', 'rest', 'rest', 'radio', 'self_content']));

    const avg = (xs: RunResult[], pick: (r: RunResult) => number) =>
      xs.reduce((n, r) => n + pick(r), 0) / xs.length;

    const goodScore = avg(good, (r) => r.score);
    const badScore = avg(bad, (r) => r.score);
    const goodSales = avg(good, (r) => r.firstWeekSales);
    const badSales = avg(bad, (r) => r.firstWeekSales);

    console.log('\n=== PLAY QUALITY ===');
    console.log(`  잘 굴린 판  점수 ${goodScore.toFixed(1)}  초동 ${Math.round(goodSales).toLocaleString('ko-KR')}`);
    console.log(`  못 굴린 판  점수 ${badScore.toFixed(1)}  초동 ${Math.round(badSales).toLocaleString('ko-KR')}\n`);

    expect(goodScore).toBeGreaterThan(badScore + 10);
    expect(goodSales).toBeGreaterThan(badSales * 1.3);
  });
});
