import { motion } from 'framer-motion';

import { MetricTile, NeonButton, TickerBar } from '../../components/ui';
import { formatCount, formatWon } from '../../game/formulas';
import type { GameOver } from '../../game/types';
import { useGameStore } from '../../app/store';

export interface GameOverScreenProps {
  gameOver: GameOver;
  companyName: string;
}

/**
 * The closure ending.
 *
 * Deliberately quiet — no neon stamp, no celebration chrome. The run summary
 * is the only thing on the page, because that is what the player is here to
 * read.
 */
export function GameOverScreen({ gameOver, companyName }: GameOverScreenProps) {
  const resetGame = useGameStore((s) => s.resetGame);
  const setPhase = useGameStore((s) => s.setPhase);

  const restart = () => {
    resetGame();
    setPhase('company_create');
  };

  return (
    <div className="flex min-h-dvh flex-col">
      <TickerBar />

      <div className="flex flex-1 flex-col justify-center px-6 py-16 sm:px-10 lg:px-16">
        <motion.div
          initial={{ opacity: 0, y: 14 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
          className="mx-auto flex w-full max-w-[840px] flex-col gap-8"
        >
          <div>
            <div className="kicker">Run ended · {companyName}</div>
            <h1 className="mt-3 text-[44px] font-semibold leading-none tracking-tight text-paper sm:text-[64px]">
              {gameOver.title}
            </h1>
            <div className="mt-6 h-px w-full max-w-[420px] bg-ink-line" />
          </div>

          <div className="flex flex-col gap-2.5">
            {gameOver.lines.map((line, i) => (
              <motion.p
                key={i}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.4 + i * 0.18, duration: 0.5 }}
                className="m-0 max-w-[52ch] text-[14px] leading-relaxed text-muted"
              >
                {line}
              </motion.p>
            ))}
          </div>

          <div className="grid grid-cols-2 gap-3 lg:grid-cols-3">
            <MetricTile
              kicker="Cycles"
              value={`${gameOver.cycles}회`}
              sublabel="진행한 사이클"
              surface="ink"
            />
            <MetricTile
              kicker="Weeks"
              value={`${gameOver.weeks}주`}
              sublabel="버틴 기간"
              surface="ink"
            />
            <MetricTile
              kicker="Best grade"
              value={gameOver.bestGrade ?? '—'}
              sublabel="최고 등급"
              surface="ink"
              emphasis={Boolean(gameOver.bestGrade)}
            />
            <MetricTile
              kicker="Best first week"
              value={gameOver.bestFirstWeek > 0 ? formatCount(gameOver.bestFirstWeek, '장') : '—'}
              sublabel="최고 초동"
              surface="ink"
            />
            <MetricTile
              kicker="Final fandom"
              value={formatCount(gameOver.finalFandom, '명')}
              sublabel="마지막 팬덤"
              surface="ink"
            />
            <MetricTile
              kicker="Lifetime revenue"
              value={formatWon(gameOver.totalRevenue)}
              sublabel="누적 매출"
              surface="ink"
            />
          </div>

          <div className="flex flex-wrap gap-3">
            <NeonButton onClick={restart}>다시 시작</NeonButton>
          </div>
        </motion.div>
      </div>
    </div>
  );
}
