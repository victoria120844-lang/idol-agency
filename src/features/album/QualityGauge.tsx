import { QUALITY_GRADE_BLURBS } from '../../game/constants';
import { qualityGrade, qualityGradeIndex } from '../../game/formulas';
import type { QualityGrade } from '../../game/types';

export interface QualityGaugeProps {
  /** Raw 0-100 score. Never rendered — only the grade it maps to. */
  score: number;
  label?: string;
}

const LADDER: QualityGrade[] = ['D', 'C', 'B', 'A', 'S'];

/**
 * Five-step quality gauge.
 *
 * The player sees a grade and a vague sentence, never the number or the
 * formula behind it. Producing an album should feel like a judgement call, not
 * a spreadsheet.
 */
export function QualityGauge({ score, label = '곡 예상 퀄리티' }: QualityGaugeProps) {
  const grade = qualityGrade(score);
  const index = qualityGradeIndex(grade);

  return (
    <div className="rounded-chip border border-paper-line bg-paper-soft px-4 py-3.5">
      <div className="flex items-baseline justify-between gap-3">
        <div>
          <div className="kicker">Expected quality</div>
          <div className="mt-1 text-[13px] font-medium text-ink">{label}</div>
        </div>
        <span
          className={`tabular flex h-10 min-w-10 items-center justify-center rounded-chip border px-2 text-[20px] font-bold leading-none ${
            index >= 3
              ? 'border-neon bg-neon text-paper'
              : index === 2
                ? 'border-neon/45 bg-neon/12 text-neon'
                : 'border-paper-line bg-transparent text-ink/70'
          }`}
          aria-label={`예상 등급 ${grade}`}
        >
          {grade}
        </span>
      </div>

      <div className="mt-3 flex gap-1" aria-hidden>
        {LADDER.map((g, i) => (
          <div key={g} className="flex flex-1 flex-col gap-1">
            <span
              className={`h-1.5 rounded-chip transition-colors duration-300 ${
                i <= index ? 'bg-neon' : 'bg-paper-line'
              }`}
            />
            <span
              className={`tabular text-center text-[10px] ${i === index ? 'text-neon' : 'text-ink/35'}`}
            >
              {g}
            </span>
          </div>
        ))}
      </div>

      <p className="m-0 mt-2.5 text-[12px] text-ink/60">{QUALITY_GRADE_BLURBS[grade]}</p>
    </div>
  );
}
