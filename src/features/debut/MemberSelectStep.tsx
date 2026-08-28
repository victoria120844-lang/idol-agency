import { useMemo, useState } from 'react';

import {
  Avatar,
  Card,
  MetricTile,
  SelectInput,
  StatHexagon,
  Tag,
  TextInput,
} from '../../components/ui';
import {
  GROUP_CONCEPTS,
  POSITION_LABELS,
  POSITION_ORDER,
  POSITION_PRIMARY_STAT,
  STAT_LABELS,
} from '../../game/constants';
import {
  averageTeamStats,
  bestStat,
  conceptFit,
  conceptIdealShape,
  isPositionMismatch,
  isPositionUnique,
  traineeOverall,
} from '../../game/formulas';
import { STAT_KEYS, type Concept, type Id, type Position, type StatKey, type Trainee } from '../../game/types';

export interface MemberSelectStepProps {
  trainees: readonly Trainee[];
  selectedIds: readonly Id[];
  positions: Record<Id, Position>;
  memberCount: number;
  concept: Concept;
  onToggle: (id: Id) => void;
  onPosition: (id: Id, position: Position) => void;
}

type SortKey = 'overall' | StatKey;

/** Positions already taken by someone else, so the select can disable them. */
function takenPositions(positions: Record<Id, Position>, exceptId: Id): Set<Position> {
  const taken = new Set<Position>();
  for (const [id, pos] of Object.entries(positions)) {
    if (id !== exceptId && isPositionUnique(pos)) taken.add(pos);
  }
  return taken;
}

export function MemberSelectStep({
  trainees,
  selectedIds,
  positions,
  memberCount,
  concept,
  onToggle,
  onPosition,
}: MemberSelectStepProps) {
  const [sort, setSort] = useState<SortKey>('overall');
  const [query, setQuery] = useState('');

  const selectedSet = useMemo(() => new Set(selectedIds), [selectedIds]);
  const selected = useMemo(
    () =>
      selectedIds
        .map((id) => trainees.find((t) => t.id === id))
        .filter((t): t is Trainee => Boolean(t)),
    [selectedIds, trainees],
  );

  const available = useMemo(() => {
    const q = query.trim().toLowerCase();
    return trainees
      .filter((t) => !selectedSet.has(t.id))
      .filter((t) => q === '' || t.name.toLowerCase().includes(q))
      .slice()
      .sort((a, b) =>
        sort === 'overall'
          ? traineeOverall(b.stats) - traineeOverall(a.stats)
          : b.stats[sort] - a.stats[sort],
      );
  }, [trainees, selectedSet, query, sort]);

  const teamStats = averageTeamStats(selected);
  const fit = selected.length > 0 ? conceptFit(teamStats, concept) : 0;
  const ideal = conceptIdealShape(concept);
  const full = selected.length >= memberCount;

  return (
    <div className="flex flex-col gap-4">
      <div className="grid gap-4 lg:grid-cols-2">
        {/* -------- available roster -------- */}
        <Card
          variant="ink"
          kicker="Roster"
          title="연습생 명단"
          action={<Tag tone="outline" surface="ink">{available.length}명</Tag>}
        >
          <div className="mb-3 flex flex-wrap items-center gap-2">
            <SelectInput
              aria-label="정렬 기준"
              surface="ink"
              value={sort}
              onChange={(e) => setSort(e.target.value as SortKey)}
              className="h-9 w-[104px]"
            >
              <option value="overall">종합</option>
              {STAT_KEYS.map((k) => (
                <option key={k} value={k}>
                  {STAT_LABELS[k]}
                </option>
              ))}
            </SelectInput>
            <TextInput
              aria-label="이름 검색"
              surface="ink"
              value={query}
              placeholder="이름 검색"
              onChange={(e) => setQuery(e.target.value)}
              className="h-9 min-w-[120px] flex-1"
            />
          </div>

          <div className="flex max-h-[420px] flex-col gap-1.5 overflow-y-auto pr-1">
            {available.length === 0 ? (
              <p className="m-0 py-8 text-center text-[13px] text-muted">
                선발할 수 있는 연습생이 없습니다.
              </p>
            ) : (
              available.map((t) => (
                <button
                  key={t.id}
                  type="button"
                  disabled={full}
                  onClick={() => onToggle(t.id)}
                  className="flex items-center gap-2.5 rounded-chip border border-ink-line p-2 text-left transition-colors hover:border-neon/50 hover:bg-neon/5 disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:border-ink-line disabled:hover:bg-transparent"
                >
                  <Avatar id={t.id} initial={t.name.slice(0, 1)} size={32} surface="ink" />
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-[13px] font-medium text-paper">{t.name}</div>
                    <div className="tabular text-[11px] text-muted">
                      {t.age}세 · 특기 {STAT_LABELS[t.signatureStat]} {t.stats[t.signatureStat]}
                    </div>
                  </div>
                  <span className="tabular shrink-0 text-[15px] font-semibold text-paper">
                    {traineeOverall(t.stats)}
                  </span>
                </button>
              ))
            )}
          </div>
        </Card>

        {/* -------- selected lineup -------- */}
        <Card
          variant="paper"
          kicker="Lineup"
          title="데뷔조"
          action={
            <Tag tone={full ? 'neon' : 'outline'}>
              {selected.length}/{memberCount}
            </Tag>
          }
        >
          <div className="flex flex-col gap-1.5">
            {Array.from({ length: memberCount }, (_, i) => {
              const t = selected[i];
              if (!t) {
                return (
                  <div
                    key={`slot-${i}`}
                    className="flex h-[58px] items-center gap-3 rounded-chip border border-dashed border-paper-line px-3"
                  >
                    <span className="tabular w-5 text-[12px] text-ink/35">
                      {String(i + 1).padStart(2, '0')}
                    </span>
                    <span className="text-[12px] text-ink/35">비어 있음</span>
                  </div>
                );
              }

              const position = positions[t.id] ?? 'sub_vocal';
              const mismatch = isPositionMismatch(position, t.stats);
              const taken = takenPositions(positions, t.id);
              const wanted = POSITION_PRIMARY_STAT[position];

              return (
                <div
                  key={t.id}
                  className="flex flex-wrap items-center gap-2 rounded-chip border border-paper-line bg-paper-soft px-2.5 py-2"
                >
                  <span className="tabular w-5 shrink-0 text-[12px] text-ink/45">
                    {String(i + 1).padStart(2, '0')}
                  </span>
                  <Avatar id={t.id} initial={t.name.slice(0, 1)} size={32} />

                  <div className="min-w-0 flex-1">
                    <div className="truncate text-[13px] font-semibold text-ink">{t.name}</div>
                    <div className="tabular text-[11px] text-ink/60">
                      종합 {traineeOverall(t.stats)} · 최고 {STAT_LABELS[bestStat(t.stats)]}
                    </div>
                  </div>

                  <div className="flex items-center gap-1.5">
                    {mismatch && (
                      <span
                        className="flex size-5 shrink-0 items-center justify-center rounded-chip border border-neon/45 text-[11px] font-bold text-neon"
                        title={`${POSITION_LABELS[position]}는 ${wanted ? STAT_LABELS[wanted] : ''}이 가장 높은 멤버에게 어울립니다. ${t.name}의 최고 스탯은 ${STAT_LABELS[bestStat(t.stats)]}입니다.`}
                        aria-label="포지션과 주력 스탯이 어긋납니다"
                      >
                        !
                      </span>
                    )}
                    <SelectInput
                      aria-label={`${t.name} 포지션`}
                      value={position}
                      onChange={(e) => onPosition(t.id, e.target.value as Position)}
                      className="h-8 w-[104px] text-[12px]"
                    >
                      {POSITION_ORDER.map((p) => (
                        <option key={p} value={p} disabled={taken.has(p)}>
                          {POSITION_LABELS[p]}
                          {taken.has(p) ? ' (중복)' : ''}
                        </option>
                      ))}
                    </SelectInput>
                    <button
                      type="button"
                      onClick={() => onToggle(t.id)}
                      aria-label={`${t.name} 제외`}
                      className="flex size-8 shrink-0 items-center justify-center rounded-chip border border-paper-line text-[13px] text-ink/60 transition-colors hover:border-neon hover:text-neon"
                    >
                      ×
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </Card>
      </div>

      {/* -------- live summary -------- */}
      <Card
        variant="paper"
        kicker="Live summary"
        title="팀 요약"
        action={<Tag tone="neon">{GROUP_CONCEPTS[concept].label}</Tag>}
      >
        <div className="flex flex-col gap-5 lg:flex-row lg:items-center">
          <div className="flex shrink-0 flex-col items-center gap-1">
            <StatHexagon stats={teamStats} overlay={ideal} size={210} surface="paper" />
            <div className="flex items-center gap-3 text-[11px] text-ink/60">
              <span className="flex items-center gap-1.5">
                <span className="h-[2px] w-4 bg-neon" />팀 평균
              </span>
              <span className="flex items-center gap-1.5">
                <span
                  className="h-[2px] w-4"
                  style={{
                    backgroundImage:
                      'repeating-linear-gradient(90deg, var(--paper-line) 0 3px, transparent 3px 6px)',
                  }}
                />
                컨셉 이상형
              </span>
            </div>
          </div>

          <div className="grid flex-1 grid-cols-2 gap-3 lg:grid-cols-3">
            <MetricTile
              kicker="Concept fit"
              value={`${fit}%`}
              sublabel="컨셉 적합도"
              emphasis
            />
            <MetricTile
              kicker="Team overall"
              value={selected.length ? `${Math.round(
                STAT_KEYS.reduce((s, k) => s + teamStats[k], 0) / STAT_KEYS.length,
              )}` : '—'}
              sublabel="팀 종합"
            />
            <MetricTile
              kicker="Members"
              value={`${selected.length}/${memberCount}`}
              sublabel="선발 인원"
            />
            {STAT_KEYS.slice(0, 3).map((k) => (
              <MetricTile
                key={k}
                kicker={k.toUpperCase()}
                value={`${teamStats[k]}`}
                sublabel={`팀 평균 ${STAT_LABELS[k]}`}
              />
            ))}
          </div>
        </div>
      </Card>
    </div>
  );
}
