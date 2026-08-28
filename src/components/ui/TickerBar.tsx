import type { CSSProperties } from 'react';

import { TICKER_HEADLINES } from '../../game/constants';

export interface TickerBarProps {
  /** Defaults to the industry headline pool in constants.ts. */
  items?: readonly string[];
  /** Seconds for one full pass. Longer strings want a longer duration. */
  duration?: number;
}

/**
 * Thin marquee of industry chatter across the top of the shell.
 *
 * The track is duplicated and translated by exactly -50%, which makes the loop
 * seamless. Only `transform` animates, so it stays on the compositor at 60fps;
 * `prefers-reduced-motion` stops it via the global rule in index.css.
 */
export function TickerBar({ items = TICKER_HEADLINES, duration = 60 }: TickerBarProps) {
  const track = [...items, ...items];

  return (
    <div className="flex h-[var(--ticker-h)] items-center overflow-hidden border-b border-ink-line bg-ink">
      {/* Sits above the track: the marquee translates left and would otherwise
          slide its headlines out from under this label. */}
      <span className="relative z-10 flex h-full shrink-0 items-center gap-1.5 border-r border-ink-line bg-ink px-3">
        <span className="size-1.5 rounded-full bg-neon" />
        <span className="kicker" style={{ color: 'var(--neon)' }}>
          LIVE
        </span>
      </span>

      <div
        className="ticker-track flex min-w-max items-center"
        style={{ '--ticker-dur': `${duration}s` } as CSSProperties}
        aria-hidden
      >
        {track.map((headline, i) => (
          <span
            key={`${headline}-${i}`}
            className="flex items-center whitespace-nowrap px-4 text-[11px] text-muted"
          >
            {headline}
            <span className="ml-4 text-ink-line">/</span>
          </span>
        ))}
      </div>
    </div>
  );
}
