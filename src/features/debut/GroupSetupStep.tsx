import { Card, Field, TextInput } from '../../components/ui';
import {
  CONCEPT_ORDER,
  DEBUT_GOALS,
  DEBUT_GOAL_ORDER,
  GROUP_CONCEPTS,
  GROUP_RULES,
  STAT_LABELS,
} from '../../game/constants';
import { STAT_KEYS, type Concept, type DebutGoal } from '../../game/types';

export interface GroupSetupStepProps {
  name: string;
  memberCount: number;
  concept: Concept;
  goal: DebutGoal;
  nameError?: string;
  onName: (v: string) => void;
  onMemberCount: (v: number) => void;
  onConcept: (v: Concept) => void;
  onGoal: (v: DebutGoal) => void;
}

/** Step 1 — name, size and concept. Size is locked in before selection starts. */
export function GroupSetupStep({
  name,
  memberCount,
  concept,
  goal,
  nameError,
  onName,
  onMemberCount,
  onConcept,
  onGoal,
}: GroupSetupStepProps) {
  return (
    <div className="flex flex-col gap-4">
      <div className="grid gap-4 lg:grid-cols-2">
        <Card variant="paper" kicker="Identity" title="그룹 정보">
          <div className="flex flex-col gap-5">
            <Field
              kicker="Group name"
              label="그룹명"
              htmlFor="gr-name"
              counter={`${name.trim().length}/${GROUP_RULES.nameMax}`}
              error={nameError}
              hint={`${GROUP_RULES.nameMin}~${GROUP_RULES.nameMax}자`}
            >
              <TextInput
                id="gr-name"
                value={name}
                maxLength={GROUP_RULES.nameMax}
                placeholder="예: 아이리스"
                autoComplete="off"
                invalid={Boolean(nameError)}
                onChange={(e) => onName(e.target.value)}
              />
            </Field>

            <Field
              kicker="Members"
              label="멤버 수"
              htmlFor="gr-count"
              hint="멤버 수를 먼저 정해야 선발로 넘어갑니다."
            >
              <div className="flex items-center gap-4">
                <input
                  id="gr-count"
                  type="range"
                  min={GROUP_RULES.minMembers}
                  max={GROUP_RULES.maxMembers}
                  step={1}
                  value={memberCount}
                  onChange={(e) => onMemberCount(Number(e.target.value))}
                  className="h-1.5 flex-1 cursor-pointer appearance-none rounded-chip bg-paper-soft accent-neon"
                />
                <span className="tabular w-14 shrink-0 rounded-chip border border-paper-line px-2 py-1 text-center text-[13px] font-semibold text-ink">
                  {memberCount}인
                </span>
              </div>
              <div className="mt-1.5 flex justify-between">
                {Array.from(
                  { length: GROUP_RULES.maxMembers - GROUP_RULES.minMembers + 1 },
                  (_, i) => GROUP_RULES.minMembers + i,
                ).map((n) => (
                  <span
                    key={n}
                    className={`tabular text-[10px] ${n === memberCount ? 'text-neon' : 'text-ink/35'}`}
                  >
                    {n}
                  </span>
                ))}
              </div>
            </Field>
          </div>
        </Card>

        <Card variant="paper" kicker="Season objective" title="데뷔 목표">
          <div className="flex flex-col gap-2">
            {DEBUT_GOAL_ORDER.map((id) => {
              const g = DEBUT_GOALS[id];
              const active = goal === id;
              return (
                <button
                  key={id}
                  type="button"
                  aria-pressed={active}
                  onClick={() => onGoal(id)}
                  className={`rounded-chip border px-3 py-2.5 text-left transition-colors ${
                    active
                      ? 'border-neon bg-neon/8'
                      : 'border-paper-line hover:border-ink/25 hover:bg-paper-soft'
                  }`}
                >
                  <div className="flex items-baseline justify-between gap-2">
                    <span className="kicker">{g.kicker}</span>
                    {active && <span className="text-[11px] font-semibold text-neon">선택됨</span>}
                  </div>
                  <div
                    className={`mt-1 text-[14px] font-semibold ${active ? 'text-neon' : 'text-ink'}`}
                  >
                    {g.label}
                  </div>
                  <p className="m-0 mt-1 text-[12px] text-ink/60">{g.blurb}</p>
                </button>
              );
            })}
          </div>
        </Card>
      </div>

      <Card variant="paper" kicker="Concept" title="그룹 컨셉">
        <p className="m-0 mb-3 text-[12.5px] text-ink/60">
          컨셉은 어떤 스탯이 중요한지에 대한 선언입니다. 아래 막대가 길수록 그 스탯이 컨셉 적합도에
          크게 반영됩니다.
        </p>

        <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-4">
          {CONCEPT_ORDER.map((id) => {
            const c = GROUP_CONCEPTS[id];
            const active = concept === id;
            return (
              <button
                key={id}
                type="button"
                aria-pressed={active}
                onClick={() => onConcept(id)}
                className={`flex flex-col gap-2 rounded-chip border p-3 text-left transition-colors ${
                  active
                    ? 'border-neon bg-neon/8'
                    : 'border-paper-line hover:border-ink/25 hover:bg-paper-soft'
                }`}
              >
                <div>
                  <div className="kicker truncate">{c.kicker}</div>
                  <div
                    className={`mt-1 text-[13.5px] font-semibold leading-tight ${active ? 'text-neon' : 'text-ink'}`}
                  >
                    {c.label}
                  </div>
                </div>

                <div className="flex flex-col gap-1">
                  {STAT_KEYS.map((key) => {
                    const w = c.weights[key];
                    // 0.7-1.5 maps onto the full bar so differences read at a glance.
                    const pct = Math.max(0, Math.min(1, (w - 0.6) / 0.9)) * 100;
                    return (
                      <div key={key} className="flex items-center gap-1.5">
                        <span className="w-8 shrink-0 text-[10px] text-ink/60">
                          {STAT_LABELS[key]}
                        </span>
                        <span className="h-1 flex-1 rounded-chip bg-paper-soft">
                          <span
                            className={`block h-full rounded-chip ${w >= 1.2 ? 'bg-neon' : 'bg-ink/30'}`}
                            style={{ width: `${pct}%` }}
                          />
                        </span>
                        <span className="tabular w-6 shrink-0 text-right text-[10px] text-ink/60">
                          {w.toFixed(1)}
                        </span>
                      </div>
                    );
                  })}
                </div>

                <p className="m-0 text-[11.5px] leading-snug text-ink/60">{c.blurb}</p>
              </button>
            );
          })}
        </div>
      </Card>
    </div>
  );
}
