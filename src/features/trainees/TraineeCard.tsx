import { memo } from 'react';
import { motion } from 'framer-motion';

import { Avatar, StatHexagon, Tag } from '../../components/ui';
import {
  GENDER_LABELS,
  NATIONALITY_LABELS,
  PERSONALITY_TAGS,
  SPECIALTIES,
  STAT_LABELS,
} from '../../game/constants';
import { isPotentialVisible, traineeOverall } from '../../game/formulas';
import type { Trainee } from '../../game/types';
import { PotentialBadge } from './PotentialBadge';

export interface TraineeCardProps {
  trainee: Trainee;
  onOpen: (id: string) => void;
  /** Plays the신규 flash and stamps SIGNED across the card. */
  isNew?: boolean;
}

/** Memoised: the roster renders up to 40 of these, each with its own radar. */
export const TraineeCard = memo(function TraineeCard({
  trainee,
  onOpen,
  isNew = false,
}: TraineeCardProps) {
  const overall = traineeOverall(trainee.stats);
  const revealed = isPotentialVisible(trainee);

  return (
    <motion.button
      type="button"
      layout
      onClick={() => onOpen(trainee.id)}
      aria-label={`${trainee.name} 연습생 상세 보기`}
      initial={isNew ? { opacity: 0, y: 10, scale: 0.97 } : false}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
      className="on-paper group relative overflow-hidden rounded-card border border-paper-line bg-paper p-3 text-left transition-colors hover:border-ink/25"
    >
      {/* Neon flash on the freshly signed card. */}
      {isNew && (
        <motion.span
          aria-hidden
          className="pointer-events-none absolute inset-0 rounded-card"
          initial={{ opacity: 1, boxShadow: '0 0 0 2px var(--neon), 0 0 28px var(--neon-glow)' }}
          animate={{ opacity: 0 }}
          transition={{ duration: 1.6, ease: 'easeOut' }}
        />
      )}
      {isNew && (
        <motion.span
          aria-hidden
          initial={{ opacity: 0, rotate: -14, scale: 1.3 }}
          animate={{ opacity: [0, 1, 1, 0], scale: 1 }}
          transition={{ duration: 1.8, times: [0, 0.15, 0.7, 1] }}
          className="pointer-events-none absolute bottom-2.5 right-2.5 z-10 rounded-chip border-2 border-neon bg-paper px-2 py-0.5 text-[11px] font-bold tracking-[0.14em] text-neon"
        >
          SIGNED
        </motion.span>
      )}

      <div className="flex items-start gap-3">
        <Avatar id={trainee.id} initial={trainee.name.slice(0, 1)} size={44} />

        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-1.5">
            <span className="truncate text-[14px] font-semibold text-ink">{trainee.name}</span>
            <PotentialBadge grade={trainee.potentialGrade} revealed={revealed} size="sm" />
          </div>
          <div className="tabular mt-0.5 text-[11px] text-ink/60">
            {trainee.age}세 · {GENDER_LABELS[trainee.gender]} ·{' '}
            {NATIONALITY_LABELS[trainee.nationality]}
          </div>
        </div>

        <div className="shrink-0 text-right">
          <div className="kicker">Overall</div>
          <div className="tabular text-[20px] font-semibold leading-none text-ink">{overall}</div>
        </div>
      </div>

      <div className="mt-2 flex items-center gap-3">
        <StatHexagon stats={trainee.stats} size={74} showLabels={false} surface="paper" />

        <div className="flex min-w-0 flex-1 flex-col gap-1.5">
          <div className="flex flex-wrap gap-1">
            <Tag tone="neon">{SPECIALTIES[trainee.specialty].label}</Tag>
          </div>
          <div className="flex flex-wrap gap-1">
            {trainee.personality.map((p) => (
              <Tag key={p} tone="outline">
                {PERSONALITY_TAGS[p].label}
              </Tag>
            ))}
          </div>
          <div className="tabular text-[11px] text-ink/60">
            특기 {STAT_LABELS[trainee.signatureStat]} {trainee.stats[trainee.signatureStat]}
          </div>
        </div>
      </div>
    </motion.button>
  );
});
