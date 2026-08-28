import { useEffect, useState } from 'react';

import { Card, NeonButton, Tag, Toast, type ToastItem } from '../../components/ui';
import { ACTIVITIES, COMEBACK } from '../../game/constants';
import { formatCount } from '../../game/formulas';
import { slotBlock } from '../../game/week';
import type { ActivityType, Id } from '../../game/types';
import { useGameStore } from '../../app/store';
import { ActivityPicker } from './ActivityPicker';
import { EventModal } from './EventModal';
import { ScheduleBoard } from './ScheduleBoard';
import { WeekReport } from './WeekReport';

export function ComebackWeek() {
  const company = useGameStore((s) => s.company);
  const group = useGameStore((s) => s.group);
  const fandom = useGameStore((s) => s.fandom);
  const schedule = useGameStore((s) => s.schedule);
  const promoWeek = useGameStore((s) => s.promoWeek);
  const buzz = useGameStore((s) => s.buzz);
  const benchedIds = useGameStore((s) => s.benchedIds);
  const pendingEvents = useGameStore((s) => s.pendingEvents);
  const weekLogs = useGameStore((s) => s.weekLogs);

  const setSlot = useGameStore((s) => s.setSlot);
  const openWeekEvents = useGameStore((s) => s.openWeekEvents);
  const answerEvent = useGameStore((s) => s.answerEvent);
  const closeWeek = useGameStore((s) => s.closeWeek);

  const [activeSlot, setActiveSlot] = useState<number | null>(0);
  const [soloMemberId, setSoloMemberId] = useState<Id | null>(null);
  const [toasts, setToasts] = useState<ToastItem[]>([]);

  const filled = schedule.filter((s) => s.activity !== null).length;
  const boardFull = filled === COMEBACK.slotsPerWeek;

  /**
   * Events are drawn the moment the board fills, so the player answers them
   * before committing rather than being ambushed after pressing the button.
   */
  useEffect(() => {
    if (boardFull && pendingEvents.length === 0) openWeekEvents();
  }, [boardFull, pendingEvents.length, openWeekEvents]);

  if (!company || !group || !fandom) return null;

  const pushToast = (text: string, tone: ToastItem['tone'], kicker?: string) => {
    const item: ToastItem = { id: `${Date.now()}-${Math.random()}`, text, tone, kicker };
    setToasts((t) => [...t, item].slice(-3));
    window.setTimeout(() => setToasts((t) => t.filter((x) => x.id !== item.id)), 3600);
  };

  const onPick = (activity: ActivityType) => {
    if (activeSlot === null) return;
    const block = slotBlock(activity, schedule, activeSlot, company.awareness);
    if (block.kind !== 'ok') return;

    const needsMember = ACTIVITIES[activity].needsMember;
    const memberId = needsMember ? (soloMemberId ?? group.members[0]?.id) : undefined;
    setSlot(activeSlot, activity, memberId);

    // Jump to the next empty slot so filling a week is one continuous motion.
    const next = schedule.find((s) => s.index !== activeSlot && s.activity === null);
    setActiveSlot(next ? next.index : null);
  };

  const onClear = (index: number) => {
    setSlot(index, null);
    setActiveSlot(index);
  };

  const onClose = () => {
    if (!boardFull) {
      pushToast('5개 슬롯을 모두 채워야 주차를 종료할 수 있습니다.', 'critical', 'SCHEDULE');
      return;
    }
    if (pendingEvents.length > 0) {
      pushToast('먼저 이번 주 이벤트에 대응해야 합니다.', 'critical', 'EVENT');
      return;
    }
    closeWeek();
    setActiveSlot(0);
  };

  const lastLog = weekLogs.length > 0 ? weekLogs[weekLogs.length - 1] : null;
  const isFinalWeek = promoWeek >= COMEBACK.weeks;

  return (
    <div className="flex flex-col gap-5">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <div className="kicker">Promo · Week {promoWeek} of {COMEBACK.weeks}</div>
          <h1 className="mt-2 text-[26px] font-semibold tracking-tight text-paper sm:text-[32px]">
            {promoWeek}주차 활동
          </h1>
          <p className="mt-2 max-w-[54ch] text-[13px] text-muted">
            5개 슬롯을 모두 채우면 이번 주 이벤트가 열립니다. 대응을 마쳐야 주차를 넘길 수
            있습니다.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Tag tone={boardFull ? 'neon' : 'outline'} surface="ink">
            {filled}/{COMEBACK.slotsPerWeek} 슬롯
          </Tag>
          <NeonButton onClick={onClose} disabled={!boardFull || pendingEvents.length > 0}>
            {isFinalWeek ? '컴백 결산으로' : '주차 종료'}
          </NeonButton>
        </div>
      </header>

      <div className="grid gap-4 lg:grid-cols-[300px_minmax(0,1fr)_300px] lg:items-start">
        {/* ---- left: the board ---- */}
        <Card
          variant="paper"
          kicker="Schedule board"
          title="스케줄 보드"
          action={
            <span className="tabular text-[11px] text-ink/60">
              {filled}/{COMEBACK.slotsPerWeek}
            </span>
          }
        >
          <ScheduleBoard
            slots={schedule}
            activeSlot={activeSlot}
            members={group.members}
            onSelectSlot={setActiveSlot}
            onClearSlot={onClear}
          />
        </Card>

        {/* ---- centre: the menu ---- */}
        <Card
          variant="paper"
          kicker="Available"
          title="선택 가능한 스케줄"
          action={
            activeSlot !== null ? (
              <Tag tone="neon">{activeSlot + 1}번 슬롯</Tag>
            ) : (
              <Tag tone="outline">보드 가득 참</Tag>
            )
          }
        >
          <ActivityPicker
            slots={schedule}
            activeSlot={activeSlot}
            awareness={company.awareness}
            members={group.members}
            soloMemberId={soloMemberId}
            onPick={onPick}
            onSoloMember={setSoloMemberId}
          />
        </Card>

        {/* ---- right: the report ---- */}
        <WeekReport
          slots={schedule}
          group={group}
          fandom={fandom}
          buzz={buzz}
          benchedIds={benchedIds}
          lastLog={lastLog}
        />
      </div>

      {/* ---- past weeks ---- */}
      {weekLogs.length > 0 && (
        <Card variant="ink" kicker="Recap" title="지난 주차 요약" flush>
          <ul className="m-0 flex list-none flex-col p-0">
            {weekLogs.map((log) => (
              <li key={log.week} className="border-b border-ink-line px-4 py-3 last:border-b-0">
                <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
                  <span className="kicker">Week {log.promoWeek}</span>
                  <span className="tabular text-[11.5px] text-neon">
                    버즈 +{formatCount(log.buzzDelta)}
                  </span>
                  <span className="tabular text-[11.5px] text-muted">
                    팬덤 {log.fanDelta >= 0 ? '+' : ''}
                    {formatCount(log.fanDelta, '명')}
                  </span>
                </div>
                <p className="m-0 mt-1.5 text-[12.5px] leading-relaxed text-muted">{log.recap}</p>
              </li>
            ))}
          </ul>
        </Card>
      )}

      <EventModal
        pending={pendingEvents[0] ?? null}
        groupName={group.name}
        members={group.members}
        remaining={pendingEvents.length}
        onChoose={answerEvent}
      />

      <Toast items={toasts} />
    </div>
  );
}
