import { Field, TextInput } from '../../components/ui';
import {
  ALBUM_CONCEPTS,
  ALBUM_CONCEPT_ORDER,
  ALBUM_FORM,
  ALBUM_TYPES,
  ALBUM_TYPE_ORDER,
} from '../../game/constants';
import { albumShortfall, formatWon } from '../../game/formulas';
import type { AlbumConcept, AlbumType, BudgetAllocation, BudgetChannel } from '../../game/types';
import { BudgetSliders } from './BudgetSliders';

export interface AlbumPlanStepProps {
  title: string;
  concept: AlbumConcept;
  type: AlbumType;
  allocation: BudgetAllocation;
  /** Cash on hand, for the affordability check on each format. */
  won: number;
  titleError?: string;
  onTitle: (v: string) => void;
  onConcept: (v: AlbumConcept) => void;
  onType: (v: AlbumType) => void;
  onAllocation: (channel: BudgetChannel, value: number) => void;
  onResetAllocation: () => void;
}

/** Step 1 — album name, concept, format and how the money is split. */
export function AlbumPlanStep({
  title,
  concept,
  type,
  allocation,
  won,
  titleError,
  onTitle,
  onConcept,
  onType,
  onAllocation,
  onResetAllocation,
}: AlbumPlanStepProps) {
  return (
    <div className="flex flex-col gap-5">
      <Field
        kicker="Album title"
        label="앨범명"
        htmlFor="al-title"
        counter={`${title.trim().length}/${ALBUM_FORM.titleMax}`}
        error={titleError}
      >
        <TextInput
          id="al-title"
          value={title}
          maxLength={ALBUM_FORM.titleMax}
          placeholder="예: FIRST LIGHT"
          autoComplete="off"
          invalid={Boolean(titleError)}
          onChange={(e) => onTitle(e.target.value)}
        />
      </Field>

      {/* ---- concept ---- */}
      <div className="flex flex-col gap-2">
        <span className="kicker">Album concept · 앨범 컨셉</span>
        <p className="m-0 text-[12px] text-ink/60">
          그룹 컨셉과 별개로 고릅니다. 어울리지 않는 조합도 낼 수 있지만, 곡 퀄리티가 그만큼
          떨어집니다.
        </p>
        <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-4">
          {ALBUM_CONCEPT_ORDER.map((id) => {
            const c = ALBUM_CONCEPTS[id];
            const active = concept === id;
            return (
              <button
                key={id}
                type="button"
                aria-pressed={active}
                onClick={() => onConcept(id)}
                className={`rounded-chip border p-3 text-left transition-colors ${
                  active
                    ? 'border-neon bg-neon/8'
                    : 'border-paper-line hover:border-ink/25 hover:bg-paper-soft'
                }`}
              >
                <div className="kicker truncate">{c.kicker}</div>
                <div
                  className={`mt-1 text-[13.5px] font-semibold ${active ? 'text-neon' : 'text-ink'}`}
                >
                  {c.label}
                </div>
                <p className="m-0 mt-1 text-[11.5px] leading-snug text-ink/60">{c.blurb}</p>
              </button>
            );
          })}
        </div>
      </div>

      {/* ---- type ---- */}
      <div className="flex flex-col gap-2">
        <span className="kicker">Album type · 앨범 타입</span>
        <div className="grid gap-2 sm:grid-cols-3">
          {ALBUM_TYPE_ORDER.map((id) => {
            const t = ALBUM_TYPES[id];
            const shortfall = albumShortfall(id, won);
            const affordable = shortfall === 0;
            const active = type === id;

            return (
              <button
                key={id}
                type="button"
                disabled={!affordable}
                aria-pressed={active}
                onClick={() => onType(id)}
                className={`rounded-chip border p-3 text-left transition-colors disabled:cursor-not-allowed ${
                  active
                    ? 'border-neon bg-neon/8'
                    : affordable
                      ? 'border-paper-line hover:border-ink/25 hover:bg-paper-soft'
                      : 'border-paper-line bg-paper-soft/60 opacity-70'
                }`}
              >
                <div className="flex items-baseline justify-between gap-2">
                  <span className="kicker truncate">{t.kicker}</span>
                  <span className="tabular text-[11px] text-ink/60">{t.trackCount}곡</span>
                </div>
                <div
                  className={`mt-1 text-[15px] font-semibold ${active ? 'text-neon' : 'text-ink'}`}
                >
                  {t.label}
                </div>
                <div className="tabular mt-1 text-[13px] font-medium text-ink">
                  {formatWon(t.cost)}
                </div>
                <p className="m-0 mt-1 text-[11.5px] leading-snug text-ink/60">{t.blurb}</p>

                {!affordable && (
                  <p className="m-0 mt-2 text-[11.5px] font-medium text-neon">
                    자금이 {formatWon(shortfall)} 부족합니다.
                  </p>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* ---- budget ---- */}
      <div className="rounded-chip border border-paper-line p-4">
        <BudgetSliders
          allocation={allocation}
          budget={ALBUM_TYPES[type].cost}
          onChange={onAllocation}
          onReset={onResetAllocation}
        />
      </div>
    </div>
  );
}
