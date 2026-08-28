export interface StepperStep {
  id: string;
  /** English kicker for the rail — e.g. "RECRUIT". */
  kicker: string;
  /** Korean label — e.g. "연습생 모집". */
  label: string;
}

export interface StepperProps {
  steps: StepperStep[];
  /** Zero-based index of the active step. */
  current: number;
  /** Repeat counter for steps that run several times, e.g. "2/4주차". */
  repeatLabel?: string;
}

/**
 * Top progress rail. Completed segments are solid, the current one is neon,
 * upcoming ones are hairline. Below 640px only the active step keeps its
 * label so nine phases still fit at 390px.
 */
export function Stepper({ steps, current, repeatLabel }: StepperProps) {
  const active = steps[current];

  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center gap-1" role="list" aria-label="게임 진행 단계">
        {steps.map((step, i) => {
          const done = i < current;
          const isCurrent = i === current;
          return (
            <div
              key={step.id}
              role="listitem"
              aria-current={isCurrent ? 'step' : undefined}
              className="flex flex-1 flex-col gap-1.5"
              title={step.label}
            >
              <span
                className={`h-[3px] rounded-chip transition-colors duration-300 ${
                  isCurrent ? 'bg-neon' : done ? 'bg-muted' : 'bg-ink-line'
                }`}
              />
              <span
                className={`hidden truncate text-[10px] leading-none tracking-label uppercase sm:block ${
                  isCurrent ? 'text-neon' : done ? 'text-muted' : 'text-muted/45'
                }`}
              >
                {step.kicker}
              </span>
            </div>
          );
        })}
      </div>

      {/* The rail shows English kickers, so the Korean name of the current step
          lives here at every width — the kicker/label pairing the design system
          asks for. */}
      <div className="flex items-baseline justify-between gap-3">
        <span className="text-[12px] font-medium text-paper">
          <span className="tabular text-muted">
            {String(current + 1).padStart(2, '0')}/{String(steps.length).padStart(2, '0')}
          </span>{' '}
          {active?.label}
        </span>
        {repeatLabel && <span className="tabular text-[12px] text-neon">{repeatLabel}</span>}
      </div>
    </div>
  );
}
