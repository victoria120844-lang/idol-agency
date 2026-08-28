import { useEffect, useState } from 'react';

import { Card, NeonButton, Tag, Toast, type ToastItem } from '../../components/ui';
import { HUB, TRAINING } from '../../game/constants';
import { formatWon } from '../../game/formulas';
import { operatingCosts } from '../../game/hub';
import type { Id, StatKey } from '../../game/types';
import { useGameStore } from '../../app/store';
import { TraineeRecruit } from '../trainees/TraineeRecruit';
import {
  ArtistPanel,
  DashboardPanel,
  RecordsPanel,
  TrainingPanel,
} from './HubPanels';

type PanelId = 'dashboard' | 'artists' | 'trainees' | 'activity' | 'records';

const PANELS: { id: PanelId; kicker: string; label: string }[] = [
  { id: 'dashboard', kicker: 'DASHBOARD', label: '대시보드' },
  { id: 'artists', kicker: 'ARTISTS', label: '아티스트' },
  { id: 'trainees', kicker: 'TRAINEES', label: '연습생' },
  { id: 'activity', kicker: 'ACTIVITY', label: '활동' },
  { id: 'records', kicker: 'RECORDS', label: '기록' },
];

export function AgencyHub() {
  const company = useGameStore((s) => s.company);
  const group = useGameStore((s) => s.group);
  const fandom = useGameStore((s) => s.fandom);
  const trainees = useGameStore((s) => s.trainees);
  const albums = useGameStore((s) => s.albums);
  const cycle = useGameStore((s) => s.cycle);
  const pendingDepartures = useGameStore((s) => s.pendingDepartures);

  const settle = useGameStore((s) => s.settleCycle);
  const resolveDeparture = useGameStore((s) => s.resolveDeparture);
  const train = useGameStore((s) => s.trainTrainee);
  const startNextAlbum = useGameStore((s) => s.startNextAlbum);
  const setPhase = useGameStore((s) => s.setPhase);

  const [panel, setPanel] = useState<PanelId>('dashboard');
  const [toasts, setToasts] = useState<ToastItem[]>([]);

  /**
   * Settling is idempotent in the store, so running it on mount is safe — and
   * it is the only moment the player is guaranteed to be looking at the hub.
   */
  useEffect(() => {
    settle();
  }, [settle]);

  if (!company) return null;

  const pushToast = (text: string, tone: ToastItem['tone'], kicker?: string) => {
    const item: ToastItem = { id: `${Date.now()}-${Math.random()}`, text, tone, kicker };
    setToasts((t) => [...t, item].slice(-3));
    window.setTimeout(() => setToasts((t) => t.filter((x) => x.id !== item.id)), 3600);
  };

  const undebuted = trainees.filter((t) => !t.debuted);
  const operating = operatingCosts(company, undebuted.length, group?.members.length ?? 0);
  const canDebutNew = undebuted.length >= HUB.minTraineesForNewGroup;
  const inCrisis = company.won < 0;
  const blocked = pendingDepartures.length > 0;

  const onTrain = (id: Id, stat: StatKey) => {
    const failure = train(id, stat);
    if (failure === 'insufficient_funds') {
      pushToast(`자금이 부족합니다. 강습에는 ${formatWon(TRAINING.cost)}이 필요합니다.`, 'critical', 'TRAINING');
      return;
    }
    if (failure === 'already_trained') {
      pushToast('이번 사이클에는 이미 강습을 받았습니다.', 'neutral', 'TRAINING');
      return;
    }
    if (failure === 'at_ceiling') {
      pushToast('잠재력 상한에 도달해 더 오르지 않습니다.', 'neutral', 'TRAINING');
      return;
    }
    pushToast('강습을 마쳤습니다.', 'good', 'TRAINING');
  };

  const onDeparture = (id: Id, persuade: boolean) => {
    const failure = resolveDeparture(id, persuade);
    if (failure === 'insufficient_funds') {
      pushToast('설득 비용을 감당할 자금이 없습니다.', 'critical', 'CONTRACT');
      return;
    }
    pushToast(
      persuade ? '재계약을 설득했습니다.' : '멤버가 팀을 떠났습니다.',
      persuade ? 'good' : 'bad',
      'CONTRACT',
    );
  };

  return (
    <div className="flex flex-col gap-5">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <div className="kicker">Agency · Cycle {cycle}</div>
          <h1 className="mt-2 text-[26px] font-semibold tracking-tight text-paper sm:text-[32px]">
            기획사 사무실
          </h1>
          <p className="mt-2 max-w-[52ch] text-[13px] text-muted">
            {company.name}의 다음 사이클을 준비합니다.
          </p>
        </div>
      </header>

      {inCrisis && (
        <Card variant="ink" className="border-neon">
          <div className="flex flex-wrap items-center gap-3">
            <Tag tone="neon" surface="ink">경영 위기</Tag>
            <p className="m-0 flex-1 text-[13px] text-neon">
              자금이 {formatWon(company.won)}입니다. 다음 사이클도 적자로 끝나면 폐업합니다.
            </p>
          </div>
        </Card>
      )}

      {pendingDepartures.length > 0 && (
        <Card variant="ink" kicker="Contract" title="재계약 협상">
          <div className="flex flex-col gap-2.5">
            {pendingDepartures.map((d) => (
              <div
                key={d.id}
                className="flex flex-col gap-3 rounded-chip border border-neon/40 bg-neon/8 p-3 sm:flex-row sm:items-center"
              >
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-baseline gap-2">
                    <span className="text-[13.5px] font-semibold text-paper">{d.memberName}</span>
                    <span className="tabular text-[11.5px] text-muted">
                      팀 호감도 {d.averageAffinity}
                    </span>
                  </div>
                  <p className="m-0 mt-1 text-[12.5px] text-muted">{d.reason}</p>
                </div>
                <div className="flex shrink-0 gap-2">
                  <NeonButton size="sm" onClick={() => onDeparture(d.id, true)}>
                    설득 {formatWon(d.persuadeCost)}
                  </NeonButton>
                  <NeonButton size="sm" variant="danger" onClick={() => onDeparture(d.id, false)}>
                    보내준다
                  </NeonButton>
                </div>
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* ---- panel rail ---- */}
      <div className="flex gap-1 overflow-x-auto rounded-card border border-ink-line bg-ink-soft p-1">
        {PANELS.map((p) => (
          <button
            key={p.id}
            type="button"
            aria-pressed={panel === p.id}
            onClick={() => setPanel(p.id)}
            className={`flex min-w-[84px] flex-1 flex-col items-center gap-0.5 rounded-chip border px-3 py-2 transition-colors ${
              panel === p.id
                ? 'border-neon/45 bg-neon/8 text-neon'
                : 'border-transparent text-muted hover:bg-ink-line/40 hover:text-paper'
            }`}
          >
            <span className="text-[9px] tracking-label">{p.kicker}</span>
            <span className="text-[13px] font-medium">{p.label}</span>
          </button>
        ))}
      </div>

      {panel === 'dashboard' && (
        <DashboardPanel
          company={company}
          group={group}
          fandom={fandom}
          albums={albums}
          cycle={cycle}
          operating={operating}
        />
      )}

      {panel === 'artists' && (
        <ArtistPanel group={group} fandom={fandom} ciColor={company.ciColor} />
      )}

      {panel === 'trainees' && (
        <div className="flex flex-col gap-5">
          <TrainingPanel
            trainees={trainees}
            won={company.won}
            cycle={cycle}
            onTrain={onTrain}
          />
          <div className="border-t border-ink-line pt-5">
            <TraineeRecruit />
          </div>
        </div>
      )}

      {panel === 'activity' && (
        <div className="grid gap-3 lg:grid-cols-2">
          <Card variant="paper" kicker="Next comeback" title="새 앨범 제작">
            <p className="m-0 text-[13px] text-ink/60">
              {group
                ? `${group.name}로 다음 앨범을 냅니다. 멤버 스탯과 관계는 그대로 이어집니다.`
                : '데뷔한 그룹이 없어 앨범을 낼 수 없습니다.'}
            </p>
            <div className="mt-4">
              <NeonButton
                block
                surface="paper"
                disabled={!group || blocked}
                onClick={startNextAlbum}
              >
                새 앨범 제작
              </NeonButton>
              {blocked && (
                <p className="m-0 mt-2 text-[11.5px] text-neon">
                  재계약 협상을 먼저 마쳐야 합니다.
                </p>
              )}
            </div>
          </Card>

          <Card variant="paper" kicker="New group" title="신규 그룹 데뷔">
            <p className="m-0 text-[13px] text-ink/60">
              데뷔하지 않은 연습생이 {HUB.minTraineesForNewGroup}명 이상이면 두 번째 그룹을 낼 수
              있습니다. 현재 {undebuted.length}명.
            </p>
            <div className="mt-4">
              <NeonButton
                block
                surface="paper"
                variant={canDebutNew ? 'primary' : 'ghost'}
                disabled={!canDebutNew || blocked}
                onClick={() => setPhase('debut_group')}
              >
                신규 그룹 데뷔
              </NeonButton>
            </div>
          </Card>
        </div>
      )}

      {panel === 'records' && <RecordsPanel albums={albums} group={group} />}

      <Toast items={toasts} />
    </div>
  );
}
