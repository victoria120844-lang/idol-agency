import { useRef, useState } from 'react';
import { motion } from 'framer-motion';
import { toPng } from 'html-to-image';

import {
  Avatar,
  Card,
  MetricTile,
  NeonButton,
  Tag,
  TierBadge,
  Toast,
  type ToastItem,
} from '../../components/ui';
import { POSITION_LABELS, RELATION_TYPES } from '../../game/constants';
import { formatCount } from '../../game/formulas';
import { promotionText, resultSummaryText } from '../../game/settle';
import type { ResultMetric } from '../../game/types';
import { useGameStore } from '../../app/store';
import { GradeStamp } from './GradeStamp';
import { ShareCard } from './ShareCard';
import { WeekLineChart } from './WeekLineChart';

export function ComebackResults() {
  const company = useGameStore((s) => s.company);
  const group = useGameStore((s) => s.group);
  const fandom = useGameStore((s) => s.fandom);
  const albums = useGameStore((s) => s.albums);
  const activeAlbumId = useGameStore((s) => s.activeAlbumId);
  const setPhase = useGameStore((s) => s.setPhase);

  const shareRef = useRef<HTMLDivElement>(null);
  const [busy, setBusy] = useState(false);
  const [toasts, setToasts] = useState<ToastItem[]>([]);

  const album = albums.find((a) => a.id === activeAlbumId) ?? null;
  const result = album?.result ?? null;

  if (!company || !group || !fandom || !album || !result) return null;

  const pushToast = (text: string, tone: ToastItem['tone'], kicker?: string) => {
    const item: ToastItem = { id: `${Date.now()}-${Math.random()}`, text, tone, kicker };
    setToasts((t) => [...t, item].slice(-3));
    window.setTimeout(() => setToasts((t) => t.filter((x) => x.id !== item.id)), 3600);
  };

  /**
   * Export the off-screen 1200x675 card.
   *
   * `pixelRatio: 1` because the node is already at the target size — letting
   * html-to-image scale it would produce a 2400px file Twitter then downsamples.
   */
  const saveImage = async () => {
    if (!shareRef.current) return;
    setBusy(true);
    try {
      const dataUrl = await toPng(shareRef.current, {
        width: 1200,
        height: 675,
        pixelRatio: 1,
        cacheBust: true,
        backgroundColor: '#0A0A0B',
        // The Pretendard and JetBrains Mono stylesheets are cross-origin, so
        // html-to-image cannot read their rules to inline them and logs a
        // SecurityError for each. ShareCard declares an explicit font stack
        // with system Korean fallbacks, so skipping the embed costs nothing
        // and keeps the export silent.
        skipFonts: true,
      });
      const link = document.createElement('a');
      link.download = `${group.name}_${album.title}_결산.png`;
      link.href = dataUrl;
      link.click();
      pushToast('결과 이미지를 저장했습니다.', 'good', 'EXPORT');
    } catch {
      pushToast('이미지 저장에 실패했습니다. 다시 시도해 주세요.', 'critical', 'EXPORT');
    } finally {
      setBusy(false);
    }
  };

  const copySummary = async () => {
    const text = resultSummaryText(company.name, group, album, result);
    try {
      await navigator.clipboard.writeText(text);
      pushToast('결과 요약을 복사했습니다.', 'good', 'COPY');
    } catch {
      pushToast('복사에 실패했습니다. 브라우저 권한을 확인해 주세요.', 'critical', 'COPY');
    }
  };

  const m = result.metrics;

  return (
    <div className="flex flex-col gap-5">
      <header>
        <div className="kicker">Results · Cycle {result.cycle}</div>
        <h1 className="mt-2 text-[26px] font-semibold tracking-tight text-paper sm:text-[32px]">
          컴백 결산
        </h1>
        <p className="mt-2 max-w-[54ch] text-[13px] text-muted">
          {group.name} 「{album.title}」의 4주 활동이 끝났습니다.
        </p>
      </header>

      {/* ---- grade + goal ---- */}
      <Card variant="ink">
        <div className="flex flex-col items-center gap-6 sm:flex-row sm:items-center">
          <div className="shrink-0">
            <GradeStamp grade={result.grade} score={result.score} />
          </div>

          <div className="flex min-w-0 flex-1 flex-col gap-3">
            <div
              className={`rounded-chip border px-4 py-3 ${
                result.goalMet
                  ? 'border-neon/45 bg-neon/8'
                  : 'border-ink-line bg-ink-soft'
              }`}
            >
              <div className="kicker">Season objective</div>
              <p
                className={`m-0 mt-1.5 text-[14px] font-medium ${
                  result.goalMet ? 'text-neon' : 'text-paper'
                }`}
              >
                {result.goalText}
              </p>
            </div>

            {result.promotedFrom && result.promotedTo && (
              <motion.div
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.7, duration: 0.5 }}
                className="glow-neon flex flex-wrap items-center gap-3 rounded-chip border border-neon bg-neon/10 px-4 py-3"
              >
                <span className="kicker" style={{ color: 'var(--neon)' }}>
                  Promotion
                </span>
                <TierBadge tier={result.promotedTo} surface="ink" />
                <span className="text-[13.5px] font-medium text-neon">
                  {promotionText(result.promotedFrom, result.promotedTo)}
                </span>
              </motion.div>
            )}
          </div>
        </div>
      </Card>

      {/* ---- six headline metrics ---- */}
      <section className="flex flex-col gap-3">
        <div className="flex items-baseline gap-3">
          <div>
            <div className="kicker">Headline metrics</div>
            <h2 className="mt-0.5 text-[17px] font-semibold tracking-tight text-paper">
              6대 지표
            </h2>
          </div>
          <span className="h-px flex-1 bg-ink-line" />
        </div>

        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          <MetricWithReason kicker="FIRST WEEK SALES" sublabel="초동" metric={m.firstWeekSales} emphasis />
          <MetricWithReason kicker="CHART PEAK" sublabel="음원 최고 순위" metric={m.chartPeak} />
          <MetricWithReason kicker="MV VIEWS" sublabel="뮤직비디오 조회수" metric={m.mvViews} />
          <MetricWithReason kicker="FANDOM" sublabel="팬덤 규모" metric={m.fandom} />
          <MetricWithReason kicker="AWARENESS" sublabel="대중 인지도" metric={m.awareness} />
          <MetricWithReason kicker="NET PROFIT" sublabel="회사 수익" metric={m.profit} />
        </div>
      </section>

      {/* ---- chart ---- */}
      <Card variant="ink" kicker="4-week trend" title="4주간 지표 변화">
        <WeekLineChart series={result.series} fandomColor={fandom.color} />
      </Card>

      {/* ---- members ---- */}
      <Card variant="ink" kicker="Member settlement" title="멤버별 결산" flush>
        <ul className="m-0 flex list-none flex-col p-0">
          {result.memberResults.map((mr) => {
            const member = group.members.find((x) => x.id === mr.memberId);
            return (
              <li
                key={mr.memberId}
                className="flex items-center gap-3 border-b border-ink-line px-4 py-3 last:border-b-0"
              >
                <span className="tabular w-6 shrink-0 text-[12px] text-muted">
                  {mr.buzzRank}
                </span>
                {member && <Avatar id={member.traineeId} size={34} surface="ink" />}
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-baseline gap-2">
                    <span className="text-[13.5px] font-semibold text-paper">{mr.name}</span>
                    {member && (
                      <span className="text-[11px] text-muted">
                        {POSITION_LABELS[member.position]}
                      </span>
                    )}
                  </div>
                  <p className="m-0 mt-0.5 text-[12px] text-muted">{mr.note}</p>
                </div>
                <div className="shrink-0 text-right">
                  <div className="kicker">Fans</div>
                  <div className="tabular text-[14px] font-semibold text-paper">
                    {formatCount(mr.personalFans, '명')}
                  </div>
                </div>
              </li>
            );
          })}
        </ul>
      </Card>

      {/* ---- relationships ---- */}
      <Card
        variant="ink"
        kicker="Relationship diff"
        title="관계도 변화"
        action={<Tag tone="outline" surface="ink">{result.relationshipDiffs.length}건</Tag>}
      >
        {result.relationshipDiffs.length === 0 ? (
          <p className="m-0 text-[13px] text-muted">
            이번 컴백 동안 눈에 띄게 변한 관계는 없었습니다.
          </p>
        ) : (
          <ul className="m-0 flex list-none flex-col gap-2 p-0">
            {result.relationshipDiffs.map((d) => (
              <li
                key={`${d.a}-${d.b}`}
                className="flex flex-wrap items-center gap-2.5 rounded-chip border border-ink-line px-3 py-2.5"
              >
                <Tag tone={d.becameType ? 'neon' : 'outline'} surface="ink">
                  {RELATION_TYPES[d.becameType ?? d.type].label}
                </Tag>
                <span className="min-w-0 flex-1 text-[12.5px] text-paper">{d.text}</span>
                <span
                  className={`tabular shrink-0 text-[12px] font-medium ${
                    d.affinityDelta >= 0 ? 'text-neon' : 'text-muted'
                  }`}
                >
                  호감도 {d.affinityDelta >= 0 ? '+' : ''}
                  {d.affinityDelta}
                </span>
              </li>
            ))}
          </ul>
        )}
      </Card>

      {/* ---- press + community ---- */}
      <div className="grid gap-3 lg:grid-cols-2">
        <Card variant="paper" kicker="Press" title="기사 헤드라인">
          <ul className="m-0 flex list-none flex-col p-0">
            {result.headlines.map((h, i) => (
              <li
                key={i}
                className="flex gap-3 border-b border-paper-line py-2.5 last:border-b-0"
              >
                <span className="tabular shrink-0 text-[11px] text-ink/45">
                  {String(i + 1).padStart(2, '0')}
                </span>
                <span className="text-[13.5px] font-medium leading-snug text-ink">{h}</span>
              </li>
            ))}
          </ul>
        </Card>

        <Card variant="ink" kicker="Community" title="커뮤니티 반응">
          <ul className="m-0 flex list-none flex-col gap-2 p-0">
            {result.reactions.map((r, i) => (
              <li
                key={i}
                className="rounded-chip border border-ink-line bg-ink-soft px-3 py-2 text-[12.5px] leading-relaxed text-muted"
              >
                {r}
              </li>
            ))}
          </ul>
        </Card>
      </div>

      {/* ---- share footer ---- */}
      <Card variant="ink" kicker="Share" title="결과 공유">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <p className="m-0 max-w-[52ch] text-[13px] text-muted">
            트위터 규격(1200×675)으로 결과 카드를 저장하거나, 해시태그가 포함된 한국어 요약을
            복사해 그대로 붙여넣을 수 있습니다.
          </p>
          <div className="flex flex-col gap-2 sm:flex-row">
            <NeonButton variant="ghost" loading={busy} onClick={saveImage}>
              결과 이미지 저장
            </NeonButton>
            <NeonButton variant="ghost" onClick={copySummary}>
              결과 요약 복사
            </NeonButton>
          </div>
        </div>
        <p className="m-0 mt-3 border-t border-ink-line pt-3 text-[11.5px] text-muted">
          #아이돌기획사시뮬레이터 · IDOL AGENCY SIMULATOR
        </p>
      </Card>

      {/* ---- actions ---- */}
      <div className="flex flex-col gap-2 sm:flex-row sm:justify-end">
        <NeonButton onClick={() => setPhase('agency_hub')}>다음 활동 준비</NeonButton>
      </div>

      {/* Off-screen export target, rendered at exactly 1200x675. */}
      <div
        aria-hidden
        style={{
          position: 'fixed',
          left: -20000,
          top: 0,
          width: 1200,
          height: 675,
          pointerEvents: 'none',
        }}
      >
        <ShareCard
          ref={shareRef}
          company={company}
          group={group}
          fandom={fandom}
          album={album}
          result={result}
        />
      </div>

      <Toast items={toasts} />
    </div>
  );
}

/** A MetricTile with the plain-Korean reason it landed where it did. */
function MetricWithReason({
  kicker,
  sublabel,
  metric,
  emphasis = false,
}: {
  kicker: string;
  sublabel: string;
  metric: ResultMetric;
  emphasis?: boolean;
}) {
  return (
    <div className="flex flex-col gap-2">
      <MetricTile
        kicker={kicker}
        value={metric.value}
        sublabel={sublabel}
        delta={metric.delta}
        deltaLabel={metric.deltaLabel}
        emphasis={emphasis}
      />
      <p className="m-0 px-1 text-[11.5px] leading-relaxed text-muted">{metric.reason}</p>
    </div>
  );
}
