import { Avatar, Tag } from '../../components/ui';
import { ACTIVITIES } from '../../game/constants';
import { formatWon } from '../../game/formulas';
import type { Member, ScheduleSlot } from '../../game/types';

export interface ScheduleBoardProps {
  slots: readonly ScheduleSlot[];
  activeSlot: number | null;
  members: readonly Member[];
  onSelectSlot: (index: number) => void;
  onClearSlot: (index: number) => void;
}

/** The five slots of one promotion week, labelled 1~5. */
export function ScheduleBoard({
  slots,
  activeSlot,
  members,
  onSelectSlot,
  onClearSlot,
}: ScheduleBoardProps) {
  return (
    <div className="flex flex-col gap-2">
      {slots.map((slot) => {
        const config = slot.activity ? ACTIVITIES[slot.activity] : null;
        const isActive = activeSlot === slot.index;
        const solo = slot.memberId
          ? members.find((m) => m.id === slot.memberId)
          : undefined;

        return (
          <div
            key={slot.index}
            className={`flex items-center gap-3 rounded-chip border p-3 transition-colors ${
              isActive
                ? 'border-neon bg-neon/8'
                : config
                  ? 'border-paper-line bg-paper-soft'
                  : 'border-dashed border-paper-line'
            }`}
          >
            <span
              className={`tabular flex size-7 shrink-0 items-center justify-center rounded-chip border text-[12px] font-semibold ${
                config ? 'border-ink/20 text-ink' : 'border-paper-line text-ink/35'
              }`}
            >
              {slot.index + 1}
            </span>

            <button
              type="button"
              onClick={() => onSelectSlot(slot.index)}
              className="flex min-w-0 flex-1 flex-col items-start text-left"
            >
              {config ? (
                <>
                  <span className="kicker">{config.kicker}</span>
                  <span className="mt-0.5 truncate text-[13.5px] font-semibold text-ink">
                    {config.label}
                  </span>
                  <span className="tabular mt-0.5 text-[11px] text-ink/60">
                    {config.cost === 0
                      ? '비용 없음'
                      : config.cost < 0
                        ? `수익 ${formatWon(-config.cost)}`
                        : `비용 ${formatWon(config.cost)}`}
                    {' · '}
                    피로 {config.fatigue > 0 ? '+' : ''}
                    {config.fatigue}
                  </span>
                </>
              ) : (
                <span className="text-[12.5px] text-ink/40">
                  {isActive ? '오른쪽에서 스케줄을 고르세요' : '비어 있음 · 눌러서 채우기'}
                </span>
              )}
            </button>

            {solo && (
              <span className="flex shrink-0 items-center gap-1.5">
                <Avatar id={solo.traineeId} size={24} />
                <Tag tone="neon">{solo.name}</Tag>
              </span>
            )}

            {config && (
              <button
                type="button"
                onClick={() => onClearSlot(slot.index)}
                aria-label={`${slot.index + 1}번 슬롯 비우기`}
                className="flex size-7 shrink-0 items-center justify-center rounded-chip border border-paper-line text-[13px] text-ink/60 transition-colors hover:border-neon hover:text-neon"
              >
                ×
              </button>
            )}
          </div>
        );
      })}
    </div>
  );
}
