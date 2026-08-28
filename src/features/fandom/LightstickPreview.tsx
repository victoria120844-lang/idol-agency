import { useMemo, type CSSProperties } from 'react';

export interface LightstickPreviewProps {
  /** Fandom colour. Every dot and glow reads from this. */
  color: string;
  groupName: string;
  fandomName?: string;
  /** Optional lightstick name, shown as a small caption. */
  lightstickName?: string;
}

/** Dots across and down. 24 x 9 fills a wide card without costing frames. */
const COLUMNS = 24;
const ROWS = 9;
const DOT_COUNT = COLUMNS * ROWS;

/**
 * The 응원봉 물결: a dark arena filled with a field of lightsticks in the
 * fandom colour, twinkling out of phase.
 *
 * Only `opacity` animates, so the whole field stays on the compositor. Phase
 * and duration are derived from the dot index rather than random, so the scene
 * is identical on every render and survives a re-mount without flashing.
 */
export function LightstickPreview({
  color,
  groupName,
  fandomName,
  lightstickName,
}: LightstickPreviewProps) {
  const dots = useMemo(
    () =>
      Array.from({ length: DOT_COUNT }, (_, i) => {
        const col = i % COLUMNS;
        const row = Math.floor(i / COLUMNS);
        // Rows further back sit smaller and dimmer, which reads as depth.
        const depth = row / (ROWS - 1);
        return {
          i,
          size: 7 - depth * 3.4,
          baseOpacity: 0.9 - depth * 0.45,
          delay: ((col * 7 + row * 13) % 40) / 10,
          duration: 2.4 + ((col + row * 3) % 5) * 0.35,
          // Nudge alternate rows so the grid never reads as graph paper.
          offset: row % 2 === 0 ? 0 : 10,
        };
      }),
    [],
  );

  return (
    <div
      className="relative isolate overflow-hidden rounded-card border border-ink-line bg-ink"
      aria-label={`${groupName} 응원봉 물결 미리보기`}
    >
      {/* Stage haze in the fandom colour, kept very low so it never becomes a
          large fill competing with the system accent. */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 bottom-0 h-3/5"
        style={{
          background: `radial-gradient(120% 100% at 50% 120%, ${color}26, transparent 70%)`,
        }}
      />

      <div className="relative flex min-h-[240px] flex-col justify-between p-5 sm:min-h-[280px]">
        <div className="text-center">
          <div className="kicker">{fandomName ? `${fandomName} 응원봉 물결` : '응원봉 물결'}</div>
          <h3
            className="mt-2 text-[26px] font-semibold tracking-tight sm:text-[34px]"
            style={{ color, textShadow: `0 0 28px ${color}59` }}
          >
            {groupName || '그룹명'}
          </h3>
          {lightstickName && (
            <p className="m-0 mt-1.5 text-[11.5px] text-muted">공식 응원봉 · {lightstickName}</p>
          )}
        </div>

        <div
          className="mt-6 flex flex-col gap-[7px]"
          aria-hidden
          style={{ ['--fandom' as string]: color }}
        >
          {Array.from({ length: ROWS }, (_, row) => (
            <div
              key={row}
              className="flex justify-center gap-[10px]"
              style={{ marginLeft: dots[row * COLUMNS].offset }}
            >
              {dots.slice(row * COLUMNS, row * COLUMNS + COLUMNS).map((d) => (
                <span
                  key={d.i}
                  className="lightstick-dot block shrink-0 rounded-full"
                  style={
                    {
                      width: d.size,
                      height: d.size,
                      background: color,
                      boxShadow: `0 0 ${d.size * 1.8}px ${color}`,
                      // The keyframe animates between this and 1.
                      '--dot-opacity': d.baseOpacity,
                      animationDelay: `${d.delay}s`,
                      animationDuration: `${d.duration}s`,
                    } as CSSProperties
                  }
                />
              ))}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
