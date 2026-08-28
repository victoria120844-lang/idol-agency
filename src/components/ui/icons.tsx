import type { SVGProps } from 'react';

/**
 * Hand-drawn geometric icon set. No icon library — the product ships as a
 * static bundle and a dashboard only needs a dozen marks.
 *
 * All icons are 20x20, 1.5px stroke, and inherit `currentColor`.
 */
type IconProps = SVGProps<SVGSVGElement>;

function Svg({ children, ...rest }: IconProps) {
  return (
    <svg
      width="20"
      height="20"
      viewBox="0 0 20 20"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      {...rest}
    >
      {children}
    </svg>
  );
}

/** Agency mark: a bracketed slash, used as the product logo. */
export function LogoMark({ className = '' }: { className?: string }) {
  return (
    <svg width="22" height="22" viewBox="0 0 22 22" fill="none" aria-hidden="true" className={className}>
      <rect x="1.75" y="1.75" width="18.5" height="18.5" rx="4" stroke="currentColor" strokeWidth="1.5" />
      <path d="M8 15.5 14 6.5" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" />
      <circle cx="14.4" cy="14.6" r="1.6" fill="currentColor" />
    </svg>
  );
}

export function IconIntro(p: IconProps) {
  return (
    <Svg {...p}>
      <path d="M7.5 5.5 15 10l-7.5 4.5V5.5Z" />
    </Svg>
  );
}

export function IconCompany(p: IconProps) {
  return (
    <Svg {...p}>
      <path d="M3 17h14M4.5 17V4.5h7V17M11.5 8.5H16V17" />
      <path d="M7 7.5h1.5M7 10.5h1.5M7 13.5h1.5" />
    </Svg>
  );
}

export function IconTrainee(p: IconProps) {
  return (
    <Svg {...p}>
      <circle cx="8" cy="7" r="2.75" />
      <path d="M2.75 16.5c0-2.6 2.35-4.25 5.25-4.25s5.25 1.65 5.25 4.25" />
      <path d="M14 6.5a2.5 2.5 0 0 1 0 5M15.5 12.75c1.2.6 1.9 1.9 1.9 3.75" />
    </Svg>
  );
}

export function IconDebut(p: IconProps) {
  return (
    <Svg {...p}>
      <path d="m10 2.75 2.2 4.65 5 .72-3.6 3.6.85 5.05L10 14.4l-4.45 2.37.85-5.05-3.6-3.6 5-.72L10 2.75Z" />
    </Svg>
  );
}

export function IconFandom(p: IconProps) {
  return (
    <Svg {...p}>
      <path d="M10 16.5S3.25 12.6 3.25 7.9A3.65 3.65 0 0 1 10 5.9a3.65 3.65 0 0 1 6.75 2c0 4.7-6.75 8.6-6.75 8.6Z" />
    </Svg>
  );
}

export function IconAlbum(p: IconProps) {
  return (
    <Svg {...p}>
      <circle cx="10" cy="10" r="7.25" />
      <circle cx="10" cy="10" r="2" />
      <path d="M10 2.75a7.25 7.25 0 0 1 6.5 4" />
    </Svg>
  );
}

export function IconComeback(p: IconProps) {
  return (
    <Svg {...p}>
      <circle cx="10" cy="12.5" r="3" />
      <path d="M10 9.5v-7M6.5 4.5 10 2.5l3.5 2" />
      <path d="M4.75 15.5a6.5 6.5 0 0 1 0-6M15.25 15.5a6.5 6.5 0 0 0 0-6" />
    </Svg>
  );
}

export function IconResults(p: IconProps) {
  return (
    <Svg {...p}>
      <path d="M3 16.5h14" />
      <path d="M5.75 16.5v-4.75M9.5 16.5V6.5M13.25 16.5v-7.5M17 16.5V3.5" />
    </Svg>
  );
}

export function IconHub(p: IconProps) {
  return (
    <Svg {...p}>
      <rect x="3" y="3" width="6" height="6" rx="1" />
      <rect x="11" y="3" width="6" height="6" rx="1" />
      <rect x="3" y="11" width="6" height="6" rx="1" />
      <rect x="11" y="11" width="6" height="6" rx="1" />
    </Svg>
  );
}

export function IconArrowUp(p: IconProps) {
  return (
    <Svg {...p} width="12" height="12" viewBox="0 0 12 12">
      <path d="M6 9.5v-7M3 5.5 6 2.5l3 3" />
    </Svg>
  );
}

export function IconArrowDown(p: IconProps) {
  return (
    <Svg {...p} width="12" height="12" viewBox="0 0 12 12">
      <path d="M6 2.5v7M3 6.5l3 3 3-3" />
    </Svg>
  );
}

export function IconClose(p: IconProps) {
  return (
    <Svg {...p}>
      <path d="m5.5 5.5 9 9M14.5 5.5l-9 9" />
    </Svg>
  );
}

export function IconHelp(p: IconProps) {
  return (
    <Svg {...p}>
      <circle cx="10" cy="10" r="7.25" />
      <path d="M7.9 7.9a2.15 2.15 0 1 1 2.85 2.03c-.5.18-.75.6-.75 1.12v.45" />
      <circle cx="10" cy="14.2" r=".85" fill="currentColor" stroke="none" />
    </Svg>
  );
}

export function IconSave(p: IconProps) {
  return (
    <Svg {...p}>
      <path d="M4 4.75h9.5L16 7.25v8a.75.75 0 0 1-.75.75H4.75A.75.75 0 0 1 4 15.25V5.5a.75.75 0 0 1 .75-.75Z" />
      <path d="M7 4.75v3.5h5v-3.5M7 16V12h6v4" />
    </Svg>
  );
}

export function IconCheck(p: IconProps) {
  return (
    <Svg {...p} width="12" height="12" viewBox="0 0 12 12">
      <path d="m2.5 6.5 2.5 2.5 4.5-6" />
    </Svg>
  );
}
