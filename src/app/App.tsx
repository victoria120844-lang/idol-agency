import { useEffect, useState } from 'react';

import { StyleGuide } from '../dev/StyleGuide';
import { useGameStore } from './store';
import { GameOverScreen } from '../features/hub/GameOverScreen';
import { IntroScreen } from './IntroScreen';
import { PhaseRouter } from './PhaseRouter';

/** Dev-only escape hatch to the component gallery: open `#/styleguide`. */
function useStyleGuideRoute(): boolean {
  const [active, setActive] = useState(
    () => import.meta.env.DEV && window.location.hash.startsWith('#/styleguide'),
  );

  useEffect(() => {
    if (!import.meta.env.DEV) return;
    const onHash = () => setActive(window.location.hash.startsWith('#/styleguide'));
    window.addEventListener('hashchange', onHash);
    return () => window.removeEventListener('hashchange', onHash);
  }, []);

  return active;
}

export function App() {
  const phase = useGameStore((s) => s.phase);
  const booted = useGameStore((s) => s.booted);
  const gameOver = useGameStore((s) => s.gameOver);
  const companyName = useGameStore((s) => s.company?.name);
  const showStyleGuide = useStyleGuideRoute();

  if (showStyleGuide) return <StyleGuide />;

  // `booted` is session-only, so a reload always opens on the intro — the save
  // itself is untouched and 이어하기 drops back into the persisted phase.
  if (!booted) return <IntroScreen />;

  // The closure ending replaces every phase screen rather than being a phase
  // of its own; the state machine in CLAUDE.md stays exactly as documented.
  if (gameOver) {
    return <GameOverScreen gameOver={gameOver} companyName={companyName ?? '기획사'} />;
  }

  return <PhaseRouter phase={phase} />;
}
