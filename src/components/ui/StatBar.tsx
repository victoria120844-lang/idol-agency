export interface StatBarProps {
  /** Korean stat name shown at the left — e.g. "보컬". */
  label: string;
  value: number;
  max?: number;
  /** Hidden ceiling, drawn as a faint track segment behind the fill. */
  potential?: number;
  /** Which surface the bar sits on; picks the track and text colours. */
  surface?: 'paper' | 'ink';
  /** Optional English kicker replacing the Korean label column width. */
  compact?: boolean;
}

/**
 * Horizontal meter: label left, tabular value right, neon fill, hairline ticks
 * at the 50 and 100 marks so values are readable without an axis.
 */
export function StatBar({
  label,
  value,
  max = 100,
  potential,
  surface = 'paper',
  compact = false,
}: StatBarProps) {
  const pct = Math.max(0, Math.min(1, value / max)) * 100;
  const potentialPct =
    potential === undefined ? null : Math.max(0, Math.min(1, potential / max)) * 100;

  const onPaper = surface === 'paper';
  const track = onPaper ? 'bg-paper-soft' : 'bg-ink-line/60';
  const tick = onPaper ? 'bg-paper-line' : 'bg-ink-line';
  // --muted is only 3.4:1 on white, so paper surfaces step the label down
  // from ink instead.
  const labelColor = onPaper ? 'text-ink/60' : 'text-muted';
  const valueColor = onPaper ? 'text-ink' : 'text-paper';
  const ghost = onPaper ? 'bg-paper-line' : 'bg-ink-line';

  return (
    <div className="flex items-center gap-3">
      <span className={`${compact ? 'w-10' : 'w-14'} shrink-0 text-[12px] ${labelColor}`}>
        {label}
      </span>

      <div className={`relative h-1.5 flex-1 rounded-chip ${track}`}>
        {potentialPct !== null && (
          <div
            className={`absolute inset-y-0 left-0 rounded-chip ${ghost}`}
            style={{ width: `${potentialPct}%` }}
          />
        )}
        <div
          className="absolute inset-y-0 left-0 rounded-chip bg-neon transition-[width] duration-500 ease-out"
          style={{ width: `${pct}%` }}
        />
        {/* Reference ticks at the halfway and full marks. */}
        <span className={`absolute inset-y-0 left-1/2 w-px ${tick}`} aria-hidden />
        <span className={`absolute inset-y-0 right-0 w-px ${tick}`} aria-hidden />
      </div>

      <span className={`tabular w-8 shrink-0 text-right text-[12px] font-medium ${valueColor}`}>
        {Math.round(value)}
      </span>
    </div>
  );
}
