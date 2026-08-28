import type { ComponentType, ReactNode, SVGProps } from 'react';

import { PHASE_LABELS } from '../../game/constants';
import { formatCount, formatWon } from '../../game/formulas';
import type { AgencyTierId, GamePhase } from '../../game/types';
import { TickerBar } from './TickerBar';
import { TierBadge } from './TierBadge';
import {
  IconAlbum,
  IconComeback,
  IconCompany,
  IconDebut,
  IconFandom,
  IconHub,
  IconIntro,
  IconHelp,
  IconResults,
  IconSave,
  IconTrainee,
  LogoMark,
} from './icons';

const PHASE_ICONS: Record<GamePhase, ComponentType<SVGProps<SVGSVGElement>>> = {
  intro: IconIntro,
  company_create: IconCompany,
  trainee_recruit: IconTrainee,
  debut_group: IconDebut,
  fandom_setup: IconFandom,
  album_produce: IconAlbum,
  comeback_week: IconComeback,
  results: IconResults,
  agency_hub: IconHub,
};

/** Phases that get a rail slot. `intro` is pre-game and has no rail entry. */
const RAIL_PHASES: readonly GamePhase[] = [
  'company_create',
  'trainee_recruit',
  'debut_group',
  'fandom_setup',
  'album_produce',
  'comeback_week',
  'results',
  'agency_hub',
] as const;

export interface AppShellProps {
  phase: GamePhase;
  /** Agency name in the top bar. Null before the company exists. */
  companyName?: string | null;
  /** Agency CI colour; tints the logo mark once the company exists. */
  ciColor?: string;
  /** Size tier, shown as a badge beside the agency name. */
  tier?: AgencyTierId;
  /** Cash on hand, rendered through formatWon. */
  won?: number;
  /** Comeback-only: current promo week and how many there are. */
  promoWeek?: number;
  promoTotal?: number;
  /** Comeback-only: 누적 버즈 and 팬덤 규모 for the top bar. */
  buzz?: number;
  fandomSize?: number;
  /** In-game week counter. */
  week?: number;
  /** Fires when a rail icon is clicked; omit to make the rail display-only. */
  onNavigate?: (phase: GamePhase) => void;
  /** Phases the player may jump to. Everything else renders disabled. */
  unlocked?: readonly GamePhase[];
  /** Opens the rules modal. */
  onHelp?: () => void;
  /** Opens the save slot manager. */
  onSaves?: () => void;
  children: ReactNode;
}

/**
 * Global chrome: ticker, left icon rail, thin top bar, padded content area.
 * The rail collapses into a fixed bottom bar below the `lg` breakpoint.
 */
export function AppShell({
  phase,
  companyName,
  ciColor,
  tier,
  won,
  promoWeek,
  promoTotal,
  buzz,
  fandomSize,
  week,
  onNavigate,
  unlocked,
  onHelp,
  onSaves,
  children,
}: AppShellProps) {
  const canVisit = (p: GamePhase) => (unlocked ? unlocked.includes(p) : Boolean(onNavigate));

  return (
    <div className="min-h-dvh">
      <div className="fixed inset-x-0 top-0 z-30">
        <TickerBar />
      </div>

      {/* ---- Left rail (lg and up) ---- */}
      <nav
        aria-label="게임 단계"
        className="fixed left-0 top-[var(--ticker-h)] bottom-0 z-20 hidden w-[var(--rail-w)] flex-col items-center border-r border-ink-line bg-ink-soft py-3 lg:flex"
      >
        <span
          className="flex size-10 items-center justify-center"
          style={{ color: ciColor ?? 'var(--neon)' }}
          title={companyName ?? 'IDOL AGENCY SIMULATOR'}
        >
          <LogoMark />
        </span>

        <span className="my-3 h-px w-8 bg-ink-line" />

        <div className="flex flex-col items-center gap-1">
          {RAIL_PHASES.map((p) => (
            <RailButton
              key={p}
              phase={p}
              active={p === phase}
              enabled={canVisit(p)}
              onClick={onNavigate}
            />
          ))}
        </div>

        {/* System actions sit below the phase list, away from the game flow. */}
        <div className="mt-auto flex flex-col items-center gap-1">
          <span className="my-1 h-px w-8 bg-ink-line" />
          <button
            type="button"
            onClick={onSaves}
            aria-label="저장 슬롯"
            title="저장 슬롯"
            className="flex size-10 items-center justify-center rounded-chip border border-transparent text-muted transition-colors hover:bg-ink-line/40 hover:text-paper"
          >
            <IconSave />
          </button>
          <button
            type="button"
            onClick={onHelp}
            aria-label="게임 방법"
            title="게임 방법"
            className="flex size-10 items-center justify-center rounded-chip border border-transparent text-muted transition-colors hover:bg-ink-line/40 hover:text-paper"
          >
            <IconHelp />
          </button>
        </div>
      </nav>

      {/* ---- Top bar ---- */}
      <header className="fixed left-0 right-0 top-[var(--ticker-h)] z-20 flex h-[var(--topbar-h)] items-center justify-between gap-4 border-b border-ink-line bg-ink px-4 lg:left-[var(--rail-w)] lg:px-6">
        <div className="flex min-w-0 items-center gap-2.5">
          <span className="lg:hidden" style={{ color: ciColor ?? 'var(--neon)' }}>
            <LogoMark className="size-[18px]" />
          </span>
          <div className="flex min-w-0 items-center gap-2.5">
            <div className="min-w-0">
              <div className="kicker hidden sm:block">AGENCY</div>
              <div className="truncate text-[13px] font-semibold text-paper">
                {companyName ?? '미설립'}
              </div>
            </div>
            {tier && (
              <span className="shrink-0">
                <TierBadge tier={tier} surface="ink" size="sm" />
              </span>
            )}
          </div>
        </div>

        <div className="flex shrink-0 items-center gap-4 sm:gap-6">
          {buzz !== undefined && (
            <>
              <TopStat kicker="BUZZ" value={formatCount(buzz)} className="hidden md:block" />
              <span className="hidden h-7 w-px bg-ink-line md:block" />
            </>
          )}
          {fandomSize !== undefined && (
            <>
              <TopStat
                kicker="FANDOM"
                value={formatCount(fandomSize, '명')}
                className="hidden lg:block"
              />
              <span className="hidden h-7 w-px bg-ink-line lg:block" />
            </>
          )}
          <TopStat kicker="BALANCE" value={won === undefined ? '—' : formatWon(won)} emphasis />
          <span className="hidden h-7 w-px bg-ink-line sm:block" />
          <span className="flex shrink-0 items-center gap-0.5 lg:hidden">
            <button
              type="button"
              onClick={onSaves}
              aria-label="저장 슬롯"
              className="flex size-8 items-center justify-center rounded-chip text-muted transition-colors hover:text-paper"
            >
              <IconSave width={16} height={16} />
            </button>
            <button
              type="button"
              onClick={onHelp}
              aria-label="게임 방법"
              className="flex size-8 items-center justify-center rounded-chip text-muted transition-colors hover:text-paper"
            >
              <IconHelp width={16} height={16} />
            </button>
          </span>
          <TopStat
            kicker="WEEK"
            value={
              promoWeek !== undefined && promoTotal !== undefined
                ? `${promoWeek}/${promoTotal}`
                : week === undefined
                  ? '—'
                  : `${week}주차`
            }
          />
        </div>
      </header>

      {/* Four-segment promotion rail, only during the comeback. */}
      {promoWeek !== undefined && promoTotal !== undefined && (
        <div className="fixed left-0 right-0 top-[calc(var(--ticker-h)+var(--topbar-h))] z-20 flex h-[3px] gap-px bg-ink lg:left-[var(--rail-w)]">
          {Array.from({ length: promoTotal }, (_, i) => (
            <span
              key={i}
              className={`h-full flex-1 ${i < promoWeek ? 'bg-neon' : 'bg-ink-line'}`}
            />
          ))}
        </div>
      )}

      {/* ---- Content ---- */}
      <main className="min-h-dvh px-4 pb-[calc(var(--bottombar-h)+24px)] pt-[calc(var(--ticker-h)+var(--topbar-h)+20px)] sm:px-6 lg:pb-10 lg:pl-[calc(var(--rail-w)+32px)] lg:pr-8 lg:pt-[calc(var(--ticker-h)+var(--topbar-h)+28px)]">
        <div className="mx-auto w-full max-w-[1240px]">{children}</div>
      </main>

      {/* ---- Bottom bar (below lg) ---- */}
      <nav
        aria-label="게임 단계"
        className="fixed inset-x-0 bottom-0 z-20 flex h-[var(--bottombar-h)] items-stretch justify-between gap-0.5 overflow-x-auto border-t border-ink-line bg-ink-soft px-1 lg:hidden"
      >
        {RAIL_PHASES.map((p) => (
          <RailButton
            key={p}
            phase={p}
            active={p === phase}
            enabled={canVisit(p)}
            onClick={onNavigate}
            layout="bottom"
          />
        ))}
      </nav>
    </div>
  );
}

function TopStat({
  kicker,
  value,
  emphasis = false,
  className = '',
}: {
  kicker: string;
  value: string;
  emphasis?: boolean;
  className?: string;
}) {
  return (
    <div className={`text-right ${className}`}>
      <div className="kicker hidden sm:block">{kicker}</div>
      <div
        className={`tabular text-[13px] font-semibold leading-tight ${emphasis ? 'text-neon' : 'text-paper'}`}
      >
        {value}
      </div>
    </div>
  );
}

function RailButton({
  phase,
  active,
  enabled,
  onClick,
  layout = 'rail',
}: {
  phase: GamePhase;
  active: boolean;
  enabled: boolean;
  onClick?: (phase: GamePhase) => void;
  layout?: 'rail' | 'bottom';
}) {
  const Icon = PHASE_ICONS[phase];
  const { label, kicker } = PHASE_LABELS[phase];

  const tone = active
    ? 'text-neon border-neon/45 bg-neon/8'
    : enabled
      ? 'text-muted border-transparent hover:text-paper hover:bg-ink-line/40'
      : 'text-ink-line border-transparent cursor-not-allowed';

  if (layout === 'bottom') {
    return (
      <button
        type="button"
        disabled={!enabled}
        aria-current={active ? 'page' : undefined}
        onClick={() => onClick?.(phase)}
        className={`flex min-w-[46px] flex-1 flex-col items-center justify-center gap-0.5 overflow-hidden rounded-chip border px-0.5 transition-colors ${tone}`}
      >
        <Icon width={18} height={18} />
        {/* Tight tracking and truncation keep eight labels inside 390px. */}
        <span className="w-full truncate text-center text-[8px] leading-none tracking-[0.06em]">
          {kicker}
        </span>
      </button>
    );
  }

  return (
    <button
      type="button"
      disabled={!enabled}
      title={label}
      aria-label={label}
      aria-current={active ? 'page' : undefined}
      onClick={() => onClick?.(phase)}
      className={`flex size-10 items-center justify-center rounded-chip border transition-colors ${tone}`}
    >
      <Icon />
    </button>
  );
}
