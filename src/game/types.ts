/**
 * Core data model for IDOL AGENCY SIMULATOR.
 *
 * Everything here is plain serializable data: the whole GameState is written to
 * localStorage as JSON, so no class instances, Map/Set, Date objects or
 * functions may appear in any of these shapes.
 */

// ---------------------------------------------------------------------------
// Phase state machine
// ---------------------------------------------------------------------------

/**
 * intro -> company_create -> trainee_recruit -> debut_group -> fandom_setup
 *   -> album_produce -> comeback_week (x4) -> results -> agency_hub
 *
 * agency_hub loops back to album_produce for the next album cycle.
 */
export type GamePhase =
  | 'intro'
  | 'company_create'
  | 'trainee_recruit'
  | 'debut_group'
  | 'fandom_setup'
  | 'album_produce'
  | 'comeback_week'
  | 'results'
  | 'agency_hub';

export const PHASE_ORDER: readonly GamePhase[] = [
  'intro',
  'company_create',
  'trainee_recruit',
  'debut_group',
  'fandom_setup',
  'album_produce',
  'comeback_week',
  'results',
  'agency_hub',
] as const;

// ---------------------------------------------------------------------------
// Shared primitives
// ---------------------------------------------------------------------------

/** Unique id, generated from the seeded RNG so saves stay reproducible. */
export type Id = string;

/** 0-100 unless noted otherwise. */
export type Score = number;

export type Grade = 'F' | 'D' | 'C' | 'B' | 'A' | 'S' | 'SS';

/** The eight debut concepts. Each carries a stat weighting in constants.ts. */
export type Concept =
  | 'fresh'
  | 'crush'
  | 'dark_fantasy'
  | 'y2k'
  | 'youth_band'
  | 'highteen'
  | 'dreamy'
  | 'hiphop_crew';

/**
 * Every position is unique within a group except `sub_vocal`, which any number
 * of members may hold.
 */
export type Position =
  | 'leader'
  | 'main_vocal'
  | 'lead_vocal'
  | 'sub_vocal'
  | 'main_dancer'
  | 'lead_dancer'
  | 'rapper'
  | 'visual'
  | 'center'
  | 'maknae';

/** Soft season objective picked at debut, scored on the results screen. */
export type DebutGoal = 'music_show_win' | 'first_week_100k' | 'awareness_50';

// ---------------------------------------------------------------------------
// Stats
// ---------------------------------------------------------------------------

/**
 * The six attributes every trainee and member is measured on. These are also
 * the six axes of StatHexagon — the set is deliberately closed so the radar
 * chart and the stat list can never drift apart.
 */
export interface Stats {
  vocal: Score;
  dance: Score;
  rap: Score;
  visual: Score;
  /** 매력 — stage presence and likeability. */
  charisma: Score;
  /** Resistance to scandal fallout, hate comments and pressure. */
  mental: Score;
}

export type StatKey = keyof Stats;

export const STAT_KEYS: readonly StatKey[] = [
  'vocal',
  'dance',
  'rap',
  'visual',
  'charisma',
  'mental',
] as const;

// ---------------------------------------------------------------------------
// Company
// ---------------------------------------------------------------------------

/** Founding neighbourhood. Each carries a small flavour modifier. */
export type District = 'gangnam' | 'hongdae' | 'seongsu' | 'yeouido' | 'pangyo';

/** Agency size ladder: 소형 → 중소 → 중견 → 대형 → 초대형. */
export type AgencyTierId = 'small' | 'mid_small' | 'mid' | 'major' | 'mega';

export interface Company {
  id: Id;
  /** Player-chosen agency name (Korean or English, 2-12 characters). */
  name: string;
  /** The player's own name in-world. */
  ceoName: string;
  /** Optional tagline, up to 30 characters. */
  slogan: string;
  /** CI colour as a hex string; drives the logo mark and chart series. */
  ciColor: string;
  district: District;
  /** Cash on hand in Korean Won. */
  won: number;
  /** Size tier, derived from awareness via `agencyTier`. */
  tier: AgencyTierId;
  /** 회사 인지도 0-100 — how well the public knows the label. */
  awareness: Score;
  /** 업계 신뢰도 0-100 — gates casting, broadcast slots and investment. */
  trust: Score;
  /** 보유 연습실 — caps how many trainees can train in one slot. */
  practiceRooms: number;
  /** Number of staff slots; each staff member unlocks a schedule action. */
  staff: StaffMember[];
  /** Weeks elapsed since founding. */
  foundedWeek: number;
  /** Accumulated debt; triggers a bad ending if it exceeds the limit. */
  debt: number;
  /**
   * Consecutive cycles that closed with negative funds. Two in a row ends the
   * run — one bad comeback is a crisis, two is a closure.
   */
  deficitCycles: number;
  /** Lifetime revenue across every settled comeback. */
  totalRevenue: number;
}

/** What the creation form collects before a Company is built. */
export interface CompanyDraft {
  name: string;
  ceoName: string;
  slogan: string;
  ciColor: string;
  district: District;
}

export interface StaffMember {
  id: Id;
  name: string;
  role: 'manager' | 'vocal_trainer' | 'dance_trainer' | 'producer' | 'stylist' | 'pr';
  skill: Score;
  /** Weekly salary in Won. */
  salary: number;
}

// ---------------------------------------------------------------------------
// Trainees and group members
// ---------------------------------------------------------------------------

export type Gender = 'female' | 'male';

export type Nationality = 'kr' | 'jp' | 'cn' | 'th' | 'us';

/** Hidden growth ceiling, revealed by training or a paid evaluation. */
export type PotentialGrade = 'S' | 'A' | 'B' | 'C' | 'D';

export type PersonalityTagId =
  | 'competitive'
  | 'timid'
  | 'leadership'
  | 'professional'
  | 'lazy'
  | 'grinder'
  | 'star_quality'
  | 'fragile'
  | 'funny'
  | 'blunt'
  | 'aegyo'
  | 'perfectionist';

export type SpecialtyId =
  | 'lyrics'
  | 'composing'
  | 'choreography'
  | 'language'
  | 'athletics'
  | 'instrument'
  | 'adlib';

export interface Trainee {
  id: Id;
  /** Typed by the player at the audition. */
  name: string;
  gender: Gender;
  age: number;
  nationality: Nationality;
  stats: Stats;
  /** The one stat that rolled a bonus at recruitment. */
  signatureStat: StatKey;
  /** Hidden until `potentialRevealed`. */
  potentialGrade: PotentialGrade;
  potentialRevealed: boolean;
  /** Weeks of training completed; reveals the grade once it reaches the gate. */
  trainedWeeks: number;
  /** Exactly two, drawn from PERSONALITY_TAGS. */
  personality: PersonalityTagId[];
  specialty: SpecialtyId;
  /** 0-100, drops with overwork and rises with rest. */
  condition: Score;
  /** 0-100, high fatigue causes injuries and stat loss. */
  fatigue: Score;
  /** Personal fan count, starts at 0. */
  personalFans: number;
  /** What the audition cost in Won — 0 while free slots remain. */
  recruitCost: number;
  /** Week the trainee joined the agency. */
  joinedWeek: number;
  /** True once promoted into the debut group. */
  debuted: boolean;
  /** Cycle number of the last 강습; one lesson per trainee per cycle. */
  lastTrainedCycle: number;
}

export interface Member {
  id: Id;
  /** Back-reference to the Trainee record this member was promoted from. */
  traineeId: Id;
  name: string;
  position: Position;
  stats: Stats;
  /** Copied from the trainee so member cards render without a roster lookup. */
  age: number;
  gender: Gender;
  nationality: Nationality;
  personality: PersonalityTagId[];
  specialty: SpecialtyId;
  potentialGrade: PotentialGrade;
  signatureStat: StatKey;
  /** Individual popularity 0-100, drives solo schedules and CF offers. */
  popularity: Score;
  /** Personal fan count, sums into Fandom.size. */
  personalFans: number;
  condition: Score;
  fatigue: Score;
}

// ---------------------------------------------------------------------------
// Relationships
// ---------------------------------------------------------------------------

/**
 * 절친 / 라이벌 / 어색함 / 멘토-멘티 / 썸 / 연애 / 갈등.
 *
 * `dating` never appears at debut — it can only develop through play, which is
 * what `Relationship.romanceLocked` guards.
 */
export type RelationType =
  | 'best_friend'
  | 'rival'
  | 'awkward'
  | 'mentor'
  | 'crush'
  | 'dating'
  | 'conflict';

/** One entry in a pair's history. Appended during the comeback weeks. */
export interface RelationshipEvent {
  id: Id;
  /** In-game week the event fired. */
  week: number;
  /** Korean sentence shown in the pair's history log. */
  text: string;
  /** Change applied to the pair's 호감도 by this event. */
  affinityDelta: number;
  /** Set when the event changed the relationship type. */
  becameType?: RelationType;
}

export interface Relationship {
  /** Member ids, always stored in lineup order so the pair key is stable. */
  a: Id;
  b: Id;
  type: RelationType;
  /** 호감도, -100 (feuding) to 100 (inseparable). */
  affinity: number;
  /** For `mentor`, the id of the member doing the mentoring. */
  mentorFrom?: Id;
  /** Korean origin sentence generated at debut. */
  origin: string;
  /** Accumulating story log; starts empty. */
  log: RelationshipEvent[];
  /**
   * False until play unlocks 연애 for this pair. Nothing at debut sets it, so
   * a group can never start out dating.
   */
  romanceLocked: boolean;
}

export interface Group {
  id: Id;
  name: string;
  concept: Concept;
  goal: DebutGoal;
  memberIds: Id[];
  members: Member[];
  relationships: Relationship[];
  /** In-game week the group debuted. */
  debutWeek: number;
  /** 팀워크 0-100, derived from average 호감도. */
  teamwork: Score;
  /** 갈등 지수 0-100, from the share of negative pairs. */
  conflictIndex: Score;
  /** 스캔들 리스크 0-100; rises with romance and low teamwork. */
  scandalRisk: Score;
  /** 컨셉 적합도 0-100, from the concept's stat weights. */
  conceptFit: Score;
  /** Aggregate skill snapshot recomputed after training. */
  overall: Score;
  /** Fan-facing group colour; defaults to the agency CI colour. */
  colorHex: string;
}

/** What the debut wizard collects before a Group is built. */
export interface GroupDraft {
  name: string;
  memberCount: number;
  concept: Concept;
  goal: DebutGoal;
  /** Trainee ids in lineup order. */
  traineeIds: Id[];
  /** Position per trainee id. */
  positions: Record<Id, Position>;
}

// ---------------------------------------------------------------------------
// Fandom
// ---------------------------------------------------------------------------

export interface Fandom {
  /** Official fandom name chosen by the player, e.g. "별빛". */
  name: string;
  /**
   * Fandom colour.
   *
   * This is a **secondary** accent. It may appear in the fandom panel, results
   * chart series and the group profile card — never in buttons or global
   * chrome, where neon red stays the only system accent.
   */
  color: string;
  /** Optional lightstick name, e.g. "별빛봉". */
  lightstickName: string;
  /** Optional fandom slogan, up to 40 characters. */
  slogan: string;
  /** 팬덤 규모 — total fan count; the sum of every member's 개인 팬. */
  size: number;
  /** 충성도 0-100, how much of the fandom converts to purchases. */
  loyalty: Score;
  /** 여론 -100 to +100. Negative means the public has turned. */
  sentiment: number;
  /** 코어 팬 비율, percent of `size` that buys everything. */
  coreRatio: Score;
  /** Rolling weekly growth used for trend arrows. */
  weeklyGrowth: number;
  /** In-game week the fandom was named. */
  foundedWeek: number;
}

/** A member asking to leave, waiting on the player's answer. */
export interface PendingDeparture {
  id: Id;
  memberId: Id;
  memberName: string;
  /** Average 호감도 toward the rest of the group. */
  averageAffinity: number;
  /** Korean explanation of why they want out. */
  reason: string;
  /** Won it costs to talk them into staying. */
  persuadeCost: number;
}

/** Why the run ended. */
export interface GameOver {
  reason: 'bankruptcy';
  /** Korean headline. */
  title: string;
  /** Korean body lines. */
  lines: string[];
  /** Final numbers for the run summary. */
  cycles: number;
  weeks: number;
  bestGrade: Grade | null;
  bestFirstWeek: number;
  finalFandom: number;
  totalRevenue: number;
}

/** What the fandom setup screen collects before a Fandom is built. */
export interface FandomDraft {
  name: string;
  color: string;
  lightstickName: string;
  slogan: string;
}

// ---------------------------------------------------------------------------
// Albums and tracks
// ---------------------------------------------------------------------------

/** Album concept, chosen independently of the group's debut concept. */
export type AlbumConcept =
  | 'summer'
  | 'noir'
  | 'citypop'
  | 'highteen_romance'
  | 'hard_hiphop'
  | 'dreampop'
  | 'band_rock'
  | 'festival_edm';

export type AlbumType = 'single' | 'mini' | 'full';

/** Mood tags for the title track; at most three. */
export type MoodTag =
  | 'refreshing'
  | 'intense'
  | 'melancholy'
  | 'dreamy'
  | 'playful'
  | 'lonely'
  | 'confident'
  | 'nostalgic'
  | 'aggressive'
  | 'warm';

/** Five-step ladder shared with the trainee potential grade. */
export type QualityGrade = PotentialGrade;

/**
 * How the production budget is split, in percent. The five values always sum to
 * 100 — `rebalanceAllocation` is the only thing that should ever change them.
 */
export interface BudgetAllocation {
  /** 프로듀싱 — feeds 음원 성적. */
  producing: number;
  /** 뮤직비디오 — feeds 유튜브 조회수. */
  mv: number;
  /** 안무 — feeds 음악방송 점수. */
  choreography: number;
  /** 의상 — feeds 팬덤 반응. */
  styling: number;
  /** 마케팅 — feeds 대중 인지도. */
  marketing: number;
}

export type BudgetChannel = keyof BudgetAllocation;

export interface Track {
  id: Id;
  title: string;
  kind: 'title' | 'b_side';
  genre: Genre;
  /** Title track only: 70-160. */
  bpm?: number;
  /** Title track only: at most three mood tags. */
  moods?: MoodTag[];
  /**
   * Members credited on the track. A participant whose 특기 is 작사 or 작곡
   * raises album quality and fandom loyalty.
   */
  participantIds: Id[];
  /** Composite 0-100 quality used by the chart formula. */
  quality: Score;
}

export type Genre =
  | 'dance_pop'
  | 'ballad'
  | 'hip_hop'
  | 'rnb'
  | 'rock'
  | 'city_pop'
  | 'edm'
  | 'trot';

export interface Album {
  id: Id;
  title: string;
  concept: AlbumConcept;
  type: AlbumType;
  tracks: Track[];
  /** Id of the promoted single within `tracks`. */
  titleTrackId: Id;
  /** Total production spend in Won, set by the album type. */
  budget: number;
  allocation: BudgetAllocation;
  /** 센터 — drives 개인 팬 gain and 대중 인지도. */
  centerMemberId: Id;
  /** 킬링파트 — drives 음원 성적 and short-form virality. */
  killingPartMemberId: Id;
  /** Title-track line share per member id, in percent, summing to 100. */
  partShares: Record<Id, number>;
  /** Weighted average of track quality plus concept fit. */
  quality: Score;
  qualityGrade: QualityGrade;
  /** Korean album introduction, generated at production time. */
  introText: string;
  releaseWeek: number;
  /** Filled in after the comeback resolves. */
  result: ComebackResult | null;
  /** Cycle number: 1 for the debut album, 2 for the next, and so on. */
  cycle: number;
}

/** What the four-step production wizard collects before an Album is built. */
export interface AlbumDraft {
  title: string;
  concept: AlbumConcept;
  type: AlbumType;
  allocation: BudgetAllocation;
  titleTrack: {
    title: string;
    genre: Genre;
    bpm: number;
    moods: MoodTag[];
  };
  bSides: {
    title: string;
    genre: Genre;
    participantIds: Id[];
  }[];
  centerMemberId: Id;
  killingPartMemberId: Id;
  partShares: Record<Id, number>;
}

// ---------------------------------------------------------------------------
// Weekly schedule
// ---------------------------------------------------------------------------

/** The eleven things a promotion week can be spent on. */
export type ActivityType =
  | 'music_show'
  | 'pre_record'
  | 'fan_signing'
  | 'variety'
  | 'radio'
  | 'self_content'
  | 'shortform'
  | 'cf_shoot'
  | 'photoshoot'
  | 'solo_schedule'
  | 'rest';

/** One of the five slots in a promotion week. */
export interface ScheduleSlot {
  /** 0-4, rendered to the player as 1~5. */
  index: number;
  activity: ActivityType | null;
  /** Required by `solo_schedule`; ignored by every other activity. */
  memberId?: Id;
}

export interface WeekLogEntry {
  id: Id;
  /** Korean text shown in the recap feed. */
  text: string;
  tone: 'good' | 'bad' | 'neutral' | 'critical';
}

/** Everything one resolved week changed, kept for the recap and the results. */
export interface WeekLog {
  week: number;
  /** 1-4 within the current comeback promotion cycle. */
  promoWeek: number;
  slots: ScheduleSlot[];
  entries: WeekLogEntry[];

  buzzDelta: number;
  fanDelta: number;
  wonDelta: number;
  loyaltyDelta: number;
  awarenessDelta: number;
  sentimentDelta: number;
  salesDelta: number;
  streamDelta: number;
  /** Average fatigue added across the lineup. */
  fatigueDelta: number;

  /**
   * Absolute values at the end of the week.
   *
   * The results chart plots these directly rather than accumulating deltas —
   * event effects are applied while answering, outside any week's delta, so a
   * reconstructed series drifts away from the headline number.
   */
  fandomAfter: number;
  buzzAfter: number;

  /** Members whose fatigue forced them out of the following week. */
  benchedIds: Id[];
  /** Event ids that fired this week. */
  eventIds: string[];
  /** Korean recap written like a fan community post. */
  recap: string;
}

/** An event waiting for the player to choose. */
export interface PendingEvent {
  /** Unique per firing, so the same event can recur across weeks. */
  id: Id;
  eventId: string;
  week: number;
  /** Member the event is about, when it targets one. */
  memberId?: Id;
  /** Pair the event is about, when it targets a relationship. */
  pairA?: Id;
  pairB?: Id;
  /** Korean body, resolved at fire time so names are already spliced in. */
  body: string;
}

// ---------------------------------------------------------------------------
// Events
// ---------------------------------------------------------------------------

export type EventCategory =
  | 'scandal'
  | 'lucky'
  | 'member'
  | 'industry'
  | 'fandom'
  | 'health';

/** What an event targets, which decides how its body text is filled in. */
export type EventTarget = 'none' | 'member' | 'lowest_mental' | 'pair' | 'romance_pair';

export interface GameEvent {
  id: string;
  /** English kicker for the modal. */
  kicker: string;
  /** Korean headline. */
  title: string;
  /** Korean body, 2-4 lines. `{a}` / `{b}` / `{group}` are filled at fire time. */
  body: string;
  category: EventCategory;
  target: EventTarget;
  /** Relative likelihood in the weekly draw. */
  weight: number;
  choices: EventChoice[];
}

export interface EventChoice {
  id: string;
  /** Korean button label. */
  label: string;
  /** Korean line shown in the recap after resolving. */
  resultText: string;
  effects: EventEffect;
}

/**
 * Every field is a signed delta. Absent means "leave it alone" — an effect
 * never assigns, so applying several in a row composes cleanly.
 */
export interface EventEffect {
  won?: number;
  /** 누적 버즈. */
  buzz?: number;
  /** 회사 인지도. */
  awareness?: number;
  /** 업계 신뢰도. */
  trust?: number;
  fanSize?: number;
  fanLoyalty?: number;
  /** 여론, -100..100. */
  sentiment?: number;
  teamwork?: number;
  conflict?: number;
  scandalRisk?: number;
  /** Fatigue added to every member. */
  fatigue?: number;
  /** Fatigue added to the targeted member only. */
  memberFatigue?: number;
  /** 개인 팬 added to the targeted member. */
  memberFans?: number;
  /**
   * Condition damage on the targeted member, amplified when their 멘탈 is low.
   * See `mentalDamage` in formulas.ts.
   */
  mentalHit?: number;
  /** 호감도 change applied to the targeted pair. */
  pairAffinity?: number;
  /** Album first-week sales. */
  sales?: number;
  streams?: number;
}

// ---------------------------------------------------------------------------
// Comeback results
// ---------------------------------------------------------------------------

/** One headline metric plus the plain-Korean reason it landed where it did. */
export interface ResultMetric {
  /** Already formatted for display. */
  value: string;
  /** Raw number, for the chart and the copy summary. */
  raw: number;
  /** Signed change vs. before the comeback, when there is one. */
  delta?: number;
  deltaLabel?: string;
  /** One Korean line explaining what drove it. */
  reason: string;
}

/** Per-member settlement line. */
export interface MemberResult {
  memberId: Id;
  name: string;
  personalFans: number;
  fanGain: number;
  /** 1 = most talked about this comeback. */
  buzzRank: number;
  /** One Korean sentence about this member's comeback. */
  note: string;
}

/** A relationship that visibly moved during the comeback. */
export interface RelationshipDiff {
  a: Id;
  b: Id;
  nameA: string;
  nameB: string;
  /** Type after the comeback. */
  type: RelationType;
  /** Set when the pair changed type during the cycle. */
  becameType?: RelationType;
  affinityDelta: number;
  /** Korean one-liner for the diff list. */
  text: string;
}

/** One week of the four-week series, for the line chart. */
export interface WeekSeriesPoint {
  promoWeek: number;
  fandom: number;
  buzz: number;
}

export interface ComebackResult {
  albumId: Id;
  cycle: number;

  /** Physical copies sold in the first week. */
  firstWeekSales: number;
  /** Peak position on the main chart, 1 = number one, 0 = did not chart. */
  chartPeak: number;
  /** Four-week cumulative music video views. */
  mvViews: number;
  /** Cumulative streaming count. */
  streams: number;
  /** Music show wins during the promotion. */
  musicShowWins: number;

  fandomBefore: number;
  fandomAfter: number;
  awarenessBefore: number;
  awarenessAfter: number;

  revenue: number;
  expense: number;
  /** revenue - expense, may be negative. */
  profit: number;
  /** Cash on hand after settlement. */
  wonAfter: number;

  /** The six headline metrics, in display order. */
  metrics: {
    firstWeekSales: ResultMetric;
    chartPeak: ResultMetric;
    mvViews: ResultMetric;
    fandom: ResultMetric;
    awareness: ResultMetric;
    profit: ResultMetric;
  };

  /** 0-100 composite behind the grade. */
  score: number;
  grade: Grade;

  goal: DebutGoal;
  goalMet: boolean;
  /** Korean line stating how the goal went. */
  goalText: string;

  series: WeekSeriesPoint[];
  memberResults: MemberResult[];
  relationshipDiffs: RelationshipDiff[];

  /** Three generated Korean press headlines. */
  headlines: string[];
  /** Five generated Korean community reactions. */
  reactions: string[];

  /** Set when the comeback pushed the agency up a tier. */
  promotedFrom?: AgencyTierId;
  promotedTo?: AgencyTierId;
}

// ---------------------------------------------------------------------------
// Root save shape
// ---------------------------------------------------------------------------

/** Serializable RNG position; see rng.ts. */
export interface RngState {
  seed: number;
  /** Number of values drawn so far, replayed on load to restore position. */
  cursor: number;
}

export interface GameState {
  /** Bumped whenever the save shape changes; drives migration. */
  version: number;
  phase: GamePhase;
  rng: RngState;
  /** In-game week counter, increments once per resolved week. */
  week: number;
  /** 1-4 inside the current comeback promotion. */
  promoWeek: number;
  /** Album cycle number, starts at 1. */
  cycle: number;

  company: Company | null;
  /** Recruited but not yet debuted. */
  trainees: Trainee[];
  group: Group | null;
  fandom: Fandom | null;
  albums: Album[];
  /** Id of the album currently being promoted. */
  activeAlbumId: Id | null;

  /** The current promotion week's five slots. */
  schedule: ScheduleSlot[];
  weekLogs: WeekLog[];
  /** Events awaiting player choices; the week cannot advance until it empties. */
  pendingEvents: PendingEvent[];
  /**
   * The week whose random events have already been drawn.
   *
   * Without this the draw is not idempotent: answering the last event empties
   * `pendingEvents`, which looks identical to "not drawn yet" and makes the
   * screen draw a fresh set forever.
   */
  eventsDrawnWeek: number | null;
  /** 누적 버즈 across the comeback. */
  buzz: number;
  /** Album first-week sales accumulated so far this cycle. */
  sales: number;
  /** Cumulative streams this cycle. */
  streams: number;
  /** Music show wins this cycle. */
  musicShowWins: number;
  /** Members benched by fatigue for the current week. */
  benchedIds: Id[];
  /** Members asking to leave; the hub blocks a new cycle until answered. */
  pendingDepartures: PendingDeparture[];
  /** Set once the run has ended. Rendered instead of any phase screen. */
  gameOver: GameOver | null;
  /** Cycle whose operating costs have already been settled. */
  settledCycle: number | null;
  /**
   * Snapshot taken when the comeback started, so the results screen can show
   * real deltas instead of guessing at where the cycle began.
   */
  cycleStart: { fandomSize: number; awareness: number } | null;
  /**
   * Korean result lines from events already answered this week. Kept in the
   * save so refreshing mid-week does not lose what the player decided; folded
   * into the recap and cleared when the week closes.
   */
  answeredLines: { id: Id; eventId: string; text: string }[];

  /** One-shot flags: tutorials seen, endings unlocked, milestones hit. */
  flags: Record<string, boolean>;
  /** Unix ms of the last save, used for the "이어하기" screen. */
  savedAt: number;
}
