import type { InputHTMLAttributes, ReactNode, SelectHTMLAttributes } from 'react';

/**
 * Form primitives for paper cards. Inputs are hairline boxes at the chip
 * radius, matching the dashboard rather than a rounded mobile form.
 */

export interface FieldProps {
  /** English kicker — e.g. "COMPANY NAME". */
  kicker: string;
  /** Korean label shown next to the kicker. */
  label: string;
  /** Korean validation message; renders the field in the error state. */
  error?: string;
  /** Korean helper text, hidden while an error is showing. */
  hint?: string;
  /** Live counter such as "8/12". */
  counter?: string;
  optional?: boolean;
  htmlFor?: string;
  children: ReactNode;
}

export function Field({
  kicker,
  label,
  error,
  hint,
  counter,
  optional = false,
  htmlFor,
  children,
}: FieldProps) {
  return (
    <div className="flex flex-col gap-1.5">
      <div className="flex items-baseline justify-between gap-3">
        <label htmlFor={htmlFor} className="flex items-baseline gap-2">
          <span className="kicker">{kicker}</span>
          <span className="text-[13px] font-medium text-ink">{label}</span>
          {optional && <span className="text-[11px] text-ink/60">선택</span>}
        </label>
        {counter && <span className="tabular text-[11px] text-ink/60">{counter}</span>}
      </div>

      {children}

      {error ? (
        <p className="m-0 text-[11.5px] text-neon">{error}</p>
      ) : hint ? (
        <p className="m-0 text-[11.5px] text-ink/60">{hint}</p>
      ) : null}
    </div>
  );
}

export type ControlSurface = 'paper' | 'ink';

const CONTROL_BASE =
  'h-10 w-full rounded-chip border px-3 text-[13.5px] outline-none transition-colors';

/**
 * Surface is a prop rather than a class override: two competing Tailwind
 * background utilities in one class string resolve by stylesheet order, not by
 * the order they were written, which silently produced white-on-white inputs.
 */
const SURFACES: Record<ControlSurface, { base: string; idle: string }> = {
  paper: {
    base: 'bg-paper text-ink placeholder:text-ink/35',
    idle: 'border-paper-line focus:border-ink/40',
  },
  ink: {
    base: 'bg-ink-soft text-paper placeholder:text-muted',
    idle: 'border-ink-line focus:border-muted',
  },
};

/** Chevron colour has to follow the surface too. */
function chevron(surface: ControlSurface): string {
  const stroke = surface === 'paper' ? '%236b6b6c' : '%238a8a93';
  return `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' fill='none' stroke='${stroke}' stroke-width='1.5'%3E%3Cpath d='M2.5 4.5 6 8l3.5-3.5'/%3E%3C/svg%3E")`;
}

export interface TextInputProps extends InputHTMLAttributes<HTMLInputElement> {
  invalid?: boolean;
  surface?: ControlSurface;
}

export function TextInput({
  invalid = false,
  surface = 'paper',
  className = '',
  ...rest
}: TextInputProps) {
  const s = SURFACES[surface];
  return (
    <input
      type="text"
      aria-invalid={invalid || undefined}
      className={`${CONTROL_BASE} ${s.base} ${invalid ? 'border-neon' : s.idle} ${className}`}
      {...rest}
    />
  );
}

export interface SelectInputProps extends SelectHTMLAttributes<HTMLSelectElement> {
  invalid?: boolean;
  surface?: ControlSurface;
}

export function SelectInput({
  invalid = false,
  surface = 'paper',
  className = '',
  ...rest
}: SelectInputProps) {
  const s = SURFACES[surface];
  return (
    <select
      aria-invalid={invalid || undefined}
      className={`${CONTROL_BASE} ${s.base} appearance-none pr-9 ${invalid ? 'border-neon' : s.idle} ${className}`}
      style={{
        backgroundImage: chevron(surface),
        backgroundRepeat: 'no-repeat',
        backgroundPosition: 'right 12px center',
      }}
      {...rest}
    />
  );
}

export interface ColorInputProps {
  id?: string;
  value: string;
  onChange: (hex: string) => void;
  /** Quick-pick swatches offered next to the picker. */
  presets?: readonly string[];
}

/** Colour picker plus preset swatches and a readable hex readout. */
export function ColorInput({ id, value, onChange, presets = [] }: ColorInputProps) {
  return (
    <div className="flex flex-wrap items-center gap-2">
      <div className="relative size-10 shrink-0 overflow-hidden rounded-chip border border-paper-line">
        <span className="absolute inset-0" style={{ backgroundColor: value }} />
        <input
          id={id}
          type="color"
          value={value}
          onChange={(e) => onChange(e.target.value.toUpperCase())}
          aria-label="CI 컬러 선택"
          className="absolute inset-0 size-full cursor-pointer opacity-0"
        />
      </div>

      <span className="tabular rounded-chip border border-paper-line px-2.5 py-1.5 text-[12px] text-ink">
        {value.toUpperCase()}
      </span>

      {presets.length > 0 && (
        <div className="flex flex-wrap items-center gap-1.5">
          {presets.map((hex) => (
            <button
              key={hex}
              type="button"
              onClick={() => onChange(hex)}
              aria-label={`CI 컬러 ${hex}`}
              aria-pressed={value.toUpperCase() === hex.toUpperCase()}
              className={`size-6 rounded-chip border transition-transform hover:scale-110 ${
                value.toUpperCase() === hex.toUpperCase() ? 'border-ink' : 'border-paper-line'
              }`}
              style={{ backgroundColor: hex }}
            />
          ))}
        </div>
      )}
    </div>
  );
}
