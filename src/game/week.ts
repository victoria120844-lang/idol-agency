/**
 * Weekly resolution for the comeback phase.
 *
 * `resolveWeek` is the whole pipeline: schedule effects → fatigue and benching
 * → relationship progression → recap. It is pure — it takes a snapshot and
 * returns the next one plus a WeekLog, and the store is what commits it.
 *
 * Random events are drawn separately (`rollWeeklyEvents` in events.ts) and
 * applied through `applyEventEffect`, because the player has to answer them
 * before the week can close.
 */

import {
  ACTIVITIES,
  ACTIVITY_SYNERGY,
  COMEBACK,
  FANDOM,
  RELATION_TYPES,
} from './constants';
import { clampScore, agencyTier, josa, teamChemistry } from './formulas';
import { randChance, randInt, randPick, type Rng } from './rng';
import type {
  Company,
  EventEffect,
  Fandom,
  Group,
  Id,
  Member,
  Relationship,
  RelationshipEvent,
  ScheduleSlot,
  WeekLog,
  WeekLogEntry,
} from './types';

// ---------------------------------------------------------------------------
// Fatigue
// ---------------------------------------------------------------------------

/** A member too tired to give a full performance. */
export function isStrained(member: Member): boolean {
  return member.fatigue >= COMEBACK.fatigueStrainThreshold;
}

/** A member whose fatigue has crossed into injury territory. */
export function isInjured(member: Member): boolean {
  return member.fatigue >= COMEBACK.fatigueInjuryThreshold;
}

/**
 * How much of the week's effects the lineup actually delivers, 0-1.
 *
 * Benched members contribute nothing and strained members contribute a
 * fraction, so fatigue shows up directly in the results math rather than as a
 * cosmetic warning.
 */
export function lineupEffectiveness(
  members: readonly Member[],
  benchedIds: readonly Id[],
): number {
  if (members.length === 0) return 0;
  const bench = new Set(benchedIds);
  let total = 0;
  for (const m of members) {
    if (bench.has(m.id)) continue;
    total += isStrained(m) ? COMEBACK.strainedEffectMul : 1;
  }
  return total / members.length;
}

/** Condition damage, amplified for members with low 멘탈. */
export function mentalDamage(base: number, mental: number): number {
  // A 20-멘탈 member takes roughly double what an 80-멘탈 member does.
  return Math.round(base * (1.6 - (mental / 100) * 0.9));
}

// ---------------------------------------------------------------------------
// Schedule validation
// ---------------------------------------------------------------------------

export type SlotBlock =
  | { kind: 'ok' }
  | { kind: 'awareness'; required: number }
  | { kind: 'small_label'; max: number }
  | { kind: 'max_per_week'; max: number }
  | { kind: 'needs_member' };

/**
 * Why this activity cannot go in this slot, given what is already booked.
 * The UI shows the Korean reason; the resolver trusts the board is valid.
 */
export function slotBlock(
  activity: keyof typeof ACTIVITIES,
  slots: readonly ScheduleSlot[],
  slotIndex: number,
  awareness: number,
): SlotBlock {
  const config = ACTIVITIES[activity];

  if (config.requiresAwareness !== undefined && awareness < config.requiresAwareness) {
    return { kind: 'awareness', required: config.requiresAwareness };
  }

  const booked = slots.filter((s, i) => i !== slotIndex && s.activity === activity).length;

  if (
    config.smallLabelAwareness !== undefined &&
    config.smallLabelMax !== undefined &&
    awareness < config.smallLabelAwareness &&
    booked >= config.smallLabelMax
  ) {
    return { kind: 'small_label', max: config.smallLabelMax };
  }

  if (config.maxPerWeek !== undefined && booked >= config.maxPerWeek) {
    return { kind: 'max_per_week', max: config.maxPerWeek };
  }

  return { kind: 'ok' };
}

// ---------------------------------------------------------------------------
// Schedule effects
// ---------------------------------------------------------------------------

export interface WeekTotals {
  cost: number;
  fatigue: number;
  buzz: number;
  awareness: number;
  exposure: number;
  loyalty: number;
  sales: number;
  streams: number;
  teamwork: number;
  sentiment: number;
  /** 개인 팬 owed to specific members by name of the activity that earned it. */
  memberFans: Record<Id, number>;
}

function emptyTotals(): WeekTotals {
  return {
    cost: 0,
    fatigue: 0,
    buzz: 0,
    awareness: 0,
    exposure: 0,
    loyalty: 0,
    sales: 0,
    streams: 0,
    teamwork: 0,
    sentiment: 0,
    memberFans: {},
  };
}

/**
 * Sum the week's five slots into raw totals, applying the synergies that only
 * hold for a particular lineup — 예능감 members on a variety booking, the
 * killing-part member on a short-form challenge, and so on.
 */
export function scheduleTotals(
  slots: readonly ScheduleSlot[],
  group: Group,
  killingPartId: Id | null,
  effectiveness: number,
): WeekTotals {
  const totals = emptyTotals();
  const funnyCount = group.members.filter((m) => m.personality.includes('funny')).length;
  const visual = group.members.find((m) => m.position === 'visual');
  const killing = group.members.find((m) => m.id === killingPartId);

  for (const slot of slots) {
    if (!slot.activity) continue;
    const config = ACTIVITIES[slot.activity];

    totals.cost += config.cost;
    totals.fatigue += config.fatigue;
    totals.teamwork += config.teamwork;
    totals.loyalty += config.loyalty;
    totals.sentiment += config.sentiment;

    // Output-side numbers are what fatigue and benching bite into.
    totals.buzz += config.buzz * effectiveness;
    totals.awareness += config.awareness * effectiveness;
    totals.exposure += config.exposure * effectiveness;
    totals.sales += config.sales * effectiveness;
    totals.streams += config.streams * effectiveness;

    if (slot.activity === 'variety') {
      totals.buzz += funnyCount * ACTIVITY_SYNERGY.varietyPerFunnyMember * effectiveness;
    }

    if (slot.activity === 'shortform' && killing) {
      const power = (killing.stats.vocal + killing.stats.rap) / 2;
      const bonus = power * ACTIVITY_SYNERGY.shortformKillingWeight * effectiveness;
      totals.streams += bonus;
      totals.buzz += bonus * 0.6;
    }

    if (slot.activity === 'photoshoot' && visual) {
      totals.memberFans[visual.id] =
        (totals.memberFans[visual.id] ?? 0) + ACTIVITY_SYNERGY.photoshootVisualFans;
    }

    if (slot.activity === 'solo_schedule' && slot.memberId) {
      totals.memberFans[slot.memberId] =
        (totals.memberFans[slot.memberId] ?? 0) + ACTIVITY_SYNERGY.soloFans;
    }
  }

  return totals;
}

// ---------------------------------------------------------------------------
// Event effects
// ---------------------------------------------------------------------------

export interface WorldSlice {
  company: Company;
  group: Group;
  fandom: Fandom;
  buzz: number;
  sales: number;
  streams: number;
}

/**
 * Apply one event effect to the world. Every field is a delta, so effects
 * compose — several events in a week just run through this in order.
 */
export function applyEventEffect(
  world: WorldSlice,
  effect: EventEffect,
  target: { memberId?: Id; pair?: [Id, Id] },
  week: number,
  resultText: string,
): WorldSlice {
  const company = { ...world.company };
  const fandom = { ...world.fandom };
  let group = { ...world.group };

  if (effect.won) company.won += effect.won;
  if (effect.awareness) {
    company.awareness = clampScore(company.awareness + effect.awareness);
    company.tier = agencyTier(company.awareness);
  }
  if (effect.trust) company.trust = clampScore(company.trust + effect.trust);

  if (effect.fanSize) fandom.size = Math.max(0, fandom.size + effect.fanSize);
  if (effect.fanLoyalty) fandom.loyalty = clampScore(fandom.loyalty + effect.fanLoyalty);
  if (effect.sentiment) {
    fandom.sentiment = Math.max(-100, Math.min(100, fandom.sentiment + effect.sentiment));
  }

  if (effect.teamwork) group.teamwork = clampScore(group.teamwork + effect.teamwork);
  if (effect.conflict) group.conflictIndex = clampScore(group.conflictIndex + effect.conflict);
  if (effect.scandalRisk) group.scandalRisk = clampScore(group.scandalRisk + effect.scandalRisk);

  // Member-level effects.
  if (effect.fatigue || effect.memberFatigue || effect.mentalHit || effect.memberFans) {
    group = {
      ...group,
      members: group.members.map((m) => {
        let fatigue = m.fatigue;
        let condition = m.condition;
        let personalFans = m.personalFans;

        if (effect.fatigue) fatigue += effect.fatigue;
        if (m.id === target.memberId) {
          if (effect.memberFatigue) fatigue += effect.memberFatigue;
          if (effect.memberFans) personalFans += effect.memberFans;
          if (effect.mentalHit) {
            condition -= mentalDamage(effect.mentalHit, m.stats.mental);
          }
        }

        return {
          ...m,
          fatigue: clampScore(fatigue),
          condition: clampScore(condition),
          personalFans: Math.max(0, personalFans),
        };
      }),
    };
  }

  // Pair-level effects append to the story log, never overwrite it.
  if (effect.pairAffinity && target.pair) {
    const [a, b] = target.pair;
    group = {
      ...group,
      relationships: group.relationships.map((r) =>
        (r.a === a && r.b === b) || (r.a === b && r.b === a)
          ? appendRelationshipEvent(r, week, resultText, effect.pairAffinity ?? 0)
          : r,
      ),
    };
  }

  return {
    company,
    group,
    fandom,
    buzz: world.buzz + (effect.buzz ?? 0),
    sales: Math.max(0, world.sales + (effect.sales ?? 0)),
    streams: Math.max(0, world.streams + (effect.streams ?? 0)),
  };
}

// ---------------------------------------------------------------------------
// Relationship progression
// ---------------------------------------------------------------------------

/** Append one entry to a pair's log and move its 호감도. */
export function appendRelationshipEvent(
  rel: Relationship,
  week: number,
  text: string,
  affinityDelta: number,
  becameType?: Relationship['type'],
): Relationship {
  const entry: RelationshipEvent = {
    id: `rl_${week}_${rel.a}_${rel.b}_${rel.log.length}`,
    week,
    text,
    affinityDelta,
    becameType,
  };
  return {
    ...rel,
    affinity: Math.max(-100, Math.min(100, rel.affinity + affinityDelta)),
    type: becameType ?? rel.type,
    log: [...rel.log, entry],
  };
}

/**
 * Move the relationship matrix on by one week.
 *
 * Guarantees at least one log entry per week, so the story always accumulates
 * — that is the whole point of the system. What happened on the schedule
 * decides which pair gets the entry and which direction it moves.
 */
export function progressRelationships(
  rng: Rng,
  group: Group,
  slots: readonly ScheduleSlot[],
  week: number,
): { relationships: Relationship[]; entries: WeekLogEntry[] } {
  const entries: WeekLogEntry[] = [];
  let relationships = [...group.relationships];
  if (relationships.length === 0) return { relationships, entries };

  const nameOf = (id: Id) => group.members.find((m) => m.id === id)?.name ?? '멤버';
  const restCount = slots.filter((s) => s.activity === 'rest').length;
  const bondingCount = slots.filter(
    (s) => s.activity === 'self_content' || s.activity === 'rest',
  ).length;
  const soloIds = slots
    .filter((s) => s.activity === 'solo_schedule' && s.memberId)
    .map((s) => s.memberId as Id);

  const replace = (updated: Relationship) => {
    relationships = relationships.map((r) =>
      r.a === updated.a && r.b === updated.b ? updated : r,
    );
  };

  // 1. Time spent together pulls a random pair closer.
  if (bondingCount > 0) {
    const target = randPick(rng, relationships);
    const delta = randInt(rng, 4, 9) * bondingCount;
    const text =
      restCount > 0
        ? `쉬는 날 ${nameOf(target.a)}와 ${nameOf(target.b)}가 오래 이야기했다.`
        : `자체 콘텐츠를 찍으며 ${nameOf(target.a)}와 ${nameOf(target.b)}가 부쩍 편해졌다.`;
    replace(appendRelationshipEvent(target, week, text, delta));
    entries.push({ id: `rel-bond-${week}`, text, tone: 'good' });
  }

  // 2. A solo schedule stings the members left behind.
  for (const soloId of soloIds) {
    const affected = relationships.filter((r) => r.a === soloId || r.b === soloId);
    if (affected.length === 0) continue;
    const target = randPick(rng, affected);
    const other = target.a === soloId ? target.b : target.a;
    const delta = -randInt(rng, 3, 8);
    const text = `${josa(nameOf(soloId), '이가')} 개인 스케줄로 빠진 사이 ${nameOf(other)}의 서운함이 쌓였다.`;
    replace(appendRelationshipEvent(target, week, text, delta));
    entries.push({ id: `rel-solo-${week}-${soloId}`, text, tone: 'bad' });
  }

  // 3. A 썸 pair that has run hot long enough can become 연애.
  const crushes = relationships.filter(
    (r) => r.type === 'crush' && r.affinity >= COMEBACK.romanceAffinityGate,
  );
  if (crushes.length > 0 && randChance(rng, COMEBACK.romanceChance)) {
    const target = randPick(rng, crushes);
    const text = `${nameOf(target.a)}와 ${nameOf(target.b)}가 조용히 만나기 시작했다. 팀에는 아직 아무도 모른다.`;
    replace(appendRelationshipEvent(target, week, text, 4, 'dating'));
    entries.push({ id: `rel-romance-${week}`, text, tone: 'critical' });
  }

  // 4. An unresolved 갈등 keeps sliding.
  const spiralling = relationships.filter(
    (r) => r.type === 'conflict' && r.affinity <= COMEBACK.conflictSpiralBelow,
  );
  if (spiralling.length > 0) {
    const target = randPick(rng, spiralling);
    const text = `${nameOf(target.a)}와 ${nameOf(target.b)}는 이번 주에도 서로를 피했다.`;
    replace(appendRelationshipEvent(target, week, text, -randInt(rng, 2, 6)));
    entries.push({ id: `rel-spiral-${week}`, text, tone: 'bad' });
  }

  // 5. Guarantee: a week always writes at least one line into the story.
  if (entries.length === 0) {
    const target = randPick(rng, relationships);
    const meta = RELATION_TYPES[target.type];
    const delta = randInt(rng, -3, 4);
    const text = `${nameOf(target.a)}와 ${nameOf(target.b)}는 ${meta.label} 관계를 유지한 채 한 주를 보냈다.`;
    replace(appendRelationshipEvent(target, week, text, delta));
    entries.push({ id: `rel-idle-${week}`, text, tone: 'neutral' });
  }

  return { relationships, entries };
}

// ---------------------------------------------------------------------------
// The week
// ---------------------------------------------------------------------------

export interface ResolveWeekInput {
  world: WorldSlice;
  slots: readonly ScheduleSlot[];
  /** Members benched coming into this week; they sit out and recover. */
  benchedIds: readonly Id[];
  killingPartId: Id | null;
  centerId: Id | null;
  week: number;
  promoWeek: number;
  /** Korean lines the answered events already contributed. */
  eventEntries: WeekLogEntry[];
  eventIds: string[];
}

export interface ResolveWeekOutput {
  world: WorldSlice;
  log: WeekLog;
  /** Members benched for the week that follows. */
  benchedIds: Id[];
}

/**
 * Close one promotion week.
 *
 * Order matters: effectiveness is read from the fatigue the members carried
 * *into* the week, then the week's own fatigue is applied, then benching is
 * decided for the next one. That way a week the player over-booked hurts the
 * week after, which is the pressure the whole phase runs on.
 */
export function resolveWeek(rng: Rng, input: ResolveWeekInput): ResolveWeekOutput {
  const { world, slots, benchedIds, killingPartId, centerId, week, promoWeek } = input;
  const bench = new Set(benchedIds);

  const effectiveness = lineupEffectiveness(world.group.members, benchedIds);
  const totals = scheduleTotals(slots, world.group, killingPartId, effectiveness);

  // ---- money and headline metrics ----
  const company = { ...world.company };
  company.won -= totals.cost;
  company.awareness = clampScore(
    company.awareness + Math.round(totals.awareness * COMEBACK.awarenessScale),
  );
  company.tier = agencyTier(company.awareness);

  const fandom = { ...world.fandom };
  const fanGain = Math.round(
    totals.exposure * COMEBACK.fansPerExposure * (1 + world.group.overall / 100),
  );
  fandom.size = Math.max(0, fandom.size + fanGain);
  fandom.weeklyGrowth = fanGain;
  fandom.loyalty = clampScore(fandom.loyalty + totals.loyalty);
  fandom.sentiment = Math.max(
    -100,
    Math.min(100, fandom.sentiment + Math.round(totals.sentiment)),
  );
  // Non-core fans drift away every week regardless.
  fandom.size = Math.round(fandom.size * (1 - FANDOM.churnRate * (1 - fandom.coreRatio / 100)));

  const salesGain = Math.round(totals.sales * COMEBACK.salesPerPoint * (fandom.loyalty / 60));
  const streamGain = Math.round(totals.streams * COMEBACK.streamsPerPoint);
  const buzzGain = Math.round(totals.buzz);

  // ---- fatigue, benching, personal fans ----
  const nextBench: Id[] = [];
  let group = { ...world.group };

  group = {
    ...group,
    teamwork: clampScore(group.teamwork + totals.teamwork),
    members: group.members.map((m) => {
      const sittingOut = bench.has(m.id);
      const weekFatigue =
        totals.fatigue * COMEBACK.weeklyFatigueScale - COMEBACK.weeklyRecovery;
      const fatigue = clampScore(
        sittingOut ? m.fatigue - COMEBACK.benchRecovery : m.fatigue + weekFatigue,
      );

      // The centre takes a slice of the week's fan gain on top of anything the
      // schedule owed this member directly.
      const centerShare =
        m.id === centerId
          ? Math.round((fanGain * ACTIVITY_SYNERGY.centerFanShare) / 1)
          : 0;
      const direct = totals.memberFans[m.id] ?? 0;
      const evenShare = Math.round(
        (fanGain * (1 - (centerId ? ACTIVITY_SYNERGY.centerFanShare : 0))) /
          group.members.length,
      );

      const next = {
        ...m,
        fatigue,
        condition: clampScore(100 - fatigue),
        personalFans: Math.max(0, m.personalFans + centerShare + direct + evenShare),
      };

      if (!sittingOut && isInjured(next)) nextBench.push(m.id);
      return next;
    }),
  };

  // ---- relationships ----
  const progression = progressRelationships(rng, group, slots, week);
  group = { ...group, relationships: progression.relationships };

  const chemistry = teamChemistry(group.relationships);
  group = {
    ...group,
    conflictIndex: chemistry.conflictIndex,
    scandalRisk: chemistry.scandalRisk,
  };

  // ---- log ----
  const entries: WeekLogEntry[] = [...input.eventEntries, ...progression.entries];

  const benchedNames = benchedIds
    .map((id) => world.group.members.find((m) => m.id === id)?.name)
    .filter(Boolean) as string[];
  if (benchedNames.length > 0) {
    entries.unshift({
      id: `bench-out-${week}`,
      text: `${benchedNames.join(', ')}${benchedNames.length > 1 ? '가' : josa(benchedNames[0], '이가').slice(-1)} 컨디션 회복을 위해 이번 주 활동에서 빠졌습니다.`,
      tone: 'bad',
    });
  }
  const newlyBenched = nextBench
    .map((id) => group.members.find((m) => m.id === id)?.name)
    .filter(Boolean) as string[];
  if (newlyBenched.length > 0) {
    entries.push({
      id: `bench-in-${week}`,
      text: `${newlyBenched.join(', ')} 피로 누적으로 다음 주 활동이 어렵다는 소견을 받았습니다.`,
      tone: 'critical',
    });
  }

  const log: WeekLog = {
    week,
    promoWeek,
    slots: slots.map((s) => ({ ...s })),
    entries,
    buzzDelta: buzzGain,
    fanDelta: fandom.size - world.fandom.size,
    wonDelta: -totals.cost,
    loyaltyDelta: fandom.loyalty - world.fandom.loyalty,
    awarenessDelta: company.awareness - world.company.awareness,
    sentimentDelta: fandom.sentiment - world.fandom.sentiment,
    salesDelta: salesGain,
    streamDelta: streamGain,
    fatigueDelta: Math.round(
      totals.fatigue * COMEBACK.weeklyFatigueScale - COMEBACK.weeklyRecovery,
    ),
    fandomAfter: fandom.size,
    buzzAfter: world.buzz + buzzGain,
    benchedIds: nextBench,
    eventIds: input.eventIds,
    recap: '',
  };

  log.recap = weekRecap(log, group, fandom);

  return {
    world: {
      company,
      group,
      fandom,
      buzz: world.buzz + buzzGain,
      sales: world.sales + salesGain,
      streams: world.streams + streamGain,
    },
    log,
    benchedIds: nextBench,
  };
}

// ---------------------------------------------------------------------------
// Recap copy
// ---------------------------------------------------------------------------

/** A Korean recap written the way a fan community post reads. */
export function weekRecap(log: WeekLog, group: Group, fandom: Fandom): string {
  const booked = log.slots
    .map((s) => s.activity)
    .filter(Boolean)
    .map((a) => ACTIVITIES[a as keyof typeof ACTIVITIES].label);

  const headline =
    log.buzzDelta >= 60
      ? `${log.promoWeek}주차 완전 불붙었다`
      : log.buzzDelta >= 30
        ? `${log.promoWeek}주차 나쁘지 않았음`
        : `${log.promoWeek}주차 조용했다`;

  const fanLine =
    log.fanDelta > 0
      ? `팬덤 ${log.fanDelta.toLocaleString('ko-KR')}명 늘어서 이제 ${fandom.size.toLocaleString('ko-KR')}명.`
      : `팬덤이 ${Math.abs(log.fanDelta).toLocaleString('ko-KR')}명 빠졌다. 이제 ${fandom.size.toLocaleString('ko-KR')}명.`;

  const scheduleLine = booked.length > 0 ? `이번 주 스케줄: ${booked.join(', ')}.` : '';

  const toneLine =
    log.benchedIds.length > 0
      ? '근데 애들 진짜 힘들어 보인다. 회사 일정 좀 줄여라.'
      : group.teamwork >= 70
        ? '분위기는 확실히 좋아 보인다.'
        : group.teamwork <= 40
          ? '요즘 멤버들 사이가 좀 어색한 것 같기도 하고.'
          : '';

  return [`[${headline}]`, scheduleLine, fanLine, toneLine].filter(Boolean).join(' ');
}
