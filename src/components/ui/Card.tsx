import type { HTMLAttributes, ReactNode } from 'react';

export type CardVariant = 'paper' | 'ink' | 'outline';

/**
 * `paper` is the dominant pattern: a white card sitting on the ink shell.
 * `ink` is an elevated dark surface for chrome-adjacent panels.
 * `outline` is a hairline-only container for grouping without weight.
 */
const VARIANTS: Record<CardVariant, string> = {
  paper: 'on-paper bg-paper text-ink border border-paper-line',
  ink: 'bg-ink-soft text-paper border border-ink-line',
  outline: 'bg-transparent text-paper border border-ink-line',
};

const HEADER_RULE: Record<CardVariant, string> = {
  paper: 'border-paper-line',
  ink: 'border-ink-line',
  outline: 'border-ink-line',
};

export interface CardProps extends HTMLAttributes<HTMLDivElement> {
  variant?: CardVariant;
  /** English kicker, rendered uppercase — e.g. "TRAINEE ROSTER". */
  kicker?: string;
  /** Korean title paired with the kicker — e.g. "연습생 명단". */
  title?: string;
  /** Right-aligned header slot: counts, filters, a small action. */
  action?: ReactNode;
  footer?: ReactNode;
  /** Drop the body padding when the card holds a full-bleed table or list. */
  flush?: boolean;
  children?: ReactNode;
}

export function Card({
  variant = 'paper',
  kicker,
  title,
  action,
  footer,
  flush = false,
  className = '',
  children,
  ...rest
}: CardProps) {
  const hasHeader = Boolean(kicker || title || action);

  return (
    <div className={`rounded-card overflow-hidden ${VARIANTS[variant]} ${className}`} {...rest}>
      {hasHeader && (
        <div
          className={`flex items-start justify-between gap-3 border-b px-4 py-3 ${HEADER_RULE[variant]}`}
        >
          <div className="min-w-0">
            {kicker && <div className="kicker">{kicker}</div>}
            {title && (
              <h3 className="mt-1 truncate text-[15px] font-semibold leading-tight tracking-tight">
                {title}
              </h3>
            )}
          </div>
          {action && <div className="shrink-0">{action}</div>}
        </div>
      )}

      {children !== undefined && <div className={flush ? '' : 'px-4 py-4'}>{children}</div>}

      {footer && (
        <div className={`border-t px-4 py-3 ${HEADER_RULE[variant]}`}>{footer}</div>
      )}
    </div>
  );
}
