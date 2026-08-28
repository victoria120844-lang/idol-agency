import { useMemo, useState } from 'react';

import {
  Card,
  Field,
  MetricTile,
  NeonButton,
  Tag,
  TextInput,
} from '../../components/ui';
import {
  FANDOM,
  FANDOM_COLORS,
  FANDOM_FORM,
  GROUP_CONCEPTS,
  POSITION_LABELS,
} from '../../game/constants';
import { formatCount, josa } from '../../game/formulas';
import type { Fandom, FandomDraft } from '../../game/types';
import { useGameStore } from '../../app/store';
import { FandomNotice } from './FandomNotice';
import { LightstickPreview } from './LightstickPreview';

/** Korean validation message for the name, or undefined when it is fine. */
function nameError(name: string): string | undefined {
  const v = name.trim();
  if (v.length === 0) return undefined;
  if (v.length < FANDOM_FORM.nameMin || v.length > FANDOM_FORM.nameMax) {
    return `팬덤명은 ${FANDOM_FORM.nameMin}~${FANDOM_FORM.nameMax}자여야 합니다.`;
  }
  return undefined;
}

export function FandomSetup() {
  const company = useGameStore((s) => s.company);
  const group = useGameStore((s) => s.group);
  const week = useGameStore((s) => s.week);
  const createFandom = useGameStore((s) => s.createFandom);

  const [draft, setDraft] = useState<FandomDraft>({
    name: '',
    color: FANDOM_FORM.defaultColor,
    lightstickName: '',
    slogan: '',
  });
  const [touched, setTouched] = useState(false);

  const set = <K extends keyof FandomDraft>(key: K, value: FandomDraft[K]) =>
    setDraft((d) => ({ ...d, [key]: value }));

  const error = nameError(draft.name);
  const isValid = draft.name.trim().length >= FANDOM_FORM.nameMin && !error;

  /**
   * Preview fandom. The real size is rolled when the player confirms, so this
   * shows the midpoint of the trainee-era range rather than pretending to
   * know the roll.
   */
  const previewFandom: Fandom | null = useMemo(() => {
    if (!group) return null;
    const midpoint = Math.round((FANDOM.fansPerMemberMin + FANDOM.fansPerMemberMax) / 2);
    return {
      name: draft.name.trim() || '팬덤명',
      color: draft.color,
      lightstickName: draft.lightstickName.trim(),
      slogan: draft.slogan.trim(),
      size: group.members.length * midpoint,
      loyalty: FANDOM.startingLoyalty,
      sentiment: FANDOM.startingSentiment,
      coreRatio: FANDOM.startingCoreRatio,
      weeklyGrowth: 0,
      foundedWeek: week,
    };
  }, [group, draft, week]);

  if (!company || !group || !previewFandom) return null;

  const submit = () => {
    setTouched(true);
    if (!isValid) return;
    createFandom(draft);
  };

  const concept = GROUP_CONCEPTS[group.concept];
  const coreFans = Math.round((previewFandom.size * previewFandom.coreRatio) / 100);

  return (
    <div className="flex flex-col gap-5">
      <header>
        <div className="kicker">Fandom</div>
        <h1 className="mt-2 text-[26px] font-semibold tracking-tight text-paper sm:text-[32px]">
          팬덤 설정
        </h1>
        <p className="mt-2 max-w-[54ch] text-[13px] text-muted">
          {josa(group.name, '을를')} 응원할 사람들에게 이름과 색을 붙입니다. 이 색은 앞으로 팬덤 화면과 결산
          차트, 그룹 프로필에만 쓰입니다.
        </p>
      </header>

      <div className="grid gap-4 lg:grid-cols-[380px_minmax(0,1fr)] lg:items-start">
        {/* ---------------- form ---------------- */}
        <Card
          variant="paper"
          kicker="Identity"
          title="팬덤 정보"
          className="lg:sticky lg:top-[calc(var(--ticker-h)+var(--topbar-h)+20px)]"
          footer={
            <div className="flex flex-col gap-2">
              {touched && !isValid && (
                <span className="text-[12px] text-neon">팬덤명을 입력해 주세요.</span>
              )}
              <NeonButton block onClick={submit} disabled={touched && !isValid}>
                팬덤 확정
              </NeonButton>
            </div>
          }
        >
          <div className="flex flex-col gap-5">
            <Field
              kicker="Fandom name"
              label="팬덤명"
              htmlFor="fd-name"
              counter={`${draft.name.trim().length}/${FANDOM_FORM.nameMax}`}
              error={touched ? error : undefined}
              hint={`${FANDOM_FORM.nameMin}~${FANDOM_FORM.nameMax}자`}
            >
              <TextInput
                id="fd-name"
                value={draft.name}
                maxLength={FANDOM_FORM.nameMax}
                placeholder="예: 별빛"
                autoComplete="off"
                invalid={touched && Boolean(error)}
                onChange={(e) => set('name', e.target.value)}
                onBlur={() => setTouched(true)}
              />
            </Field>

            <Field
              kicker="Fandom colour"
              label="팬덤 대표 색"
              htmlFor="fd-color"
              hint="공식 굿즈와 응원봉, 결산 차트에 쓰입니다."
            >
              <div className="flex flex-col gap-2.5">
                <div className="grid grid-cols-6 gap-1.5">
                  {FANDOM_COLORS.map((c) => {
                    const active = draft.color.toUpperCase() === c.hex.toUpperCase();
                    return (
                      <button
                        key={c.hex}
                        type="button"
                        title={`${c.label} ${c.hex}`}
                        aria-label={`팬덤 색 ${c.label}`}
                        aria-pressed={active}
                        onClick={() => set('color', c.hex)}
                        className={`h-9 rounded-chip border transition-transform hover:scale-105 ${
                          active ? 'border-ink' : 'border-paper-line'
                        }`}
                        style={{ backgroundColor: c.hex }}
                      />
                    );
                  })}
                </div>

                <div className="flex items-center gap-2">
                  <div className="relative size-9 shrink-0 overflow-hidden rounded-chip border border-paper-line">
                    <span className="absolute inset-0" style={{ backgroundColor: draft.color }} />
                    <input
                      id="fd-color"
                      type="color"
                      value={draft.color}
                      onChange={(e) => set('color', e.target.value.toUpperCase())}
                      aria-label="팬덤 색 직접 선택"
                      className="absolute inset-0 size-full cursor-pointer opacity-0"
                    />
                  </div>
                  <span className="tabular rounded-chip border border-paper-line px-2.5 py-1.5 text-[12px] text-ink">
                    {draft.color.toUpperCase()}
                  </span>
                  <span className="text-[11.5px] text-ink/60">
                    {FANDOM_COLORS.find((c) => c.hex.toUpperCase() === draft.color.toUpperCase())
                      ?.label ?? '커스텀'}
                  </span>
                </div>
              </div>
            </Field>

            <Field
              kicker="Lightstick"
              label="응원봉 이름"
              htmlFor="fd-stick"
              optional
              counter={`${draft.lightstickName.trim().length}/${FANDOM_FORM.lightstickMax}`}
            >
              <TextInput
                id="fd-stick"
                value={draft.lightstickName}
                maxLength={FANDOM_FORM.lightstickMax}
                placeholder="예: 별빛봉"
                autoComplete="off"
                onChange={(e) => set('lightstickName', e.target.value)}
              />
            </Field>

            <Field
              kicker="Slogan"
              label="팬덤 슬로건"
              htmlFor="fd-slogan"
              optional
              counter={`${draft.slogan.trim().length}/${FANDOM_FORM.sloganMax}`}
            >
              <TextInput
                id="fd-slogan"
                value={draft.slogan}
                maxLength={FANDOM_FORM.sloganMax}
                placeholder="예: 우리가 너희의 첫 관객이야"
                autoComplete="off"
                onChange={(e) => set('slogan', e.target.value)}
              />
            </Field>
          </div>
        </Card>

        {/* ---------------- live preview ----------------
            `min-w-0` matters: grid items default to min-width:auto, so the
            lightstick field's min-content width would otherwise widen the whole
            column past the viewport instead of being clipped by the card. */}
        <div className="flex min-w-0 flex-col gap-4">
          <LightstickPreview
            color={draft.color}
            groupName={group.name}
            fandomName={draft.name.trim() || undefined}
            lightstickName={draft.lightstickName.trim() || undefined}
          />

          {draft.slogan.trim() && (
            <p
              className="m-0 rounded-card border border-ink-line bg-ink-soft px-4 py-3 text-center text-[13.5px] italic"
              style={{ color: draft.color }}
            >
              “{draft.slogan.trim()}”
            </p>
          )}

          <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
            <MetricTile
              kicker="Fandom size"
              value={formatCount(previewFandom.size, '명')}
              sublabel="예상 팬덤 규모"
              surface="ink"
              emphasis
            />
            <MetricTile
              kicker="Core fans"
              value={formatCount(coreFans, '명')}
              sublabel={`코어 팬 ${previewFandom.coreRatio}%`}
              surface="ink"
            />
            <MetricTile
              kicker="Loyalty"
              value={`${previewFandom.loyalty}`}
              sublabel="충성도"
              surface="ink"
            />
            <MetricTile
              kicker="Sentiment"
              value={`${previewFandom.sentiment > 0 ? '+' : ''}${previewFandom.sentiment}`}
              sublabel="여론"
              surface="ink"
            />
          </div>

          <FandomNotice
            companyName={company.name}
            groupName={group.name}
            fandom={previewFandom}
          />

          {/* group profile card — one of the three places the fandom colour lives */}
          <Card
            variant="ink"
            kicker="Group profile"
            title={group.name}
            action={<Tag tone="outline" surface="ink">{concept.label}</Tag>}
            flush
          >
            <div className="flex items-center gap-3 border-b border-ink-line px-4 py-3">
              <span
                className="h-8 w-1 shrink-0 rounded-chip"
                style={{ backgroundColor: draft.color }}
                aria-hidden
              />
              <div className="min-w-0">
                <div className="tabular text-[12px] text-muted">
                  {group.members.length}인조 · 팀워크 {group.teamwork} · 컨셉 적합도{' '}
                  {group.conceptFit}%
                </div>
                <div className="text-[12px] text-muted">
                  공식 색 {draft.color.toUpperCase()}
                  {draft.name.trim() ? ` · 팬덤 ${draft.name.trim()}` : ''}
                </div>
              </div>
            </div>

            <ul className="m-0 flex list-none flex-col p-0">
              {group.members.map((m) => (
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
    </div>
  );
}
