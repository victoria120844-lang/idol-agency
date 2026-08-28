import { useState } from 'react';

import { Avatar, Modal, NeonButton, StatBar, StatHexagon, Tag } from '../../components/ui';
import {
  GENDER_LABELS,
  NATIONALITY_LABELS,
  PERSONALITY_TAGS,
  POTENTIAL_GRADES,
  RECRUIT,
  SPECIALTIES,
  STAT_LABELS,
} from '../../game/constants';
import { formatWon, isPotentialVisible, traineeOverall } from '../../game/formulas';
import { traineeProfile } from '../../game/generators';
import { STAT_KEYS, type Trainee } from '../../game/types';
import { PotentialBadge } from './PotentialBadge';

export interface TraineeModalProps {
  trainee: Trainee | null;
  /** Cash on hand, to disable the paid evaluation when it is unaffordable. */
  won: number;
  onClose: () => void;
  onEvaluate: (id: string) => void;
  onRelease: (id: string) => void;
}

export function TraineeModal({ trainee, won, onClose, onEvaluate, onRelease }: TraineeModalProps) {
  const [confirmRelease, setConfirmRelease] = useState(false);

  if (!trainee) return null;

  const revealed = isPotentialVisible(trainee);
  const canAfford = won >= RECRUIT.evaluationCost;
  const weeksLeft = Math.max(0, RECRUIT.revealAfterWeeks - trainee.trainedWeeks);

  const close = () => {
    setConfirmRelease(false);
    onClose();
  };

  return (
    <>
      <Modal
        open={!confirmRelease}
        kicker="Trainee profile"
        title={trainee.name}
        onClose={close}
        footer={
          <>
            <NeonButton variant="danger" surface="paper" onClick={() => setConfirmRelease(true)}>
              방출
            </NeonButton>
            <NeonButton variant="ghost" surface="paper" onClick={close}>
              닫기
            </NeonButton>
          </>
        }
      >
        <div className="flex flex-col gap-4">
          {/* identity */}
          <div className="flex items-start gap-3">
            <Avatar id={trainee.id} initial={trainee.name.slice(0, 1)} size={56} />
            <div className="min-w-0 flex-1">
              <div className="tabular text-[12px] text-ink/60">
                {trainee.age}세 · {GENDER_LABELS[trainee.gender]} ·{' '}
                {NATIONALITY_LABELS[trainee.nationality]} · {trainee.joinedWeek}주차 입사
              </div>
              <div className="mt-2 flex flex-wrap items-center gap-1.5">
                <Tag tone="neon">{SPECIALTIES[trainee.specialty].label}</Tag>
                {trainee.personality.map((p) => (
                  <Tag key={p} tone="outline">
                    {PERSONALITY_TAGS[p].label}
                  </Tag>
                ))}
              </div>
            </div>
            <div className="shrink-0 text-right">
              <div className="kicker">Overall</div>
              <div className="tabular text-[26px] font-semibold leading-none text-ink">
                {traineeOverall(trainee.stats)}
              </div>
            </div>
          </div>

          <p className="m-0 rounded-chip border border-paper-line bg-paper-soft px-3 py-2.5 text-[13px] text-ink">
            {traineeProfile(trainee)}
          </p>

          {/* stats */}
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
            <div className="flex justify-center sm:shrink-0">
              <StatHexagon stats={trainee.stats} size={168} surface="paper" />
            </div>
            <div className="flex flex-1 flex-col gap-2.5">
              {STAT_KEYS.map((key) => (
                <StatBar
                  key={key}
                  label={STAT_LABELS[key]}
                  value={trainee.stats[key]}
                  surface="paper"
                />
              ))}
            </div>
          </div>

          {/* potential */}
          <div className="rounded-chip border border-paper-line bg-paper-soft px-3 py-3">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-2.5">
                <div className="kicker">Potential</div>
                <PotentialBadge grade={trainee.potentialGrade} revealed={revealed} />
              </div>

              {!revealed && (
                <NeonButton
                  size="sm"
                  disabled={!canAfford}
                  onClick={() => onEvaluate(trainee.id)}
                >
                  평가 세션 {formatWon(RECRUIT.evaluationCost)}
                </NeonButton>
              )}
            </div>

            <p className="m-0 mt-2 text-[12px] text-ink/60">
              {revealed
                ? POTENTIAL_GRADES[trainee.potentialGrade].note
                : `${RECRUIT.revealAfterWeeks}주 훈련하면 무료로 드러납니다. ${weeksLeft}주 남음.`}
            </p>
            {!revealed && !canAfford && (
              <p className="m-0 mt-1 text-[12px] text-neon">
                자금이 부족해 평가 세션을 진행할 수 없습니다.
              </p>
            )}
          </div>

          {/* condition */}
          <dl className="m-0 grid grid-cols-3 gap-3">
            <Stat label="컨디션" value={`${trainee.condition}`} />
            <Stat label="피로도" value={`${trainee.fatigue}`} />
            <Stat label="개인 팬" value={`${trainee.personalFans.toLocaleString('ko-KR')}명`} />
          </dl>
        </div>
      </Modal>

      <Modal
        open={confirmRelease}
        variant="ink"
        kicker="Release trainee"
        title={`${trainee.name} 연습생을 방출할까요?`}
        onClose={() => setConfirmRelease(false)}
        footer={
          <>
            <NeonButton variant="ghost" onClick={() => setConfirmRelease(false)}>
              취소
            </NeonButton>
            <NeonButton
              variant="danger"
              onClick={() => {
                setConfirmRelease(false);
                onRelease(trainee.id);
              }}
            >
              방출하기
            </NeonButton>
          </>
        }
      >
        <p className="m-0">
          계약을 해지하면 명단에서 완전히 사라지고, 지불한 계약금은 환불되지 않습니다. 이 작업은
          되돌릴 수 없습니다.
        </p>
      </Modal>
    </>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-chip border border-paper-line px-3 py-2">
      <dt className="text-[11px] text-ink/60">{label}</dt>
      <dd className="tabular m-0 mt-0.5 text-[15px] font-semibold text-ink">{value}</dd>
    </div>
  );
}
