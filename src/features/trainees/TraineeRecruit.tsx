import { useMemo, useState } from 'react';
import { AnimatePresence } from 'framer-motion';

import {
  Card,
  Field,
  NeonButton,
  SelectInput,
  Tag,
  TextInput,
  Toast,
  type ToastItem,
} from '../../components/ui';
import { GENDER_LABELS, RECRUIT, STAT_LABELS } from '../../game/constants';
import {
  formatWon,
  freeSlotsLeft,
  isPotentialVisible,
  recruitCost,
  traineeOverall,
} from '../../game/formulas';
import { STAT_KEYS, type Gender, type StatKey, type Trainee } from '../../game/types';
import { useGameStore, type RecruitFailure } from '../../app/store';
import { TraineeCard } from './TraineeCard';
import { TraineeModal } from './TraineeModal';

/** Korean toast copy for every way an audition can be refused. */
const FAILURE_TEXT: Record<RecruitFailure, string> = {
  roster_full: `연습생은 최대 ${RECRUIT.maxRoster}명까지만 보유할 수 있습니다. 먼저 방출하세요.`,
  insufficient_funds: `자금이 부족합니다. 무료 모집이 끝나 1명당 ${formatWon(RECRUIT.costAfterFree)}이 필요합니다.`,
  no_company: '기획사가 아직 설립되지 않았습니다.',
  no_name: '연습생 이름을 입력해 주세요.',
};

type SortKey = 'overall' | StatKey | 'potential';
type GenderFilter = 'all' | Gender;

const SORT_OPTIONS: { id: SortKey; label: string }[] = [
  { id: 'overall', label: '종합' },
  ...STAT_KEYS.map((k) => ({ id: k as SortKey, label: STAT_LABELS[k] })),
  { id: 'potential', label: '잠재력' },
];

/** Most toasts visible at once. Older ones drop off the top of the stack. */
const TOAST_STACK_MAX = 3;

/** Potential ordering; unrevealed trainees sort to the bottom. */
const GRADE_RANK: Record<string, number> = { S: 5, A: 4, B: 3, C: 2, D: 1 };

function sortValue(t: Trainee, key: SortKey): number {
  if (key === 'overall') return traineeOverall(t.stats);
  if (key === 'potential') {
    return isPotentialVisible(t) ? GRADE_RANK[t.potentialGrade] : -1;
  }
  return t.stats[key];
}

export function TraineeRecruit() {
  const company = useGameStore((s) => s.company);
  const trainees = useGameStore((s) => s.trainees);
  const recruit = useGameStore((s) => s.recruitTrainee);
  const release = useGameStore((s) => s.releaseTrainee);
  const evaluate = useGameStore((s) => s.evaluateTrainee);
  const setPhase = useGameStore((s) => s.setPhase);

  const [name, setName] = useState('');
  const [gender, setGender] = useState<Gender>('female');
  const [openId, setOpenId] = useState<string | null>(null);
  const [newId, setNewId] = useState<string | null>(null);
  const [toasts, setToasts] = useState<ToastItem[]>([]);

  const [sort, setSort] = useState<SortKey>('overall');
  const [genderFilter, setGenderFilter] = useState<GenderFilter>('all');
  const [query, setQuery] = useState('');

  const won = company?.won ?? 0;
  const count = trainees.length;
  const cost = recruitCost(count);
  const freeLeft = freeSlotsLeft(count);
  const rosterFull = count >= RECRUIT.maxRoster;
  const canDebut = count >= RECRUIT.minForDebut;

  const pushToast = (text: string, tone: ToastItem['tone'], kicker?: string) => {
    const item: ToastItem = { id: `${Date.now()}-${Math.random()}`, text, tone, kicker };
    // Rapid-fire auditions would otherwise stack toasts over the whole roster.
    setToasts((t) => [...t, item].slice(-TOAST_STACK_MAX));
    window.setTimeout(() => setToasts((t) => t.filter((x) => x.id !== item.id)), 3600);
  };

  const onAudition = () => {
    const failure = recruit(name, gender);
    if (failure) {
      pushToast(FAILURE_TEXT[failure], failure === 'no_name' ? 'neutral' : 'critical', 'AUDITION');
      return;
    }
    // The store appends, so the new trainee is the last one.
    const signed = useGameStore.getState().trainees.at(-1);
    if (signed) {
      setNewId(signed.id);
      window.setTimeout(() => setNewId((id) => (id === signed.id ? null : id)), 2000);
      pushToast(
        cost > 0
          ? `${signed.name} 연습생과 계약했습니다. ${formatWon(cost)} 지출.`
          : `${signed.name} 연습생과 계약했습니다. 무료 모집 ${freeLeft - 1}회 남음.`,
        'good',
        'SIGNED',
      );
    }
    setName('');
  };

  const onEvaluate = (id: string) => {
    const failure = evaluate(id);
    if (failure) {
      pushToast(
        `자금이 부족합니다. 평가 세션에는 ${formatWon(RECRUIT.evaluationCost)}이 필요합니다.`,
        'critical',
        'EVALUATION',
      );
      return;
    }
    pushToast('평가 세션을 마쳤습니다. 잠재력이 공개되었습니다.', 'good', 'EVALUATION');
  };

  const onRelease = (id: string) => {
    const target = trainees.find((t) => t.id === id);
    release(id);
    setOpenId(null);
    if (target) pushToast(`${target.name} 연습생을 방출했습니다.`, 'bad', 'RELEASED');
  };

  const visible = useMemo(() => {
    const q = query.trim().toLowerCase();
    return trainees
      .filter((t) => genderFilter === 'all' || t.gender === genderFilter)
      .filter((t) => q === '' || t.name.toLowerCase().includes(q))
      .slice()
      .sort((a, b) => sortValue(b, sort) - sortValue(a, sort));
  }, [trainees, genderFilter, query, sort]);

  const openTrainee = trainees.find((t) => t.id === openId) ?? null;

  return (
    <div className="flex flex-col gap-5">
      <header>
        <div className="kicker">Recruit</div>
        <h1 className="mt-2 text-[26px] font-semibold tracking-tight text-paper sm:text-[32px]">
          연습생 모집
        </h1>
        <p className="mt-2 max-w-[52ch] text-[13px] text-muted">
          이름과 성별만 정하면 나머지는 오디션에서 드러납니다. 잠재력은 4주 훈련하거나 평가 세션을
          거쳐야 보입니다.
        </p>
      </header>

      <div className="grid gap-4 lg:grid-cols-[320px_minmax(0,1fr)] lg:items-start">
        {/* ---------------- recruit panel ---------------- */}
        <Card
          variant="paper"
          kicker="Audition"
          title="오디션"
          className="lg:sticky lg:top-[calc(var(--ticker-h)+var(--topbar-h)+20px)]"
          footer={
            <div className="flex flex-col gap-1.5">
              <NeonButton
                block
                surface="paper"
                variant={canDebut ? 'primary' : 'ghost'}
                disabled={!canDebut}
                onClick={() => setPhase('debut_group')}
              >
                데뷔조 구성
              </NeonButton>
              {!canDebut && (
                <p className="m-0 text-center text-[11.5px] text-ink/60">
                  연습생 {RECRUIT.minForDebut}명부터 데뷔조를 짤 수 있습니다. ({count}/
                  {RECRUIT.minForDebut})
                </p>
              )}
            </div>
          }
        >
          <div className="flex flex-col gap-4">
            <Field kicker="Name" label="이름" htmlFor="tr-name">
              <TextInput
                id="tr-name"
                value={name}
                maxLength={12}
                placeholder="예: 김하늘"
                autoComplete="off"
                onChange={(e) => setName(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') onAudition();
                }}
              />
            </Field>

            <Field kicker="Gender" label="성별">
              <div className="grid grid-cols-2 gap-1.5" role="radiogroup" aria-label="성별">
                {(['female', 'male'] as Gender[]).map((g) => (
                  <button
                    key={g}
                    type="button"
                    role="radio"
                    aria-checked={gender === g}
                    onClick={() => setGender(g)}
                    className={`h-10 rounded-chip border text-[13px] font-medium transition-colors ${
                      gender === g
                        ? 'border-neon bg-neon/10 text-neon'
                        : 'border-paper-line text-ink/60 hover:border-ink/30 hover:text-ink'
                    }`}
                  >
                    {GENDER_LABELS[g]}
                  </button>
                ))}
              </div>
            </Field>

            <NeonButton block onClick={onAudition} disabled={rosterFull}>
              오디션 진행
            </NeonButton>

            <dl className="m-0 flex flex-col gap-2 border-t border-paper-line pt-3">
              <Meter
                label="무료 모집"
                value={`${freeLeft}/${RECRUIT.freeSlots} 남음`}
                ratio={freeLeft / RECRUIT.freeSlots}
              />
              <Meter
                label="명단 정원"
                value={`${count}/${RECRUIT.maxRoster}명`}
                ratio={count / RECRUIT.maxRoster}
                invert
              />
              <div className="flex items-baseline justify-between gap-2 pt-1">
                <dt className="text-[12px] text-ink/60">다음 오디션 비용</dt>
                <dd
                  className={`tabular m-0 text-[13px] font-semibold ${cost > 0 ? 'text-neon' : 'text-ink'}`}
                >
                  {cost > 0 ? formatWon(cost) : '무료'}
                </dd>
              </div>
            </dl>

            {rosterFull && (
              <p className="m-0 rounded-chip border border-neon/40 bg-neon/8 px-3 py-2 text-[12px] text-neon">
                정원이 찼습니다. 새로 뽑으려면 먼저 방출해야 합니다.
              </p>
            )}
          </div>
        </Card>

        {/* ---------------- roster ---------------- */}
        <div className="flex flex-col gap-3">
          <Card variant="ink" flush>
            <div className="flex flex-wrap items-center gap-2 p-3">
              <div className="flex items-center gap-2">
                <span className="kicker">Sort</span>
                <SelectInput
                  aria-label="정렬 기준"
                  surface="ink"
                  value={sort}
                  onChange={(e) => setSort(e.target.value as SortKey)}
                  className="h-9 w-[104px]"
                >
                  {SORT_OPTIONS.map((o) => (
                    <option key={o.id} value={o.id}>
                      {o.label}
                    </option>
                  ))}
                </SelectInput>
              </div>

              <div className="flex items-center gap-1" role="group" aria-label="성별 필터">
                {(['all', 'female', 'male'] as GenderFilter[]).map((g) => (
                  <button
                    key={g}
                    type="button"
                    aria-pressed={genderFilter === g}
                    onClick={() => setGenderFilter(g)}
                    className={`h-9 rounded-chip border px-3 text-[12px] transition-colors ${
                      genderFilter === g
                        ? 'border-neon/50 bg-neon/10 text-neon'
                        : 'border-ink-line text-muted hover:text-paper'
                    }`}
                  >
                    {g === 'all' ? '전체' : GENDER_LABELS[g]}
                  </button>
                ))}
              </div>

              <TextInput
                aria-label="이름 검색"
                surface="ink"
                value={query}
                placeholder="이름 검색"
                onChange={(e) => setQuery(e.target.value)}
                className="h-9 min-w-[120px] flex-1"
              />

              <Tag tone="neon" surface="ink">
                {visible.length}명
              </Tag>
            </div>
          </Card>

          {trainees.length === 0 ? (
            <Card variant="outline">
              <div className="flex min-h-[180px] flex-col items-center justify-center gap-2 text-center">
                <div className="kicker">Empty roster</div>
                <p className="m-0 text-[13px] text-muted">
                  아직 연습생이 없습니다. 왼쪽에서 첫 오디션을 진행하세요.
                </p>
              </div>
            </Card>
          ) : visible.length === 0 ? (
            <Card variant="outline">
              <div className="flex min-h-[180px] items-center justify-center text-center text-[13px] text-muted">
                조건에 맞는 연습생이 없습니다.
              </div>
            </Card>
          ) : (
            <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2 xl:grid-cols-3">
              <AnimatePresence initial={false}>
                {visible.map((t) => (
                  <TraineeCard
                    key={t.id}
                    trainee={t}
                    isNew={t.id === newId}
                    onOpen={setOpenId}
                  />
                ))}
              </AnimatePresence>
            </div>
          )}
        </div>
      </div>

      <TraineeModal
        trainee={openTrainee}
        won={won}
        onClose={() => setOpenId(null)}
        onEvaluate={onEvaluate}
        onRelease={onRelease}
      />

      <Toast items={toasts} />
    </div>
  );
}

/** Small labelled progress row used in the audition panel. */
function Meter({
  label,
  value,
  ratio,
  invert = false,
}: {
  label: string;
  value: string;
  ratio: number;
  invert?: boolean;
}) {
  const pct = Math.max(0, Math.min(1, ratio)) * 100;
  // `invert` means a full bar is the bad end (roster capacity), so it turns
  // neon as it fills rather than as it empties.
  const hot = invert ? pct > 80 : pct < 25;

  return (
    <div className="flex flex-col gap-1">
      <div className="flex items-baseline justify-between gap-2">
        <dt className="text-[12px] text-ink/60">{label}</dt>
        <dd className={`tabular m-0 text-[12px] font-medium ${hot ? 'text-neon' : 'text-ink'}`}>
          {value}
        </dd>
      </div>
      <div className="h-1.5 rounded-chip bg-paper-soft">
        <div
          className={`h-full rounded-chip transition-[width] duration-300 ${hot ? 'bg-neon' : 'bg-ink/35'}`}
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}
