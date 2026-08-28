import { Avatar, SelectInput, Tag } from '../../components/ui';
import { ACTIVITIES, ACTIVITY_ORDER } from '../../game/constants';
import { formatWon } from '../../game/formulas';
import { slotBlock, type SlotBlock } from '../../game/week';
import type { ActivityType, Id, Member, ScheduleSlot } from '../../game/types';

export interface ActivityPickerProps {
  slots: readonly ScheduleSlot[];
  /** Which slot the picked activity goes into; null disables the whole list. */
  activeSlot: number | null;
  awareness: number;
  members: readonly Member[];
  soloMemberId: Id | null;
  onPick: (activity: ActivityType) => void;
  onSoloMember: (id: Id) => void;
}

/** Korean reason an activity cannot be booked right now. */
function blockText(block: SlotBlock, activity: ActivityType): string | null {
  switch (block.kind) {
    case 'awareness':
      return `회사 인지도 ${block.required} 이상부터 섭외됩니다.`;
    case 'small_label':
      return `소형 기획사는 주 ${block.max}회까지만 잡을 수 있습니다.`;
    case 'max_per_week':
      return `한 주에 ${block.max}회까지만 가능합니다.`;
    case 'needs_member':
      return '멤버를 한 명 지정해야 합니다.';
    default:
      void activity;
      return null;
  }
}

export function ActivityPicker({
  slots,
  activeSlot,
  awareness,
  members,
  soloMemberId,
  onPick,
  onSoloMember,
}: ActivityPickerProps) {
  return (
    <div className="flex flex-col gap-3">
      {activeSlot === null && (
        <p className="m-0 rounded-chip border border-dashed border-paper-line px-3 py-2.5 text-[12.5px] text-ink/60">
          왼쪽에서 채울 슬롯을 먼저 고르세요.
        </p>
      )}

      <div className="grid gap-2 sm:grid-cols-2">
        {ACTIVITY_ORDER.map((id) => {
          const config = ACTIVITIES[id];
          const block =
            activeSlot === null
              ? ({ kind: 'ok' } as SlotBlock)
              : slotBlock(id, slots, activeSlot, awareness);
          const reason = blockText(block, id);
          const disabled = activeSlot === null || block.kind !== 'ok';
          const earns = config.cost < 0;

          return (
            <div key={id} className="flex flex-col">
              <button
                type="button"
                disabled={disabled}
                onClick={() => onPick(id)}
                className={`flex flex-col gap-1.5 rounded-chip border p-3 text-left transition-colors ${
                  disabled
                    ? 'cursor-not-allowed border-paper-line bg-paper-soft/60 opacity-60'
                    : 'border-paper-line hover:border-neon/50 hover:bg-neon/5'
                }`}
              >
                <div className="flex items-baseline justify-between gap-2">
                  <span className="kicker truncate">{config.kicker}</span>
                  <span
                    className={`tabular shrink-0 text-[11.5px] font-medium ${earns ? 'text-neon' : 'text-ink/60'}`}
                  >
                    {config.cost === 0
                      ? '무료'
                      : earns
                        ? `+${formatWon(-config.cost)}`
                        : formatWon(config.cost)}
                  </span>
                </div>

                <span className="text-[13.5px] font-semibold text-ink">{config.label}</span>
                <p className="m-0 text-[11.5px] leading-snug text-ink/60">{config.blurb}</p>

                <div className="mt-0.5 flex flex-wrap gap-1">
                  {config.fatigue !== 0 && (
                    <Tag tone={config.fatigue > 0 ? 'outline' : 'neon'}>
                      피로 {config.fatigue > 0 ? '+' : ''}
                      {config.fatigue}
                    </Tag>
                  )}
                  {config.exposure > 0 && <Tag tone="outline">노출 {config.exposure}</Tag>}
                  {config.loyalty > 0 && <Tag tone="outline">충성 +{config.loyalty}</Tag>}
                </div>
              </button>

              {reason && (
                <p className="m-0 px-1 pt-1 text-[11px] text-neon">{reason}</p>
              )}

              {id === 'solo_schedule' && !disabled && (
                <div className="mt-1.5 flex items-center gap-2 px-1">
                  <span className="text-[11px] text-ink/60">대상</span>
                  <SelectInput
                    aria-label="개인 스케줄 대상 멤버"
                    value={soloMemberId ?? members[0]?.id ?? ''}
                    onChange={(e) => onSoloMember(e.target.value)}
                    className="h-8 flex-1 text-[12px]"
                  >
                    {members.map((m) => (
                      <option key={m.id} value={m.id}>
                        {m.name}
                      </option>
                    ))}
                  </SelectInput>
                  <Avatar
                    id={
                      members.find((m) => m.id === (soloMemberId ?? members[0]?.id))?.traineeId ??
                      ''
                    }
                    size={28}
                  />
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
