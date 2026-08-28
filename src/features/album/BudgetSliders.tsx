import { BUDGET_CHANNELS, BUDGET_CHANNEL_ORDER } from '../../game/constants';
import { allocationTotal, formatWon } from '../../game/formulas';
import type { BudgetAllocation, BudgetChannel } from '../../game/types';

export interface BudgetSlidersProps {
  allocation: BudgetAllocation;
  /** Total production budget in Won, used to show each channel's actual spend. */
  budget: number;
  onChange: (channel: BudgetChannel, value: number) => void;
  onReset: () => void;
}

/**
 * Five sliders that always total 100%.
 *
 * The invariant lives in `rebalanceAllocation`, not here — moving one slider
 * absorbs the difference across the others proportionally, so the UI never has
 * to block, clamp or warn about the total.
 */
export function BudgetSliders({ allocation, budget, onChange, onReset }: BudgetSlidersProps) {
  const total = allocationTotal(allocation);

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-baseline justify-between gap-3">
        <span className="kicker">Budget split</span>
        <div className="flex items-center gap-3">
          <span
            className={`tabular text-[12px] font-semibold ${total === 100 ? 'text-ink' : 'text-neon'}`}
          >
            합계 {total}%
          </span>
          <button
            type="button"
            onClick={onReset}
            className="rounded-chip border border-paper-line px-2 py-1 text-[11px] text-ink/60 transition-colors hover:border-ink/30 hover:text-ink"
          >
            기본값
          </button>
        </div>
      </div>

      <div className="flex flex-col gap-3">
        {BUDGET_CHANNEL_ORDER.map((key) => {
          const channel = BUDGET_CHANNELS[key];
          const pct = allocation[key];
          const spend = Math.round((budget * pct) / 100);

          return (
            <div key={key} className="flex flex-col gap-1">
              <div className="flex flex-wrap items-baseline justify-between gap-x-3">
                <label htmlFor={`bg-${key}`} className="flex items-baseline gap-2">
                  <span className="text-[13px] font-medium text-ink">{channel.label}</span>
                  <span className="text-[11px] text-ink/60">→ {channel.feeds}</span>
                </label>
                <span className="tabular text-[12px] text-ink/60">
                  <span className="font-semibold text-ink">{pct}%</span> · {formatWon(spend)}
                </span>
              </div>

              <input
                id={`bg-${key}`}
                type="range"
                min={0}
                max={100}
                step={1}
                value={pct}
                aria-label={`${channel.label} 예산 비중`}
                onChange={(e) => onChange(key, Number(e.target.value))}
                className="h-1.5 w-full cursor-pointer appearance-none rounded-chip bg-paper-soft accent-neon"
              />
            </div>
          );
        })}
      </div>

      {/* One stacked bar makes the split readable at a glance. */}
      <div className="flex h-2 overflow-hidden rounded-chip border border-paper-line">
        {BUDGET_CHANNEL_ORDER.map((key, i) => (
          <span
            key={key}
            title={`${BUDGET_CHANNELS[key].label} ${allocation[key]}%`}
            style={{ width: `${allocation[key]}%` }}
            className={i % 2 === 0 ? 'bg-neon' : 'bg-ink/30'}
          />
        ))}
      </div>
    </div>
  );
}
