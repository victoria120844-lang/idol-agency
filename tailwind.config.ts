import type { Config } from 'tailwindcss';

/**
 * Design tokens for IDOL AGENCY SIMULATOR.
 *
 * Art direction: "K-pop label operations dashboard" — a dark ink shell carrying
 * white paper cards, one single neon accent, 1px hairlines instead of shadows.
 *
 * These hex values are mirrored as raw CSS variables in `src/styles/index.css`
 * (`--ink`, `--neon`, …) so non-Tailwind contexts — inline SVG, canvas — can
 * read the same palette. Change a value here and there, never in a component.
 */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        ink: {
          DEFAULT: '#0A0A0B', // primary dark background
          soft: '#141416', // elevated dark surface
          line: '#26262A', // dark mode hairline
        },
        paper: {
          DEFAULT: '#FFFFFF', // light background / card face
          soft: '#F4F4F5', // muted light surface
          line: '#E4E4E7', // light hairline
        },
        neon: {
          DEFAULT: '#FF1F3D', // the ONLY accent color
          dim: '#C4162E',
        },
        muted: '#8A8A93',
      },
      borderRadius: {
        /** Chips, inputs, tags. */
        chip: '4px',
        /** Cards and panels. Nothing is fully rounded except avatars. */
        card: '10px',
      },
      fontFamily: {
        sans: [
          'Pretendard Variable',
          'Pretendard',
          '-apple-system',
          'BlinkMacSystemFont',
          'Apple SD Gothic Neo',
          'system-ui',
          'sans-serif',
        ],
        mono: ['JetBrains Mono', 'SFMono-Regular', 'Menlo', 'Consolas', 'monospace'],
      },
      letterSpacing: {
        /** Section labels: UPPERCASE 11px / 0.12em. */
        label: '0.12em',
      },
      boxShadow: {
        /** The only glow in the product. Active and primary elements only. */
        neon: '0 0 0 1px var(--neon), 0 0 24px var(--neon-glow)',
      },
    },
  },
} satisfies Config;
