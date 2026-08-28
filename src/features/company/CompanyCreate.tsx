import { useMemo, useState } from 'react';

import {
  Card,
  ColorInput,
  Field,
  MetricTile,
  NeonButton,
  SelectInput,
  TextInput,
  TierBadge,
} from '../../components/ui';
import {
  COMPANY_FORM,
  COMPANY_START,
  DISTRICTS,
  DISTRICT_ORDER,
} from '../../game/constants';
import { agencyTier, formatWon } from '../../game/formulas';
import type { CompanyDraft, District } from '../../game/types';
import { useGameStore } from '../../app/store';
import { BusinessLicense } from './BusinessLicense';

/** Quick picks for the CI colour. Neon red is the default. */
const CI_PRESETS = ['#FF1F3D', '#0A0A0B', '#1D4ED8', '#0F766E', '#B45309', '#7E22CE'] as const;

interface Errors {
  name?: string;
  ceoName?: string;
  slogan?: string;
}

/** Pure validation of the draft. Returns Korean messages for the player. */
function validate(draft: CompanyDraft): Errors {
  const errors: Errors = {};
  const name = draft.name.trim();
  const ceo = draft.ceoName.trim();

  if (name.length === 0) {
    errors.name = '회사명을 입력해 주세요.';
  } else if (name.length < COMPANY_FORM.nameMin || name.length > COMPANY_FORM.nameMax) {
    errors.name = `회사명은 ${COMPANY_FORM.nameMin}~${COMPANY_FORM.nameMax}자여야 합니다.`;
  } else if (!COMPANY_FORM.namePattern.test(name)) {
    errors.name = '한글, 영문, 숫자만 사용할 수 있습니다.';
  }

  if (ceo.length < COMPANY_FORM.ceoNameMin) {
    errors.ceoName = '대표자명을 입력해 주세요.';
  } else if (ceo.length > COMPANY_FORM.ceoNameMax) {
    errors.ceoName = `대표자명은 ${COMPANY_FORM.ceoNameMax}자 이내여야 합니다.`;
  }

  if (draft.slogan.trim().length > COMPANY_FORM.sloganMax) {
    errors.slogan = `슬로건은 ${COMPANY_FORM.sloganMax}자 이내여야 합니다.`;
  }

  return errors;
}

export function CompanyCreate() {
  const seed = useGameStore((s) => s.rng.seed);
  const createCompany = useGameStore((s) => s.createCompany);

  const [draft, setDraft] = useState<CompanyDraft>({
    name: '',
    ceoName: '',
    slogan: '',
    ciColor: COMPANY_START.ciColor,
    district: COMPANY_START.district,
  });
  const [touched, setTouched] = useState(false);

  const errors = useMemo(() => validate(draft), [draft]);
  const isValid = Object.keys(errors).length === 0;
  const shown = touched ? errors : {};

  const set = <K extends keyof CompanyDraft>(key: K, value: CompanyDraft[K]) =>
    setDraft((d) => ({ ...d, [key]: value }));

  const submit = () => {
    setTouched(true);
    if (!isValid) return;
    createCompany(draft);
  };

  const district = DISTRICTS[draft.district];
  const startingTier = agencyTier(COMPANY_START.awareness);

  return (
    <div className="mx-auto flex w-full max-w-[1000px] flex-col gap-5">
      <header>
        <div className="kicker">Founding</div>
        <h1 className="mt-2 text-[26px] font-semibold tracking-tight text-paper sm:text-[32px]">
          기획사 설립
        </h1>
        <p className="mt-2 max-w-[52ch] text-[13px] text-muted">
          등록만 하면 오늘부터 대표입니다. 이름과 색을 정하고 나면 되돌릴 수 없습니다.
        </p>
      </header>

      <Card variant="paper" flush>
        <form
          className="grid gap-0 lg:grid-cols-[minmax(0,1fr)_360px]"
          onSubmit={(e) => {
            e.preventDefault();
            submit();
          }}
        >
          {/* ---- left: the form ---- */}
          <div className="flex flex-col gap-5 border-b border-paper-line p-5 lg:border-b-0 lg:border-r">
            <Field
              kicker="Company name"
              label="회사명"
              htmlFor="co-name"
              counter={`${draft.name.trim().length}/${COMPANY_FORM.nameMax}`}
              error={shown.name}
              hint={`${COMPANY_FORM.nameMin}~${COMPANY_FORM.nameMax}자, 한글 또는 영문`}
            >
              <TextInput
                id="co-name"
                value={draft.name}
                invalid={Boolean(shown.name)}
                maxLength={COMPANY_FORM.nameMax}
                placeholder="예: 스타라인 엔터테인먼트"
                autoComplete="off"
                onChange={(e) => set('name', e.target.value)}
                onBlur={() => setTouched(true)}
              />
            </Field>

            <Field
              kicker="CEO"
              label="대표자명"
              htmlFor="co-ceo"
              counter={`${draft.ceoName.trim().length}/${COMPANY_FORM.ceoNameMax}`}
              error={shown.ceoName}
              hint="게임 안에서 플레이어를 부르는 이름입니다."
            >
              <TextInput
                id="co-ceo"
                value={draft.ceoName}
                invalid={Boolean(shown.ceoName)}
                maxLength={COMPANY_FORM.ceoNameMax}
                placeholder="예: 김대표"
                autoComplete="off"
                onChange={(e) => set('ceoName', e.target.value)}
                onBlur={() => setTouched(true)}
              />
            </Field>

            <Field
              kicker="Slogan"
              label="회사 슬로건"
              htmlFor="co-slogan"
              optional
              counter={`${draft.slogan.trim().length}/${COMPANY_FORM.sloganMax}`}
              error={shown.slogan}
              hint="사업자 등록증과 회사 소개에 표시됩니다."
            >
              <TextInput
                id="co-slogan"
                value={draft.slogan}
                invalid={Boolean(shown.slogan)}
                maxLength={COMPANY_FORM.sloganMax}
                placeholder="예: 무대 위에서 증명한다"
                autoComplete="off"
                onChange={(e) => set('slogan', e.target.value)}
              />
            </Field>

            <Field
              kicker="CI colour"
              label="회사 CI 컬러"
              htmlFor="co-ci"
              hint="로고 마크와 차트 색으로 계속 쓰입니다."
            >
              <ColorInput
                id="co-ci"
                value={draft.ciColor}
                presets={CI_PRESETS}
                onChange={(hex) => set('ciColor', hex)}
              />
            </Field>

            <Field
              kicker="District"
              label="설립 지역"
              htmlFor="co-district"
              hint={district.blurb}
            >
              <SelectInput
                id="co-district"
                value={draft.district}
                onChange={(e) => set('district', e.target.value as District)}
              >
                {DISTRICT_ORDER.map((id) => (
                  <option key={id} value={id}>
                    {DISTRICTS[id].label}
                  </option>
                ))}
              </SelectInput>
            </Field>

            <DistrictModifiers district={draft.district} />
          </div>

          {/* ---- right: live license preview ---- */}
          <div className="flex flex-col gap-3 bg-paper-soft/40 p-5">
            <div className="kicker">Live preview</div>
            <BusinessLicense draft={draft} seed={seed} />
          </div>
        </form>
      </Card>

      {/* ---- fixed starting conditions ---- */}
      <section className="flex flex-col gap-3">
        <div className="flex items-baseline gap-3">
          <div>
            <div className="kicker">Starting conditions</div>
            <h2 className="mt-0.5 text-[17px] font-semibold tracking-tight text-paper">
              시작 조건
            </h2>
          </div>
          <span className="h-px flex-1 bg-ink-line" />
        </div>

        <div className="grid grid-cols-2 gap-3 lg:grid-cols-5">
          <MetricTile
            kicker="Seed capital"
            value={formatWon(COMPANY_START.won)}
            sublabel="시작 자금"
            emphasis
          />
          <MetricTile
            kicker="Label tier"
            value={<TierBadge tier={startingTier} />}
            sublabel="기획사 등급"
          />
          <MetricTile
            kicker="Awareness"
            value={`${COMPANY_START.awareness} / 100`}
            sublabel="회사 인지도"
          />
          <MetricTile
            kicker="Industry trust"
            value={`${COMPANY_START.trust} / 100`}
            sublabel="업계 신뢰도"
          />
          <MetricTile
            kicker="Practice rooms"
            value={`${COMPANY_START.practiceRooms}개`}
            sublabel="보유 연습실"
          />
        </div>
      </section>

      {/* ---- in-world briefing ---- */}
      <Card variant="ink" kicker="Briefing" title="소형 기획사로 시작한다는 것">
        <ol className="m-0 flex list-none flex-col gap-2 p-0 text-[13px] text-muted">
          <BriefLine n="01">
            자금이 {formatWon(COMPANY_START.won)}뿐이라 데뷔 전에 한 번은 반드시 돈이 마릅니다.
          </BriefLine>
          <BriefLine n="02">
            인지도 {COMPANY_START.awareness}에 신뢰도 {COMPANY_START.trust}. 음악방송 섭외가 계속
            거절당합니다.
          </BriefLine>
          <BriefLine n="03">
            대신 연습생 계약금이 쌉니다. 큰 회사가 놓친 원석을 먼저 데려올 수 있습니다.
          </BriefLine>
        </ol>
      </Card>

      <div className="flex flex-col items-stretch gap-2 sm:flex-row sm:items-center sm:justify-end">
        {touched && !isValid && (
          <span className="text-[12px] text-neon sm:mr-auto">입력을 확인해 주세요.</span>
        )}
        <NeonButton onClick={submit} disabled={touched && !isValid}>
          기획사 설립하기
        </NeonButton>
      </div>
    </div>
  );
}

function BriefLine({ n, children }: { n: string; children: React.ReactNode }) {
  return (
    <li className="flex gap-3">
      <span className="tabular shrink-0 text-[11px] text-neon">{n}</span>
      <span className="leading-relaxed">{children}</span>
    </li>
  );
}

/** Compact readout of what the chosen district changes. */
function DistrictModifiers({ district }: { district: District }) {
  const d = DISTRICTS[district];

  const rows: { label: string; value: string; good: boolean | null }[] = [
    { label: '임대료', value: pct(d.overheadMul), good: d.overheadMul < 1 },
    { label: '노출도', value: pct(d.exposureMul), good: d.exposureMul > 1 },
    { label: '연습생 실력', value: pct(d.traineeQualityMul), good: d.traineeQualityMul > 1 },
    { label: '연습생 비용', value: pct(d.traineeCostMul), good: d.traineeCostMul < 1 },
    {
      label: '방송 섭외',
      value: d.broadcastBonus === 0 ? '—' : `${d.broadcastBonus > 0 ? '+' : ''}${d.broadcastBonus}`,
      good: d.broadcastBonus > 0 ? true : d.broadcastBonus < 0 ? false : null,
    },
  ];

  return (
    <div className="rounded-chip border border-paper-line bg-paper-soft px-3 py-2.5">
      <div className="kicker mb-2">{d.kicker} modifiers</div>
      <dl className="m-0 grid grid-cols-2 gap-x-4 gap-y-1.5 sm:grid-cols-3">
        {rows.map((r) => (
          <div key={r.label} className="flex items-baseline justify-between gap-2">
            <dt className="text-[11.5px] text-ink/60">{r.label}</dt>
            <dd
              className={`tabular m-0 text-[12px] font-medium ${
                r.good === null ? 'text-ink/60' : r.good ? 'text-neon' : 'text-ink'
              }`}
            >
              {r.value}
            </dd>
          </div>
        ))}
      </dl>
    </div>
  );
}

/** "+15%" / "-10%" / "—" for a multiplier around 1. */
function pct(mul: number): string {
  const delta = Math.round((mul - 1) * 100);
  if (delta === 0) return '—';
  return `${delta > 0 ? '+' : ''}${delta}%`;
}
