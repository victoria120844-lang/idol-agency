import { STAT_LABELS } from '../../game/constants';
import type { Stats, StatKey } from '../../game/types';

/** The six axes a trainee is read on. Stamina and variety live in the bar list. */
export const HEXAGON_AXES: readonly StatKey[] = [
  'vocal',
  'dance',
  'rap',
  'visual',
  'charisma',
  'mental',
] as const;

export interface StatHexagonProps {
  stats: Stats;
  /** Faint outline of the hidden ceiling, drawn behind the value shape. */
  potential?: Stats;
  /**
   * A target shape drawn as a dashed outline behind the values — used for the
   * concept's ideal shape on the debut screen.
   */
  overlay?: Stats;
  size?: number;
  surface?: 'paper' | 'ink';
  /** Hide the axis labels when the chart is used as a thumbnail. */
  showLabels?: boolean;
}

const VIEW = 240;
const CENTER = VIEW / 2;
const RADIUS = 74;
const LABEL_RADIUS = 98;
const RINGS = [0.25, 0.5, 0.75, 1];

/** Vertex position for axis `i` at `ratio` of full radius. Starts at 12 o'clock. */
function point(i: number, ratio: number, radius = RADIUS): [number, number] {
  const angle = (Math.PI / 3) * i - Math.PI / 2;
  return [CENTER + Math.cos(angle) * radius * ratio, CENTER + Math.sin(angle) * radius * ratio];
}

function polygon(ratios: number[], radius = RADIUS): string {
  return ratios.map((r, i) => point(i, r, radius).join(',')).join(' ');
}

/**
 * Six-axis radar chart in pure SVG — no chart library. Renders the same on
 * paper cards and ink panels; the grid takes its colour from the surface.
 */
export function StatHexagon({
  stats,
  potential,
  overlay,
  size = 200,
  surface = 'paper',
  showLabels = true,
}: StatHexagonProps) {
  const onPaper = surface === 'paper';
  const grid = onPaper ? 'var(--paper-line)' : 'var(--ink-line)';
  // Axis labels need 4.5:1; --muted clears it on ink but not on white.
  const labelFill = onPaper ? 'color-mix(in srgb, var(--ink) 62%, #ffffff)' : 'var(--muted)';
  const valueFill = onPaper ? 'var(--ink)' : 'var(--paper)';

  // Without labels the chart is a thumbnail, so crop the box to the shape
  // instead of reserving the label gutter.
  const pad = 6;
  const box = showLabels
    ? `0 0 ${VIEW} ${VIEW}`
    : `${CENTER - RADIUS - pad} ${CENTER - RADIUS - pad} ${(RADIUS + pad) * 2} ${(RADIUS + pad) * 2}`;

  const values = HEXAGON_AXES.map((key) => Math.max(0, Math.min(100, stats[key])) / 100);
  const ceiling = potential
    ? HEXAGON_AXES.map((key) => Math.max(0, Math.min(100, potential[key])) / 100)
    : null;

  return (
    <svg
      viewBox={box}
      width={size}
      height={size}
      role="img"
      aria-label={HEXAGON_AXES.map((k) => `${STAT_LABELS[k]} ${Math.round(stats[k])}`).join(', ')}
      className="max-w-full"
    >
      {/* Concentric hairline rings. */}
      {RINGS.map((ring) => (
        <polygon
          key={ring}
          points={polygon(HEXAGON_AXES.map(() => ring))}
          fill="none"
          stroke={grid}
          strokeWidth="1"
        />
      ))}

      {/* Axis spokes. */}
      {HEXAGON_AXES.map((key, i) => {
        const [x, y] = point(i, 1);
        return <line key={key} x1={CENTER} y1={CENTER} x2={x} y2={y} stroke={grid} strokeWidth="1" />;
      })}

      {/* Target shape, dashed and heavier than the grid so it reads as a goal. */}
      {overlay && (
        <polygon
          points={polygon(
            HEXAGON_AXES.map((key) => Math.max(0, Math.min(100, overlay[key])) / 100),
          )}
          fill="none"
          stroke={grid}
          strokeWidth="1.5"
          strokeDasharray="4 3"
          strokeLinejoin="round"
        />
      )}

      {/* Potential ceiling, dashed and unfilled. */}
      {ceiling && (
        <polygon
          points={polygon(ceiling)}
          fill="none"
          stroke={grid}
          strokeWidth="1"
          strokeDasharray="3 3"
        />
      )}

      {/* The value shape. Neon at low opacity — never a large solid fill. */}
      <polygon
        points={polygon(values)}
        fill="var(--neon)"
        fillOpacity="0.12"
        stroke="var(--neon)"
        strokeWidth="1.5"
        strokeLinejoin="round"
      />

      {/* Vertex dots. */}
      {values.map((ratio, i) => {
        const [x, y] = point(i, ratio);
        return <circle key={HEXAGON_AXES[i]} cx={x} cy={y} r="2.5" fill="var(--neon)" />;
      })}

      {showLabels &&
        HEXAGON_AXES.map((key, i) => {
          const [x, y] = point(i, 1, LABEL_RADIUS);
          // Nudge the anchor so side labels do not collide with the shape.
          const anchor = x < CENTER - 4 ? 'end' : x > CENTER + 4 ? 'start' : 'middle';
          return (
            <g key={key}>
              <text
                x={x}
                y={y - 3}
                textAnchor={anchor}
                fill={labelFill}
                fontSize="11"
                letterSpacing="0.02em"
              >
                {STAT_LABELS[key]}
              </text>
              <text
                x={x}
                y={y + 11}
                textAnchor={anchor}
                fill={valueFill}
                fontSize="12"
                fontWeight="600"
                style={{ fontVariantNumeric: 'tabular-nums' }}
              >
                {Math.round(stats[key])}
              </text>
            </g>
          );
        })}
    </svg>
  );
}
