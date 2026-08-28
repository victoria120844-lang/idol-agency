import { useState } from 'react';

import {
  Avatar,
  Card,
  MetricTile,
  NeonButton,
  SelectInput,
  StatBar,
  StatHexagon,
  Tag,
  TierBadge,
} from '../../components/ui';
import {
  ALBUM_TYPES,
  HUB,
  POSITION_LABELS,
  RELATION_TYPES,
  STAT_LABELS,
  TRAINING,
  TRAINING_COURSES,
} from '../../game/constants';
import {
  averageTeamStats,
  formatCount,
  formatWon,
  isPotentialVisible,
  traineeOverall,
} from '../../game/formulas';
import { averageAffinity, tierProgress, trainingCeiling, trainingOutcome } from '../../game/hub';
import { PotentialBadge } from '../trainees/PotentialBadge';
import { RelationshipMap } from '../debut/RelationshipMap';
import { WeekLineChart } from '../results/WeekLineChart';
import type {
  Album,
  Company,
  Fandom,
  Group,
  Id,
  StatKey,
  Trainee,
} from '../../game/types';

// ---------------------------------------------------------------------------
// 대시보드
// ---------------------------------------------------------------------------

export function DashboardPanel({
  company,
  group,
  fandom,
  albums,
  cycle,
  operating,
}: {
  company: Company;
  group: Group | null;
  fandom: Fandom | null;
  albums: readonly Album[];
  cycle: number;
  operating: { overhead: number; trainees: number; members: number; total: number };
}) {
  const tier = tierProgress(company.awareness);
  const lastResult = [...albums].reverse().find((a) => a.result)?.result ?? null;

  return (
    <div className="flex flex-col gap-4">
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <MetricTile
          kicker="Balance"
          value={formatWon(company.won)}
          sublabel="보유 자금"
          surface="ink"
          emphasis={company.won >= 0}
        />
        <MetricTile
          kicker="Lifetime revenue"
          value={formatWon(company.totalRevenue)}
          sublabel="누적 매출"
          surface="ink"
        />
        <MetricTile
          kicker="Fandom"
          value={fandom ? formatCount(fandom.size, '명') : '—'}
          sublabel="팬덤 규모"
          surface="ink"
        />
        <MetricTile
          kicker="Operating cost"
          value={formatWon(operating.total)}
          sublabel="사이클당 운영비"
          surface="ink"
        />
      </div>

      <div className="grid gap-3 lg:grid-cols-2">
        <Card variant="ink" kicker="Agency tier" title="회사 등급">
          <div className="flex flex-col gap-3">
            <TierBadge tier={company.tier} surface="ink" showLadder />
            <div className="flex items-baseline justify-between gap-3">
              <span className="text-[12px] text-muted">회사 인지도</span>
              <span className="tabular text-[14px] font-semibold text-paper">
                {company.awareness} / 100
              </span>
            </div>
            <div className="h-1.5 overflow-hidden rounded-chip bg-ink-line">
              <div
                className="h-full rounded-chip bg-neon transition-[width] duration-500"
                style={{ width: `${tier.progress * 100}%` }}
              />
            </div>
            <p className="m-0 text-[12px] text-muted">{tier.note}</p>
          </div>
        </Card>

        <Card variant="ink" kicker="Operating costs" title="사이클 운영비">
          <dl className="m-0 flex flex-col gap-2">
            <CostRow label="연습실 · 운영비" value={operating.overhead} />
            <CostRow label="연습생 유지비" value={operating.trainees} />
            <CostRow label="멤버 정산" value={operating.members} />
            <div className="mt-1 flex items-baseline justify-between gap-3 border-t border-ink-line pt-2">
              <dt className="text-[12px] font-medium text-paper">합계</dt>
              <dd className="tabular m-0 text-[14px] font-semibold text-neon">
                {formatWon(operating.total)}
              </dd>
            </div>
          </dl>
        </Card>
      </div>

      {lastResult && (
        <Card variant="ink" kicker="Last comeback" title="직전 컴백 추이">
          <WeekLineChart
            series={lastResult.series}
            fandomColor={fandom?.color ?? company.ciColor}
            height={180}
          />
        </Card>
      )}

      <Card variant="ink" kicker="Next objective" title="다음 목표">
        <ul className="m-0 flex list-none flex-col gap-2 p-0 text-[13px] text-muted">
          <li className="flex gap-3">
            <span className="tabular shrink-0 text-[11px] text-neon">01</span>
            <span>{tier.note}</span>
          </li>
          <li className="flex gap-3">
            <span className="tabular shrink-0 text-[11px] text-neon">02</span>
            <span>
              다음 사이클 운영비 {formatWon(operating.total)}을 감당하려면 이번 앨범이 그 이상을
              벌어야 합니다.
            </span>
          </li>
          {group && (
            <li className="flex gap-3">
              <span className="tabular shrink-0 text-[11px] text-neon">03</span>
              <span>
                {group.name} 팀워크 {group.teamwork} · 갈등 지수 {group.conflictIndex}. 갈등이
                높으면 재계약 거부가 나옵니다.
              </span>
            </li>
          )}
          <li className="flex gap-3">
            <span className="tabular shrink-0 text-[11px] text-neon">04</span>
            <span>{cycle}번째 사이클을 마쳤습니다.</span>
          </li>
        </ul>
      </Card>
    </div>
  );
}

function CostRow({ label, value }: { label: string; value: number }) {
  return (
    <div className="flex items-baseline justify-between gap-3">
      <dt className="text-[12px] text-muted">{label}</dt>
      <dd className="tabular m-0 text-[13px] text-paper">{formatWon(value)}</dd>
    </div>
  );
}

// ---------------------------------------------------------------------------
// 아티스트
// ---------------------------------------------------------------------------

export function ArtistPanel({
  group,
  fandom,
  ciColor,
}: {
  group: Group | null;
  fandom: Fandom | null;
  ciColor: string;
}) {
  const [openId, setOpenId] = useState<Id | null>(null);

  if (!group) {
    return (
      <Card variant="outline">
        <div className="flex min-h-[180px] items-center justify-center text-center text-[13px] text-muted">
          아직 데뷔한 그룹이 없습니다.
        </div>
      </Card>
    );
  }

  const teamStats = averageTeamStats(group.members);
  const ranked = [...group.members].sort((a, b) => b.personalFans - a.personalFans);
  const open = group.members.find((m) => m.id === openId) ?? null;

  return (
    <div className="flex flex-col gap-4">
      <Card
        variant="ink"
        kicker="Group"
        title={group.name}
        action={<Tag tone="neon" surface="ink">{group.members.length}인조</Tag>}
      >
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
          <span
            className="h-1 w-full shrink-0 rounded-chip sm:h-16 sm:w-1"
            style={{ backgroundColor: fandom?.color ?? ciColor }}
            aria-hidden
          />
          <div className="flex flex-1 flex-col items-center gap-4 sm:flex-row">
            <StatHexagon stats={teamStats} size={170} surface="ink" />
            <div className="grid flex-1 grid-cols-2 gap-3">
              <MetricTile kicker="Teamwork" value={`${group.teamwork}`} sublabel="팀워크" surface="ink" />
              <MetricTile kicker="Conflict" value={`${group.conflictIndex}`} sublabel="갈등 지수" surface="ink" />
              <MetricTile kicker="Scandal" value={`${group.scandalRisk}`} sublabel="스캔들 리스크" surface="ink" />
              <MetricTile
                kicker="Fandom"
                value={fandom ? formatCount(fandom.size, '명') : '—'}
                sublabel={fandom?.name ?? '팬덤'}
                surface="ink"
              />
            </div>
          </div>
        </div>
      </Card>

      <div className="grid gap-3 lg:grid-cols-2">
        <Card variant="ink" kicker="Personal fans" title="개인 팬 순위" flush>
          <ul className="m-0 flex list-none flex-col p-0">
            {ranked.map((m, i) => (
              <li key={m.id} className="border-b border-ink-line last:border-b-0">
                <button
                  type="button"
                  onClick={() => setOpenId(openId === m.id ? null : m.id)}
                  className="flex w-full items-center gap-3 px-4 py-2.5 text-left transition-colors hover:bg-ink-line/40"
                >
                  <span className="tabular w-5 shrink-0 text-[12px] text-muted">{i + 1}</span>
                  <Avatar id={m.traineeId} size={30} surface="ink" />
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-[13px] font-medium text-paper">{m.name}</div>
                    <div className="text-[11px] text-muted">{POSITION_LABELS[m.position]}</div>
                  </div>
                  <span className="tabular shrink-0 text-[13px] font-semibold text-paper">
                    {formatCount(m.personalFans, '명')}
                  </span>
                </button>

                {openId === m.id && open && (
                  <div className="flex flex-col gap-2.5 border-t border-ink-line px-4 py-3">
                    {(Object.keys(STAT_LABELS) as StatKey[]).map((key) => (
                      <StatBar
                        key={key}
                        label={STAT_LABELS[key]}
                        value={open.stats[key]}
                        surface="ink"
                      />
                    ))}
                    <div className="tabular mt-1 text-[11.5px] text-muted">
                      피로도 {open.fatigue} · 컨디션 {open.condition} · 팀 호감도{' '}
                      {averageAffinity(group, open.id)}
                    </div>
                  </div>
                )}
              </li>
            ))}
          </ul>
        </Card>

        <Card variant="ink" kicker="Relationships" title="현재 관계도">
          <div className="flex justify-center">
            <RelationshipMap
              members={group.members}
              relationships={group.relationships}
              size={360}
            />
          </div>
        </Card>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// 연습생 · 트레이닝
// ---------------------------------------------------------------------------

export function TrainingPanel({
  trainees,
  won,
  cycle,
  onTrain,
}: {
  trainees: readonly Trainee[];
  won: number;
  cycle: number;
  onTrain: (id: Id, stat: StatKey) => void;
}) {
  const [course, setCourse] = useState<StatKey>('vocal');
  const roster = trainees.filter((t) => !t.debuted);

  return (
    <div className="flex flex-col gap-4">
      <Card variant="paper" kicker="Lessons" title="강습">
        <div className="flex flex-wrap items-end gap-3">
          <div className="flex min-w-[180px] flex-1 flex-col gap-1.5">
            <span className="kicker">Course</span>
            <SelectInput value={course} onChange={(e) => setCourse(e.target.value as StatKey)}>
              {TRAINING_COURSES.map((c) => (
                <option key={c.stat} value={c.stat}>
                  {c.label}
                </option>
              ))}
            </SelectInput>
          </div>
          <div className="text-right">
            <div className="kicker">Cost</div>
            <div className="tabular mt-1 text-[15px] font-semibold text-neon">
              {formatWon(TRAINING.cost)}
            </div>
          </div>
        </div>
        <p className="m-0 mt-3 text-[12.5px] text-ink/60">
          {TRAINING_COURSES.find((c) => c.stat === course)?.blurb} 연습생 한 명당 사이클마다 한 번
          받을 수 있고, 잠재력 등급이 성장 폭과 상한을 정합니다.
        </p>
      </Card>

      {roster.length === 0 ? (
        <Card variant="outline">
          <div className="flex min-h-[160px] items-center justify-center text-center text-[13px] text-muted">
            데뷔하지 않은 연습생이 없습니다.
          </div>
        </Card>
      ) : (
        <div className="grid gap-2.5 sm:grid-cols-2 xl:grid-cols-3">
          {roster.map((t) => {
            const outcome = trainingOutcome(t, course, cycle, won);
            const ceiling = trainingCeiling(t.potentialGrade);
            const revealed = isPotentialVisible(t);

            return (
              <div
                key={t.id}
                className="on-paper flex flex-col gap-3 rounded-card border border-paper-line bg-paper p-3"
              >
                <div className="flex items-start gap-3">
                  <Avatar id={t.id} initial={t.name.slice(0, 1)} size={38} />
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-1.5">
                      <span className="truncate text-[13.5px] font-semibold text-ink">
                        {t.name}
                      </span>
                      <PotentialBadge grade={t.potentialGrade} revealed={revealed} size="sm" />
                    </div>
                    <div className="tabular text-[11px] text-ink/60">
                      종합 {traineeOverall(t.stats)} · 훈련 {t.trainedWeeks}주
                    </div>
                  </div>
                </div>

                <StatBar
                  label={STAT_LABELS[course]}
                  value={t.stats[course]}
                  potential={revealed ? ceiling : undefined}
                  surface="paper"
                />

                <NeonButton
                  block
                  size="sm"
                  surface="paper"
                  variant={outcome.kind === 'ok' ? 'primary' : 'ghost'}
                  disabled={outcome.kind !== 'ok'}
                  onClick={() => onTrain(t.id, course)}
                >
                  {outcome.kind === 'ok'
                    ? `강습 진행 (+${outcome.gain})`
                    : outcome.kind === 'already_trained'
                      ? '이번 사이클 완료'
                      : outcome.kind === 'at_ceiling'
                        ? `상한 ${outcome.ceiling} 도달`
                        : '자금 부족'}
                </NeonButton>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// 기록
// ---------------------------------------------------------------------------

export function RecordsPanel({
  albums,
  group,
}: {
  albums: readonly Album[];
  group: Group | null;
}) {
  const settled = albums.filter((a) => a.result);

  // Every relationship event across the whole save, in chronological order.
  const timeline = (group?.relationships ?? [])
    .flatMap((r) =>
      r.log.map((e) => ({
        week: e.week,
        text: e.text,
        pair: `${group?.members.find((m) => m.id === r.a)?.name ?? ''} · ${
          group?.members.find((m) => m.id === r.b)?.name ?? ''
        }`,
        became: e.becameType,
      })),
    )
    .sort((a, b) => a.week - b.week);

  const best = settled.reduce<{ sales: number; chart: number; fandom: number }>(
    (acc, a) => ({
      sales: Math.max(acc.sales, a.result!.firstWeekSales),
      chart:
        a.result!.chartPeak > 0 && (acc.chart === 0 || a.result!.chartPeak < acc.chart)
          ? a.result!.chartPeak
          : acc.chart,
      fandom: Math.max(acc.fandom, a.result!.fandomAfter),
    }),
    { sales: 0, chart: 0, fandom: 0 },
  );

  return (
    <div className="flex flex-col gap-4">
      <div className="grid grid-cols-3 gap-3">
        <MetricTile
          kicker="Best first week"
          value={best.sales > 0 ? formatCount(best.sales, '장') : '—'}
          sublabel="최고 초동"
          surface="ink"
          emphasis
        />
        <MetricTile
          kicker="Best chart"
          value={best.chart > 0 ? `${best.chart}위` : '차트인 없음'}
          sublabel="최고 순위"
          surface="ink"
        />
        <MetricTile
          kicker="Peak fandom"
          value={best.fandom > 0 ? formatCount(best.fandom, '명') : '—'}
          sublabel="최대 팬덤"
          surface="ink"
        />
      </div>

      <Card variant="ink" kicker="Discography" title="앨범별 성적" flush>
        {settled.length === 0 ? (
          <p className="m-0 px-4 py-8 text-center text-[13px] text-muted">
            아직 결산된 앨범이 없습니다.
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[560px] border-collapse text-[13px]">
              <thead>
                <tr>
                  {['사이클', '앨범', '형식', '등급', '초동', '음원', '순이익'].map((h) => (
                    <th
                      key={h}
                      className="kicker border-b border-ink-line px-4 py-2 text-left font-medium"
                    >
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {settled.map((a) => (
                  <tr key={a.id}>
                    <td className="tabular border-b border-ink-line px-4 py-2.5 text-muted">
                      {a.cycle}
                    </td>
                    <td className="border-b border-ink-line px-4 py-2.5 font-medium text-paper">
                      {a.title}
                    </td>
                    <td className="border-b border-ink-line px-4 py-2.5 text-muted">
                      {ALBUM_TYPES[a.type].label}
                    </td>
                    <td className="tabular border-b border-ink-line px-4 py-2.5 font-semibold text-neon">
                      {a.result!.grade}
                    </td>
                    <td className="tabular border-b border-ink-line px-4 py-2.5 text-paper">
                      {formatCount(a.result!.firstWeekSales, '장')}
                    </td>
                    <td className="tabular border-b border-ink-line px-4 py-2.5 text-muted">
                      {a.result!.chartPeak === 0 ? '실패' : `${a.result!.chartPeak}위`}
                    </td>
                    <td
                      className={`tabular border-b border-ink-line px-4 py-2.5 ${
                        a.result!.profit >= 0 ? 'text-paper' : 'text-neon'
                      }`}
                    >
                      {formatWon(a.result!.profit)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      <Card
        variant="ink"
        kicker="Story timeline"
        title="관계 서사 타임라인"
        action={<Tag tone="outline" surface="ink">{timeline.length}건</Tag>}
        flush
      >
        {timeline.length === 0 ? (
          <p className="m-0 px-4 py-8 text-center text-[13px] text-muted">
            아직 쌓인 이야기가 없습니다.
          </p>
        ) : (
          <ul className="m-0 flex list-none flex-col p-0">
            {timeline.map((e, i) => (
              <li
                key={i}
                className="flex gap-3 border-b border-ink-line px-4 py-2.5 last:border-b-0"
              >
                <span className="tabular w-12 shrink-0 text-[11.5px] text-muted">
                  {e.week}주차
                </span>
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-baseline gap-2">
                    <span className="text-[11.5px] text-muted">{e.pair}</span>
                    {e.became && (
                      <Tag tone="neon" surface="ink">
                        {RELATION_TYPES[e.became].label}
                      </Tag>
                    )}
                  </div>
                  <p className="m-0 mt-0.5 text-[12.5px] leading-relaxed text-paper">{e.text}</p>
                </div>
              </li>
            ))}
          </ul>
        )}
      </Card>
    </div>
  );
}

/** Shared by the 활동 panel so the CTA text stays in one place. */
export const NEW_GROUP_MIN = HUB.minTraineesForNewGroup;
