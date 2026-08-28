import { Modal, NeonButton, Tag } from '../../components/ui';
import { getEvent, pendingEventTitle } from '../../game/events';
import type { Member, PendingEvent } from '../../game/types';

export interface EventModalProps {
  pending: PendingEvent | null;
  groupName: string;
  members: readonly Member[];
  /** How many events are still queued, including this one. */
  remaining: number;
  onChoose: (pendingId: string, choiceId: string) => void;
}

/**
 * One random event, blocking the week until answered.
 *
 * Deliberately ink rather than paper: these are in-world moments, not agency
 * paperwork, and the darker sheet makes the week stop feeling routine.
 */
export function EventModal({
  pending,
  groupName,
  members,
  remaining,
  onChoose,
}: EventModalProps) {
  if (!pending) return null;
  const event = getEvent(pending.eventId);
  if (!event) return null;

  return (
    <Modal
      open
      variant="ink"
      kicker={event.kicker}
      title={pendingEventTitle(pending, groupName, members)}
    >
      <div className="flex flex-col gap-4">
        <div className="flex items-center gap-2">
          <Tag tone="neon" surface="ink">
            {pending.week}주차
          </Tag>
          {remaining > 1 && (
            <span className="tabular text-[11.5px] text-muted">
              남은 이벤트 {remaining - 1}건
            </span>
          )}
        </div>

        <div className="flex flex-col gap-1.5">
          {pending.body.split('\n').map((line, i) => (
            <p key={i} className="m-0 text-[13.5px] leading-relaxed text-paper">
              {line}
            </p>
          ))}
        </div>

        <div className="flex flex-col gap-2 border-t border-ink-line pt-4">
          {event.choices.map((choice) => (
            <NeonButton
              key={choice.id}
              block
              variant="ghost"
              className="justify-start !text-left"
              onClick={() => onChoose(pending.id, choice.id)}
            >
              {choice.label}
            </NeonButton>
          ))}
        </div>
      </div>
    </Modal>
  );
}
