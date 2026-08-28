import { Suspense, lazy, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';

import { AppShell, Toast, type ToastItem } from '../components/ui';
import { HowToPlay } from '../features/system/HowToPlay';
import { OnboardingTour } from '../features/system/OnboardingTour';
import { SaveManager } from '../features/system/SaveManager';
import { COMEBACK, PHASE_LABELS } from '../game/constants';
import type { GamePhase } from '../game/types';
import { useGameStore } from './store';

/**
 * Phase screens are code-split.
 *
 * Each one pulls in framer-motion and its own feature tree, and a player only
 * ever looks at one at a time — splitting keeps the initial download to the
 * shell plus whichever screen the save resumes into.
 */
const CompanyCreate = lazy(() =>
  import('../features/company/CompanyCreate').then((m) => ({ default: m.CompanyCreate })),
);
const TraineeRecruit = lazy(() =>
  import('../features/trainees/TraineeRecruit').then((m) => ({ default: m.TraineeRecruit })),
);
const DebutGroup = lazy(() =>
  import('../features/debut/DebutGroup').then((m) => ({ default: m.DebutGroup })),
);
const FandomSetup = lazy(() =>
  import('../features/fandom/FandomSetup').then((m) => ({ default: m.FandomSetup })),
);
const AlbumProduce = lazy(() =>
  import('../features/album/AlbumProduce').then((m) => ({ default: m.AlbumProduce })),
);
const ComebackWeek = lazy(() =>
  import('../features/comeback/ComebackWeek').then((m) => ({ default: m.ComebackWeek })),
);
const ComebackResults = lazy(() =>
  import('../features/results/ComebackResults').then((m) => ({ default: m.ComebackResults })),
);
const AgencyHub = lazy(() =>
  import('../features/hub/AgencyHub').then((m) => ({ default: m.AgencyHub })),
);

/**
 * The whole game is one page driven by `phase` — no router library. Every phase
 * runs inside the dashboard shell; `intro` is handled before this component.
 */
export function PhaseRouter({ phase }: { phase: GamePhase }) {
  const company = useGameStore((s) => s.company);
  const week = useGameStore((s) => s.week);
  const promoWeek = useGameStore((s) => s.promoWeek);
  const buzz = useGameStore((s) => s.buzz);
  const fandom = useGameStore((s) => s.fandom);
  const inComeback = phase === 'comeback_week';

  const [helpOpen, setHelpOpen] = useState(false);
  const [savesOpen, setSavesOpen] = useState(false);
  const [toasts, setToasts] = useState<ToastItem[]>([]);

  const notify = (text: string, tone: ToastItem['tone']) => {
    const item: ToastItem = { id: `${Date.now()}-${Math.random()}`, text, tone };
    setToasts((t) => [...t, item].slice(-3));
    window.setTimeout(() => setToasts((t) => t.filter((x) => x.id !== item.id)), 3600);
  };

  return (
    <AppShell
      phase={phase}
      companyName={company?.name}
      ciColor={company?.ciColor}
      tier={company?.tier}
      won={company?.won}
      week={week}
      promoWeek={inComeback ? promoWeek : undefined}
      promoTotal={inComeback ? COMEBACK.weeks : undefined}
      buzz={inComeback ? buzz : undefined}
      fandomSize={inComeback ? fandom?.size : undefined}
      onHelp={() => setHelpOpen(true)}
      onSaves={() => setSavesOpen(true)}
    >
      {/* Keyed on phase so each screen slides in as the previous slides out. */}
      <AnimatePresence mode="wait">
        <motion.div
          key={phase}
          initial={{ opacity: 0, x: 24 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -24 }}
          transition={{ duration: 0.32, ease: [0.22, 1, 0.36, 1] }}
        >
          <Suspense fallback={<PhaseFallback phase={phase} />}>
            <PhaseScreen phase={phase} />
          </Suspense>
        </motion.div>
      </AnimatePresence>

      <HowToPlay open={helpOpen} onClose={() => setHelpOpen(false)} />
      <SaveManager open={savesOpen} onClose={() => setSavesOpen(false)} onNotify={notify} />
      <OnboardingTour />
      <Toast items={toasts} />
    </AppShell>
  );
}

/** Shown while a phase chunk loads. Matches the header the screen will render. */
function PhaseFallback({ phase }: { phase: GamePhase }) {
  const { kicker, label } = PHASE_LABELS[phase];
  return (
    <div className="flex min-h-[40vh] flex-col" aria-busy="true" aria-live="polite">
      <div className="kicker">{kicker}</div>
      <h1 className="mt-2 text-[26px] font-semibold tracking-tight text-paper sm:text-[32px]">
        {label}
      </h1>
      <div className="mt-6 flex items-center gap-2 text-[13px] text-muted">
        <span
          className="size-3.5 animate-spin rounded-full border-[1.5px] border-muted border-t-transparent"
          aria-hidden
        />
        불러오는 중…
      </div>
    </div>
  );
}

function PhaseScreen({ phase }: { phase: GamePhase }) {
  if (phase === 'company_create') return <CompanyCreate />;
  if (phase === 'trainee_recruit') return <TraineeRecruit />;
  if (phase === 'debut_group') return <DebutGroup />;
  if (phase === 'fandom_setup') return <FandomSetup />;
  if (phase === 'album_produce') return <AlbumProduce />;
  if (phase === 'comeback_week') return <ComebackWeek />;
  if (phase === 'results') return <ComebackResults />;
  if (phase === 'agency_hub') return <AgencyHub />;

  const { kicker, label } = PHASE_LABELS[phase];
  return (
    <div className="flex min-h-[50vh] flex-col items-start justify-center">
      <div className="kicker">{kicker}</div>
      <h1 className="mt-2 text-[26px] font-semibold tracking-tight text-paper">{label}</h1>
      <p className="mt-2 text-[13px] text-muted">이 화면은 아직 구현되지 않았습니다.</p>
    </div>
  );
}
