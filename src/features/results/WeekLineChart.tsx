import { formatCount } from '../../game/formulas';
import type { WeekSeriesPoint } from '../../game/types';

export interface WeekLineChartProps {
  series: readonly WeekSeriesPoint[];
  /** Fandom series colour — the one place the fandom colour earns its keep. */
  fandomColor: string;
  height?: number;
}

const VIEW_W = 720;
const PAD_L = 8;
const PAD_R = 8;
const PAD_T = 22;
const PAD_B = 26;

/**
 * Four-week trend, drawn as two normalised series on one pair of axes.
 *
 * Fandom and buzz live on wildly different scales, so each series is normalised
 * against its own maximum — the shape of the run is the story, not the absolute
 * pixel height. Pure SVG; no chart library.
 */
export function WeekLineChart({ series, fandomColor, height = 220 }: WeekLineChartProps) {
  if (series.length === 0) return null;

  const innerW = VIEW_W - PAD_L - PAD_R;
  const innerH = height - PAD_T - PAD_B;

  const maxFandom = Math.max(...series.map((p) => p.fandom), 1);
  const maxBuzz = Math.max(...series.map((p) => p.buzz), 1);

  const x = (i: number) =>
    PAD_L + (series.length === 1 ? innerW / 2 : (i / (series.length - 1)) * innerW);
  const y = (value: number, max: number) => PAD_T + innerH - (value / max) * innerH;

  const path = (key: 'fandom' | 'buzz', max: number) =>
    series.map((p, i) => `${i === 0 ? 'M' : 'L'} ${x(i)} ${y(p[key], max)}`).join(' ');

  const area = (key: 'fandom' | 'buzz', max: number) =>
    `${path(key, max)} L ${x(series.length - 1)} ${PAD_T + innerH} L ${x(0)} ${PAD_T + innerH} Z`;

  return (
    <div className="flex flex-col gap-2">
      <svg
        viewBox={`0 0 ${VIEW_W} ${height}`}
        className="h-auto w-full"
        role="img"
        aria-label="4주간 팬덤과 버즈 추이"
      >
        <defs>
          <linearGradient id="fandomFill" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={fandomColor} stopOpacity="0.22" />
            <stop offset="100%" stopColor={fandomColor} stopOpacity="0" />
          </linearGradient>
        </defs>

        {/* Hairline gridlines at the quarter marks. */}
        {[0, 0.25, 0.5, 0.75, 1].map((t) => (
          <line
            key={t}
            x1={PAD_L}
            x2={VIEW_W - PAD_R}
            y1={PAD_T + innerH * t}
            y2={PAD_T + innerH * t}
            stroke="var(--ink-line)"
            strokeWidth="1"
          />
        ))}

        <path d={area('fandom', maxFandom)} fill="url(#fandomFill)" />
        <path
          d={path('fandom', maxFandom)}
          fill="none"
          stroke={fandomColor}
          strokeWidth="2.5"
          strokeLinejoin="round"
          strokeLinecap="round"
        />
        <path
          d={path('buzz', maxBuzz)}
          fill="none"
          stroke="var(--neon)"
          strokeWidth="2.5"
          strokeDasharray="6 4"
          strokeLinejoin="round"
          strokeLinecap="round"
        />

        {series.map((p, i) => (
          <g key={p.promoWeek}>
            <circle cx={x(i)} cy={y(p.fandom, maxFandom)} r="4" fill={fandomColor} />
            <circle cx={x(i)} cy={y(p.buzz, maxBuzz)} r="4" fill="var(--neon)" />
            <text
              x={x(i)}
              y={height - 8}
              textAnchor={i === 0 ? 'start' : i === series.length - 1 ? 'end' : 'middle'}
              fontSize="12"
              fill="var(--muted)"
            >
              {p.promoWeek}주차
            </text>
          </g>
        ))}

        {/* Final values as a fixed readout in the top-left corner.
            Anchoring them to the line ends looked tidier but the two series
            finish at almost the same normalised height, so the labels
            overprinted each other and the end dots. */}
        <text x={PAD_L} y={13} fontSize="12" fontWeight="600" fill={fandomColor}>
          팬덤 {formatCount(series[series.length - 1].fandom, '명')}
        </text>
        <text x={PAD_L + 150} y={13} fontSize="12" fontWeight="600" fill="var(--neon)">
          버즈 {formatCount(series[series.length - 1].buzz)}
        </text>
      </svg>

      <div className="flex flex-wrap gap-x-4 gap-y-1 text-[11px] text-muted">
        <span className="flex items-center gap-1.5">
          <span className="h-[2px] w-5" style={{ background: fandomColor }} />
          팬덤 규모
        </span>
        <span className="flex items-center gap-1.5">
          <span
            className="h-[2px] w-5"
            style={{
              backgroundImage:
                'repeating-linear-gradient(90deg, var(--neon) 0 5px, transparent 5px 9px)',
            }}
          />
          누적 버즈
        </span>
        <span className="text-muted/70">두 계열은 각자 최댓값 기준으로 정규화됩니다.</span>
      </div>
    </div>
  );
}
