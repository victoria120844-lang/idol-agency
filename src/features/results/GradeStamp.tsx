import { motion } from 'framer-motion';

import type { Grade } from '../../game/types';

export interface GradeStampProps {
  grade: Grade;
  /** 0-100 composite, shown small under the letter. */
  score: number;
  /** Disable the entrance animation for the PNG export. */
  still?: boolean;
  size?: number;
}

/** Korean one-liner under the stamp, so the grade reads without a legend. */
const GRADE_NOTE: Record<Grade, string> = {
  SS: '전설적인 데뷔',
  S: '대성공',
  A: '성공적인 컴백',
  B: '무난한 성적',
  C: '아쉬운 결과',
  D: '부진',
  F: '실패',
};

/**
 * The big neon grade stamp — the thing players screenshot.
 *
 * Slams in rotated and overshooting, then settles, the way a rubber stamp
 * lands. Only `transform` and `opacity` animate.
 */
export function GradeStamp({ grade, score, still = false, size = 180 }: GradeStampProps) {
  const hot = grade === 'SS' || grade === 'S' || grade === 'A';

  return (
    <div className="flex flex-col items-center gap-3">
      <motion.div
        initial={still ? false : { scale: 2.2, opacity: 0, rotate: -22 }}
        animate={{ scale: 1, opacity: 1, rotate: -8 }}
        transition={{ duration: 0.55, ease: [0.16, 1, 0.3, 1], delay: still ? 0 : 0.25 }}
        className="relative flex items-center justify-center rounded-full border-[6px]"
        style={{
          width: size,
          height: size,
          borderColor: hot ? 'var(--neon)' : 'var(--muted)',
          boxShadow: hot ? '0 0 0 1px var(--neon), 0 0 48px var(--neon-glow)' : undefined,
        }}
      >
        <span
          className="tabular font-black leading-none"
          style={{
            fontSize: size * (grade.length > 1 ? 0.42 : 0.55),
            color: hot ? 'var(--neon)' : 'var(--muted)',
          }}
        >
          {grade}
        </span>
        <span
          className="absolute bottom-[14%] text-[10px] font-bold tracking-[0.2em]"
          style={{ color: hot ? 'var(--neon)' : 'var(--muted)' }}
        >
          GRADE
        </span>
      </motion.div>

      <div className="text-center">
        <div className={`text-[15px] font-semibold ${hot ? 'text-neon' : 'text-paper'}`}>
          {GRADE_NOTE[grade]}
        </div>
        <div className="tabular mt-0.5 text-[11.5px] text-muted">종합 점수 {score} / 100</div>
      </div>
    </div>
  );
}
