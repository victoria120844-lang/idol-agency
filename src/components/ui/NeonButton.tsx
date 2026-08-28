import type { ButtonHTMLAttributes, ReactNode } from 'react';

export type ButtonVariant = 'primary' | 'ghost' | 'danger';
export type ButtonSize = 'sm' | 'md';

export type ButtonSurface = 'paper' | 'ink';

/**
 * Neon is reserved for the single primary action on a screen. `ghost` is the
 * default for everything else; `danger` is an outlined warning, deliberately
 * quieter than primary so it never competes for attention.
 *
 * `ghost` has to know its surface — its text colour is the surface's foreground,
 * and a paper-surfaced ghost styled for ink renders white on white.
 */
const VARIANTS: Record<ButtonSurface, Record<ButtonVariant, string>> = {
  ink: {
    primary:
      'bg-neon text-paper border border-neon hover:bg-neon-dim hover:border-neon-dim glow-neon',
    ghost: 'bg-transparent text-paper border border-ink-line hover:border-muted hover:bg-ink-soft',
    danger: 'bg-transparent text-neon border border-neon/45 hover:border-neon hover:bg-neon/8',
  },
  paper: {
    primary:
      'bg-neon text-paper border border-neon hover:bg-neon-dim hover:border-neon-dim glow-neon',
    ghost: 'bg-transparent text-ink border border-paper-line hover:border-ink/40 hover:bg-paper-soft',
    danger: 'bg-transparent text-neon border border-neon/45 hover:border-neon hover:bg-neon/8',
  },
};

const SIZES: Record<ButtonSize, string> = {
  sm: 'h-8 px-3 text-[12px]',
  md: 'h-10 px-4 text-[13px]',
};

export interface NeonButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  /** Which surface the button sits on. Only `ghost` looks different. */
  surface?: ButtonSurface;
  loading?: boolean;
  block?: boolean;
  children: ReactNode;
}

export function NeonButton({
  variant = 'primary',
  size = 'md',
  surface = 'ink',
  loading = false,
  block = false,
  disabled,
  className = '',
  children,
  ...rest
}: NeonButtonProps) {
  const isDisabled = disabled || loading;

  return (
    <button
      type="button"
      disabled={isDisabled}
      aria-busy={loading || undefined}
      className={`
        relative inline-flex items-center justify-center gap-2 rounded-chip font-semibold
        tracking-tight transition-colors duration-150
        disabled:cursor-not-allowed disabled:opacity-40 disabled:shadow-none
        ${VARIANTS[surface][variant]} ${SIZES[size]} ${block ? 'w-full' : ''} ${className}
      `}
      {...rest}
    >
      {loading && (
        <span
          aria-hidden
          className="size-3.5 animate-spin rounded-full border-[1.5px] border-current border-t-transparent"
        />
      )}
      <span className={loading ? 'opacity-70' : undefined}>{children}</span>
    </button>
  );
}
