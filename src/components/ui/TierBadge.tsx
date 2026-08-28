import { AGENCY_TIERS } from '../../game/constants';
import { agencyTierIndex, agencyTierInfo } from '../../game/formulas';
import type { AgencyTierId } from '../../game/types';

export interface TierBadgeProps {
  tier: AgencyTierId;
  surface?: 'paper' | 'ink';
  /** Adds the 5-step ladder meter under the label. */
  showLadder?: boolean;
  size?: 'sm' | 'md';
}

/**
 * Agency size badge. Only the current step is neon; the rest of the ladder is
 * hairline, so the player reads how far the label still has to climb.
 */
export function TierBadge({
  tier,
  surface = 'paper',
  showLadder = false,
  size = 'md',
}: TierBadgeProps) {
  const info = agencyTierInfo(tier);
  const index = agencyTierIndex(tier);
  const onPaper = surface === 'paper';

  const dims = size === 'sm' ? 'h-5 px-1.5 text-[10px]' : 'h-6 px-2 text-[11px]';
  const track = onPaper ? 'bg-paper-line' : 'bg-ink-line';

  return (
    <div className="flex flex-col gap-1.5">
      <span
        className={`inline-flex ${dims} w-fit items-center gap-1.5 rounded-chip border border-neon/40 bg-neon/10 font-semibold leading-none text-neon`}
      >
        {info.label}
      </span>

      {showLadder && (
        <div className="flex items-center gap-1" aria-label={`기획사 등급 ${index + 1}/5`}>
          {AGENCY_TIERS.map((t, i) => (
            <span
              key={t.id}
              title={t.label}
              className={`h-[3px] flex-1 rounded-chip ${i <= index ? 'bg-neon' : track}`}
            />
          ))}
        </div>
      )}
    </div>
  );
}
