/**
 * Global game store.
 *
 * The store holds state and calls into `src/game/` for every calculation — it
 * never does game math itself. Persistence is automatic: `persist` writes the
 * whole GameState to localStorage on every change, so any phase transition is
 * resumable after a refresh.
 */

import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';

import { getActiveSlot, slotKey } from './saves';
import {
  ALBUM_TUNING,
  COMEBACK,
  DISTRICTS,
  HUB,
  RECRUIT,
  SAVE_VERSION,
  TRAINING,
} from '../game/constants';
import {
  choiceResultText,
  effectTargets,
  resolveChoice,
  rollWeeklyEvents,
} from '../game/events';
import { applyEventEffect, resolveWeek } from '../game/week';
import { settleComeback } from '../game/settle';
import { applyTraining, settleCycle, trainingOutcome } from '../game/hub';
import {
  createCompany,
  createAlbum,
  createMember,
  foundFandom,
  generateRelationships,
  generateTrainee,
} from '../game/generators';
import {
  albumConceptFit,
  albumCost,
  averageTeamStats,
  clampScore,
  conceptFit,
  partSkew,
  groupOverall,
  recruitBlock,
  recruitCost,
  teamChemistry,
} from '../game/formulas';
import { createRng, createSeed, randId, randInt, snapshot } from '../game/rng';
import type {
  ActivityType,
  AlbumDraft,
  CompanyDraft,
  FandomDraft,
  GamePhase,
  GameState,
  Gender,
  Group,
  GroupDraft,
  Id,
  ScheduleSlot,
  StatKey,
} from '../game/types';

/** Reasons an audition can be refused. `no_company` should be unreachable. */
export type RecruitFailure = 'roster_full' | 'insufficient_funds' | 'no_company' | 'no_name';

export interface GameStore extends GameState {
  /**
   * Session-only: false until the player picks 새 게임 or 이어하기. Not
   * persisted, so every page load opens on the intro regardless of how far the
   * save has progressed.
   */
  booted: boolean;

  /** Leave the intro and show the game at whatever phase the save holds. */
  boot: () => void;
  /** Move to a phase. Every transition goes through here so it gets persisted. */
  setPhase: (phase: GamePhase) => void;
  /** Found the agency and advance to trainee recruitment. */
  createCompany: (draft: CompanyDraft) => void;

  /**
   * Run one audition. Returns why it was refused, or null on success — the
   * caller turns that into a Korean toast.
   */
  recruitTrainee: (name: string, gender: Gender) => RecruitFailure | null;
  /** Drop a trainee from the roster. Refunds nothing. */
  releaseTrainee: (id: Id) => void;
  /** Pay for a 평가 세션 to reveal the potential grade immediately. */
  evaluateTrainee: (id: Id) => 'insufficient_funds' | null;

  /** Debut the group and advance to fandom setup. */
  createGroup: (draft: GroupDraft) => void;
  /** Name the fandom and advance to album production. */
  createFandom: (draft: FandomDraft) => void;

  /**
   * Freeze the album, pay for it, and start the four-week comeback. Returns
   * why it was refused, or null on success.
   */
  produceAlbum: (draft: AlbumDraft) => 'insufficient_funds' | 'no_group' | null;

  /** Put an activity in one of the week's five slots, or clear it with null. */
  setSlot: (index: number, activity: ActivityType | null, memberId?: Id) => void;
  /** Draw this week's random events. Called once, when the board is full. */
  openWeekEvents: () => void;
  /** Answer one pending event. The week can only close when none are left. */
  answerEvent: (pendingId: Id, choiceId: string) => void;
  /** Resolve the week and advance. Requires a full board and no pending events. */
  closeWeek: () => void;
  /**
   * Settle the finished cycle: operating costs, rest, departure rolls. Runs
   * once per cycle — the `settledCycle` marker makes it idempotent.
   */
  settleCycle: () => void;
  /** Answer a member's departure: persuade them to stay, or let them go. */
  resolveDeparture: (departureId: Id, persuade: boolean) => 'insufficient_funds' | null;
  /** Pay for one 강습. Returns why it was refused, or null on success. */
  trainTrainee: (
    traineeId: Id,
    stat: StatKey,
  ) => 'already_trained' | 'at_ceiling' | 'insufficient_funds' | null;
  /** Start the next album cycle with the existing group. */
  startNextAlbum: () => void;

  /** Set a one-shot flag (tour seen, tutorials, milestones). */
  setFlag: (key: string, value: boolean) => void;

  /** Wipe the save and start over from `intro` with a fresh seed. */
  resetGame: (seed?: number) => void;
  /** True when there is a playthrough worth resuming. */
  hasSave: () => boolean;
}

/** A fresh, empty board of five slots. */
function emptySchedule(): ScheduleSlot[] {
  return Array.from({ length: COMEBACK.slotsPerWeek }, (_, index) => ({
    index,
    activity: null,
  }));
}

function createInitialState(seed = createSeed()): GameState {
  return {
    version: SAVE_VERSION,
    phase: 'intro',
    rng: { seed, cursor: 0 },
    week: 0,
    promoWeek: 0,
    cycle: 1,

    company: null,
    trainees: [],
    group: null,
    fandom: null,
    albums: [],
    activeAlbumId: null,

    schedule: [],
    weekLogs: [],
    pendingEvents: [],
    eventsDrawnWeek: null,
    buzz: 0,
    sales: 0,
    streams: 0,
    musicShowWins: 0,
    benchedIds: [],
    pendingDepartures: [],
    gameOver: null,
    settledCycle: null,
    cycleStart: null,
    answeredLines: [],

    flags: {},
    savedAt: 0,
  };
}

export const useGameStore = create<GameStore>()(
  persist(
    (set, get) => ({
      ...createInitialState(),
      booted: false,

      boot: () => set({ booted: true }),

      setPhase: (phase) => set({ phase, savedAt: Date.now() }),

      createCompany: (draft) => {
        const { rng: rngState } = get();
        // Draw from the saved stream position, then write the cursor back so
        // the next draw continues where this one stopped.
        const rng = createRng(rngState);
        const company = createCompany(rng, draft);

        set({
          company,
          rng: snapshot(rng),
          phase: 'trainee_recruit',
          week: 1,
          booted: true,
          savedAt: Date.now(),
        });
      },

      recruitTrainee: (name, gender) => {
        const { company, trainees, rng: rngState, week } = get();
        if (!company) return 'no_company';
        if (name.trim().length === 0) return 'no_name';

        const blocked = recruitBlock(trainees.length, company.won);
        if (blocked) return blocked;

        const cost = recruitCost(trainees.length);
        const rng = createRng(rngState);
        const trainee = generateTrainee(rng, {
          name,
          gender,
          joinedWeek: week,
          recruitCost: cost,
          qualityMul: DISTRICTS[company.district].traineeQualityMul,
        });

        set({
          trainees: [...trainees, trainee],
          company: { ...company, won: company.won - cost },
          rng: snapshot(rng),
          savedAt: Date.now(),
        });
        return null;
      },

      releaseTrainee: (id) =>
        set((state) => ({
          trainees: state.trainees.filter((t) => t.id !== id),
          savedAt: Date.now(),
        })),

      evaluateTrainee: (id) => {
        const { company, trainees } = get();
        if (!company) return 'insufficient_funds';
        if (company.won < RECRUIT.evaluationCost) return 'insufficient_funds';

        set({
          company: { ...company, won: company.won - RECRUIT.evaluationCost },
          trainees: trainees.map((t) => (t.id === id ? { ...t, potentialRevealed: true } : t)),
          savedAt: Date.now(),
        });
        return null;
      },

      createGroup: (draft) => {
        const { company, trainees, rng: rngState, week } = get();
        if (!company) return;

        const rng = createRng(rngState);

        // Lineup order follows draft.traineeIds so the relationship matrix and
        // the map both index members the same way.
        const members = draft.traineeIds
          .map((id) => trainees.find((t) => t.id === id))
          .filter((t): t is NonNullable<typeof t> => Boolean(t))
          .map((t) => createMember(rng, t, draft.positions[t.id] ?? 'sub_vocal'));

        const relationships = generateRelationships(rng, members);
        const chemistry = teamChemistry(relationships);
        const teamStats = averageTeamStats(members);

        const group: Group = {
          id: randId(rng, 'gr'),
          name: draft.name.trim(),
          concept: draft.concept,
          goal: draft.goal,
          memberIds: members.map((m) => m.id),
          members,
          relationships,
          debutWeek: week,
          teamwork: chemistry.teamwork,
          conflictIndex: chemistry.conflictIndex,
          scandalRisk: chemistry.scandalRisk,
          conceptFit: conceptFit(teamStats, draft.concept),
          overall: groupOverall(teamStats),
          colorHex: company.ciColor,
        };

        const debutedIds = new Set(draft.traineeIds);

        set({
          group,
          trainees: trainees.map((t) =>
            debutedIds.has(t.id) ? { ...t, debuted: true } : t,
          ),
          rng: snapshot(rng),
          phase: 'fandom_setup',
          booted: true,
          savedAt: Date.now(),
        });
      },

      createFandom: (draft) => {
        const { group, rng: rngState, week } = get();
        if (!group) return;

        const rng = createRng(rngState);
        const founded = foundFandom(rng, draft, group.members, week);

        set({
          fandom: founded.fandom,
          // Members carry their own 개인 팬, and Fandom.size is their sum.
          group: { ...group, members: founded.members },
          rng: snapshot(rng),
          phase: 'album_produce',
          booted: true,
          savedAt: Date.now(),
        });
      },

      produceAlbum: (draft) => {
        const { company, group, fandom, rng: rngState, week, cycle } = get();
        if (!company || !group) return 'no_group';

        const cost = albumCost(draft.type);
        if (company.won < cost) return 'insufficient_funds';

        const rng = createRng(rngState);
        const teamStats = averageTeamStats(group.members);
        const album = createAlbum(rng, {
          draft,
          group,
          teamStats,
          conceptFitPct: albumConceptFit(teamStats, draft.concept),
          week,
          cycle,
        });

        // A skewed title-track split buys the top member attention at the cost
        // of the room: teamwork drops, conflict rises, and the comeback weeks
        // get a 파트 분배 논란 to draw from.
        const skew = partSkew(draft.partShares);
        const nextGroup = skew.skewed
          ? {
              ...group,
              teamwork: clampScore(group.teamwork - ALBUM_TUNING.skewTeamworkPenalty),
              conflictIndex: clampScore(group.conflictIndex + ALBUM_TUNING.skewConflictGain),
            }
          : group;

        // Members writing their own material is what a fandom actually rewards.
        const selfWritten = album.tracks.filter((t) => t.participantIds.length > 0).length;
        const nextFandom = fandom
          ? {
              ...fandom,
              loyalty: clampScore(
                fandom.loyalty + selfWritten * ALBUM_TUNING.loyaltyPerSelfWritten,
              ),
            }
          : fandom;

        set({
          albums: [...get().albums, album],
          activeAlbumId: album.id,
          company: { ...company, won: company.won - cost },
          group: nextGroup,
          fandom: nextFandom,
          rng: snapshot(rng),
          phase: 'comeback_week',
          promoWeek: 1,
          schedule: emptySchedule(),
          benchedIds: [],
          cycleStart: {
            fandomSize: fandom?.size ?? 0,
            awareness: company.awareness,
          },
          pendingEvents: [],
          eventsDrawnWeek: null,
          answeredLines: [],
          buzz: 0,
          sales: 0,
          streams: 0,
          musicShowWins: 0,
          weekLogs: [],
          booted: true,
          savedAt: Date.now(),
        });
        return null;
      },

      setSlot: (index, activity, memberId) =>
        set((state) => ({
          schedule: state.schedule.map((s) =>
            s.index === index ? { index, activity, memberId } : s,
          ),
          savedAt: Date.now(),
        })),

      openWeekEvents: () => {
        const state = get();
        // Draw once per week, no matter how often the screen re-renders.
        if (state.eventsDrawnWeek === state.week) return;
        if (state.pendingEvents.length > 0) return;

        const rng = createRng(state.rng);
        const count = randInt(rng, COMEBACK.eventsPerWeekMin, COMEBACK.eventsPerWeekMax);
        const events = rollWeeklyEvents(rng, state, count);

        set({
          pendingEvents: events,
          eventsDrawnWeek: state.week,
          rng: snapshot(rng),
          savedAt: Date.now(),
        });
      },

      answerEvent: (pendingId, choiceId) => {
        const state = get();
        const pending = state.pendingEvents.find((p) => p.id === pendingId);
        if (!pending || !state.company || !state.group || !state.fandom) return;

        const effect = resolveChoice(pending.eventId, choiceId);
        if (!effect) return;

        const resultText = choiceResultText(pending.eventId, choiceId);
        const world = applyEventEffect(
          {
            company: state.company,
            group: state.group,
            fandom: state.fandom,
            buzz: state.buzz,
            sales: state.sales,
            streams: state.streams,
          },
          effect,
          effectTargets(pending),
          state.week,
          resultText,
        );

        set({
          company: world.company,
          group: world.group,
          fandom: world.fandom,
          buzz: world.buzz,
          sales: world.sales,
          streams: world.streams,
          pendingEvents: state.pendingEvents.filter((p) => p.id !== pendingId),
          // Stash the Korean line so the recap can show what each choice did.
          flags: { ...state.flags, [`answered_${pendingId}`]: true },
          answeredLines: [
            ...state.answeredLines,
            { id: pendingId, eventId: pending.eventId, text: resultText },
          ],
          savedAt: Date.now(),
        });
      },

      closeWeek: () => {
        const state = get();
        const { company, group, fandom } = state;
        if (!company || !group || !fandom) return;
        if (state.pendingEvents.length > 0) return;
        if (state.schedule.some((s) => s.activity === null)) return;

        const album = state.albums.find((a) => a.id === state.activeAlbumId) ?? null;
        const rng = createRng(state.rng);

        const outcome = resolveWeek(rng, {
          world: {
            company,
            group,
            fandom,
            buzz: state.buzz,
            sales: state.sales,
            streams: state.streams,
          },
          slots: state.schedule,
          benchedIds: state.benchedIds,
          killingPartId: album?.killingPartMemberId ?? null,
          centerId: album?.centerMemberId ?? null,
          week: state.week,
          promoWeek: state.promoWeek,
          eventEntries: state.answeredLines.map((l) => ({
            id: l.id,
            text: l.text,
            tone: 'neutral' as const,
          })),
          eventIds: state.answeredLines.map((l) => l.eventId),
        });


        const lastWeek = state.promoWeek >= COMEBACK.weeks;

        // The final week rolls straight into settlement, using the same rng
        // instance so the cursor advances once for the whole transition.
        let albums = state.albums;
        if (lastWeek && album) {
          const teamStats = averageTeamStats(outcome.world.group.members);
          const result = settleComeback(rng, {
            company: outcome.world.company,
            group: outcome.world.group,
            fandom: outcome.world.fandom,
            album,
            logs: [...state.weekLogs, outcome.log],
            teamStats,
            conceptFitPct: albumConceptFit(teamStats, album.concept),
            buzz: outcome.world.buzz,
            salesPressure: outcome.world.sales,
            streams: outcome.world.streams,
            musicShowWins: state.musicShowWins,
            fandomBefore: state.cycleStart?.fandomSize ?? outcome.world.fandom.size,
            awarenessBefore: state.cycleStart?.awareness ?? outcome.world.company.awareness,
            cycle: state.cycle,
          });
          albums = state.albums.map((a) => (a.id === album.id ? { ...a, result } : a));
          // Settlement is when the money actually moves.
          outcome.world.company = {
            ...outcome.world.company,
            won: outcome.world.company.won + result.profit,
            totalRevenue: outcome.world.company.totalRevenue + result.revenue,
          };
        }

        set({
          albums,
          company: outcome.world.company,
          group: outcome.world.group,
          fandom: outcome.world.fandom,
          buzz: outcome.world.buzz,
          sales: outcome.world.sales,
          streams: outcome.world.streams,
          benchedIds: outcome.benchedIds,
          weekLogs: [...state.weekLogs, outcome.log],
          schedule: emptySchedule(),
          answeredLines: [],
          rng: snapshot(rng),
          week: state.week + 1,
          promoWeek: lastWeek ? state.promoWeek : state.promoWeek + 1,
          phase: lastWeek ? 'results' : 'comeback_week',
          savedAt: Date.now(),
        });
      },

      settleCycle: () => {
        const state = get();
        const { company, group } = state;
        if (!company) return;
        // Idempotent: charging twice on a re-render would be a silent bug.
        if (state.settledCycle === state.cycle) return;

        const rng = createRng(state.rng);
        const outcome = settleCycle(rng, {
          company,
          group,
          fandom: state.fandom,
          trainees: state.trainees,
          albums: state.albums,
          cycle: state.cycle,
          week: state.week,
        });

        set({
          company: outcome.company,
          group: outcome.group,
          pendingDepartures: outcome.departures,
          gameOver: outcome.gameOver,
          settledCycle: state.cycle,
          rng: snapshot(rng),
          savedAt: Date.now(),
        });
      },

      resolveDeparture: (departureId, persuade) => {
        const state = get();
        const { company, group } = state;
        const departure = state.pendingDepartures.find((d) => d.id === departureId);
        if (!company || !group || !departure) return null;

        if (persuade) {
          if (company.won < departure.persuadeCost) return 'insufficient_funds';

          set({
            company: { ...company, won: company.won - departure.persuadeCost },
            group: {
              ...group,
              teamwork: clampScore(group.teamwork + HUB.persuadeTeamwork),
            },
            pendingDepartures: state.pendingDepartures.filter((d) => d.id !== departureId),
            savedAt: Date.now(),
          });
          return null;
        }

        // They leave: drop the member, every pair they were in, and free the
        // trainee record so the roster can use them again.
        const leaving = group.members.find((m) => m.id === departure.memberId);
        const members = group.members.filter((m) => m.id !== departure.memberId);
        const relationships = group.relationships.filter(
          (r) => r.a !== departure.memberId && r.b !== departure.memberId,
        );
        const chemistry = teamChemistry(relationships);

        set({
          group: {
            ...group,
            members,
            memberIds: members.map((m) => m.id),
            relationships,
            teamwork: chemistry.teamwork,
            conflictIndex: chemistry.conflictIndex,
            scandalRisk: chemistry.scandalRisk,
          },
          trainees: state.trainees.map((t) =>
            t.id === leaving?.traineeId ? { ...t, debuted: false } : t,
          ),
          pendingDepartures: state.pendingDepartures.filter((d) => d.id !== departureId),
          savedAt: Date.now(),
        });
        return null;
      },

      trainTrainee: (traineeId, stat) => {
        const state = get();
        const { company } = state;
        const trainee = state.trainees.find((t) => t.id === traineeId);
        if (!company || !trainee) return 'already_trained';

        const outcome = trainingOutcome(trainee, stat, state.cycle, company.won);
        if (outcome.kind !== 'ok') return outcome.kind;

        set({
          company: { ...company, won: company.won - TRAINING.cost },
          trainees: state.trainees.map((t) =>
            t.id === traineeId ? applyTraining(t, stat, outcome.gain, state.cycle) : t,
          ),
          savedAt: Date.now(),
        });
        return null;
      },

      startNextAlbum: () => {
        const state = get();
        if (!state.group) return;
        set({
          phase: 'album_produce',
          cycle: state.cycle + 1,
          // The comeback screen resets these itself, but clearing here keeps
          // the hub from showing last cycle's numbers while the wizard opens.
          promoWeek: 0,
          weekLogs: [],
          buzz: 0,
          sales: 0,
          streams: 0,
          musicShowWins: 0,
          savedAt: Date.now(),
        });
      },

      setFlag: (key, value) =>
        set((state) => ({ flags: { ...state.flags, [key]: value }, savedAt: Date.now() })),

      resetGame: (seed) =>
        set({ ...createInitialState(seed), booted: get().booted, savedAt: 0 }),

      hasSave: () => {
        const { savedAt, phase, company } = get();
        return savedAt > 0 && phase !== 'intro' && company !== null;
      },
    }),
    {
      // The active slot decides which key persist reads and writes.
      name: slotKey(getActiveSlot()),
      version: SAVE_VERSION,
      storage: createJSONStorage(() => localStorage),
      /**
       * v1 stored a different Company shape (specialty / reputation /
       * facilityLevel). Nothing shipped on v1, so the migration starts clean
       * rather than guessing at the missing fields.
       */
      migrate: (persisted, version) => {
        if (version < 2) return createInitialState();
        return persisted as GameState;
      },
      /** Actions and session flags are recreated on load; only data persists. */
      partialize: (state): GameState => ({
        version: state.version,
        phase: state.phase,
        rng: state.rng,
        week: state.week,
        promoWeek: state.promoWeek,
        cycle: state.cycle,
        company: state.company,
        trainees: state.trainees,
        group: state.group,
        fandom: state.fandom,
        albums: state.albums,
        activeAlbumId: state.activeAlbumId,
        schedule: state.schedule,
        weekLogs: state.weekLogs,
        pendingEvents: state.pendingEvents,
        eventsDrawnWeek: state.eventsDrawnWeek,
        buzz: state.buzz,
        sales: state.sales,
        streams: state.streams,
        musicShowWins: state.musicShowWins,
        benchedIds: state.benchedIds,
        pendingDepartures: state.pendingDepartures,
        gameOver: state.gameOver,
        settledCycle: state.settledCycle,
        cycleStart: state.cycleStart,
        answeredLines: state.answeredLines,
        flags: state.flags,
        savedAt: state.savedAt,
      }),
    },
  ),
);
