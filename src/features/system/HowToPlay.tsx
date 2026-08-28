import { Modal, NeonButton } from '../../components/ui';
import { COMEBACK, ECONOMY, RECRUIT } from '../../game/constants';
import { formatWon } from '../../game/formulas';

export interface HowToPlayProps {
  open: boolean;
  onClose: () => void;
}

const SECTIONS: { kicker: string; title: string; lines: string[] }[] = [
  {
    kicker: 'THE LOOP',
    title: '한 사이클의 흐름',
    lines: [
      '연습생을 뽑고 → 데뷔조를 짜고 → 팬덤 이름을 정하고 → 앨범을 만들고 → 4주간 활동하고 → 결산합니다.',
      '결산이 끝나면 기획사 사무실로 돌아가 다음 앨범을 준비합니다. 멤버 스탯과 팬덤, 관계는 그대로 이어집니다.',
    ],
  },
  {
    kicker: 'MONEY',
    title: '돈이 제일 먼저 마릅니다',
    lines: [
      `시작 자금은 ${formatWon(ECONOMY.startingWon)}입니다. 앨범 제작비와 활동비가 여기서 나갑니다.`,
      '사이클이 끝날 때마다 연습실 임대료와 연습생 유지비, 멤버 정산이 한 번에 빠져나갑니다.',
      '두 사이클 연속 적자면 폐업합니다. 한 번은 만회할 수 있습니다.',
    ],
  },
  {
    kicker: 'TRAINEES',
    title: '연습생과 잠재력',
    lines: [
      `오디션은 ${RECRUIT.freeSlots}명까지 무료이고, 그 뒤로는 1명당 ${formatWon(RECRUIT.costAfterFree)}입니다.`,
      '잠재력 등급은 처음엔 ???로 가려져 있습니다. 4주 훈련하거나 평가 세션 비용을 내면 공개됩니다.',
      '강습으로 스탯을 올릴 수 있지만, 잠재력 등급이 정한 상한을 넘지는 못합니다.',
    ],
  },
  {
    kicker: 'SCHEDULE',
    title: '4주 컴백',
    lines: [
      `한 주에 슬롯 ${COMEBACK.slotsPerWeek}개를 모두 채워야 주차를 넘길 수 있습니다.`,
      '보드를 채우면 그 주의 이벤트가 열리고, 대응을 마쳐야 주차가 종료됩니다.',
      `피로도가 ${COMEBACK.fatigueStrainThreshold}을 넘으면 활동 효과가 줄고, ${COMEBACK.fatigueInjuryThreshold}을 넘으면 다음 주 활동에서 빠집니다.`,
      '휴식은 지표가 정체되는 대신 피로도를 크게 줄이고 팀 분위기를 올립니다.',
    ],
  },
  {
    kicker: 'RELATIONSHIPS',
    title: '관계는 계속 쌓입니다',
    lines: [
      '데뷔할 때 모든 멤버 쌍에 관계와 시작 이야기가 붙습니다.',
      '활동하며 매주 새 기록이 쌓이고, 썸이 연애로 발전하거나 갈등이 더 깊어지기도 합니다.',
      '팀 호감도가 너무 낮은 멤버는 재계약을 거부할 수 있습니다.',
    ],
  },
];

/** The rules, in one place, reachable from the rail at any time. */
export function HowToPlay({ open, onClose }: HowToPlayProps) {
  return (
    <Modal
      open={open}
      variant="ink"
      kicker="How to play"
      title="게임 방법"
      onClose={onClose}
      footer={
        <NeonButton onClick={onClose}>알겠습니다</NeonButton>
      }
    >
      <div className="flex flex-col gap-5">
        {SECTIONS.map((s) => (
          <section key={s.kicker} className="flex flex-col gap-2">
            <div>
              <div className="kicker">{s.kicker}</div>
              <h3 className="mt-1 text-[14px] font-semibold text-paper">{s.title}</h3>
            </div>
            <ul className="m-0 flex list-none flex-col gap-1.5 p-0">
              {s.lines.map((line, i) => (
                <li key={i} className="flex gap-2.5">
                  <span className="mt-[7px] size-1 shrink-0 rounded-full bg-neon" aria-hidden />
                  <span className="text-[12.5px] leading-relaxed text-muted">{line}</span>
                </li>
              ))}
            </ul>
          </section>
        ))}
      </div>
    </Modal>
  );
}
