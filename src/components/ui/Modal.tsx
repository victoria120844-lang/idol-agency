import { useEffect, type ReactNode } from 'react';

import { IconClose } from './icons';

export interface ModalProps {
  open: boolean;
  /** English kicker — e.g. "INCIDENT REPORT". */
  kicker?: string;
  /** Korean title. */
  title?: string;
  onClose?: () => void;
  /** Footer actions, right-aligned on desktop and stacked on mobile. */
  footer?: ReactNode;
  /** Modals default to a paper card; ink is for in-world broadcast moments. */
  variant?: 'paper' | 'ink';
  children: ReactNode;
}

/** Centred dialog on a dimmed ink scrim. Sheet-style on mobile. */
export function Modal({
  open,
  kicker,
  title,
  onClose,
  footer,
  variant = 'paper',
  children,
}: ModalProps) {
  useEffect(() => {
    if (!open || !onClose) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  if (!open) return null;

  const onPaper = variant === 'paper';
  const shell = onPaper
    ? 'on-paper bg-paper text-ink border-paper-line'
    : 'bg-ink-soft text-paper border-ink-line';
  const rule = onPaper ? 'border-paper-line' : 'border-ink-line';

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center sm:p-6">
      <div
        className="absolute inset-0 bg-ink/80 backdrop-blur-[2px]"
        onClick={onClose}
        aria-hidden
      />

      <div
        role="dialog"
        aria-modal="true"
        aria-label={title}
        className={`relative flex w-full max-w-lg flex-col rounded-t-card border sm:rounded-card ${shell}`}
      >
        {(kicker || title) && (
          <div className={`flex items-start justify-between gap-3 border-b px-5 py-4 ${rule}`}>
            <div className="min-w-0">
              {kicker && <div className="kicker">{kicker}</div>}
              {title && <h2 className="mt-1 text-[17px] font-semibold tracking-tight">{title}</h2>}
            </div>
            {onClose && (
              <button
                type="button"
                onClick={onClose}
                aria-label="닫기"
                className="-mr-1 -mt-1 rounded-chip p-1 text-muted transition-colors hover:text-neon"
              >
                <IconClose />
              </button>
            )}
          </div>
        )}

        <div className="px-5 py-4 text-[13.5px] leading-relaxed">{children}</div>

        {footer && (
          <div className={`flex flex-col-reverse gap-2 border-t px-5 py-4 sm:flex-row sm:justify-end ${rule}`}>
            {footer}
          </div>
        )}
      </div>
    </div>
  );
}
