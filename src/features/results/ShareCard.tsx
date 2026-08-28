import { forwardRef } from 'react';

import { ALBUM_TYPES } from '../../game/constants';
import { formatCount, formatWon } from '../../game/formulas';
import type { Album, ComebackResult, Company, Fandom, Group } from '../../game/types';
import { GradeStamp } from './GradeStamp';
import { WeekLineChart } from './WeekLineChart';

export interface ShareCardProps {
  company: Company;
  group: Group;
  fandom: Fandom;
  album: Album;
  result: ComebackResult;
}

/**
 * The 1200x675 card exported to PNG for Twitter.
 *
 * Rendered off-screen at exactly that size rather than scaled from the live
 * layout, so the export is pixel-predictable. Everything is inline or token
 * based — html-to-image inlines computed styles, and a class that resolves
 * differently at export time is the classic way these come out wrong.
 */
export const ShareCard = forwardRef<HTMLDivElement, ShareCardProps>(function ShareCard(
  { company, group, fandom, album, result },
  ref,
) {
  const tiles: { label: string; value: string; hot?: boolean }[] = [
    { label: '초동', value: formatCount(result.firstWeekSales, '장'), hot: true },
    {
      label: '음원 최고',
      value: result.chartPeak === 0 ? '차트인 실패' : `${result.chartPeak}위`,
    },
    { label: 'MV 조회수', value: formatCount(result.mvViews, '회') },
    { label: '팬덤', value: formatCount(result.fandomAfter, '명') },
    { label: '인지도', value: `${result.awarenessAfter}` },
    { label: '순이익', value: formatWon(result.profit), hot: result.profit >= 0 },
  ];

  return (
    <div
      ref={ref}
      style={{
        width: 1200,
        height: 675,
        background: 'linear-gradient(180deg, #0A0A0B 0%, #0C0C0E 100%)',
        color: '#FFFFFF',
        fontFamily:
          "'Pretendard Variable', Pretendard, -apple-system, BlinkMacSystemFont, 'Apple SD Gothic Neo', system-ui, sans-serif",
        display: 'flex',
        flexDirection: 'column',
        padding: 44,
        boxSizing: 'border-box',
        position: 'relative',
        overflow: 'hidden',
      }}
    >
      {/* Fandom-colour wash, the secondary accent doing its job. */}
      <div
        style={{
          position: 'absolute',
          inset: 'auto -10% -30% -10%',
          height: '60%',
          background: `radial-gradient(60% 100% at 50% 100%, ${fandom.color}1F, transparent 70%)`,
          pointerEvents: 'none',
        }}
      />

      {/* header */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'flex-start',
          borderBottom: '1px solid #26262A',
          paddingBottom: 20,
        }}
      >
        <div>
          <div
            style={{
              fontSize: 12,
              letterSpacing: '0.14em',
              textTransform: 'uppercase',
              color: '#8A8A93',
            }}
          >
            {company.name} · {ALBUM_TYPES[album.type].kicker} · {result.cycle}번째 컴백
          </div>
          <div style={{ fontSize: 40, fontWeight: 700, letterSpacing: '-0.02em', marginTop: 8 }}>
            {group.name}
            <span style={{ color: fandom.color }}> 「{album.title}」</span>
          </div>
        </div>
        <div style={{ textAlign: 'right' }}>
          <div
            style={{
              fontSize: 12,
              letterSpacing: '0.14em',
              textTransform: 'uppercase',
              color: '#8A8A93',
            }}
          >
            Fandom
          </div>
          <div style={{ fontSize: 18, fontWeight: 600, marginTop: 6, color: fandom.color }}>
            {fandom.name}
          </div>
        </div>
      </div>

      {/* body */}
      <div style={{ display: 'flex', gap: 32, flex: 1, paddingTop: 24, minHeight: 0 }}>
        <div style={{ width: 200, flexShrink: 0, display: 'flex', alignItems: 'center' }}>
          <GradeStamp grade={result.grade} score={result.score} still size={168} />
        </div>

        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 16, minWidth: 0 }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12 }}>
            {tiles.map((t) => (
              <div
                key={t.label}
                style={{
                  border: '1px solid #26262A',
                  borderRadius: 10,
                  padding: '12px 14px',
                  background: '#141416',
                }}
              >
                <div
                  style={{
                    fontSize: 11,
                    letterSpacing: '0.12em',
                    textTransform: 'uppercase',
                    color: '#8A8A93',
                  }}
                >
                  {t.label}
                </div>
                <div
                  style={{
                    fontSize: 24,
                    fontWeight: 700,
                    marginTop: 6,
                    fontVariantNumeric: 'tabular-nums',
                    color: t.hot ? '#FF1F3D' : '#FFFFFF',
                  }}
                >
                  {t.value}
                </div>
              </div>
            ))}
          </div>

          <div style={{ flex: 1, minHeight: 0 }}>
            <WeekLineChart series={result.series} fandomColor={fandom.color} height={150} />
          </div>
        </div>
      </div>

      {/* footer */}
      <div
        style={{
          borderTop: '1px solid #26262A',
          paddingTop: 16,
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          fontSize: 13,
          color: '#8A8A93',
        }}
      >
        <span>{result.goalText}</span>
        <span style={{ letterSpacing: '0.12em', fontSize: 11, textTransform: 'uppercase' }}>
          IDOL AGENCY SIMULATOR
        </span>
      </div>
    </div>
  );
});
