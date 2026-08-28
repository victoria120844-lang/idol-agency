/**
 * Save slot management.
 *
 * Three independent slots, each a full `GameState` under its own localStorage
 * key. The store always reads and writes the *active* slot; switching slots
 * rewrites the key the persist middleware uses and reloads.
 */

import { SAVE_KEY, SAVE_VERSION } from '../game/constants';
import type { GameState } from '../game/types';

export const SLOT_COUNT = 3;
/** Which slot the store is currently bound to. */
const ACTIVE_SLOT_KEY = 'idol-sim-active-slot';

/** localStorage key for a slot. Slot 1 keeps the original key for continuity. */
export function slotKey(slot: number): string {
  return slot === 1 ? SAVE_KEY : `${SAVE_KEY}-slot${slot}`;
}

export function getActiveSlot(): number {
  const raw = Number(localStorage.getItem(ACTIVE_SLOT_KEY));
  return Number.isInteger(raw) && raw >= 1 && raw <= SLOT_COUNT ? raw : 1;
}

export function setActiveSlot(slot: number): void {
  localStorage.setItem(ACTIVE_SLOT_KEY, String(slot));
}

export interface SlotSummary {
  slot: number;
  empty: boolean;
  companyName?: string;
  groupName?: string;
  week?: number;
  cycle?: number;
  phase?: string;
  savedAt?: number;
  /** Set when the stored save is from a version this build cannot read. */
  incompatible?: boolean;
}

/** Read a slot without loading it, for the slot picker. */
export function readSlot(slot: number): SlotSummary {
  try {
    const raw = localStorage.getItem(slotKey(slot));
    if (!raw) return { slot, empty: true };

    const parsed = JSON.parse(raw) as { state?: GameState; version?: number };
    const state = parsed.state;
    if (!state) return { slot, empty: true };

    return {
      slot,
      empty: false,
      companyName: state.company?.name,
      groupName: state.group?.name,
      week: state.week,
      cycle: state.cycle,
      phase: state.phase,
      savedAt: state.savedAt,
      incompatible: (parsed.version ?? 0) > SAVE_VERSION,
    };
  } catch {
    return { slot, empty: true };
  }
}

export function readAllSlots(): SlotSummary[] {
  return Array.from({ length: SLOT_COUNT }, (_, i) => readSlot(i + 1));
}

export function clearSlot(slot: number): void {
  localStorage.removeItem(slotKey(slot));
}

// ---------------------------------------------------------------------------
// Export / import
// ---------------------------------------------------------------------------

/** Wrapper written to the downloaded file, so an import can be validated. */
export interface SaveFile {
  format: 'idol-agency-simulator';
  saveVersion: number;
  exportedAt: string;
  state: GameState;
}

export function buildSaveFile(state: GameState): SaveFile {
  return {
    format: 'idol-agency-simulator',
    saveVersion: SAVE_VERSION,
    exportedAt: new Date().toISOString(),
    state,
  };
}

/** Trigger a download of the current slot as JSON. */
export function downloadSave(state: GameState, companyName: string): void {
  const file = buildSaveFile(state);
  const blob = new Blob([JSON.stringify(file, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `${companyName || 'idol-agency'}_세이브.json`;
  link.click();
  URL.revokeObjectURL(url);
}

export type ImportResult =
  | { ok: true; state: GameState }
  | { ok: false; reason: 'not_json' | 'wrong_format' | 'too_new' | 'too_old' };

/**
 * Validate an uploaded save.
 *
 * The version guard runs in both directions: a file from a newer build cannot
 * be read, and a file older than the current `SAVE_VERSION` is refused rather
 * than loaded into a shape it does not match.
 */
export function parseSaveFile(text: string): ImportResult {
  let parsed: unknown;
  try {
    parsed = JSON.parse(text);
  } catch {
    return { ok: false, reason: 'not_json' };
  }

  const file = parsed as Partial<SaveFile>;
  if (file?.format !== 'idol-agency-simulator' || !file.state) {
    return { ok: false, reason: 'wrong_format' };
  }
  if ((file.saveVersion ?? 0) > SAVE_VERSION) return { ok: false, reason: 'too_new' };
  if ((file.saveVersion ?? 0) < SAVE_VERSION) return { ok: false, reason: 'too_old' };

  return { ok: true, state: file.state };
}

/** Korean message for a failed import. */
export const IMPORT_ERRORS: Record<Exclude<ImportResult, { ok: true }>['reason'], string> = {
  not_json: 'JSON 파일이 아닙니다.',
  wrong_format: '이 게임의 세이브 파일이 아닙니다.',
  too_new: '더 최신 버전에서 만든 세이브라 불러올 수 없습니다.',
  too_old: '이전 버전 세이브라 현재 버전과 호환되지 않습니다.',
};

/** Write a state straight into a slot, bypassing the store. */
export function writeSlot(slot: number, state: GameState): void {
  localStorage.setItem(
    slotKey(slot),
    JSON.stringify({ state, version: SAVE_VERSION }),
  );
}
