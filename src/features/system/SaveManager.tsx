import { useRef, useState } from 'react';

import { Modal, NeonButton, Tag } from '../../components/ui';
import { PHASE_LABELS } from '../../game/constants';
import type { GamePhase } from '../../game/types';
import { useGameStore } from '../../app/store';
import {
  IMPORT_ERRORS,
  clearSlot,
  downloadSave,
  getActiveSlot,
  parseSaveFile,
  readAllSlots,
  setActiveSlot,
  writeSlot,
  type SlotSummary,
} from '../../app/saves';

export interface SaveManagerProps {
  open: boolean;
  onClose: () => void;
  onNotify: (text: string, tone: 'good' | 'bad' | 'critical' | 'neutral') => void;
}

type Confirm =
  | { kind: 'switch'; slot: number }
  | { kind: 'delete'; slot: number }
  | { kind: 'import'; slot: number; text: string }
  | null;

/**
 * Three save slots plus JSON export/import.
 *
 * Switching slots rebinds the persist key, which only takes effect on a fresh
 * store — so the switch reloads the page rather than pretending the swap can
 * happen live. Every destructive path goes through a confirm.
 */
export function SaveManager({ open, onClose, onNotify }: SaveManagerProps) {
  const [slots, setSlots] = useState<SlotSummary[]>(() => readAllSlots());
  const [confirm, setConfirm] = useState<Confirm>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const [importTarget, setImportTarget] = useState(1);

  const active = getActiveSlot();
  const refresh = () => setSlots(readAllSlots());

  const doExport = () => {
    const state = useGameStore.getState();
    downloadSave(state, state.company?.name ?? 'idol-agency');
    onNotify('세이브 파일을 내보냈습니다.', 'good');
  };

  const onFile = async (file: File, slot: number) => {
    const text = await file.text();
    const result = parseSaveFile(text);
    if (!result.ok) {
      onNotify(IMPORT_ERRORS[result.reason], 'critical');
      return;
    }
    setConfirm({ kind: 'import', slot, text });
  };

  const applyConfirm = () => {
    if (!confirm) return;

    if (confirm.kind === 'switch') {
      setActiveSlot(confirm.slot);
      window.location.reload();
      return;
    }
    if (confirm.kind === 'delete') {
      clearSlot(confirm.slot);
      refresh();
      onNotify(`${confirm.slot}번 슬롯을 삭제했습니다.`, 'bad');
      setConfirm(null);
      return;
    }
    if (confirm.kind === 'import') {
      const result = parseSaveFile(confirm.text);
      if (result.ok) {
        writeSlot(confirm.slot, result.state);
        setActiveSlot(confirm.slot);
        window.location.reload();
      }
      return;
    }
  };

  const confirmCopy = (): { title: string; body: string; label: string } => {
    if (confirm?.kind === 'switch') {
      return {
        title: `${confirm.slot}번 슬롯으로 전환할까요?`,
        body: '현재 진행 중인 내용은 지금 슬롯에 그대로 저장되어 있습니다. 페이지가 새로고침됩니다.',
        label: '전환하기',
      };
    }
    if (confirm?.kind === 'delete') {
      return {
        title: `${confirm.slot}번 슬롯을 삭제할까요?`,
        body: '이 슬롯의 진행 상황이 완전히 사라집니다. 되돌릴 수 없습니다.',
        label: '삭제하기',
      };
    }
    return {
      title: `${confirm?.slot ?? 1}번 슬롯에 불러올까요?`,
      body: '해당 슬롯의 기존 진행 상황을 덮어씁니다. 되돌릴 수 없습니다.',
      label: '덮어쓰기',
    };
  };

  const copy = confirmCopy();

  return (
    <>
      <Modal
        open={open && confirm === null}
        variant="ink"
        kicker="Save slots"
        title="저장 슬롯"
        onClose={onClose}
        footer={
          <NeonButton variant="ghost" onClick={onClose}>
            닫기
          </NeonButton>
        }
      >
        <div className="flex flex-col gap-4">
          <div className="flex flex-col gap-2">
            {slots.map((s) => (
              <div
                key={s.slot}
                className={`flex flex-wrap items-center gap-3 rounded-chip border px-3 py-2.5 ${
                  s.slot === active ? 'border-neon/45 bg-neon/8' : 'border-ink-line'
                }`}
              >
                <span
                  className={`tabular flex size-7 shrink-0 items-center justify-center rounded-chip border text-[12px] font-semibold ${
                    s.slot === active ? 'border-neon text-neon' : 'border-ink-line text-muted'
                  }`}
                >
                  {s.slot}
                </span>

                <div className="min-w-0 flex-1">
                  {s.empty ? (
                    <span className="text-[13px] text-muted">비어 있음</span>
                  ) : (
                    <>
                      <div className="flex flex-wrap items-baseline gap-2">
                        <span className="text-[13px] font-medium text-paper">
                          {s.companyName ?? '이름 없음'}
                        </span>
                        {s.groupName && (
                          <span className="text-[11.5px] text-muted">{s.groupName}</span>
                        )}
                        {s.incompatible && <Tag tone="neon" surface="ink">버전 불일치</Tag>}
                      </div>
                      <div className="tabular text-[11px] text-muted">
                        {s.cycle}사이클 · {s.week}주차 ·{' '}
                        {PHASE_LABELS[(s.phase as GamePhase) ?? 'intro']?.label ?? ''}
                      </div>
                    </>
                  )}
                </div>

                <div className="flex shrink-0 gap-1.5">
                  {s.slot !== active && (
                    <NeonButton
                      size="sm"
                      variant="ghost"
                      onClick={() => setConfirm({ kind: 'switch', slot: s.slot })}
                    >
                      전환
                    </NeonButton>
                  )}
                  {s.slot === active && <Tag tone="neon" surface="ink">사용 중</Tag>}
                  {!s.empty && (
                    <NeonButton
                      size="sm"
                      variant="danger"
                      onClick={() => setConfirm({ kind: 'delete', slot: s.slot })}
                    >
                      삭제
                    </NeonButton>
                  )}
                </div>
              </div>
            ))}
          </div>

          <div className="flex flex-col gap-2 border-t border-ink-line pt-4">
            <div className="kicker">Export / import</div>
            <p className="m-0 text-[12px] text-muted">
              세이브를 JSON 파일로 내보내거나 불러옵니다. 버전이 다르면 불러오기가 거부됩니다.
            </p>
            <div className="mt-1 flex flex-wrap items-center gap-2">
              <NeonButton size="sm" variant="ghost" onClick={doExport}>
                세이브 내보내기
              </NeonButton>

              <label className="flex items-center gap-2 text-[12px] text-muted">
                불러올 슬롯
                <select
                  value={importTarget}
                  onChange={(e) => setImportTarget(Number(e.target.value))}
                  aria-label="불러올 슬롯 선택"
                  className="h-8 rounded-chip border border-ink-line bg-ink-soft px-2 text-[12px] text-paper"
                >
                  {slots.map((s) => (
                    <option key={s.slot} value={s.slot}>
                      {s.slot}번
                    </option>
                  ))}
                </select>
              </label>

              <NeonButton size="sm" variant="ghost" onClick={() => fileRef.current?.click()}>
                세이브 불러오기
              </NeonButton>
              <input
                ref={fileRef}
                type="file"
                accept="application/json,.json"
                className="sr-only"
                aria-label="세이브 파일 선택"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) void onFile(file, importTarget);
                  e.target.value = '';
                }}
              />
            </div>
          </div>
        </div>
      </Modal>

      <Modal
        open={confirm !== null}
        variant="ink"
        kicker="Confirm"
        title={copy.title}
        onClose={() => setConfirm(null)}
        footer={
          <>
            <NeonButton variant="ghost" onClick={() => setConfirm(null)}>
              취소
            </NeonButton>
            <NeonButton variant="danger" onClick={applyConfirm}>
              {copy.label}
            </NeonButton>
          </>
        }
      >
        <p className="m-0">{copy.body}</p>
      </Modal>
    </>
  );
}
