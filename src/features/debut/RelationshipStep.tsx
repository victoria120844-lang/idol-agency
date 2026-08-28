import { useState } from 'react';

import { Card, MetricTile, Tag } from '../../components/ui';
import { POSITION_LABELS, RELATION_TYPES } from '../../game/constants';
import { teamChemistry } from '../../game/formulas';
import type { Member, RelationType, Relationship } from '../../game/types';
import { RelationshipMap } from './RelationshipMap';

export interface RelationshipStepProps {
  members: readonly Member[];
  relationships: readonly Relationship[];
}

/** Every type present in the matrix, with how many pairs hold it. */
function typeCounts(relationships: readonly Relationship[]) {
  const counts = new Map<RelationType, number>();
  for (const r of relationships) counts.set(r.type, (counts.get(r.type) ?? 0) + 1);
  return counts;
}

export function RelationshipStep({ members, relationships }: RelationshipStepProps) {
  const [pair, setPair] = useState<Relationship | null>(null);

  const chemistry = teamChemistry(relationships);
  const counts = typeCounts(relationships);
  const nameOf = (id: string) => members.find((m) => m.id === id)?.name ?? '—';

  return (
    <div className="flex flex-col gap-4">
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <MetricTile
          kicker="Teamwork"
          value={`${chemistry.teamwork}`}
          sublabel="팀워크"
          emphasis
        />
        <MetricTile kicker="Conflict" value={`${chemistry.conflictIndex}`} sublabel="갈등 지수" />
        <MetricTile
          kicker="Scandal risk"
          value={`${chemistry.scandalRisk}`}
          sublabel="스캔들 리스크"
        />
        <MetricTile
          kicker="Pairs"
          value={`${relationships.length}`}
          sublabel="관계 쌍"
          surface="ink"
        />
      </div>

      <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_360px] lg:items-start">
        <Card
          variant="ink"
          kicker="Relationship map"
          title="관계도"
          action={
            <span className="text-[11px] text-muted">선을 올려두거나 누르면 기록이 열립니다</span>
          }
        >
          <div className="flex justify-center">
            <RelationshipMap
              members={members}
              relationships={relationships}
              onSelectPair={setPair}
              size={420}
            />
          </div>

          <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1.5 border-t border-ink-line pt-3">
            {(Object.keys(RELATION_TYPES) as RelationType[])
              .filter((t) => (counts.get(t) ?? 0) > 0)
              .map((t) => {
                const meta = RELATION_TYPES[t];
                const color =
                  meta.stroke === 'neon'
                    ? 'var(--neon)'
                    : meta.stroke === 'paper'
                      ? 'var(--paper)'
                      : 'var(--muted)';
                return (
                  <span key={t} className="flex items-center gap-1.5 text-[11px] text-muted">
                    <span
                      className="h-[2px] w-5 shrink-0"
                      style={
                        meta.dashed
                          ? {
                              backgroundImage: `repeating-linear-gradient(90deg, ${color} 0 4px, transparent 4px 7px)`,
                            }
                          : { background: color }
                      }
                    />
                    {meta.label}
                    <span className="tabular text-muted/70">{counts.get(t)}</span>
                  </span>
                );
              })}
          </div>
        </Card>

        <div className="flex flex-col gap-3">
          {/* pair detail */}
          <Card
            variant="paper"
            kicker="Pair history"
            title={pair ? `${nameOf(pair.a)} · ${nameOf(pair.b)}` : '관계 기록'}
            action={pair ? <Tag tone="neon">{RELATION_TYPES[pair.type].label}</Tag> : undefined}
          >
            {pair ? (
              <div className="flex flex-col gap-3">
                <div className="flex items-baseline justify-between gap-2">
                  <span className="text-[12px] text-ink/60">호감도</span>
                  <span
                    className={`tabular text-[18px] font-semibold ${pair.affinity < 0 ? 'text-ink' : 'text-neon'}`}
                  >
                    {pair.affinity > 0 ? '+' : ''}
                    {pair.affinity}
                  </span>
                </div>
                <div className="h-1.5 overflow-hidden rounded-chip bg-paper-soft">
                  <div
                    className={`h-full rounded-chip ${pair.affinity < 0 ? 'bg-ink/40' : 'bg-neon'}`}
                    style={{ width: `${Math.abs(pair.affinity)}%` }}
                  />
                </div>

                <p className="m-0 rounded-chip border border-paper-line bg-paper-soft px-3 py-2.5 text-[13px] leading-relaxed text-ink">
                  {pair.origin}
                </p>

                {pair.mentorFrom && (
                  <p className="m-0 text-[11.5px] text-ink/60">
                    {nameOf(pair.mentorFrom)}이 멘토 역할을 맡고 있습니다.
                  </p>
                )}

                <div>
                  <div className="kicker mb-1.5">History</div>
                  {pair.log.length === 0 ? (
                    <p className="m-0 text-[12px] text-ink/60">
                      아직 기록이 없습니다. 컴백 활동을 시작하면 이곳에 사건이 쌓입니다.
                    </p>
                  ) : (
                    <ul className="m-0 flex list-none flex-col gap-1.5 p-0">
                      {pair.log.map((e) => (
                        <li key={e.id} className="flex gap-2 text-[12px] text-ink">
                          <span className="tabular shrink-0 text-ink/45">{e.week}주</span>
                          <span>{e.text}</span>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              </div>
            ) : (
              <p className="m-0 text-[13px] text-ink/60">
                관계도에서 선을 선택하면 두 사람의 호감도와 시작 이야기가 여기에 표시됩니다.
              </p>
            )}
          </Card>

          {/* lineup reference */}
          <Card variant="ink" kicker="Lineup" title="데뷔조" flush>
            <ul className="m-0 flex list-none flex-col p-0">
              {members.map((m) => (
                <li
                  key={m.id}
                  className="flex items-center justify-between gap-2 border-b border-ink-line px-4 py-2 last:border-b-0"
                >
                  <span className="truncate text-[13px] text-paper">{m.name}</span>
                  <span className="shrink-0 text-[11px] text-muted">
                    {POSITION_LABELS[m.position]}
                  </span>
                </li>
              ))}
            </ul>
          </Card>
        </div>
      </div>

      {/* every origin line, so nothing is hidden behind a hover */}
      <Card variant="ink" kicker="Origin stories" title="관계 시작 기록" flush>
        <ul className="m-0 flex list-none flex-col p-0">
          {relationships.map((r) => (
            <li
              key={`${r.a}-${r.b}`}
              className="flex flex-wrap items-baseline gap-x-3 gap-y-1 border-b border-ink-line px-4 py-2.5 last:border-b-0"
            >
              <span className="shrink-0 text-[12.5px] font-medium text-paper">
                {nameOf(r.a)} · {nameOf(r.b)}
              </span>
              <Tag
                tone={RELATION_TYPES[r.type].stroke === 'neon' ? 'neon' : 'outline'}
                surface="ink"
              >
                {RELATION_TYPES[r.type].label}
              </Tag>
              <span
                className={`tabular shrink-0 text-[11.5px] ${r.affinity < 0 ? 'text-muted' : 'text-neon'}`}
              >
                {r.affinity > 0 ? '+' : ''}
                {r.affinity}
              </span>
              <span className="min-w-[200px] flex-1 text-[12.5px] text-muted">{r.origin}</span>
            </li>
          ))}
        </ul>
      </Card>
    </div>
  );
}
