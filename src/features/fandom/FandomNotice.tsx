import { fandomNotice } from '../../game/generators';
import type { Fandom } from '../../game/types';

export interface FandomNoticeProps {
  companyName: string;
  groupName: string;
  fandom: Fandom;
}

/**
 * The official fandom-name notice, set like a real agency board post: a
 * bordered sheet with a 공지 label, numbered body lines and a signature block.
 *
 * The fandom colour appears here as a secondary accent — the top rule and the
 * mark only. Neon stays the system accent everywhere else.
 */
export function FandomNotice({ companyName, groupName, fandom }: FandomNoticeProps) {
  const notice = fandomNotice(companyName, groupName, fandom);

  return (
    <article className="on-paper overflow-hidden rounded-card border border-paper-line bg-paper">
      <div className="h-[3px] w-full" style={{ backgroundColor: fandom.color }} />

      <div className="flex flex-col gap-4 p-5">
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-paper-line pb-3">
          <div className="flex items-center gap-2">
            <span
              className="inline-flex h-5 items-center rounded-chip px-2 text-[10px] font-bold tracking-[0.12em] text-paper"
              style={{ backgroundColor: fandom.color }}
            >
              공지
            </span>
            <span className="kicker">Official notice</span>
          </div>
          <span className="tabular text-[11px] text-ink/60">
            {fandom.foundedWeek}주차 · {companyName}
          </span>
        </div>

        <h3 className="m-0 text-[17px] font-semibold tracking-tight text-ink">{notice.title}</h3>

        <ol className="m-0 flex list-none flex-col gap-2.5 p-0">
          {notice.lines.map((line, i) => (
            <li key={i} className="flex gap-3">
              <span className="tabular shrink-0 text-[11px] text-ink/45">
                {String(i + 1).padStart(2, '0')}
              </span>
              <span className="text-[13.5px] leading-relaxed text-ink">{line}</span>
            </li>
          ))}
        </ol>

        <div className="flex items-center justify-between gap-3 border-t border-paper-line pt-3">
          <span className="text-[11.5px] text-ink/60">{companyName} 팬 커뮤니케이션팀</span>
          <span
            className="flex size-9 shrink-0 items-center justify-center rounded-full border-2 text-[9px] font-bold"
            style={{ borderColor: fandom.color, color: fandom.color }}
            aria-hidden
          >
            {fandom.name.slice(0, 2) || '팬덤'}
          </span>
        </div>
      </div>
    </article>
  );
}
