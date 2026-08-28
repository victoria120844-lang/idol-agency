import type { ReactNode } from 'react';

import { IconArrowDown, IconArrowUp } from './icons';

export interface MetricTileProps {
  /** English kicker — e.g. "FIRST WEEK SALES". */
  kicker: string;
  /** The headline figure, already formatted (formatWon / formatCount). */
  value: ReactNode;
  /** Korean sublabel — e.g. "초동 판매량". */
  sublabel?: string;
  /** Signed change; positive renders neon, negative renders muted. */
  delta?: number;
  /** Formatted delta text; falls back to the signed number. */
  deltaLabel?: string;
  surface?: 'paper' | 'ink';
  /** Marks the metric as the screen's key number, tinting the value neon. */
  emphasis?: boolean;
}

/**
 * Big tabular number with its English kicker above and Korean sublabel below.
 * The delta arrow is the only place a small neon mark appears on a paper card.
 */
export function MetricTile({
  kicker,
  value,
  sublabel,
  delta,
  deltaLabel,
  surface = 'paper',
  emphasis = false,
}: MetricTileProps) {
  const onPaper = surface === 'paper';
  const shell = onPaper
    ? 'on-paper bg-paper border-paper-line text-ink'
    : 'bg-ink-soft border-ink-line text-paper';
  const valueColor = emphasis ? 'text-neon' : onPaper ? 'text-ink' : 'text-paper';

  const hasDelta = delta !== undefined && delta !== 0;
  const up = (delta ?? 0) > 0;

  return (
    <div className={`rounded-card border px-4 py-3.5 ${shell}`}>
      <div className="kicker truncate">{kicker}</div>

      {/* Wraps rather than overflows: at 390px a long figure plus a delta does
          not fit on one baseline in a two-column grid. */}
      <div className="mt-2 flex flex-wrap items-baseline gap-x-2 gap-y-1">
        <span className={`tabular text-[26px] font-semibold leading-none tracking-tight ${valueColor}`}>
          {value}
        </span>
        {hasDelta && (
          <span
            className={`tabular inline-flex items-center gap-0.5 text-[12px] font-medium ${up ? 'text-neon' : 'text-muted'}`}
          >
            {up ? <IconArrowUp /> : <IconArrowDown />}
            {deltaLabel ?? `${up ? '+' : ''}${delta}`}
          </span>
        )}
      </div>

      {sublabel && (
        <div className={`mt-1.5 text-[12px] ${onPaper ? 'text-ink/60' : 'text-muted'}`}>{sublabel}</div>
      )}
    </div>
  );
}
