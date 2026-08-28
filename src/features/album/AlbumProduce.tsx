import { useMemo, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';

import { Card, MetricTile, NeonButton, Stepper, Toast, type ToastItem } from '../../components/ui';
import { ALBUM_FORM, ALBUM_TYPES } from '../../game/constants';
import { createAlbum } from '../../game/generators';
import {
  albumConceptFit,
  albumShortfall,
  averageTeamStats,
  defaultAllocation,
  evenShares,
  formatWon,
  rebalanceAllocation,
  rebalanceShares,
  titleTrackQuality,
} from '../../game/formulas';
import { createRng } from '../../game/rng';
import type {
  AlbumConcept,
  AlbumDraft,
  AlbumType,
  BudgetChannel,
  Genre,
  Id,
  MoodTag,
} from '../../game/types';
import { useGameStore } from '../../app/store';
import { AlbumPlanStep } from './AlbumPlanStep';
import { AlbumSummaryCard } from './AlbumSummaryCard';
import { BSideStep } from './BSideStep';
import { PositionStep } from './PositionStep';
import { TitleTrackStep } from './TitleTrackStep';

const STEPS = [
  { id: 'plan', kicker: 'PLAN', label: '앨범 기획' },
  { id: 'title', kicker: 'TITLE', label: '타이틀곡' },
  { id: 'bside', kicker: 'B-SIDES', label: '수록곡' },
  { id: 'parts', kicker: 'PARTS', label: '포지션 배분' },
];

export function AlbumProduce() {
  const company = useGameStore((s) => s.company);
  const group = useGameStore((s) => s.group);
  const fandom = useGameStore((s) => s.fandom);
  const rngState = useGameStore((s) => s.rng);
  const week = useGameStore((s) => s.week);
  const cycle = useGameStore((s) => s.cycle);
  const produceAlbum = useGameStore((s) => s.produceAlbum);

  const memberIds = useMemo(() => group?.members.map((m) => m.id) ?? [], [group]);

  const [step, setStep] = useState(0);
  const [toasts, setToasts] = useState<ToastItem[]>([]);

  /**
   * The whole wizard writes into one draft held here, so stepping back never
   * loses input — nothing is stored per-step.
   */
  const [draft, setDraft] = useState<AlbumDraft>(() => ({
    title: '',
    concept: 'summer',
    type: 'single',
    allocation: defaultAllocation(),
    titleTrack: {
      title: '',
      genre: 'dance_pop',
      bpm: ALBUM_FORM.bpmDefault,
      moods: [],
    },
    bSides: [],
    centerMemberId: memberIds[0] ?? '',
    killingPartMemberId: memberIds[0] ?? '',
    partShares: evenShares(memberIds),
  }));

  const pushToast = (text: string, tone: ToastItem['tone'], kicker?: string) => {
    const item: ToastItem = { id: `${Date.now()}-${Math.random()}`, text, tone, kicker };
    setToasts((t) => [...t, item].slice(-3));
    window.setTimeout(() => setToasts((t) => t.filter((x) => x.id !== item.id)), 3600);
  };

  const patch = (p: Partial<AlbumDraft>) => setDraft((d) => ({ ...d, ...p }));

  // ---- step validation ----
  const planDone = draft.title.trim().length >= ALBUM_FORM.titleMin;
  const titleDone = draft.titleTrack.title.trim().length >= ALBUM_FORM.titleMin;
  const bSidesDone = draft.bSides.every((b) => b.title.trim().length > 0);

  // ---- derived ----
  const teamStats = useMemo(
    () => (group ? averageTeamStats(group.members) : null),
    [group],
  );
  const conceptFitPct = teamStats ? albumConceptFit(teamStats, draft.concept) : 0;
  const expectedQuality =
    teamStats && group
      ? titleTrackQuality({
          teamStats,
          concept: draft.concept,
          conceptFitPct,
          producingPct: draft.allocation.producing,
          teamwork: group.teamwork,
        })
      : 0;

  /**
   * Preview the finished album without consuming the RNG stream — a local
   * generator from the same save position produces exactly what `produceAlbum`
   * will commit.
   */
  const previewAlbum = useMemo(() => {
    if (!group || !teamStats) return null;
    const rng = createRng(rngState);
    return createAlbum(rng, { draft, group, teamStats, conceptFitPct, week, cycle });
  }, [group, teamStats, rngState, draft, conceptFitPct, week, cycle]);

  if (!company || !group) return null;

  const cost = ALBUM_TYPES[draft.type].cost;
  const shortfall = albumShortfall(draft.type, company.won);

  const goNext = () => {
    if (step === 0 && !planDone) {
      pushToast('앨범명을 입력해 주세요.', 'neutral', 'ALBUM');
      return;
    }
    if (step === 1 && !titleDone) {
      pushToast('타이틀곡 이름을 입력해 주세요.', 'neutral', 'TITLE TRACK');
      return;
    }
    if (step === 2 && !bSidesDone) {
      pushToast('수록곡 이름을 모두 입력해 주세요.', 'critical', 'B-SIDES');
      return;
    }
    setStep((s) => Math.min(STEPS.length - 1, s + 1));
  };

  const confirm = () => {
    if (shortfall > 0) {
      pushToast(
        `자금이 ${formatWon(shortfall)} 부족해 발매할 수 없습니다.`,
        'critical',
        'INSUFFICIENT FUNDS',
      );
      return;
    }
    const failure = produceAlbum(draft);
    if (failure === 'insufficient_funds') {
      pushToast('자금이 부족해 발매할 수 없습니다.', 'critical', 'INSUFFICIENT FUNDS');
    }
  };

  return (
    <div className="flex flex-col gap-5">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <div className="kicker">Produce</div>
          <h1 className="mt-2 text-[26px] font-semibold tracking-tight text-paper sm:text-[32px]">
            앨범 제작
          </h1>
          <p className="mt-2 max-w-[54ch] text-[13px] text-muted">
            {group.name}의 {cycle}번째 앨범을 만듭니다. 네 단계를 오가며 언제든 앞 단계로 돌아갈 수
            있고, 입력한 내용은 사라지지 않습니다.
          </p>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <MetricTile
            kicker="Balance"
            value={formatWon(company.won)}
            sublabel="보유 자금"
            surface="ink"
          />
          <MetricTile
            kicker="Production cost"
            value={formatWon(cost)}
            sublabel={ALBUM_TYPES[draft.type].label}
            surface="ink"
            emphasis
          />
        </div>
      </header>

      <Card variant="paper">
        <div className="flex flex-col gap-5">
          <div className="border-b border-paper-line pb-4">
            <div className="[&_.kicker]:text-ink/45">
              <Stepper steps={STEPS} current={step} />
            </div>
          </div>

          <AnimatePresence mode="wait">
            <motion.div
              key={step}
              initial={{ opacity: 0, x: 14 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -14 }}
              transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }}
            >
              {step === 0 && (
                <AlbumPlanStep
                  title={draft.title}
                  concept={draft.concept}
                  type={draft.type}
                  allocation={draft.allocation}
                  won={company.won}
                  onTitle={(v) => patch({ title: v })}
                  onConcept={(v: AlbumConcept) => patch({ concept: v })}
                  onType={(v: AlbumType) =>
                    setDraft((d) => ({
                      ...d,
                      type: v,
                      // Trim b-sides that no longer fit the format.
                      bSides: d.bSides.slice(0, ALBUM_TYPES[v].bSideMax),
                    }))
                  }
                  onAllocation={(channel: BudgetChannel, value: number) =>
                    setDraft((d) => ({
                      ...d,
                      allocation: rebalanceAllocation(d.allocation, channel, value),
                    }))
                  }
                  onResetAllocation={() => patch({ allocation: defaultAllocation() })}
                />
              )}

              {step === 1 && (
                <TitleTrackStep
                  title={draft.titleTrack.title}
                  genre={draft.titleTrack.genre}
                  bpm={draft.titleTrack.bpm}
                  moods={draft.titleTrack.moods}
                  concept={draft.concept}
                  qualityScore={expectedQuality}
                  onTitle={(v) =>
                    setDraft((d) => ({ ...d, titleTrack: { ...d.titleTrack, title: v } }))
                  }
                  onGenre={(v: Genre) =>
                    setDraft((d) => ({ ...d, titleTrack: { ...d.titleTrack, genre: v } }))
                  }
                  onBpm={(v) =>
                    setDraft((d) => ({ ...d, titleTrack: { ...d.titleTrack, bpm: v } }))
                  }
                  onToggleMood={(m: MoodTag) =>
                    setDraft((d) => {
                      const has = d.titleTrack.moods.includes(m);
                      const moods = has
                        ? d.titleTrack.moods.filter((x) => x !== m)
                        : d.titleTrack.moods.length < ALBUM_FORM.moodMax
                          ? [...d.titleTrack.moods, m]
                          : d.titleTrack.moods;
                      return { ...d, titleTrack: { ...d.titleTrack, moods } };
                    })
                  }
                />
              )}

              {step === 2 && (
                <BSideStep
                  bSides={draft.bSides}
                  type={draft.type}
                  members={group.members}
                  onAdd={() =>
                    setDraft((d) => ({
                      ...d,
                      bSides: [
                        ...d.bSides,
                        { title: '', genre: 'dance_pop' as Genre, participantIds: [] },
                      ],
                    }))
                  }
                  onRemove={(i) =>
                    setDraft((d) => ({ ...d, bSides: d.bSides.filter((_, x) => x !== i) }))
                  }
                  onChange={(i, p) =>
                    setDraft((d) => ({
                      ...d,
                      bSides: d.bSides.map((b, x) => (x === i ? { ...b, ...p } : b)),
                    }))
                  }
                  onToggleParticipant={(i, memberId) =>
                    setDraft((d) => ({
                      ...d,
                      bSides: d.bSides.map((b, x) =>
                        x === i
                          ? {
                              ...b,
                              participantIds: b.participantIds.includes(memberId)
                                ? b.participantIds.filter((id) => id !== memberId)
                                : [...b.participantIds, memberId],
                            }
                          : b,
                      ),
                    }))
                  }
                />
              )}

              {step === 3 && (
                <PositionStep
                  members={group.members}
                  centerMemberId={draft.centerMemberId}
                  killingPartMemberId={draft.killingPartMemberId}
                  partShares={draft.partShares}
                  onCenter={(id: Id) => patch({ centerMemberId: id })}
                  onKillingPart={(id: Id) => patch({ killingPartMemberId: id })}
                  onShare={(id, value) =>
                    setDraft((d) => ({
                      ...d,
                      partShares: rebalanceShares(d.partShares, id, value),
                    }))
                  }
                  onEvenShares={() => patch({ partShares: evenShares(memberIds) })}
                />
              )}
            </motion.div>
          </AnimatePresence>
        </div>
      </Card>

      {step === 3 && previewAlbum && (
        <AlbumSummaryCard
          album={previewAlbum}
          group={group}
          accentColor={fandom?.color ?? company.ciColor}
        />
      )}

      {/* ---- controls ---- */}
      <div className="flex flex-col-reverse items-stretch gap-2 sm:flex-row sm:items-center sm:justify-between">
        <NeonButton
          variant="ghost"
          onClick={() => setStep((s) => Math.max(0, s - 1))}
          disabled={step === 0}
        >
          이전
        </NeonButton>

        <div className="flex flex-col items-stretch gap-2 sm:flex-row sm:items-center">
          {shortfall > 0 && (
            <span className="text-[12px] text-neon">
              자금이 {formatWon(shortfall)} 부족합니다.
            </span>
          )}
          {step < STEPS.length - 1 ? (
            <NeonButton onClick={goNext}>다음</NeonButton>
          ) : (
            <NeonButton onClick={confirm} disabled={shortfall > 0}>
              발매 확정 · {formatWon(cost)}
            </NeonButton>
          )}
        </div>
      </div>

      <Toast items={toasts} />
    </div>
  );
}
