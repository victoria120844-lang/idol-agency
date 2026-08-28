import { Card, Tag } from '../../components/ui';
import { ACTIVITIES, COMEBACK } from '../../game/constants';
import { formatCount, formatWon } from '../../game/formulas';
import { isInjured, isStrained } from '../../game/week';
import type { Fandom, Group, Id, ScheduleSlot, WeekLog } from '../../game/types';

export interface WeekReportProps {
  slots: readonly ScheduleSlot[];
  group: Group;
  fandom: Fandom;
  buzz: number;
  benchedIds: readonly Id[];
  /** Last resolved week, shown under the projection. */
  lastLog: WeekLog | null;
}

/** Right-hand panel: what this week costs, and what last week did. */
export function WeekReport({
  slots,
  group,
  fandom,
  buzz,
  benchedIds,
  lastLog,
}: WeekReportProps) {
  const booked = slots.filter((s) => s.activity);
  const cost = booked.reduce((sum, s) => sum + ACTIVITIES[s.activity!].cost, 0);
  // Same scaling the resolver applies, so the projection matches the outcome.
  const fatigue = Math.round(
    booked.reduce((sum, s) => sum + ACTIVITIES[s.activity!].fatigue, 0) *
      COMEBACK.weeklyFatigueScale -
      COMEBACK.weeklyRecovery,
  );
  const exposure = booked.reduce((sum, s) => sum + ACTIVITIES[s.activity!].exposure, 0);

  const bench = new Set(benchedIds);
  const strained = group.members.filter((m) => !bench.has(m.id) && isStrained(m));

  return (
    <div className="flex flex-col gap-3">
      <Card variant="ink" kicker="This week" title="주간 리포트">
        <dl className="m-0 flex flex-col gap-2.5">
          <Row label="누적 버즈" value={formatCount(buzz)} />
          <Row label="팬덤 규모" value={formatCount(fandom.size, '명')} />
          <Row
            label="예상 자금 변동"
            value={cost === 0 ? '변동 없음' : cost < 0 ? `+${formatWon(-cost)}` : `-${formatWon(cost)}`}
            hot={cost < 0}
          />
          <Row
            label="예상 피로도"
            value={`${fatigue > 0 ? '+' : ''}${fatigue}`}
            hot={fatigue >= 25}
          />
          <Row label="주간 노출도" value={`${exposure}`} />
        </dl>
      </Card>

      <Card variant="ink" kicker="Condition" title="컨디션">
        <div className="flex flex-col gap-2">
          {group.members.map((m) => {
            const benched = bench.has(m.id);
            const strain = isStrained(m);
            const injury = isInjured(m);
            return (
              <div key={m.id} className="flex items-center gap-2.5">
                <span className="w-16 shrink-0 truncate text-[12px] text-paper">{m.name}</span>
                <div className="relative h-1.5 flex-1 rounded-chip bg-ink-line">
                  <div
                    className={`absolute inset-y-0 left-0 rounded-chip ${
                      injury ? 'bg-neon' : strain ? 'bg-neon/60' : 'bg-muted'
                    }`}
                    style={{ width: `${m.fatigue}%` }}
                  />
                  <span
                    className="absolute inset-y-0 w-px bg-muted/50"
                    style={{ left: `${COMEBACK.fatigueStrainThreshold}%` }}
                    aria-hidden
                  />
                </div>
                <span
                  className={`tabular w-7 shrink-0 text-right text-[11.5px] ${
                    strain ? 'text-neon' : 'text-muted'
                  }`}
                >
                  {m.fatigue}
                </span>
                {benched && <Tag tone="neon" surface="ink">휴식</Tag>}
              </div>
            );
          })}
        </div>

        {(strained.length > 0 || bench.size > 0) && (
          <p className="m-0 mt-3 rounded-chip border border-neon/40 bg-neon/8 px-3 py-2 text-[11.5px] leading-relaxed text-neon">
            {bench.size > 0 &&
              `${benchedIds
                .map((id) => group.members.find((m) => m.id === id)?.name)
                .filter(Boolean)
                .join(', ')} 이번 주 활동 불가. `}
            {strained.length > 0 &&
              `${strained.map((m) => m.name).join(', ')} 컨디션 난조 — 이번 주 효과가 ${Math.round(
                (1 - COMEBACK.strainedEffectMul) * 100,
              )}% 줄어듭니다.`}
          </p>
        )}
      </Card>

      {lastLog && (
        <Card variant="ink" kicker={`Week ${lastLog.promoWeek} log`} title="지난 주 기록" flush>
          <div className="border-b border-ink-line px-4 py-3">
            <p className="m-0 text-[12.5px] leading-relaxed text-paper">{lastLog.recap}</p>
          </div>
          <dl className="m-0 grid grid-cols-2 gap-x-4 gap-y-2 px-4 py-3">
            <Delta label="버즈" value={lastLog.buzzDelta} />
            <Delta label="팬덤" value={lastLog.fanDelta} suffix="명" />
            <Delta label="자금" value={lastLog.wonDelta} money />
            <Delta label="충성도" value={lastLog.loyaltyDelta} />
            <Delta label="인지도" value={lastLog.awarenessDelta} />
            <Delta label="여론" value={lastLog.sentimentDelta} />
            <Delta label="초동" value={lastLog.salesDelta} suffix="장" />
            <Delta label="스트리밍" value={lastLog.streamDelta} />
          </dl>
          {lastLog.entries.length > 0 && (
            <ul className="m-0 flex list-none flex-col p-0">
              {lastLog.entries.map((e) => (
                <li
                  key={e.id}
                  className="flex gap-2.5 border-t border-ink-line px-4 py-2 text-[12px] leading-relaxed"
                >
                  <span
                    className={`mt-1.5 size-1.5 shrink-0 rounded-full ${
                      e.tone === 'good' || e.tone === 'critical' ? 'bg-neon' : 'bg-muted'
                    }`}
                  />
                  <span className={e.tone === 'critical' ? 'text-neon' : 'text-muted'}>
                    {e.text}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </Card>
      )}
    </div>
  );
}

function Row({ label, value, hot = false }: { label: string; value: string; hot?: boolean }) {
  return (
    <div className="flex items-baseline justify-between gap-3">
      <dt className="text-[12px] text-muted">{label}</dt>
      <dd
        className={`tabular m-0 text-[13px] font-semibold ${hot ? 'text-neon' : 'text-paper'}`}
      >
        {value}
      </dd>
    </div>
  );
}

function Delta({
  label,
  value,
  suffix = '',
  money = false,
}: {
  label: string;
  value: number;
  suffix?: string;
  money?: boolean;
}) {
  const up = value > 0;
  const text = money
    ? `${up ? '+' : ''}${formatWon(value)}`
    : `${up ? '+' : ''}${formatCount(value, suffix)}`;

  return (
    <div className="flex items-baseline justify-between gap-2">
      <dt className="text-[11.5px] text-muted">{label}</dt>
      <dd
        className={`tabular m-0 text-[12px] font-medium ${
          value === 0 ? 'text-muted' : up ? 'text-neon' : 'text-paper'
        }`}
      >
        {value === 0 ? '—' : text}
      </dd>
    </div>
  );
}
