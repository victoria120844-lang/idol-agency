import { debutPressRelease } from '../../game/generators';
import type { Group } from '../../game/types';

export interface PressReleaseCardProps {
  companyName: string;
  ceoName: string;
  group: Group;
  /** Agency CI colour, used for the letterhead rule and the mark. */
  ciColor: string;
}

/**
 * The debut announcement, set like a real label press release: letterhead rule
 * in the CI colour, dateline, headline, body, and a 보도자료 footer.
 */
export function PressReleaseCard({
  companyName,
  ceoName,
  group,
  ciColor,
}: PressReleaseCardProps) {
  const release = debutPressRelease(companyName, ceoName, group);

  return (
    <article className="on-paper overflow-hidden rounded-card border border-paper-line bg-paper">
      <div className="h-[3px] w-full" style={{ backgroundColor: ciColor }} />

      <div className="flex flex-col gap-4 p-5 sm:p-6">
        <div className="flex flex-wrap items-baseline justify-between gap-2 border-b border-paper-line pb-3">
          <div className="kicker">Press release</div>
          <div className="tabular text-[11px] text-ink/60">{release.dateline}</div>
        </div>

        <h3 className="m-0 max-w-[34ch] text-[19px] font-semibold leading-snug tracking-tight text-ink sm:text-[22px]">
          {release.headline}
        </h3>

        <div className="flex flex-col gap-3">
          {release.paragraphs.map((p, i) => (
            <p key={i} className="m-0 max-w-[62ch] text-[13.5px] leading-relaxed text-ink">
              {p}
            </p>
          ))}
        </div>

        <div className="flex items-center justify-between gap-3 border-t border-paper-line pt-3">
          <span className="text-[11.5px] text-ink/60">
            본 자료는 {companyName} 홍보팀이 배포했습니다.
          </span>
          <span
            className="flex size-9 shrink-0 items-center justify-center rounded-full border-2 text-[9px] font-bold"
            style={{ borderColor: ciColor, color: ciColor }}
            aria-hidden
          >
            {companyName.slice(0, 2)}
          </span>
        </div>
      </div>
    </article>
  );
}
