import { useEffect, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';

import { NeonButton } from '../../components/ui';
import { useGameStore } from '../../app/store';

/** Persisted so the tour only ever runs once per save. */
export const TOUR_FLAG = 'tourSeen';

const STEPS: { kicker: string; title: string; body: string }[] = [
  {
    kicker: 'STEP 1 / 4',
    title: '여기가 기획사입니다',
    body:
      '왼쪽 레일이 게임의 단계를 보여줍니다. 지금 있는 단계만 네온으로 켜지고, 아직 잠긴 단계는 흐리게 남습니다.',
  },
  {
    kicker: 'STEP 2 / 4',
    title: '상단 바가 회사 상태입니다',
    body:
      '회사명과 등급, 보유 자금, 현재 주차가 항상 위에 붙어 있습니다. 자금은 네온으로 표시되는 유일한 숫자입니다 — 이 게임에서 제일 먼저 마르는 자원이니까요.',
  },
  {
    kicker: 'STEP 3 / 4',
    title: '숫자는 항상 이유가 붙습니다',
    body:
      '결산 화면의 여섯 지표에는 왜 그렇게 나왔는지가 한 줄씩 따라붙습니다. 무엇을 바꿔야 다음이 나아지는지 화면이 알려줍니다.',
  },
  {
    kicker: 'STEP 4 / 4',
    title: '막히면 게임 방법을 여세요',
    body:
      '레일 아래쪽 물음표 버튼에서 규칙 전체를 다시 볼 수 있습니다. 저장 슬롯과 세이브 내보내기도 그 옆에 있습니다.',
  },
];

/**
 * First-run tour: four cards, once per save.
 *
 * Deliberately a centred card stack rather than anchored spotlights — the
 * layout reflows hard between 390px and 1440px, and a tooltip pinned to a
 * moving target is the kind of thing that breaks silently on the width nobody
 * tested.
 */
export function OnboardingTour() {
  const flags = useGameStore((s) => s.flags);
  const setFlag = useGameStore((s) => s.setFlag);
  const [step, setStep] = useState(0);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (!flags[TOUR_FLAG]) setOpen(true);
  }, [flags]);

  const finish = () => {
    setOpen(false);
    setFlag(TOUR_FLAG, true);
  };

  if (!open) return null;
  const current = STEPS[step];
  const last = step === STEPS.length - 1;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-[60] flex items-end justify-center p-4 sm:items-center"
        role="dialog"
        aria-modal="true"
        aria-label="처음 안내"
      >
        <div className="absolute inset-0 bg-ink/80 backdrop-blur-[2px]" onClick={finish} />

        <motion.div
          key={step}
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.28, ease: [0.22, 1, 0.36, 1] }}
          className="relative w-full max-w-[440px] rounded-card border border-ink-line bg-ink-soft p-5"
        >
          <div className="kicker">{current.kicker}</div>
          <h2 className="mt-2 text-[18px] font-semibold tracking-tight text-paper">
            {current.title}
          </h2>
          <p className="m-0 mt-3 text-[13.5px] leading-relaxed text-muted">{current.body}</p>

          <div className="mt-5 flex items-center gap-1.5" aria-hidden>
            {STEPS.map((s, i) => (
              <span
                key={s.kicker}
                className={`h-[3px] flex-1 rounded-chip ${i <= step ? 'bg-neon' : 'bg-ink-line'}`}
              />
            ))}
          </div>

          <div className="mt-4 flex items-center justify-between gap-2">
            <NeonButton size="sm" variant="ghost" onClick={finish}>
              건너뛰기
            </NeonButton>
            <NeonButton size="sm" onClick={() => (last ? finish() : setStep(step + 1))}>
              {last ? '시작하기' : '다음'}
            </NeonButton>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
