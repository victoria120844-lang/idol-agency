/**
 * Every balance number in the game lives here.
 *
 * Rule: components and feature modules never inline a magic number. If a value
 * affects how the game plays, it belongs in this file so the whole balance
 * surface can be tuned from one place.
 */

import type {
  ActivityType,
  AgencyTierId,
  AlbumConcept,
  AlbumType,
  BudgetChannel,
  MoodTag,
  QualityGrade,
  Concept,
  District,
  DebutGoal,
  GamePhase,
  Gender,
  Genre,
  Grade,
  Nationality,
  PersonalityTagId,
  Position,
  PotentialGrade,
  RelationType,
  SpecialtyId,
  StatKey,
} from './types';

// ---------------------------------------------------------------------------
// Save / meta
// ---------------------------------------------------------------------------

export const SAVE_KEY = 'idol-sim-save-v1';
/** Bump whenever GameState changes shape, and add a branch to `migrate`. */
export const SAVE_VERSION = 2;

// ---------------------------------------------------------------------------
// Economy
// ---------------------------------------------------------------------------

export const ECONOMY = {
  /** Seed money the player founds the agency with. */
  startingWon: 5_000_000,
  /** Game over when debt passes this. */
  debtLimit: 100_000_000,
  /** Weekly fixed overhead: rent, utilities, practice room. */
  weeklyOverhead: 1_200_000,
  /** Per-trainee monthly upkeep range. */
  traineeCostMin: 800_000,
  traineeCostMax: 2_400_000,
  /** Revenue per physical album sold. */
  wonPerAlbum: 9_000,
  /** Revenue per 1,000 streams. */
  wonPerThousandStreams: 3_500,
  /** Revenue per fan-signing attendee. */
  wonPerFanSigning: 25_000,
} as const;

// ---------------------------------------------------------------------------
// Founding: districts, tiers, starting conditions
// ---------------------------------------------------------------------------

/**
 * Founding neighbourhood. Every modifier is a multiplier applied to an existing
 * balance number, so a district shifts the texture of a run without changing
 * the rules. Multipliers above 1 make the thing more expensive or more likely.
 */
export const DISTRICTS: Record<
  District,
  {
    /** Korean name shown in the select. */
    label: string;
    /** English kicker for the license preview. */
    kicker: string;
    /** One-line Korean flavour shown under the select. */
    blurb: string;
    /** Multiplies ECONOMY.weeklyOverhead — rent and utilities. */
    overheadMul: number;
    /** Multiplies the fan gain from broadcast and public activities. */
    exposureMul: number;
    /** Multiplies the stat roll mean of recruited trainees. */
    traineeQualityMul: number;
    /** Multiplies TRAINEE_GEN costs — signing and monthly upkeep. */
    traineeCostMul: number;
    /** Flat bonus to the music-show booking roll, in score points. */
    broadcastBonus: number;
  }
> = {
  gangnam: {
    label: '강남',
    kicker: 'GANGNAM',
    blurb: '업계 중심지. 임대료가 비싸지만 노출과 섭외가 가장 유리합니다.',
    overheadMul: 1.3,
    exposureMul: 1.15,
    traineeQualityMul: 1.0,
    traineeCostMul: 1.1,
    broadcastBonus: 3,
  },
  hongdae: {
    label: '홍대',
    kicker: 'HONGDAE',
    blurb: '실력파 연습생이 모이는 동네. 임대료가 싸고 실기 스탯이 높게 붙습니다.',
    overheadMul: 0.85,
    exposureMul: 0.95,
    traineeQualityMul: 1.08,
    traineeCostMul: 0.9,
    broadcastBonus: 0,
  },
  seongsu: {
    label: '성수',
    kicker: 'SEONGSU',
    blurb: '트렌드가 먼저 지나가는 곳. 콘셉트와 비주얼이 잘 먹힙니다.',
    overheadMul: 1.1,
    exposureMul: 1.08,
    traineeQualityMul: 1.03,
    traineeCostMul: 1.0,
    broadcastBonus: 1,
  },
  yeouido: {
    label: '여의도',
    kicker: 'YEOUIDO',
    blurb: '방송국 옆. 음악방송 섭외가 눈에 띄게 쉬워집니다.',
    overheadMul: 1.15,
    exposureMul: 1.0,
    traineeQualityMul: 0.97,
    traineeCostMul: 1.0,
    broadcastBonus: 6,
  },
  pangyo: {
    label: '판교',
    kicker: 'PANGYO',
    blurb: '온라인 중심. 임대료가 싸고 SNS 콘텐츠 효율이 좋지만 섭외는 불리합니다.',
    overheadMul: 0.9,
    exposureMul: 1.02,
    traineeQualityMul: 0.95,
    traineeCostMul: 0.85,
    broadcastBonus: -3,
  },
};

export const DISTRICT_ORDER: readonly District[] = [
  'gangnam',
  'hongdae',
  'seongsu',
  'yeouido',
  'pangyo',
] as const;

/**
 * Agency size ladder. The tier is derived from awareness, never set directly —
 * see `agencyTier` in formulas.ts.
 */
export const AGENCY_TIERS: readonly {
  id: AgencyTierId;
  label: string;
  en: string;
  /** Lower bound of 회사 인지도 for this tier. */
  minAwareness: number;
}[] = [
  { id: 'small', label: '소형 기획사', en: 'Small Label', minAwareness: 0 },
  { id: 'mid_small', label: '중소 기획사', en: 'Mid-Small Label', minAwareness: 25 },
  { id: 'mid', label: '중견 기획사', en: 'Mid-Size Label', minAwareness: 45 },
  { id: 'major', label: '대형 기획사', en: 'Major Label', minAwareness: 70 },
  { id: 'mega', label: '초대형 기획사', en: 'Big Label', minAwareness: 88 },
] as const;

/** Fixed conditions every playthrough starts from. */
export const COMPANY_START = {
  won: ECONOMY.startingWon,
  /** 회사 인지도. */
  awareness: 5,
  /** 업계 신뢰도. */
  trust: 10,
  /** 보유 연습실. */
  practiceRooms: 1,
  ciColor: '#FF1F3D',
  district: 'gangnam' as District,
} as const;

/** Validation bounds for the creation form. */
export const COMPANY_FORM = {
  nameMin: 2,
  nameMax: 12,
  ceoNameMin: 1,
  ceoNameMax: 10,
  sloganMax: 30,
  /** Hangul, latin letters, digits and a few separators. */
  namePattern: /^[가-힣ㄱ-ㅎㅏ-ㅣa-zA-Z0-9 .&'-]+$/,
} as const;

// ---------------------------------------------------------------------------
// Trainee generation
// ---------------------------------------------------------------------------

export const TRAINEE_GEN = {
  ageMin: 15,
  ageMax: 22,
  /** Gaussian centre for age; most trainees are 17-19. */
  ageMean: 18,
  ageStdDev: 1.8,

  /**
   * Stat roll. Mean 30 with SD 9 clamped to 10-70 puts roughly two thirds of
   * every stat in the 20-45 band the brief asks for, and makes a 60+ roll rare
   * without making it impossible.
   */
  statMean: 30,
  statStdDev: 9,
  statMin: 10,
  statMax: 70,

  /** The signature stat gets a flat bonus on top of its roll. */
  signatureBonusMin: 10,
  signatureBonusMax: 20,

  /** Exactly this many personality tags per trainee. */
  personalityCount: 2,
} as const;

/** Potential grade distribution at recruitment. Weights are percentages. */
export const POTENTIAL_WEIGHTS: readonly { grade: PotentialGrade; weight: number }[] = [
  { grade: 'D', weight: 35 },
  { grade: 'C', weight: 30 },
  { grade: 'B', weight: 20 },
  { grade: 'A', weight: 12 },
  { grade: 'S', weight: 3 },
] as const;

/** Growth multiplier each grade applies to training gains. */
export const POTENTIAL_GRADES: Record<
  PotentialGrade,
  { label: string; growthMul: number; note: string }
> = {
  S: { label: 'S', growthMul: 1.8, note: '한 세대에 몇 없는 재능' },
  A: { label: 'A', growthMul: 1.45, note: '대형 기획사가 탐낼 재목' },
  B: { label: 'B', growthMul: 1.2, note: '데뷔조 주축이 될 수 있음' },
  C: { label: 'C', growthMul: 1.0, note: '평범하지만 쓸 만함' },
  D: { label: 'D', growthMul: 0.8, note: '성장이 더딤' },
};

/** Nationality distribution. Weights are percentages. */
export const NATIONALITY_WEIGHTS: readonly { id: Nationality; weight: number }[] = [
  { id: 'kr', weight: 85 },
  { id: 'jp', weight: 6 },
  { id: 'cn', weight: 4 },
  { id: 'th', weight: 3 },
  { id: 'us', weight: 2 },
] as const;

export const NATIONALITY_LABELS: Record<Nationality, string> = {
  kr: '한국',
  jp: '일본',
  cn: '중국',
  th: '태국',
  us: '미국',
};

export const GENDER_LABELS: Record<Gender, string> = {
  female: '여자',
  male: '남자',
};

/**
 * Personality tags. `tone` drives the profile sentence and, later, how the tag
 * bends training and event rolls.
 */
export const PERSONALITY_TAGS: Record<
  PersonalityTagId,
  { label: string; tone: 'good' | 'bad' | 'neutral'; blurb: string }
> = {
  competitive: { label: '승부욕', tone: 'good', blurb: '지는 걸 못 견딥니다' },
  timid: { label: '소심함', tone: 'bad', blurb: '무대에서 위축됩니다' },
  leadership: { label: '리더십', tone: 'good', blurb: '팀을 끌고 갑니다' },
  professional: { label: '프로 의식', tone: 'good', blurb: '스케줄에 빈틈이 없습니다' },
  lazy: { label: '게으름', tone: 'bad', blurb: '연습을 자주 거릅니다' },
  grinder: { label: '연습벌레', tone: 'good', blurb: '연습실에서 살다시피 합니다' },
  star_quality: { label: '인기 체질', tone: 'good', blurb: '어디서든 눈에 띕니다' },
  fragile: { label: '유리 멘탈', tone: 'bad', blurb: '악플 한 줄에 흔들립니다' },
  funny: { label: '예능감', tone: 'good', blurb: '카메라 앞에서 살아납니다' },
  blunt: { label: '무뚝뚝', tone: 'neutral', blurb: '말수가 적습니다' },
  aegyo: { label: '애교', tone: 'neutral', blurb: '팬 서비스에 강합니다' },
  perfectionist: { label: '완벽주의', tone: 'neutral', blurb: '자신을 몰아붙입니다' },
};

export const PERSONALITY_TAG_IDS = Object.keys(PERSONALITY_TAGS) as PersonalityTagId[];

/** 특기 — one per trainee, purely flavour until the schedule phase uses it. */
export const SPECIALTIES: Record<SpecialtyId, { label: string; blurb: string }> = {
  lyrics: { label: '작사', blurb: '가사를 직접 씁니다' },
  composing: { label: '작곡', blurb: '데모를 만들어 옵니다' },
  choreography: { label: '안무 창작', blurb: '동선을 스스로 짭니다' },
  language: { label: '외국어', blurb: '해외 스케줄에 강합니다' },
  athletics: { label: '운동', blurb: '체력 소모가 적습니다' },
  instrument: { label: '악기', blurb: '라이브 무대의 폭이 넓습니다' },
  adlib: { label: '애드리브', blurb: '생방송 사고에 강합니다' },
};

export const SPECIALTY_IDS = Object.keys(SPECIALTIES) as SpecialtyId[];

/** Recruitment economy and roster limits. */
export const RECRUIT = {
  /** Auditions this many trainees at no cost. */
  freeSlots: 20,
  /** Cost in Won per audition once the free slots are used up. */
  costAfterFree: 100_000,
  /** Hard roster cap — the list has to stay fast to render and to read. */
  maxRoster: 40,
  /** 데뷔조 구성 unlocks at this many trainees. */
  minForDebut: 4,
  /** Weeks of training that reveal the potential grade for free. */
  revealAfterWeeks: 4,
  /** Cost in Won of a 평가 세션, which reveals the grade immediately. */
  evaluationCost: 300_000,
} as const;

// ---------------------------------------------------------------------------
// Group: concepts, positions, goals
// ---------------------------------------------------------------------------

export const GROUP_RULES = {
  minMembers: 3,
  maxMembers: 9,
  nameMin: 2,
  nameMax: 16,
  /** Default member count the slider opens on. */
  defaultMembers: 5,
} as const;

/**
 * The eight debut concepts.
 *
 * `weights` scale each stat when scoring 컨셉 적합도, so a concept is really a
 * statement about which six numbers matter. A weight of 1.0 is neutral.
 */
export const GROUP_CONCEPTS: Record<
  Concept,
  {
    label: string;
    kicker: string;
    /** One-line Korean flavour shown under the picker. */
    blurb: string;
    weights: Record<StatKey, number>;
  }
> = {
  fresh: {
    label: '청량',
    kicker: 'FRESH',
    blurb: '여름, 흰 셔츠, 탁 트인 고음. 보컬과 비주얼로 승부합니다.',
    weights: { vocal: 1.3, dance: 1.0, rap: 0.7, visual: 1.2, charisma: 1.1, mental: 0.9 },
  },
  crush: {
    label: '걸크러시 · 보이크러시',
    kicker: 'CRUSH',
    blurb: '센 언니, 센 오빠. 칼군무와 무대 장악력이 전부입니다.',
    weights: { vocal: 0.9, dance: 1.3, rap: 1.1, visual: 1.0, charisma: 1.2, mental: 1.0 },
  },
  dark_fantasy: {
    label: '다크 판타지',
    kicker: 'DARK FANTASY',
    blurb: '세계관과 서사. 표현력과 멘탈이 무너지면 콘셉트가 무너집니다.',
    weights: { vocal: 1.1, dance: 1.2, rap: 0.9, visual: 1.2, charisma: 1.3, mental: 1.2 },
  },
  y2k: {
    label: 'Y2K 레트로',
    kicker: 'Y2K RETRO',
    blurb: '2000년대 감성. 비주얼과 매력이 곧 콘셉트입니다.',
    weights: { vocal: 1.0, dance: 1.1, rap: 1.0, visual: 1.3, charisma: 1.3, mental: 0.8 },
  },
  youth_band: {
    label: '청춘 밴드',
    kicker: 'YOUTH BAND',
    blurb: '악기와 라이브. 보컬이 받쳐주지 않으면 성립하지 않습니다.',
    weights: { vocal: 1.4, dance: 0.7, rap: 0.7, visual: 1.0, charisma: 1.1, mental: 1.2 },
  },
  highteen: {
    label: '하이틴',
    kicker: 'HIGHTEEN',
    blurb: '교복과 첫사랑. 밝은 매력과 비주얼이 중심입니다.',
    weights: { vocal: 1.1, dance: 1.1, rap: 0.8, visual: 1.3, charisma: 1.2, mental: 0.8 },
  },
  dreamy: {
    label: '몽환',
    kicker: 'DREAMY',
    blurb: '앰비언트한 사운드. 음색과 분위기로 밀어붙입니다.',
    weights: { vocal: 1.3, dance: 0.9, rap: 0.8, visual: 1.1, charisma: 1.2, mental: 1.1 },
  },
  hiphop_crew: {
    label: '힙합 크루',
    kicker: 'HIPHOP CREW',
    blurb: '랩이 중심. 실력이 부족하면 바로 티가 납니다.',
    weights: { vocal: 0.8, dance: 1.2, rap: 1.5, visual: 0.9, charisma: 1.2, mental: 1.0 },
  },
};

export const CONCEPT_ORDER: readonly Concept[] = [
  'fresh',
  'crush',
  'dark_fantasy',
  'y2k',
  'youth_band',
  'highteen',
  'dreamy',
  'hiphop_crew',
] as const;

/** Soft season objectives, scored on the results screen. */
export const DEBUT_GOALS: Record<
  DebutGoal,
  { label: string; kicker: string; blurb: string }
> = {
  music_show_win: {
    label: '음악방송 1위',
    kicker: 'MUSIC SHOW WIN',
    blurb: '컴백 4주 안에 음악방송에서 한 번이라도 1위를 합니다.',
  },
  first_week_100k: {
    label: '초동 10만 장',
    kicker: 'FIRST WEEK 100K',
    blurb: '첫 주 실물 음반 판매량 10만 장을 넘깁니다.',
  },
  awareness_50: {
    label: '대중 인지도 50',
    kicker: 'AWARENESS 50',
    blurb: '팬덤 밖으로 나가 회사 인지도를 50까지 올립니다.',
  },
};

export const DEBUT_GOAL_ORDER: readonly DebutGoal[] = [
  'music_show_win',
  'first_week_100k',
  'awareness_50',
] as const;

/** Positions any number of members may hold. Everything else is unique. */
export const NON_UNIQUE_POSITIONS: readonly Position[] = ['sub_vocal'] as const;

export const POSITION_ORDER: readonly Position[] = [
  'leader',
  'center',
  'main_vocal',
  'lead_vocal',
  'sub_vocal',
  'main_dancer',
  'lead_dancer',
  'rapper',
  'visual',
  'maknae',
] as const;

/**
 * The stat a position is really asking for. Assigning a member whose best stat
 * is something else raises a soft warning — it is allowed, just unusual.
 * `maknae` has no requirement; it is about age, not skill.
 */
export const POSITION_PRIMARY_STAT: Record<Position, StatKey | null> = {
  leader: 'mental',
  center: 'charisma',
  main_vocal: 'vocal',
  lead_vocal: 'vocal',
  sub_vocal: 'vocal',
  main_dancer: 'dance',
  lead_dancer: 'dance',
  rapper: 'rap',
  visual: 'visual',
  maknae: null,
};

// ---------------------------------------------------------------------------
// Relationships
// ---------------------------------------------------------------------------

export const RELATION_TYPES: Record<
  RelationType,
  {
    label: string;
    kicker: string;
    /** Affinity range rolled at debut. */
    min: number;
    max: number;
    /** How the edge is drawn on the relationship map. */
    stroke: 'neon' | 'paper' | 'muted';
    dashed: boolean;
  }
> = {
  best_friend: { label: '절친', kicker: 'BEST FRIEND', min: 55, max: 90, stroke: 'paper', dashed: false },
  rival: { label: '라이벌', kicker: 'RIVAL', min: -10, max: 35, stroke: 'muted', dashed: false },
  awkward: { label: '어색함', kicker: 'AWKWARD', min: -25, max: 5, stroke: 'muted', dashed: false },
  mentor: { label: '멘토-멘티', kicker: 'MENTOR', min: 35, max: 70, stroke: 'paper', dashed: false },
  crush: { label: '썸', kicker: 'CRUSH', min: 45, max: 80, stroke: 'neon', dashed: false },
  dating: { label: '연애', kicker: 'DATING', min: 60, max: 95, stroke: 'neon', dashed: false },
  conflict: { label: '갈등', kicker: 'CONFLICT', min: -80, max: -30, stroke: 'muted', dashed: true },
};

/**
 * How personality tags bias the relationship roll. Each entry adds weight to a
 * type when the condition holds; the base weights keep every type reachable.
 */
export const RELATION_BASE_WEIGHTS: Record<RelationType, number> = {
  best_friend: 22,
  rival: 16,
  awkward: 22,
  mentor: 12,
  crush: 8,
  dating: 0, // never at debut
  conflict: 10,
};

export const RELATION_TUNING = {
  /** Age gap that makes a mentor pairing likely. */
  mentorAgeGap: 3,
  /** Weight added when a biasing condition holds. */
  biasWeight: 26,
  /** Teamwork sits at this value when average affinity is 0. */
  teamworkBase: 50,
  /** Average affinity is multiplied by this before shifting teamwork. */
  teamworkFromAffinity: 0.5,
  /** Scandal risk added per dating pair and per crush pair. */
  riskPerDating: 18,
  riskPerCrush: 6,
  /** Share of missing teamwork that becomes scandal risk. */
  riskFromLowTeamwork: 0.35,
} as const;

/**
 * Origin sentences, one pool per relationship type. `{a}` and `{b}` are the two
 * member names; for `mentor`, `{a}` is the mentor.
 */
export const ORIGIN_TEMPLATES: Record<RelationType, readonly string[]> = {
  best_friend: [
    '연습생 시절 같은 방을 쓰며 매일 새벽까지 연습했다.',
    '{a}가 처음 상경한 날 {b}가 짐을 같이 옮겨줬다.',
    '월말 평가에서 나란히 떨어진 뒤로 붙어다닌다.',
    '{b}가 다치던 날 {a}가 병원까지 업고 뛰었다.',
    '연습실 막차를 놓치고 둘이 한 시간을 걸어 들어간 적이 있다.',
    '{a}의 생일을 유일하게 기억한 사람이 {b}였다.',
    '서로의 가족 연락처를 저장해 두고 있다.',
    '{b}가 그만두겠다고 한 날 {a}가 밤새 설득했다.',
    '편의점 삼각김밥으로 버틴 겨울을 같이 났다.',
    '둘이 만든 커버 영상이 아직 회사 서버에 남아 있다.',
    '{a}는 {b} 앞에서만 사투리를 쓴다.',
    '연습생 평가표를 서로 바꿔 보며 약점을 짚어줬다.',
  ],
  rival: [
    '센터 자리를 두고 마지막까지 경쟁했다.',
    '월말 평가 1위를 번갈아 가져가며 서로를 밀어붙였다.',
    '같은 파트를 노리다 결국 {a}가 가져갔다.',
    '데뷔조 발표 전날, 둘 다 잠을 못 잤다.',
    '{b}가 먼저 들어왔지만 진도는 {a}가 앞섰다.',
    '연습실 거울 앞 자리를 두고 매번 신경전을 벌인다.',
    '트레이너가 둘을 늘 붙여 놓고 비교했다.',
    '{a}의 고음을 {b}가 이 악물고 따라잡았다.',
    '서로의 연습 시간을 몰래 재고 있다.',
    '칭찬을 들은 쪽이 그날 더 오래 남는다.',
  ],
  awkward: [
    '아직 서로 존댓말을 쓴다.',
    '연습실에서 마주쳐도 눈인사만 하고 지나간다.',
    '{a}가 먼저 말을 걸었지만 대화가 두 마디에서 끊겼다.',
    '같은 조에 배정된 적이 한 번도 없었다.',
    '단체 대화방에서만 대화한 사이다.',
    '{b}는 {a}의 이름을 아직 잘못 부른다.',
    '연습 시간대가 계속 엇갈렸다.',
    '회식 자리에서 대각선 끝에 앉는다.',
    '{a}가 농담을 던졌지만 {b}가 웃지 않았다.',
    '서로를 나쁘게 생각하진 않는다. 그냥 접점이 없었다.',
    '엘리베이터에서 마주치면 층수만 눌러준다.',
  ],
  mentor: [
    '{a}가 {b}의 안무를 처음부터 다시 잡아줬다.',
    '{b}가 흔들릴 때마다 {a}가 연습실에 남아 함께 있어줬다.',
    '{a}는 {b}에게서 자기 연습생 시절을 본다고 말했다.',
    '{a}가 {b}의 첫 월말 평가 영상을 아직 가지고 있다.',
    '{b}의 발성을 {a}가 반년에 걸쳐 고쳐줬다.',
    '{a}가 자기 파트를 줄여 {b}에게 넘긴 적이 있다.',
    '{b}는 무대에 오르기 전 {a}를 먼저 찾는다.',
    '{a}가 {b}에게 처음 쓴 연습 노트를 물려줬다.',
    '{b}가 처음 카메라 앞에 섰을 때 {a}가 옆에 서 있었다.',
    '{a}는 {b}를 두고 "나보다 멀리 갈 애"라고 말했다.',
  ],
  crush: [
    '{a}가 {b}의 파트를 유난히 오래 듣는다.',
    '숙소 복도에서 마주칠 때마다 대화가 길어진다.',
    '{b}가 준 응원 편지를 {a}가 아직 지갑에 넣고 다닌다.',
    '연습이 끝나면 둘만 늦게까지 남는 날이 잦아졌다.',
    '{a}가 {b}의 물병을 매번 챙겨 놓는다.',
    '{b}의 안무 영상만 {a}의 저장 목록에 남아 있다.',
    '서로 눈이 마주치면 먼저 시선을 피하는 쪽이 정해져 있다.',
    '{a}가 {b}에게만 새벽 연습을 같이 하자고 물었다.',
  ],
  dating: [
    '팀에는 아직 아무도 모른다.',
    '숙소 규칙을 어긴 적은 없다고 둘 다 말한다.',
    '스케줄 사이 30분을 늘 같이 보낸다.',
  ],
  conflict: [
    '무대 동선 문제로 크게 부딪힌 뒤 말을 섞지 않는다.',
    '{a}가 지각을 반복하자 {b}가 폭발했다.',
    '연습량을 두고 시작된 말다툼이 아직 풀리지 않았다.',
    '{b}가 올린 SNS 글을 {a}가 저격으로 받아들였다.',
    '{a}의 파트를 {b}가 트레이너에게 문제 삼았다.',
    '숙소 청소 당번 문제로 감정이 상했다.',
    '{b}가 사과했지만 {a}는 받아주지 않았다.',
    '평가 직전 {a}가 동선을 바꾸자고 해 크게 싸웠다.',
    '둘 사이를 아는 멤버들이 자리를 배치할 때 신경을 쓴다.',
  ],
};

// ---------------------------------------------------------------------------
// Album formats
// ---------------------------------------------------------------------------

/** Album formats. `bSideMax` is `trackCount - 1` — the title track is always one. */
export const ALBUM_TYPES: Record<
  AlbumType,
  {
    label: string;
    kicker: string;
    cost: number;
    trackCount: number;
    bSideMax: number;
    blurb: string;
  }
> = {
  single: {
    label: '싱글',
    kicker: 'SINGLE',
    cost: 1_200_000,
    trackCount: 1,
    bSideMax: 0,
    blurb: '타이틀 한 곡. 가장 싸고 가장 빨리 나옵니다.',
  },
  mini: {
    label: '미니',
    kicker: 'MINI ALBUM',
    cost: 2_500_000,
    trackCount: 4,
    bSideMax: 3,
    blurb: '타이틀 + 수록곡 3곡. 신인의 표준 선택입니다.',
  },
  full: {
    label: '정규',
    kicker: 'FULL ALBUM',
    cost: 4_500_000,
    trackCount: 8,
    bSideMax: 7,
    blurb: '타이틀 + 수록곡 7곡. 소형 기획사에는 도박에 가깝습니다.',
  },
};

export const ALBUM_TYPE_ORDER: readonly AlbumType[] = ['single', 'mini', 'full'] as const;

/**
 * Album concepts. Independent of the group's debut concept — a 청량 group can
 * put out a 다크 느와르 album, it just fits worse.
 */
export const ALBUM_CONCEPTS: Record<
  AlbumConcept,
  {
    label: string;
    kicker: string;
    blurb: string;
    /** Genres that express this concept well. */
    genreFit: Partial<Record<Genre, number>>;
    /** Stats the concept leans on when scoring the title track. */
    weights: Record<StatKey, number>;
  }
> = {
  summer: {
    label: '청량 서머',
    kicker: 'SUMMER',
    blurb: '바다, 흰 셔츠, 시원한 고음.',
    genreFit: { dance_pop: 1.25, city_pop: 1.15, rock: 1.0, hip_hop: 0.8 },
    weights: { vocal: 1.3, dance: 1.0, rap: 0.7, visual: 1.2, charisma: 1.1, mental: 0.9 },
  },
  noir: {
    label: '다크 느와르',
    kicker: 'NOIR',
    blurb: '어두운 조명과 서사. 표현력이 없으면 흉내에 그칩니다.',
    genreFit: { edm: 1.2, hip_hop: 1.15, rnb: 1.1, trot: 0.7 },
    weights: { vocal: 1.1, dance: 1.2, rap: 1.0, visual: 1.2, charisma: 1.3, mental: 1.2 },
  },
  citypop: {
    label: '레트로 시티팝',
    kicker: 'CITY POP',
    blurb: '80년대 신스와 야경. 음색 싸움입니다.',
    genreFit: { city_pop: 1.35, rnb: 1.15, dance_pop: 1.05, edm: 0.85 },
    weights: { vocal: 1.3, dance: 0.9, rap: 0.8, visual: 1.1, charisma: 1.2, mental: 1.0 },
  },
  highteen_romance: {
    label: '하이틴 로맨스',
    kicker: 'HIGHTEEN',
    blurb: '교복과 첫사랑. 비주얼과 매력으로 밀어붙입니다.',
    genreFit: { dance_pop: 1.25, ballad: 1.1, city_pop: 1.1, hip_hop: 0.8 },
    weights: { vocal: 1.1, dance: 1.1, rap: 0.8, visual: 1.35, charisma: 1.25, mental: 0.8 },
  },
  hard_hiphop: {
    label: '하드 힙합',
    kicker: 'HARD HIPHOP',
    blurb: '랩이 중심. 실력이 모자라면 바로 티가 납니다.',
    genreFit: { hip_hop: 1.4, rnb: 1.1, edm: 1.0, ballad: 0.7 },
    weights: { vocal: 0.8, dance: 1.2, rap: 1.5, visual: 0.9, charisma: 1.2, mental: 1.0 },
  },
  dreampop: {
    label: '몽환 드림팝',
    kicker: 'DREAM POP',
    blurb: '리버브에 잠긴 사운드. 분위기가 전부입니다.',
    genreFit: { rnb: 1.25, ballad: 1.2, city_pop: 1.15, hip_hop: 0.8 },
    weights: { vocal: 1.35, dance: 0.85, rap: 0.75, visual: 1.1, charisma: 1.2, mental: 1.15 },
  },
  band_rock: {
    label: '밴드 록',
    kicker: 'BAND ROCK',
    blurb: '라이브로 증명하는 콘셉트. 보컬이 무너지면 끝입니다.',
    genreFit: { rock: 1.4, ballad: 1.1, city_pop: 1.0, edm: 0.75 },
    weights: { vocal: 1.4, dance: 0.7, rap: 0.7, visual: 1.0, charisma: 1.15, mental: 1.2 },
  },
  festival_edm: {
    label: '페스티벌 EDM',
    kicker: 'FESTIVAL EDM',
    blurb: '드롭과 칼군무. 무대 장악력으로 승부합니다.',
    genreFit: { edm: 1.4, dance_pop: 1.2, hip_hop: 1.05, ballad: 0.7 },
    weights: { vocal: 0.95, dance: 1.4, rap: 1.0, visual: 1.05, charisma: 1.25, mental: 1.0 },
  },
};

export const ALBUM_CONCEPT_ORDER: readonly AlbumConcept[] = [
  'summer',
  'noir',
  'citypop',
  'highteen_romance',
  'hard_hiphop',
  'dreampop',
  'band_rock',
  'festival_edm',
] as const;

/**
 * The five places production money can go. Each channel feeds exactly one
 * result metric, so the split is a real strategic choice rather than flavour.
 */
export const BUDGET_CHANNELS: Record<
  BudgetChannel,
  { label: string; kicker: string; feeds: string; defaultPct: number }
> = {
  producing: { label: '프로듀싱', kicker: 'PRODUCING', feeds: '음원 성적', defaultPct: 30 },
  mv: { label: '뮤직비디오', kicker: 'MUSIC VIDEO', feeds: '유튜브 조회수', defaultPct: 25 },
  choreography: { label: '안무', kicker: 'CHOREOGRAPHY', feeds: '음악방송 점수', defaultPct: 20 },
  styling: { label: '의상', kicker: 'STYLING', feeds: '팬덤 반응', defaultPct: 10 },
  marketing: { label: '마케팅', kicker: 'MARKETING', feeds: '대중 인지도', defaultPct: 15 },
};

export const BUDGET_CHANNEL_ORDER: readonly BudgetChannel[] = [
  'producing',
  'mv',
  'choreography',
  'styling',
  'marketing',
] as const;

export const MOOD_TAGS: Record<MoodTag, string> = {
  refreshing: '청량한',
  intense: '강렬한',
  melancholy: '쓸쓸한',
  dreamy: '몽환적인',
  playful: '장난스러운',
  lonely: '외로운',
  confident: '당당한',
  nostalgic: '아련한',
  aggressive: '공격적인',
  warm: '따뜻한',
};

export const MOOD_TAG_IDS = Object.keys(MOOD_TAGS) as MoodTag[];

export const ALBUM_FORM = {
  titleMin: 1,
  titleMax: 20,
  trackTitleMax: 20,
  moodMax: 3,
  bpmMin: 70,
  bpmMax: 160,
  bpmDefault: 120,
} as const;

/** Tuning for the album quality formula and the part-share warning. */
export const ALBUM_TUNING = {
  /** Producing share at which the budget contributes nothing extra. */
  producingBaseline: 20,
  /** How much a point of producing share above baseline moves quality. */
  producingWeight: 0.45,
  /** Teamwork's pull on quality, as a share of the distance from 50. */
  teamworkWeight: 0.2,
  /** Concept fit's pull on quality. */
  conceptFitWeight: 0.25,
  /** Quality added per member credited on a track with a writing 특기. */
  writerBonus: 4,
  /** Fandom loyalty added per self-written track. */
  loyaltyPerSelfWritten: 2,
  /** The title track counts this many times as much as a b-side. */
  titleTrackWeight: 3,

  /** Above this share, one member is visibly hogging the title track. */
  skewShareThreshold: 40,
  /** Teamwork lost when the distribution is skewed. */
  skewTeamworkPenalty: 8,
  /** 갈등 지수 gained when the distribution is skewed. */
  skewConflictGain: 10,
} as const;

/** Lower bound of the album/track score for each 5-step grade. */
export const QUALITY_GRADE_THRESHOLDS: readonly { grade: QualityGrade; min: number }[] = [
  { grade: 'S', min: 82 },
  { grade: 'A', min: 68 },
  { grade: 'B', min: 52 },
  { grade: 'C', min: 36 },
  { grade: 'D', min: 0 },
] as const;

/** Deliberately vague — the player never sees the formula. */
export const QUALITY_GRADE_BLURBS: Record<QualityGrade, string> = {
  S: '작업실 분위기가 심상치 않습니다.',
  A: '프로듀서가 만족스러워합니다.',
  B: '무난하게 뽑혔습니다.',
  C: '어딘가 아쉽다는 반응입니다.',
  D: '이대로 내면 묻힐 것 같습니다.',
};

// ---------------------------------------------------------------------------
// Comeback weeks
// ---------------------------------------------------------------------------

export const COMEBACK = {
  /** Weeks of promotion in one comeback cycle. */
  weeks: 4,
  /** Schedule slots per week, shown to the player as 1~5. */
  slotsPerWeek: 5,

  /** Above this fatigue a member is 컨디션 난조 and their effects shrink. */
  fatigueStrainThreshold: 70,
  /** How much of an effect a strained member still contributes. */
  strainedEffectMul: 0.75,
  /** Above this fatigue the member is benched for the following week. */
  fatigueInjuryThreshold: 90,
  /** Fatigue a benched member sheds over the week they sit out. */
  benchRecovery: 45,
  /**
   * The week's five activities are the *group's* week, not one member's, so the
   * summed fatigue is scaled before it lands on each member. Tuned so a
   * maximum-intensity week costs about 32 and four of them in a row put the
   * lineup right at the injury line — the pressure the phase runs on, without
   * benching everyone by week three.
   */
  weeklyFatigueScale: 0.5,
  /** Passive recovery every week, so a light week genuinely digs the group out. */
  weeklyRecovery: 8,
  /**
   * 회사 인지도 climbs fast if the raw activity sum is applied. Scaled so a
   * full comeback moves a small label roughly one tier, not three.
   */
  awarenessScale: 0.5,

  /** Random events drawn per week. */
  eventsPerWeekMin: 2,
  eventsPerWeekMax: 3,

  /** 호감도 a 썸 pair must reach before it can become 연애. */
  romanceAffinityGate: 88,
  /** Chance per week that an eligible 썸 pair converts. */
  romanceChance: 0.35,
  /** At or below this 호감도 a 갈등 pair keeps sliding. */
  conflictSpiralBelow: -60,

  /** Fans gained per point of weekly exposure. */
  fansPerExposure: 34,
  /** First-week sales per point of weekly sales pressure. */
  salesPerPoint: 120,
  /** Streams per point of weekly stream pressure. */
  streamsPerPoint: 9_000,
} as const;

/**
 * The eleven schedule activities.
 *
 * Every number is a per-week contribution before scaling. The resolver bends
 * them by group overall, fandom size, fatigue and benching — see `week.ts`.
 * `cost` is in Won; negative earns money.
 */
export const ACTIVITIES: Record<
  ActivityType,
  {
    label: string;
    kicker: string;
    blurb: string;
    cost: number;
    /** Fatigue added to every participating member. */
    fatigue: number;
    /** 누적 버즈. */
    buzz: number;
    /** 회사 인지도. */
    awareness: number;
    /** Exposure points; the fandom gain is derived from this. */
    exposure: number;
    /** 팬덤 충성도. */
    loyalty: number;
    /** First-week album sales pressure. */
    sales: number;
    /** Streaming pressure. */
    streams: number;
    teamwork: number;
    /** 여론. */
    sentiment: number;
    /** Minimum 회사 인지도 required to book this at all. */
    requiresAwareness?: number;
    /** Times this may appear in one week; omitted means unlimited. */
    maxPerWeek?: number;
    /** Below this awareness the activity is capped at `smallLabelMax`. */
    smallLabelAwareness?: number;
    smallLabelMax?: number;
    /** Needs exactly one member picked. */
    needsMember?: boolean;
  }
> = {
  music_show: {
    label: '음악방송 출연',
    kicker: 'MUSIC SHOW',
    blurb: '대중 인지도가 가장 크게 오르지만 체력을 많이 씁니다.',
    cost: 800_000,
    fatigue: 16,
    buzz: 22,
    awareness: 4,
    exposure: 20,
    loyalty: 1,
    sales: 14,
    streams: 12,
    teamwork: 0,
    sentiment: 1,
    smallLabelAwareness: 30,
    smallLabelMax: 1,
  },
  pre_record: {
    label: '음악방송 사전녹화',
    kicker: 'PRE-RECORD',
    blurb: '코어 팬덤이 크게 결집합니다. 새벽부터 대기해야 합니다.',
    cost: 500_000,
    fatigue: 18,
    buzz: 8,
    awareness: 1,
    exposure: 8,
    loyalty: 7,
    sales: 16,
    streams: 4,
    teamwork: 1,
    sentiment: 0,
  },
  fan_signing: {
    label: '팬사인회',
    kicker: 'FAN SIGNING',
    blurb: '충성도와 초동이 함께 오르고 수익도 남습니다.',
    cost: -1_800_000,
    fatigue: 11,
    buzz: 6,
    awareness: 0,
    exposure: 6,
    loyalty: 9,
    sales: 22,
    streams: 2,
    teamwork: 1,
    sentiment: 1,
  },
  variety: {
    label: '예능 출연',
    kicker: 'VARIETY',
    blurb: '대중 인지도가 오릅니다. 예능감 있는 멤버가 있으면 효과가 커집니다.',
    cost: 0,
    fatigue: 13,
    buzz: 18,
    awareness: 5,
    exposure: 14,
    loyalty: 2,
    sales: 4,
    streams: 5,
    teamwork: 1,
    sentiment: 2,
  },
  radio: {
    label: '라디오',
    kicker: 'RADIO',
    blurb: '체력 소모가 적고 음원에 꾸준히 도움이 됩니다.',
    cost: 0,
    fatigue: 5,
    buzz: 7,
    awareness: 2,
    exposure: 6,
    loyalty: 3,
    sales: 2,
    streams: 8,
    teamwork: 1,
    sentiment: 1,
  },
  self_content: {
    label: '자체 콘텐츠 촬영',
    kicker: 'SELF CONTENT',
    blurb: '팬덤이 늘고 멤버들끼리 가까워집니다.',
    cost: 300_000,
    fatigue: 7,
    buzz: 9,
    awareness: 1,
    exposure: 10,
    loyalty: 6,
    sales: 3,
    streams: 6,
    teamwork: 4,
    sentiment: 1,
  },
  shortform: {
    label: '숏폼 챌린지',
    kicker: 'SHORT-FORM',
    blurb: '킬링파트 멤버의 실력이 그대로 확산력이 됩니다.',
    cost: 150_000,
    fatigue: 6,
    buzz: 20,
    awareness: 3,
    exposure: 12,
    loyalty: 2,
    sales: 5,
    streams: 18,
    teamwork: 0,
    sentiment: 1,
  },
  cf_shoot: {
    label: '광고 촬영',
    kicker: 'CF SHOOT',
    blurb: '자금이 크게 들어옵니다. 인지도가 일정 수준은 되어야 섭외됩니다.',
    cost: -6_000_000,
    fatigue: 14,
    buzz: 10,
    awareness: 2,
    exposure: 8,
    loyalty: 0,
    sales: 2,
    streams: 1,
    teamwork: 0,
    sentiment: 1,
    requiresAwareness: 20,
    maxPerWeek: 1,
  },
  photoshoot: {
    label: '화보 / 인터뷰',
    kicker: 'PHOTOSHOOT',
    blurb: '비주얼 멤버의 개인 팬이 늘고 인지도가 오릅니다.',
    cost: 200_000,
    fatigue: 8,
    buzz: 11,
    awareness: 3,
    exposure: 9,
    loyalty: 3,
    sales: 3,
    streams: 2,
    teamwork: 0,
    sentiment: 1,
  },
  solo_schedule: {
    label: '개인 스케줄',
    kicker: 'SOLO',
    blurb: '지정한 멤버의 개인 팬이 크게 늘지만 나머지가 서운해합니다.',
    cost: 100_000,
    fatigue: 9,
    buzz: 12,
    awareness: 2,
    exposure: 7,
    loyalty: 1,
    sales: 2,
    streams: 4,
    teamwork: -3,
    sentiment: 0,
    needsMember: true,
  },
  rest: {
    label: '휴식',
    kicker: 'REST',
    blurb: '피로도가 크게 줄고 팀 분위기가 좋아집니다. 지표는 그 주 정체합니다.',
    cost: 0,
    fatigue: -22,
    buzz: 0,
    awareness: 0,
    exposure: 0,
    loyalty: 1,
    sales: 0,
    streams: 0,
    teamwork: 5,
    sentiment: 0,
  },
};

export const ACTIVITY_ORDER: readonly ActivityType[] = [
  'music_show',
  'pre_record',
  'fan_signing',
  'variety',
  'radio',
  'self_content',
  'shortform',
  'cf_shoot',
  'photoshoot',
  'solo_schedule',
  'rest',
] as const;

/** Bonuses that only apply when the lineup happens to suit the activity. */
export const ACTIVITY_SYNERGY = {
  /** Extra buzz per member carrying the 예능감 tag on a variety booking. */
  varietyPerFunnyMember: 6,
  /** Short-form scales with the killing-part member's vocal + rap. */
  shortformKillingWeight: 0.35,
  /** Personal fans the visual-position member takes from a photoshoot. */
  photoshootVisualFans: 320,
  /** Personal fans the picked member takes from a solo schedule. */
  soloFans: 900,
  /** Share of a week's fan gain that goes to the centre member. */
  centerFanShare: 0.3,
} as const;

// ---------------------------------------------------------------------------
// Charts and fandom
// ---------------------------------------------------------------------------

export const CHART = {
  /** Sales = fandom core buying power x quality curve; tuned so a rookie
   *  group with 20k fans lands around 15,000 first-week copies. Core and
   *  casual shares come from `Fandom.coreRatio`. */
  salesPerCoreFan: 1.4,
  salesPerCasualFan: 0.25,
  /** Quality above this starts pulling in non-fans. */
  generalPublicThreshold: 65,
  /** Streams generated per point of quality above the threshold. */
  streamsPerQualityPoint: 180_000,
  /** Chart peak 1 requires roughly this score; see formulas.ts. */
  numberOneScore: 88,
  /** Music show win threshold on the same score scale. */
  musicShowWinScore: 72,
} as const;

export const FANDOM = {
  /**
   * Trainee-era core. Each member arrives with a small following of their own,
   * and the fandom's starting size is the sum of those — so a nine-member group
   * debuts in front of more people than a three-member one.
   */
  fansPerMemberMin: 80,
  fansPerMemberMax: 250,

  startingLoyalty: 60,
  startingSentiment: 0,
  startingCoreRatio: 40,

  /** New fans per exposure point per 1 point of group overall. */
  gainPerExposurePoint: 42,
  /** Weekly natural churn of the non-core fandom. */
  churnRate: 0.08,
  /** Loyalty gained per fan-signing slot. */
  loyaltyPerFanService: 1.5,
} as const;

/** Validation bounds for the fandom setup form. */
export const FANDOM_FORM = {
  nameMin: 2,
  nameMax: 12,
  lightstickMax: 16,
  sloganMax: 40,
  defaultColor: '#7FD4FF',
} as const;

/**
 * Preset fandom colours. Real K-pop fandom colours are single flat Pantones, so
 * these are saturated but not neon — and deliberately far enough from
 * `--neon` (#FF1F3D) that the two never read as the same accent.
 */
export const FANDOM_COLORS: readonly { hex: string; label: string }[] = [
  { hex: '#7FD4FF', label: '스카이' },
  { hex: '#2E5BFF', label: '코발트' },
  { hex: '#8A6BFF', label: '라벤더' },
  { hex: '#C86BFF', label: '바이올렛' },
  { hex: '#FF6BC1', label: '로즈' },
  { hex: '#FF8A5C', label: '코랄' },
  { hex: '#FFC93C', label: '허니' },
  { hex: '#E8E36B', label: '루미너스' },
  { hex: '#6BE3A8', label: '민트' },
  { hex: '#1FBFA0', label: '에메랄드' },
  { hex: '#B8894A', label: '카멜' },
  { hex: '#F2F2F5', label: '펄 화이트' },
] as const;

// ---------------------------------------------------------------------------
// Comeback settlement
// ---------------------------------------------------------------------------

/**
 * Every knob behind the results screen.
 *
 * The six headline numbers are the payoff of a whole cycle, so they are tuned
 * to be legible rather than clever: a well-played debut lands a B, a sloppy one
 * a D, and an exceptional one an S.
 */
export const RESULTS = {
  /**
   * 컨셉 적합도 acts as a multiplier on the weighted stat average rather than
   * being multiplied in raw — multiplying two weighted means squares the same
   * signal and collapses every score toward zero.
   */
  qualityConceptFloor: 0.6,
  qualityConceptSpan: 0.005,

  /** 초동 — core fans are the buyers; everyone else is rounding. */
  salesPerFanSigning: 0.15,
  salesLoyaltyDivisor: 200,
  salesRandomMin: 0.9,
  salesRandomMax: 1.15,
  /** Weekly sales pressure accumulated over four weeks folds in here. */
  salesPressureDivisor: 26_000,

  /** 음원 순위 — weights on the chart score, which then maps to a rank. */
  chartQualityWeight: 0.9,
  chartKillingWeight: 0.35,
  chartShortformWeight: 3.2,
  chartAwarenessWeight: 0.5,
  chartSentimentWeight: 0.18,
  chartStreamWeight: 0.000006,
  /** Small labels simply do not get seen. Subtracted below this awareness. */
  smallLabelAwareness: 30,
  smallLabelChartPenalty: 20,
  /**
   * Below this score the single never enters the top 100. Tuned against the
   * 200-run simulation so roughly a quarter of average first comebacks miss
   * the chart entirely — charting has to be an achievement, not a formality.
   */
  chartEntryScore: 43,
  /** Score that reaches number one. */
  chartTopScore: 95,

  /** 유튜브 조회수. */
  mvBaseViews: 42_000,
  mvBudgetWeight: 2.6,
  mvCenterWeight: 0.022,
  mvAwarenessWeight: 0.02,
  mvBuzzWeight: 900,

  /** Settlement. */
  streamsPerSettlementUnit: 1_000,
  /**
   * The label's cut. `ECONOMY.wonPerAlbum` is the retail price and
   * `wonPerThousandStreams` the platform's payout — an agency sees a slice of
   * each after distribution, and 정산 in the brief means exactly that.
   *
   * Without these a debut mini album returned ₩3.3억 on a ₩2.5M budget, which
   * makes every later financial decision meaningless.
   */
  labelAlbumMargin: 0.07,
  labelStreamMargin: 0.25,
  /** Member share of what is left, paid out of the label's net. */
  memberRevenueShare: 0.15,

  /** Composite score weights for the overall grade. */
  gradeWeights: {
    sales: 0.26,
    chart: 0.24,
    mv: 0.14,
    fandom: 0.16,
    awareness: 0.1,
    profit: 0.1,
  },
  /** Reference points that map a raw metric onto 0-100 for the grade. */
  gradeReference: {
    sales: 60_000,
    mvViews: 4_000_000,
    fandomGain: 40_000,
    awarenessGain: 30,
    profit: 30_000_000,
  },

  /**
   * The composite is a weighted mean of six normalised metrics, which
   * mathematically squeezes everything toward the middle — the first
   * simulation put 82% of runs on a D. This expands the spread around the
   * observed centre so the letter grades actually separate.
   */
  scoreCurve: {
    /** Observed median of the raw composite in the 200-run simulation. */
    center: 25.6,
    gain: 3.6,
    /**
     * The raw distribution has a fatter right tail than a normal, so the plain
     * gain pushed 6.5% of average runs to SS. Everything above this point is
     * compressed, which keeps the top grades rare without flattening the
     * middle of the ladder.
     */
    softenAbove: 74,
    softenGain: 0.42,
  },

  /** Debut goal thresholds. */
  goalFirstWeek: 100_000,
  goalAwareness: 50,
} as const;

/** Community reaction pools, keyed by how the comeback went. */
export const REACTION_TONES = ['hyped', 'warm', 'flat', 'harsh'] as const;
export type ReactionTone = (typeof REACTION_TONES)[number];

// ---------------------------------------------------------------------------
// Agency hub: between-cycle systems
// ---------------------------------------------------------------------------

export const HUB = {
  /** Weeks of overhead charged when a cycle is settled. */
  overheadWeeksPerCycle: 4,
  /** Upkeep per undebuted trainee, per cycle. */
  traineeUpkeepPerCycle: 250_000,
  /** Upkeep per debuted member, per cycle — bigger group, bigger payroll. */
  memberUpkeepPerCycle: 400_000,

  /** Two consecutive cycles closing in the red ends the run. */
  deficitCyclesToClose: 2,

  /** Fatigue every member sheds between cycles. */
  restRecovery: 60,

  /**
   * A member whose average 호감도 toward the group sits at or below this may
   * ask out. One bad comeback should not empty the roster, so the roll is
   * deliberately forgiving.
   */
  departureAffinity: -25,
  departureChance: 0.45,
  /** Won it costs to talk one member into staying. */
  persuadeCost: 3_000_000,
  /** Teamwork the group regains when a member is persuaded to stay. */
  persuadeTeamwork: 6,

  /** Trainees needed before a second group can debut. */
  minTraineesForNewGroup: 4,
} as const;

/**
 * 강습 — one lesson per trainee per cycle.
 *
 * Growth is scaled by the trainee's potential grade and hard-capped by the
 * ceiling that grade allows, so a D-grade trainee genuinely cannot be trained
 * into an ace no matter how much money is spent on them.
 */
export const TRAINING = {
  cost: 400_000,
  /** Base points added to the trained stat before the grade multiplier. */
  baseGain: 6,
  /** Ceiling each potential grade allows on a single stat. */
  ceilings: { S: 95, A: 85, B: 75, C: 65, D: 55 } as Record<PotentialGrade, number>,
} as const;

/** Which stats can be taught, and what the lesson is called. */
export const TRAINING_COURSES: readonly { stat: StatKey; label: string; blurb: string }[] = [
  { stat: 'vocal', label: '보컬 강습', blurb: '발성과 음역대를 다듬습니다.' },
  { stat: 'dance', label: '댄스 강습', blurb: '동선과 디테일을 잡습니다.' },
  { stat: 'rap', label: '랩 강습', blurb: '플로우와 발음을 교정합니다.' },
  { stat: 'visual', label: '비주얼 관리', blurb: '스타일링과 체형을 관리합니다.' },
  { stat: 'mental', label: '멘탈 케어', blurb: '무대 불안과 압박을 다룹니다.' },
] as const;

/** What the next agency tier needs, shown on the dashboard. */
export const TIER_REQUIREMENT_NOTE = '회사 인지도가 다음 등급 기준을 넘으면 자동으로 승격합니다.';

// ---------------------------------------------------------------------------
// Grading
// ---------------------------------------------------------------------------

/** Lower bound of the comeback score for each grade, checked high to low. */
export const GRADE_THRESHOLDS: readonly { grade: Grade; min: number }[] = [
  { grade: 'SS', min: 95 },
  { grade: 'S', min: 85 },
  { grade: 'A', min: 72 },
  { grade: 'B', min: 58 },
  { grade: 'C', min: 42 },
  { grade: 'D', min: 25 },
  { grade: 'F', min: 0 },
] as const;

// ---------------------------------------------------------------------------
// Korean display labels
// ---------------------------------------------------------------------------

export const STAT_LABELS: Record<StatKey, string> = {
  vocal: '보컬',
  dance: '댄스',
  rap: '랩',
  visual: '비주얼',
  charisma: '매력',
  mental: '멘탈',
};

/** Korean concept names, derived so the two lists can never disagree. */
export const CONCEPT_LABELS: Record<Concept, string> = Object.fromEntries(
  (Object.keys(GROUP_CONCEPTS) as Concept[]).map((c) => [c, GROUP_CONCEPTS[c].label]),
) as Record<Concept, string>;

export const GENRE_LABELS: Record<Genre, string> = {
  dance_pop: '댄스팝',
  ballad: '발라드',
  hip_hop: '힙합',
  rnb: 'R&B',
  rock: '록',
  city_pop: '시티팝',
  edm: 'EDM',
  trot: '트로트',
};

/** English kicker + Korean title pair shown in every screen header and the rail. */
export const PHASE_LABELS: Record<GamePhase, { kicker: string; label: string }> = {
  intro: { kicker: 'START', label: '타이틀' },
  company_create: { kicker: 'FOUNDING', label: '기획사 설립' },
  trainee_recruit: { kicker: 'RECRUIT', label: '연습생 모집' },
  debut_group: { kicker: 'DEBUT', label: '데뷔조 결성' },
  fandom_setup: { kicker: 'FANDOM', label: '팬덤 설정' },
  album_produce: { kicker: 'PRODUCE', label: '앨범 제작' },
  comeback_week: { kicker: 'PROMO', label: '컴백 활동' },
  results: { kicker: 'RESULTS', label: '컴백 결산' },
  agency_hub: { kicker: 'AGENCY', label: '기획사 사무실' },
};

/**
 * Flavour headlines for the ticker bar. Purely decorative industry chatter —
 * no game state depends on them.
 */
export const TICKER_HEADLINES: readonly string[] = [
  '음원 시장 3분기 스트리밍 총량 전년 대비 12.4% 증가',
  '중소 기획사 데뷔 그룹 수 역대 최다… 경쟁 심화',
  '팬 플랫폼 구독 매출, 실물 음반 매출 처음으로 추월',
  '연말 시상식 신인상 후보군 윤곽… 하반기 데뷔조 강세',
  '음악방송 사전 녹화 일정 조정, 컴백 러시 여파',
  '해외 투어 수요 회복… 중소 그룹 첫 단독 공연 증가',
  '초동 10만 장 돌파 신인 그룹, 올해 들어 네 팀째',
  '광고 업계 신인 모델 선호도 상승, 신인 CF 단가 인상',
] as const;

export const POSITION_LABELS: Record<Position, string> = {
  leader: '리더',
  center: '센터',
  main_vocal: '메인보컬',
  lead_vocal: '리드보컬',
  sub_vocal: '서브보컬',
  main_dancer: '메인댄서',
  lead_dancer: '리드댄서',
  rapper: '래퍼',
  visual: '비주얼',
  maknae: '막내',
};
