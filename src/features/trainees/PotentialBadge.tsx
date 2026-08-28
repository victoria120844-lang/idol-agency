import { POTENTIAL_GRADES } from '../../game/constants';
import type { PotentialGrade } from '../../game/types';

/**
 * Potential grade chip. Hidden trainees render "???" — the grade is the single
 * most valuable hidden number in the game, so it stays flat and unreadable
 * until it is earned or paid for.
 */
const STYLES: Record<PotentialGrade, string> = {
  S: 'border-neon bg-neon text-paper glow-neon',
  A: 'border-neon/45 bg-neon/12 text-neon',
  B: 'border-ink/30 bg-transparent text-ink',
  C: 'border-paper-line bg-transparent text-ink/60',
  D: 'border-paper-line bg-transparent text-ink/45',
};

export interface PotentialBadgeProps {
  grade: PotentialGrade;
  revealed: boolean;
  size?: 'sm' | 'md';
}

export function PotentialBadge({ grade, revealed, size = 'md' }: PotentialBadgeProps) {
  const dims = size === 'sm' ? 'h-[18px] min-w-[18px] text-[10px]' : 'h-6 min-w-6 text-[12px]';

  if (!revealed) {
    return (
      <span
        className={`tabular inline-flex ${dims} shrink-0 items-center justify-center rounded-chip border border-dashed border-paper-line px-1 font-bold leading-none text-ink/35`}
        title="잠재력 미확인"
        aria-label="잠재력 미확인"
      >
        ???
      </span>
    );
  }

  return (
    <span
      className={`tabular inline-flex ${dims} shrink-0 items-center justify-center rounded-chip border px-1 font-bold leading-none ${STYLES[grade]}`}
      title={`잠재력 ${grade} · ${POTENTIAL_GRADES[grade].note}`}
      aria-label={`잠재력 ${grade}`}
    >
      {grade}
    </span>
  );
}
