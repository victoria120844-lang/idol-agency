import { memo, useMemo, useState } from 'react';

import { RELATION_TYPES } from '../../game/constants';
import type { Member, Relationship } from '../../game/types';

export interface RelationshipMapProps {
  members: readonly Member[];
  relationships: readonly Relationship[];
  /** Notifies the parent so the history card can render outside the SVG. */
  onSelectPair?: (pair: Relationship | null) => void;
  size?: number;
}

const VIEW = 420;
const CENTER = VIEW / 2;
/** Node ring radius. Sized so nine 34px nodes never touch. */
const RING = 148;

/** Edge stroke per relation type, resolved from the design tokens. */
const STROKE: Record<'neon' | 'paper' | 'muted', string> = {
  neon: 'var(--neon)',
  paper: 'var(--paper)',
  muted: 'var(--muted)',
};

function nodePoint(index: number, count: number, radius = RING): [number, number] {
  // Start at 12 o'clock so the first member sits at the top of the ring.
  const angle = (Math.PI * 2 * index) / count - Math.PI / 2;
  return [CENTER + Math.cos(angle) * radius, CENTER + Math.sin(angle) * radius];
}

/**
 * Interactive relationship graph.
 *
 * Members sit on a circle; every pair gets an edge whose colour is its type and
 * whose thickness is |호감도|. Edges bow toward the centre by an amount that
 * grows with how far apart the two nodes are on the ring, which keeps the long
 * chords of a nine-member group from collapsing into an unreadable star.
 */
/**
 * Memoised: a nine-member group draws 36 curved edges plus hit areas, and the
 * hub re-renders it on every unrelated state change.
 */
export const RelationshipMap = memo(function RelationshipMap({
  members,
  relationships,
  onSelectPair,
  size = 420,
}: RelationshipMapProps) {
  const [activeKey, setActiveKey] = useState<string | null>(null);

  const positions = useMemo(() => {
    const map = new Map<string, [number, number]>();
    members.forEach((m, i) => map.set(m.id, nodePoint(i, members.length)));
    return map;
  }, [members]);

  const indexOf = useMemo(() => {
    const map = new Map<string, number>();
    members.forEach((m, i) => map.set(m.id, i));
    return map;
  }, [members]);

  const select = (rel: Relationship | null, key: string | null) => {
    setActiveKey(key);
    onSelectPair?.(rel);
  };

  if (members.length < 2) return null;

  return (
    <svg
      viewBox={`0 0 ${VIEW} ${VIEW}`}
      // Fills the card at every width instead of scaling a fixed box down —
      // at 390px the labels stay at their intended size.
      className="h-auto w-full touch-manipulation"
      style={{ maxWidth: size }}
      role="img"
      aria-label={`멤버 ${members.length}명의 관계도`}
    >
      {/* Guide ring, hairline. */}
      <circle
        cx={CENTER}
        cy={CENTER}
        r={RING}
        fill="none"
        stroke="var(--ink-line)"
        strokeWidth="1"
      />

      {relationships.map((rel) => {
        const from = positions.get(rel.a);
        const to = positions.get(rel.b);
        if (!from || !to) return null;

        const key = `${rel.a}-${rel.b}`;
        const meta = RELATION_TYPES[rel.type];
        const active = activeKey === key;
        const dimmed = activeKey !== null && !active;

        // Bow the chord toward the centre; wider separations bow more.
        const ia = indexOf.get(rel.a) ?? 0;
        const ib = indexOf.get(rel.b) ?? 0;
        const step = Math.min(
          Math.abs(ia - ib),
          members.length - Math.abs(ia - ib),
        );
        const pull = Math.min(0.55, 0.12 * step);
        const midX = (from[0] + to[0]) / 2;
        const midY = (from[1] + to[1]) / 2;
        const cx = midX + (CENTER - midX) * pull;
        const cy = midY + (CENTER - midY) * pull;

        const strength = Math.abs(rel.affinity) / 100;
        const width = 0.8 + strength * 2.6;
        const path = `M ${from[0]} ${from[1]} Q ${cx} ${cy} ${to[0]} ${to[1]}`;

        return (
          <g key={key}>
            <path
              d={path}
              fill="none"
              stroke={STROKE[meta.stroke]}
              strokeWidth={active ? width + 1.4 : width}
              strokeDasharray={meta.dashed ? '5 4' : undefined}
              strokeOpacity={dimmed ? 0.12 : active ? 1 : 0.34 + strength * 0.4}
              strokeLinecap="round"
              pointerEvents="none"
            />
            {/* Fat invisible hit area — a 2px line is impossible to hover. */}
            <path
              d={path}
              fill="none"
              stroke="transparent"
              strokeWidth="16"
              className="cursor-pointer"
              onMouseEnter={() => select(rel, key)}
              onMouseLeave={() => select(null, null)}
              onClick={() => (active ? select(null, null) : select(rel, key))}
            >
              <title>
                {`${meta.label} · 호감도 ${rel.affinity > 0 ? '+' : ''}${rel.affinity}`}
              </title>
            </path>
          </g>
        );
      })}

      {members.map((m, i) => {
        const [x, y] = positions.get(m.id) ?? [CENTER, CENTER];
        const touched =
          activeKey !== null && (activeKey.startsWith(m.id) || activeKey.endsWith(m.id));
        const dimmed = activeKey !== null && !touched;

        // Push the label outward along the same spoke as the node.
        const [lx, ly] = nodePoint(i, members.length, RING + 34);

        return (
          <g key={m.id} opacity={dimmed ? 0.35 : 1}>
            <circle
              cx={x}
              cy={y}
              r="17"
              fill="var(--ink-soft)"
              stroke={touched ? 'var(--neon)' : 'var(--ink-line)'}
              strokeWidth={touched ? 2 : 1}
            />
            <text
              x={x}
              y={y + 4}
              textAnchor="middle"
              fontSize="12"
              fontWeight="600"
              fill={touched ? 'var(--neon)' : 'var(--paper)'}
            >
              {m.name.slice(0, 1)}
            </text>
            <text
              x={lx}
              y={ly + 4}
              textAnchor={lx < CENTER - 4 ? 'end' : lx > CENTER + 4 ? 'start' : 'middle'}
              fontSize="11"
              fill={touched ? 'var(--paper)' : 'var(--muted)'}
            >
              {m.name}
            </text>
          </g>
        );
      })}
    </svg>
  );
});
