export type ToastTone = 'neutral' | 'good' | 'bad' | 'critical';

export interface ToastItem {
  id: string;
  /** Korean message shown to the player. */
  text: string;
  tone: ToastTone;
  /** Optional English kicker — e.g. "CHART UPDATE". */
  kicker?: string;
}

/**
 * Tone is carried by a 2px left rule rather than a coloured fill, so toasts
 * stay legible stacked over the ink shell.
 */
const RULES: Record<ToastTone, string> = {
  neutral: 'before:bg-ink-line',
  good: 'before:bg-neon',
  bad: 'before:bg-muted',
  critical: 'before:bg-neon',
};

const TEXT: Record<ToastTone, string> = {
  neutral: 'text-paper',
  good: 'text-paper',
  bad: 'text-muted',
  critical: 'text-neon',
};

/** Bottom-anchored stack on mobile, top-right on desktop. */
export function Toast({ items }: { items: ToastItem[] }) {
  if (items.length === 0) return null;

  return (
    <div
      role="status"
      aria-live="polite"
      className="pointer-events-none fixed inset-x-4 bottom-[calc(var(--bottombar-h)+16px)] z-40 flex flex-col gap-2 sm:inset-x-auto sm:right-6 sm:top-[calc(var(--ticker-h)+var(--topbar-h)+16px)] sm:bottom-auto sm:w-[320px]"
    >
      {items.map((item) => (
        <div
          key={item.id}
          className={`relative overflow-hidden rounded-card border border-ink-line bg-ink-soft/95 py-2.5 pl-4 pr-3 backdrop-blur before:absolute before:inset-y-0 before:left-0 before:w-[2px] before:content-[''] ${RULES[item.tone]}`}
        >
          {item.kicker && <div className="kicker">{item.kicker}</div>}
          <div className={`text-[13px] leading-snug ${TEXT[item.tone]}`}>{item.text}</div>
        </div>
      ))}
    </div>
  );
}
