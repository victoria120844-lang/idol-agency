import type { ReactNode } from 'react';

import type { Grade } from '../../game/types';

export type TagTone = 'default' | 'neon' | 'outline' | 'solid';
export type TagSurface = 'paper' | 'ink';

const TONES: Record<TagSurface, Record<TagTone, string>> = {
  paper: {
    default: 'bg-paper-soft text-ink border-paper-line',
    neon: 'bg-neon/8 text-neon border-neon/35',
    outline: 'bg-transparent text-ink/60 border-paper-line',
    solid: 'bg-ink text-paper border-ink',
  },
  ink: {
    default: 'bg-ink-soft text-paper border-ink-line',
    neon: 'bg-neon/12 text-neon border-neon/40',
    outline: 'bg-transparent text-muted border-ink-line',
    solid: 'bg-paper text-ink border-paper',
  },
};

export interface TagProps {
  tone?: TagTone;
  surface?: TagSurface;
  children: ReactNode;
}

/** Small hairline pill for concepts, positions, genres and traits. */
export function Tag({ tone = 'default', surface = 'paper', children }: TagProps) {
  return (
    <span
      className={`inline-flex h-6 items-center rounded-chip border px-2 text-[11px] font-medium leading-none ${TONES[surface][tone]}`}
    >
      {children}
    </span>
  );
}

/** Alias — a Chip is a Tag that happens to be interactive-adjacent. */
export const Chip = Tag;

/**
 * Grade badge. Intensity ramps with the grade: SS/S carry the neon, mid grades
 * are inked, and failing grades fade to muted hairlines.
 */
const GRADE_STYLES: Record<Grade, string> = {
  SS: 'bg-neon text-paper border-neon glow-neon',
  S: 'bg-neon text-paper border-neon',
  A: 'bg-neon/12 text-neon border-neon/45',
  B: 'bg-transparent text-ink border-ink/30',
  C: 'bg-transparent text-muted border-paper-line',
  D: 'bg-transparent text-muted/70 border-paper-line',
  F: 'bg-transparent text-muted/50 border-paper-line border-dashed',
};

const GRADE_STYLES_INK: Record<Grade, string> = {
  SS: 'bg-neon text-paper border-neon glow-neon',
  S: 'bg-neon text-paper border-neon',
  A: 'bg-neon/15 text-neon border-neon/50',
  B: 'bg-transparent text-paper border-ink-line',
  C: 'bg-transparent text-muted border-ink-line',
  D: 'bg-transparent text-muted/70 border-ink-line',
  F: 'bg-transparent text-muted/50 border-ink-line border-dashed',
};

export function GradeTag({
  grade,
  surface = 'paper',
  size = 'md',
}: {
  grade: Grade;
  surface?: TagSurface;
  size?: 'sm' | 'md';
}) {
  const styles = surface === 'paper' ? GRADE_STYLES : GRADE_STYLES_INK;
  const dims = size === 'sm' ? 'h-5 min-w-5 text-[10px]' : 'h-7 min-w-7 text-[12px]';

  return (
    <span
      className={`tabular inline-flex ${dims} items-center justify-center rounded-chip border px-1.5 font-bold leading-none tracking-tight ${styles[grade]}`}
      aria-label={`등급 ${grade}`}
    >
      {grade}
    </span>
  );
}
