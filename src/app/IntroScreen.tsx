import { useEffect, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';

import { Modal, NeonButton, TickerBar } from '../components/ui';
import { PHASE_LABELS } from '../game/constants';
import { formatWon } from '../game/formulas';
import { useGameStore } from './store';

/** Total run time of the opening cinematic, in milliseconds. */
const CINEMATIC_MS = 2500;

/**
 * The pre-game screen. It opens with a short cinematic, then reveals the menu.
 *
 * The cinematic is presentation only, so it lives in local state — it replays
 * on a fresh page load and is not part of the save.
 */
export function IntroScreen() {
  const [cinematicDone, setCinematicDone] = useState(false);
  const [confirmNew, setConfirmNew] = useState(false);

  const boot = useGameStore((s) => s.boot);
  const setPhase = useGameStore((s) => s.setPhase);
  const resetGame = useGameStore((s) => s.resetGame);
  const hasSave = useGameStore((s) => s.hasSave());
  const savedPhase = useGameStore((s) => s.phase);
  const company = useGameStore((s) => s.company);
  const week = useGameStore((s) => s.week);

  const startNewGame = () => {
    resetGame();
    setPhase('company_create');
    boot();
  };

  const onNewGame = () => {
    if (hasSave) setConfirmNew(true);
    else startNewGame();
  };

  return (
    <div className="flex min-h-dvh flex-col">
      <TickerBar />

      <AnimatePresence>
        {!cinematicDone && <Cinematic onDone={() => setCinematicDone(true)} />}
      </AnimatePresence>

      <div className="flex flex-1 flex-col justify-center px-6 py-16 sm:px-10 lg:px-16">
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={cinematicDone ? { opacity: 1, y: 0 } : { opacity: 0, y: 12 }}
          transition={{ duration: 0.55, ease: [0.22, 1, 0.36, 1] }}
          className="mx-auto w-full max-w-[1240px]"
        >
          <div className="kicker">IDOL AGENCY SIMULATOR</div>

          <h1 className="mt-4 text-[40px] font-semibold leading-[0.95] tracking-tight text-paper sm:text-[68px] lg:text-[84px]">
            소형 기획사
            <br />
            운영 시뮬레이터
          </h1>

          <div className="mt-8 h-px w-full max-w-[520px] bg-ink-line" />

          <p className="mt-6 max-w-[46ch] text-[13px] leading-relaxed text-muted sm:text-[14px]">
            자본금 {formatWon(5_000_000)}. 연습생을 뽑고, 데뷔조를 짜고, 앨범을 내고, 4주간의 컴백
            활동을 버텨내는 것. 차트는 냉정하고 예산은 늘 모자랍니다.
          </p>

          <div className="mt-10 flex flex-wrap items-center gap-3">
            <NeonButton onClick={onNewGame}>새 게임</NeonButton>
            {hasSave && (
              <NeonButton variant="ghost" onClick={boot}>
                이어하기
              </NeonButton>
            )}
          </div>

          {hasSave && company && (
            <p className="mt-4 text-[12px] text-muted">
              저장된 플레이 · {company.name} · {week}주차 · {PHASE_LABELS[savedPhase].label}
            </p>
          )}
        </motion.div>
      </div>

      <Modal
        open={confirmNew}
        variant="ink"
        kicker="Overwrite save"
        title="저장된 게임을 지울까요?"
        onClose={() => setConfirmNew(false)}
        footer={
          <>
            <NeonButton variant="ghost" onClick={() => setConfirmNew(false)}>
              취소
            </NeonButton>
            <NeonButton
              variant="danger"
              onClick={() => {
                setConfirmNew(false);
                startNewGame();
              }}
            >
              지우고 새로 시작
            </NeonButton>
          </>
        }
      >
        <p className="m-0">
          새 게임을 시작하면 {company ? `「${company.name}」의 ` : ''}진행 상황이 모두 사라집니다. 이
          작업은 되돌릴 수 없습니다.
        </p>
      </Modal>
    </div>
  );
}

/**
 * Opening cinematic: a neon rule draws across the centre, the title fades up
 * behind a faint scanline texture, then it auto-advances. Clicking anywhere
 * skips straight to the menu.
 *
 * The scanline is the one repeating gradient in the product — an intentional
 * exception to the no-gradients rule, scoped to this overlay.
 */
function Cinematic({ onDone }: { onDone: () => void }) {
  useEffect(() => {
    const t = window.setTimeout(onDone, CINEMATIC_MS);
    return () => window.clearTimeout(t);
  }, [onDone]);

  return (
    <motion.div
      role="button"
      tabIndex={0}
      aria-label="인트로 건너뛰기"
      onClick={onDone}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') onDone();
      }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.45, ease: 'easeInOut' }}
      className="fixed inset-0 z-50 flex cursor-pointer flex-col items-center justify-center bg-ink"
    >
      {/* Scanlines. */}
      <span
        aria-hidden
        className="pointer-events-none absolute inset-0 opacity-[0.14]"
        style={{
          backgroundImage:
            'repeating-linear-gradient(180deg, rgba(255,255,255,.5) 0px, rgba(255,255,255,.5) 1px, transparent 1px, transparent 3px)',
        }}
      />

      <div className="relative flex w-full max-w-[560px] flex-col items-center px-6">
        <motion.span
          initial={{ scaleX: 0 }}
          animate={{ scaleX: 1 }}
          transition={{ duration: 0.85, ease: [0.16, 1, 0.3, 1] }}
          className="h-px w-full origin-center bg-neon"
          style={{ boxShadow: '0 0 24px var(--neon-glow)' }}
        />

        <motion.h1
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.8, duration: 0.7, ease: 'easeOut' }}
          className="mt-6 text-center text-[19px] font-semibold uppercase tracking-[0.2em] text-paper sm:text-[26px]"
        >
          Idol Agency
          <br />
          Simulator
        </motion.h1>
      </div>

      <motion.span
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 1.6, duration: 0.5 }}
        className="kicker absolute bottom-10"
      >
        클릭하면 건너뜁니다
      </motion.span>
    </motion.div>
  );
}
