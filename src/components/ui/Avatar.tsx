export interface AvatarProps {
  /** Stable identity — the same id always draws the same mark. */
  id: string;
  /** Initial(s) shown in the corner, usually the first character of the name. */
  initial?: string;
  size?: number;
  surface?: 'paper' | 'ink';
  /** Draws the neon ring used for the selected member. */
  active?: boolean;
}

/**
 * Deterministic abstract identity mark. No faces — the roster is a personnel
 * system, so each trainee gets a geometric sigil derived from their id.
 *
 * Everything is greyscale on purpose: neon is reserved for state, so an avatar
 * can never compete with the one accent colour.
 */

/** FNV-1a — same hash the seed helper uses, kept local so this stays pure. */
function hash(input: string): number {
  let h = 0x811c9dc5;
  for (let i = 0; i < input.length; i += 1) {
    h ^= input.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return h >>> 0;
}

/** Deterministic 0-(n-1) draw from bit slice `shift` of the hash. */
function pick(h: number, shift: number, n: number): number {
  return (h >>> shift) % n;
}

export function Avatar({ id, initial, size = 44, surface = 'paper', active = false }: AvatarProps) {
  const h = hash(id);

  const onPaper = surface === 'paper';
  const bg = onPaper ? 'var(--paper-soft)' : '#1b1b21';
  const line = onPaper ? 'var(--paper-line)' : 'var(--ink-line)';
  const ink = onPaper ? 'var(--ink)' : 'var(--paper)';

  // Four independent draws: shape family, rotation, weight, offset.
  const shape = pick(h, 0, 6);
  const rotation = pick(h, 5, 8) * 45;
  const heavy = pick(h, 9, 2) === 0;
  const shift = pick(h, 12, 3) - 1;

  const strong = heavy ? 0.9 : 0.55;
  const faint = heavy ? 0.28 : 0.16;

  return (
    <div
      className="relative shrink-0 overflow-hidden rounded-chip"
      style={{
        width: size,
        height: size,
        background: bg,
        border: `1px solid ${active ? 'var(--neon)' : line}`,
      }}
    >
      <svg viewBox="0 0 48 48" width={size} height={size} aria-hidden>
        <g transform={`rotate(${rotation} 24 24) translate(${shift * 3} ${shift * -2})`}>
          {shape === 0 && (
            <>
              <circle cx="24" cy="24" r="13" fill="none" stroke={ink} strokeOpacity={strong} strokeWidth="2" />
              <circle cx="24" cy="24" r="5" fill={ink} fillOpacity={faint} />
            </>
          )}
          {shape === 1 && (
            <>
              <path d="M24 9 38 33H10Z" fill={ink} fillOpacity={faint} />
              <path d="M24 9 38 33H10Z" fill="none" stroke={ink} strokeOpacity={strong} strokeWidth="2" strokeLinejoin="round" />
            </>
          )}
          {shape === 2 && (
            <>
              <rect x="11" y="11" width="26" height="26" rx="2" fill="none" stroke={ink} strokeOpacity={strong} strokeWidth="2" />
              <rect x="19" y="19" width="10" height="10" fill={ink} fillOpacity={faint} />
            </>
          )}
          {shape === 3 && (
            <>
              <path d="M10 34a14 14 0 0 1 28 0" fill="none" stroke={ink} strokeOpacity={strong} strokeWidth="2" />
              <path d="M14 34a10 10 0 0 1 20 0" fill="none" stroke={ink} strokeOpacity={faint} strokeWidth="2" />
              <line x1="8" y1="34" x2="40" y2="34" stroke={ink} strokeOpacity={strong} strokeWidth="2" />
            </>
          )}
          {shape === 4 && (
            <>
              <path d="M24 8 40 24 24 40 8 24Z" fill={ink} fillOpacity={faint} />
              <path d="M24 8 40 24 24 40 8 24Z" fill="none" stroke={ink} strokeOpacity={strong} strokeWidth="2" strokeLinejoin="round" />
            </>
          )}
          {shape === 5 && (
            <>
              <line x1="12" y1="12" x2="36" y2="36" stroke={ink} strokeOpacity={strong} strokeWidth="2.5" strokeLinecap="round" />
              <line x1="36" y1="12" x2="12" y2="36" stroke={ink} strokeOpacity={faint} strokeWidth="2.5" strokeLinecap="round" />
              <circle cx="24" cy="24" r="15" fill="none" stroke={ink} strokeOpacity={faint} strokeWidth="1.5" />
            </>
          )}
        </g>
      </svg>

      {initial && (
        <span
          className="absolute bottom-0 right-0 px-1 text-[9px] font-bold leading-[1.4]"
          style={{ color: ink, background: bg }}
        >
          {initial}
        </span>
      )}
    </div>
  );
}
