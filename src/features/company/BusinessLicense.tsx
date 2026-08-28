import { DISTRICTS } from '../../game/constants';
import { businessNumber } from '../../game/formulas';
import type { CompanyDraft } from '../../game/types';

export interface BusinessLicenseProps {
  draft: CompanyDraft;
  /** Save seed — the registration number is derived from it, not from a draw. */
  seed: number;
}

/**
 * Live 사업자 등록증 preview. Updates on every keystroke so the player sees the
 * agency become real as they fill the form.
 *
 * Deliberately paper-on-paper: a slightly warmer inner sheet inside the card,
 * with the CI colour carried only by the seal and the top rule.
 */
export function BusinessLicense({ draft, seed }: BusinessLicenseProps) {
  const district = DISTRICTS[draft.district];
  const ci = draft.ciColor;

  return (
    <div className="on-paper overflow-hidden rounded-card border border-paper-line bg-paper-soft">
      {/* CI colour reads as the document's letterhead rule. */}
      <div className="h-[3px] w-full" style={{ backgroundColor: ci }} />

      <div className="flex flex-col gap-4 p-5">
        <div className="flex items-start justify-between gap-3 border-b border-paper-line pb-3">
          <div>
            <div className="kicker">Business registration</div>
            <h3 className="mt-1 text-[15px] font-semibold tracking-tight text-ink">
              사업자 등록증
            </h3>
          </div>
          <div className="text-right">
            <div className="kicker">No.</div>
            <div className="tabular mt-1 text-[12px] font-medium text-ink">
              {businessNumber(seed)}
            </div>
          </div>
        </div>

        <dl className="m-0 flex flex-col gap-0">
          <Row label="상호" value={draft.name.trim() || '—'} strong />
          <Row label="대표자" value={draft.ceoName.trim() || '—'} />
          <Row label="소재지" value={`서울 ${district.label}`} />
          <Row label="업태" value="서비스업" />
          <Row label="종목" value="연예 매니지먼트 · 음반 기획" />
          <Row label="개업일" value="1주차" />
        </dl>

        {draft.slogan.trim() && (
          <p className="m-0 border-l-2 pl-3 text-[12.5px] italic text-ink/60" style={{ borderColor: ci }}>
            “{draft.slogan.trim()}”
          </p>
        )}

        <div className="flex items-end justify-between gap-4 border-t border-paper-line pt-4">
          <div>
            <div className="kicker">CI Colour</div>
            <div className="mt-1.5 flex items-center gap-2">
              <span
                className="size-4 rounded-chip border border-paper-line"
                style={{ backgroundColor: ci }}
              />
              <span className="tabular text-[12px] text-ink">{ci.toUpperCase()}</span>
            </div>
          </div>

          {/* In-world 직인. Round because a Korean company seal is round — the
              stated exception to the no-fully-rounded rule. */}
          <div
            className="flex size-[68px] shrink-0 items-center justify-center rounded-full border-2 text-center"
            style={{ borderColor: ci, color: ci }}
            aria-hidden
          >
            <span className="px-1.5 text-[10px] font-bold leading-[1.15] break-all">
              {(draft.name.trim() || '기획사').slice(0, 6)}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}

function Row({ label, value, strong = false }: { label: string; value: string; strong?: boolean }) {
  return (
    <div className="flex items-baseline gap-3 border-b border-paper-line/70 py-2 last:border-b-0">
      <dt className="w-16 shrink-0 text-[11.5px] text-ink/60">{label}</dt>
      <dd
        className={`m-0 min-w-0 flex-1 break-words text-[13px] ${
          strong ? 'font-semibold text-ink' : 'text-ink'
        }`}
      >
        {value}
      </dd>
    </div>
  );
}
