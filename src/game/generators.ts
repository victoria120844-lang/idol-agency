/**
 * Seeded content generation: companies, trainees, track titles.
 *
 * Every function here takes an `Rng` as its first argument and draws from it,
 * so generated content replays identically from the same save.
 */

import {
  ALBUM_CONCEPTS,
  ALBUM_TUNING,
  ALBUM_TYPES,
  COMPANY_START,
  DEBUT_GOALS,
  FANDOM,
  GROUP_CONCEPTS,
  GENRE_LABELS,
  MOOD_TAGS,
  NATIONALITY_LABELS,
  NATIONALITY_WEIGHTS,
  ORIGIN_TEMPLATES,
  PERSONALITY_TAGS,
  PERSONALITY_TAG_IDS,
  POTENTIAL_WEIGHTS,
  RELATION_BASE_WEIGHTS,
  RELATION_TUNING,
  POSITION_LABELS,
  RELATION_TYPES,
  SPECIALTIES,
  SPECIALTY_IDS,
  STAT_LABELS,
  TRAINEE_GEN,
} from './constants';
import {
  gaussianClamped,
  randId,
  randInt,
  randPick,
  randSample,
  randWeighted,
  shuffle,
  type Rng,
} from './rng';
import {
  agencyTier,
  albumQuality,
  clampScore,
  emptyStats,
  hasFinalConsonant,
  josa,
  qualityGrade,
  titleTrackQuality,
  writingCredits,
} from './formulas';
import { STAT_KEYS } from './types';
import type {
  Album,
  AlbumDraft,
  Company,
  CompanyDraft,
  Fandom,
  FandomDraft,
  Gender,
  Group,
  Member,
  Nationality,
  PersonalityTagId,
  Position,
  PotentialGrade,
  RelationType,
  Relationship,
  SpecialtyId,
  Track,
  StatKey,
  Stats,
  Trainee,
} from './types';

// ---------------------------------------------------------------------------
// Company
// ---------------------------------------------------------------------------

/**
 * Build the founded agency from what the creation form collected. The only
 * random part is the id, so the company is reproducible from the save seed.
 */
export function createCompany(rng: Rng, draft: CompanyDraft): Company {
  return {
    id: randId(rng, 'co'),
    name: draft.name.trim(),
    ceoName: draft.ceoName.trim(),
    slogan: draft.slogan.trim(),
    ciColor: draft.ciColor,
    district: draft.district,
    won: COMPANY_START.won,
    tier: agencyTier(COMPANY_START.awareness),
    awareness: COMPANY_START.awareness,
    trust: COMPANY_START.trust,
    practiceRooms: COMPANY_START.practiceRooms,
    staff: [],
    foundedWeek: 0,
    debt: 0,
    deficitCycles: 0,
    totalRevenue: 0,
  };
}

// ---------------------------------------------------------------------------
// Trainee
// ---------------------------------------------------------------------------

/**
 * Roll the six stats. The gaussian is deliberately tight and low: most values
 * land in the 20-45 band, and a 60+ roll is uncommon enough to feel like a
 * find. `qualityMul` scales the centre, so a district can shift the whole pool.
 */
export function generateStats(rng: Rng, qualityMul = 1): Stats {
  const stats = emptyStats();
  for (const key of STAT_KEYS) {
    stats[key] = gaussianClamped(
      rng,
      TRAINEE_GEN.statMean * qualityMul,
      TRAINEE_GEN.statStdDev,
      TRAINEE_GEN.statMin,
      TRAINEE_GEN.statMax,
    );
  }
  return stats;
}

/** Age, gaussian around 18 and clamped to the recruitable range. */
export function generateAge(rng: Rng): number {
  return gaussianClamped(
    rng,
    TRAINEE_GEN.ageMean,
    TRAINEE_GEN.ageStdDev,
    TRAINEE_GEN.ageMin,
    TRAINEE_GEN.ageMax,
  );
}

export function generatePotentialGrade(rng: Rng): PotentialGrade {
  return randWeighted(rng, POTENTIAL_WEIGHTS, (p) => p.weight).grade;
}

export function generateNationality(rng: Rng): Nationality {
  return randWeighted(rng, NATIONALITY_WEIGHTS, (n) => n.weight).id;
}

/** Exactly two distinct tags. */
export function generatePersonality(rng: Rng): PersonalityTagId[] {
  return randSample(rng, PERSONALITY_TAG_IDS, TRAINEE_GEN.personalityCount);
}

export function generateSpecialty(rng: Rng): SpecialtyId {
  return randPick(rng, SPECIALTY_IDS);
}

export interface TraineeSeedInput {
  /** Typed by the player at the audition. */
  name: string;
  gender: Gender;
  joinedWeek: number;
  /** What this audition cost; 0 while free slots remain. */
  recruitCost: number;
  /** District modifier on the stat roll centre. */
  qualityMul?: number;
}

/**
 * Build one signed trainee.
 *
 * Draw order matters: it is the shape of the RNG stream, so changing it
 * changes every existing seed's playthrough. Append new draws at the end.
 */
export function generateTrainee(rng: Rng, input: TraineeSeedInput): Trainee {
  const id = randId(rng, 'tr');
  const age = generateAge(rng);
  const nationality = generateNationality(rng);
  const stats = generateStats(rng, input.qualityMul ?? 1);

  // Exactly one stat rolls higher, so every trainee has something they are
  // visibly for even when the raw numbers are unremarkable.
  const signatureStat = randPick(rng, STAT_KEYS) as StatKey;
  const bonus = randInt(rng, TRAINEE_GEN.signatureBonusMin, TRAINEE_GEN.signatureBonusMax);
  stats[signatureStat] = Math.min(TRAINEE_GEN.statMax, stats[signatureStat] + bonus);

  const potentialGrade = generatePotentialGrade(rng);
  const personality = generatePersonality(rng);
  const specialty = generateSpecialty(rng);

  return {
    id,
    name: input.name.trim(),
    gender: input.gender,
    age,
    nationality,
    stats,
    signatureStat,
    potentialGrade,
    potentialRevealed: false,
    trainedWeeks: 0,
    personality,
    specialty,
    condition: 100,
    fatigue: 0,
    personalFans: 0,
    recruitCost: input.recruitCost,
    joinedWeek: input.joinedWeek,
    debuted: false,
    lastTrainedCycle: 0,
  };
}

// ---------------------------------------------------------------------------
// Profile copy
// ---------------------------------------------------------------------------

/** Sentence fragment for a stat, keyed by how high it is. */
function statPhrase(key: StatKey, value: number): string {
  const label = STAT_LABELS[key];
  if (value >= 60) return `${label}에서 확실히 두각을 보입니다`;
  if (value >= 45) return `${label} 쪽이 눈에 띕니다`;
  return `${josa(label, '이가')} 그나마 낫습니다`;
}

/**
 * One-line Korean profile, assembled from the lead personality tag and the
 * trainee's best stat — e.g. "연습벌레 기질이 강해 댄스에서 두각을 보입니다."
 */
export function traineeProfile(trainee: Trainee): string {
  const lead = trainee.personality[0];
  const tag = lead ? PERSONALITY_TAGS[lead] : undefined;

  let best: StatKey = STAT_KEYS[0];
  for (const key of STAT_KEYS) {
    if (trainee.stats[key] > trainee.stats[best]) best = key;
  }

  const head = tag ? `${tag.label} 기질이 강해 ` : '';
  const specialty = SPECIALTIES[trainee.specialty];
  return `${head}${statPhrase(best, trainee.stats[best])}. ${specialty.blurb}.`;
}

// ---------------------------------------------------------------------------
// Group and relationships
// ---------------------------------------------------------------------------

/** Promote a trainee into the debut lineup. */
export function createMember(rng: Rng, trainee: Trainee, position: Position): Member {
  return {
    id: randId(rng, 'mb'),
    traineeId: trainee.id,
    name: trainee.name,
    position,
    stats: { ...trainee.stats },
    age: trainee.age,
    gender: trainee.gender,
    nationality: trainee.nationality,
    personality: [...trainee.personality],
    specialty: trainee.specialty,
    potentialGrade: trainee.potentialGrade,
    signatureStat: trainee.signatureStat,
    popularity: 0,
    personalFans: 0,
    condition: trainee.condition,
    fatigue: trainee.fatigue,
  };
}

/** Does either member carry this personality tag? */
function eitherHas(a: Member, b: Member, tag: PersonalityTagId): boolean {
  return a.personality.includes(tag) || b.personality.includes(tag);
}

/** Do both members carry this personality tag? */
function bothHave(a: Member, b: Member, tag: PersonalityTagId): boolean {
  return a.personality.includes(tag) && b.personality.includes(tag);
}

/**
 * Weight each relationship type for one pair, biased by their personality tags
 * and age gap. `dating` stays at zero — romance has to develop through play.
 */
export function relationWeights(a: Member, b: Member): Record<RelationType, number> {
  const w = { ...RELATION_BASE_WEIGHTS };
  const bias = RELATION_TUNING.biasWeight;
  const ageGap = Math.abs(a.age - b.age);

  // Two grinders in the same practice room end up inseparable.
  if (bothHave(a, b, 'grinder') || bothHave(a, b, 'professional')) w.best_friend += bias;
  if (eitherHas(a, b, 'aegyo') || eitherHas(a, b, 'funny')) w.best_friend += bias / 2;

  // Competitiveness on either side turns the pair into a measuring contest.
  if (eitherHas(a, b, 'competitive')) w.rival += bias;
  if (bothHave(a, b, 'competitive')) w.rival += bias;

  // Quiet people take longer to thaw.
  if (eitherHas(a, b, 'timid') || eitherHas(a, b, 'blunt')) w.awkward += bias;

  // Someone senior and steady mentors someone who needs it.
  if (ageGap >= RELATION_TUNING.mentorAgeGap) w.mentor += bias;
  if (eitherHas(a, b, 'leadership')) w.mentor += bias;

  // Presence draws attention.
  if (eitherHas(a, b, 'star_quality')) w.crush += bias / 2;
  if (eitherHas(a, b, 'aegyo')) w.crush += bias / 3;

  // The classic practice-room fight: one slacks, one cannot let it go.
  if (eitherHas(a, b, 'lazy') && eitherHas(a, b, 'perfectionist')) w.conflict += bias;
  if (eitherHas(a, b, 'fragile') && eitherHas(a, b, 'blunt')) w.conflict += bias / 2;

  w.dating = 0;
  return w;
}

/** Fill `{a}` / `{b}` in an origin template. */
function fillTemplate(template: string, aName: string, bName: string): string {
  return template.replaceAll('{a}', aName).replaceAll('{b}', bName);
}

/**
 * Build the full relationship matrix — every unordered pair gets a type, an
 * affinity, and an origin sentence, so the group starts with a story rather
 * than a blank grid.
 */
export function generateRelationships(rng: Rng, members: readonly Member[]): Relationship[] {
  const out: Relationship[] = [];

  /**
   * Deal origin templates without replacement, per type. A nine-member group
   * has 36 pairs and one type can easily claim a dozen of them, so drawing
   * uniformly would repeat the same sentence four or five times. Each type
   * keeps a shuffled queue and only reshuffles once its pool runs out.
   */
  const queues = new Map<RelationType, string[]>();
  const nextTemplate = (type: RelationType): string => {
    let queue = queues.get(type);
    if (!queue || queue.length === 0) {
      queue = shuffle(rng, ORIGIN_TEMPLATES[type]);
      queues.set(type, queue);
    }
    return queue.pop() ?? ORIGIN_TEMPLATES[type][0];
  };

  for (let i = 0; i < members.length; i += 1) {
    for (let j = i + 1; j < members.length; j += 1) {
      const a = members[i];
      const b = members[j];

      const weights = relationWeights(a, b);
      const types = Object.keys(weights) as RelationType[];
      const type = randWeighted(rng, types, (t) => weights[t]);

      const range = RELATION_TYPES[type];
      const affinity = randInt(rng, range.min, range.max);

      // For a mentor pairing the older member does the mentoring.
      const mentorFrom = type === 'mentor' ? (a.age >= b.age ? a.id : b.id) : undefined;
      const mentorName = mentorFrom === b.id ? b.name : a.name;
      const menteeName = mentorFrom === b.id ? a.name : b.name;

      const template = nextTemplate(type);
      const origin =
        type === 'mentor'
          ? fillTemplate(template, mentorName, menteeName)
          : fillTemplate(template, a.name, b.name);

      out.push({
        a: a.id,
        b: b.id,
        type,
        affinity,
        mentorFrom,
        origin,
        log: [],
        romanceLocked: false,
      });
    }
  }

  return out;
}

// ---------------------------------------------------------------------------
// Fandom
// ---------------------------------------------------------------------------

export interface FoundedFandom {
  fandom: Fandom;
  /** The same members, with their trainee-era followings filled in. */
  members: Member[];
}

/**
 * Name the fandom and hand every member their trainee-era following.
 *
 * `Fandom.size` is defined as the sum of the members' 개인 팬 rather than a
 * separate counter, so the two can never disagree.
 */
export function foundFandom(
  rng: Rng,
  draft: FandomDraft,
  members: readonly Member[],
  week: number,
): FoundedFandom {
  const withFans = members.map((m) => ({
    ...m,
    personalFans: randInt(rng, FANDOM.fansPerMemberMin, FANDOM.fansPerMemberMax),
  }));

  const size = withFans.reduce((sum, m) => sum + m.personalFans, 0);

  return {
    members: withFans,
    fandom: {
      name: draft.name.trim(),
      color: draft.color,
      lightstickName: draft.lightstickName.trim(),
      slogan: draft.slogan.trim(),
      size,
      loyalty: FANDOM.startingLoyalty,
      sentiment: FANDOM.startingSentiment,
      coreRatio: FANDOM.startingCoreRatio,
      weeklyGrowth: 0,
      foundedWeek: week,
    },
  };
}

/**
 * The agency notice announcing the official fandom name, written the way a real
 * label posts one.
 */
export function fandomNotice(
  companyName: string,
  groupName: string,
  fandom: Fandom,
): { title: string; lines: string[] } {
  const lines = [
    `「${groupName}」의 공식 팬덤명이 「${fandom.name}」으로 확정되었습니다.`,
    `공식 색상은 ${fandom.color.toUpperCase()}이며, 향후 모든 공식 굿즈와 공연 연출에 적용됩니다.`,
  ];

  if (fandom.lightstickName) {
    lines.push(`공식 응원봉의 명칭은 「${fandom.lightstickName}」으로 결정되었습니다.`);
  }
  if (fandom.slogan) {
    lines.push(`공식 슬로건은 "${fandom.slogan}"입니다.`);
  }

  lines.push(
    `${josa(groupName, '과와')} ${fandom.name}의 첫 걸음을 함께해 주시는 여러분께 감사드립니다. — ${companyName}`,
  );

  return { title: '공식 팬덤명 확정 안내', lines };
}

// ---------------------------------------------------------------------------
// Press release
// ---------------------------------------------------------------------------

export interface PressRelease {
  /** Korean headline. */
  headline: string;
  /** Body paragraphs, already assembled. */
  paragraphs: string[];
  /** "2026. 03. 04." style dateline stand-in using the in-game week. */
  dateline: string;
}

/**
 * Debut announcement written the way a Korean label actually writes one:
 * headline, lineup sentence, concept sentence, closing quote from the CEO.
 * Pure — the same group always produces the same release.
 */
export function debutPressRelease(
  companyName: string,
  ceoName: string,
  group: Group,
): PressRelease {
  const concept = GROUP_CONCEPTS[group.concept];
  const goal = DEBUT_GOALS[group.goal];
  const count = group.members.length;

  const lineup = group.members
    .map((m) => `${m.name}(${POSITION_LABELS[m.position]})`)
    .join(', ');

  const leader = group.members.find((m) => m.position === 'leader');
  const center = group.members.find((m) => m.position === 'center');
  const maknae = group.members.find((m) => m.position === 'maknae');

  const spotlight = [
    leader ? `리더는 ${josa(leader.name, '이가')} 맡는다` : null,
    center ? `센터에는 ${josa(center.name, '이가')} 선다` : null,
    maknae ? `막내는 ${maknae.name}${hasFinalConsonant(maknae.name) ? '이다' : '다'}` : null,
  ]
    .filter(Boolean)
    .join('. ');

  const nations = new Set(group.members.map((m) => NATIONALITY_LABELS[m.nationality]));
  const nationLine =
    nations.size > 1
      ? `${[...nations].join(' · ')} 출신 멤버로 구성된 다국적 그룹이다.`
      : '전원 국내 출신 멤버로 구성됐다.';

  return {
    headline: `${companyName}, ${count}인조 신인 그룹 「${group.name}」 데뷔 확정`,
    dateline: `${group.debutWeek}주차 · ${companyName} 보도자료`,
    paragraphs: [
      `${companyName}가 ${count}인조 신인 그룹 ${group.name}의 데뷔를 공식 발표했다. ` +
        `${josa(group.name, '은는')} ${lineup}로 구성된다.`,
      `데뷔 콘셉트는 '${concept.label}'다. ${concept.blurb} ${nationLine}` +
        (spotlight ? ` ${spotlight}.` : ''),
      `${companyName} ${ceoName} 대표는 "${group.name}의 첫 목표는 ${goal.label}"이라며 ` +
        `"${goal.blurb.replace(/\.$/, '')}는 것이 데뷔 시즌의 과제"라고 밝혔다.`,
    ],
  };
}

// ---------------------------------------------------------------------------
// Album
// ---------------------------------------------------------------------------

export interface AlbumBuildInput {
  draft: AlbumDraft;
  group: Group;
  /** Team stats, passed in so the generator stays free of aggregation logic. */
  teamStats: Stats;
  /** 컨셉 적합도 of the group against the album concept, 0-100. */
  conceptFitPct: number;
  week: number;
  cycle: number;
}

/**
 * Freeze the four-step draft into a finished album.
 *
 * The title track's quality is the documented formula; b-sides sit a little
 * below it with a small roll, and every writing credit lifts the track. Draw
 * order: album id, then one id + one variance roll per track in list order.
 */
export function createAlbum(rng: Rng, input: AlbumBuildInput): Album {
  const { draft, group, teamStats, conceptFitPct, week, cycle } = input;

  const albumId = randId(rng, 'al');

  const titleQuality = titleTrackQuality({
    teamStats,
    concept: draft.concept,
    conceptFitPct,
    producingPct: draft.allocation.producing,
    teamwork: group.teamwork,
  });

  const titleTrack: Track = {
    id: randId(rng, 'tk'),
    title: draft.titleTrack.title.trim(),
    kind: 'title',
    genre: draft.titleTrack.genre,
    bpm: draft.titleTrack.bpm,
    moods: [...draft.titleTrack.moods],
    participantIds: [],
    quality: titleQuality,
  };

  const bSides: Track[] = draft.bSides.map((b) => {
    const id = randId(rng, 'tk');
    // B-sides land a little under the title track, with real spread.
    const variance = randInt(rng, -12, 6);
    const credits = writingCredits(b.participantIds, group.members);
    return {
      id,
      title: b.title.trim(),
      kind: 'b_side' as const,
      genre: b.genre,
      participantIds: [...b.participantIds],
      quality: clampScore(titleQuality + variance + credits * ALBUM_TUNING.writerBonus),
    };
  });

  const tracks = [titleTrack, ...bSides];
  const quality = albumQuality(tracks, titleTrack.id);

  const album: Album = {
    id: albumId,
    title: draft.title.trim(),
    concept: draft.concept,
    type: draft.type,
    tracks,
    titleTrackId: titleTrack.id,
    budget: ALBUM_TYPES[draft.type].cost,
    allocation: { ...draft.allocation },
    centerMemberId: draft.centerMemberId,
    killingPartMemberId: draft.killingPartMemberId,
    partShares: { ...draft.partShares },
    quality,
    qualityGrade: qualityGrade(quality),
    introText: '',
    releaseWeek: week,
    result: null,
    cycle,
  };

  // The intro reads from the finished album, so it is written last.
  album.introText = albumIntroText(album, group);
  return album;
}

/** Korean album introduction, in the register a label uses on a release page. */
export function albumIntroText(album: Album, group: Group): string {
  const concept = ALBUM_CONCEPTS[album.concept];
  const type = ALBUM_TYPES[album.type];
  const title = album.tracks.find((t) => t.id === album.titleTrackId);
  const center = group.members.find((m) => m.id === album.centerMemberId);
  const killing = group.members.find((m) => m.id === album.killingPartMemberId);

  const moods = title?.moods?.length
    ? title.moods.map((m) => MOOD_TAGS[m]).join(' ')
    : '';

  const selfWritten = album.tracks.filter((t) => t.participantIds.length > 0);
  const writerLine =
    selfWritten.length > 0
      ? ` 수록곡 ${selfWritten.length}곡에는 멤버들이 직접 참여했다.`
      : '';

  const sentences = [
    `${group.name}의 ${type.label} 앨범 「${album.title}」.`,
    `'${concept.label}' 콘셉트 아래 ${album.tracks.length}곡을 담았다. ${concept.blurb}`,
    title
      ? `타이틀곡 「${title.title}」${hasFinalConsonant(title.title) ? '은' : '는'} ` +
        `${GENRE_LABELS[title.genre]} 트랙으로, ` +
        `${moods ? `${moods} 분위기를 ` : '단단한 구성을 '}${title.bpm}BPM 위에 얹었다.`
      : '',
    center && killing
      ? center.id === killing.id
        ? `센터와 킬링파트를 모두 ${josa(center.name, '이가')} 맡는다.`
        : `센터는 ${center.name}, 킬링파트는 ${josa(killing.name, '이가')} 맡는다.`
      : '',
    writerLine.trim(),
  ];

  return sentences.filter(Boolean).join(' ');
}
