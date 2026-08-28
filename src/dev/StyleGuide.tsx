import { useState } from 'react';

import {
  AppShell,
  Card,
  GradeTag,
  MetricTile,
  Modal,
  NeonButton,
  StatBar,
  StatHexagon,
  Stepper,
  Tag,
  Toast,
} from '../components/ui';
import { CONCEPT_LABELS, PHASE_LABELS, POSITION_LABELS, STAT_LABELS } from '../game/constants';
import { formatCount, formatWon, formatWonShort } from '../game/formulas';
import { PHASE_ORDER, STAT_KEYS, type Grade, type Stats } from '../game/types';

/**
 * Dev-only component gallery. Reachable at `#/styleguide` while running the dev
 * server; it is never linked from the game and is stripped from the phase
 * router in production. Delete once the real screens land.
 */

const SAMPLE_STATS: Stats = {
  vocal: 78,
  dance: 64,
  rap: 41,
  visual: 88,
  charisma: 71,
  mental: 47,
};

const SAMPLE_POTENTIAL: Stats = {
  vocal: 92,
  dance: 81,
  rap: 58,
  visual: 95,
  charisma: 84,
  mental: 69,
};

const GRADES: Grade[] = ['SS', 'S', 'A', 'B', 'C', 'D', 'F'];

const TOKENS: { name: string; value: string; note: string }[] = [
  { name: '--ink', value: '#0A0A0B', note: 'primary dark background' },
  { name: '--ink-soft', value: '#141416', note: 'elevated dark surface' },
  { name: '--ink-line', value: '#26262A', note: 'dark hairline' },
  { name: '--paper', value: '#FFFFFF', note: 'card face' },
  { name: '--paper-soft', value: '#F4F4F5', note: 'muted light surface' },
  { name: '--paper-line', value: '#E4E4E7', note: 'light hairline' },
  { name: '--neon', value: '#FF1F3D', note: 'the only accent' },
  { name: '--neon-dim', value: '#C4162E', note: 'accent hover' },
  { name: '--muted', value: '#8A8A93', note: 'secondary text' },
];

export function StyleGuide() {
  const [modalOpen, setModalOpen] = useState(false);
  const [inkModalOpen, setInkModalOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [step, setStep] = useState(5);

  const steps = PHASE_ORDER.filter((p) => p !== 'intro').map((p) => ({
    id: p,
    kicker: PHASE_LABELS[p].kicker,
    label: PHASE_LABELS[p].label,
  }));

  return (
    <AppShell
      phase="album_produce"
      companyName="스타라인 엔터테인먼트"
      won={48_500_000}
      week={14}
      onNavigate={() => {}}
    >
      <div className="flex flex-col gap-10">
        <Header />

        <Section kicker="DESIGN TOKENS" title="컬러 토큰">
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-5">
            {TOKENS.map((t) => (
              <div key={t.name} className="rounded-card border border-ink-line bg-ink-soft p-3">
                <div
                  className="mb-2.5 h-10 rounded-chip border border-ink-line"
                  style={{ background: t.value }}
                />
                <div className="tabular text-[11px] font-medium text-paper">{t.name}</div>
                <div className="tabular text-[11px] text-muted">{t.value}</div>
                <div className="mt-1 text-[10px] leading-tight text-muted">{t.note}</div>
              </div>
            ))}
          </div>
        </Section>

        <Section kicker="TYPOGRAPHY" title="타이포그래피">
          <Card variant="paper">
            <div className="flex flex-col gap-5">
              <div>
                <div className="kicker">SECTION LABEL / 섹션 라벨</div>
                <p className="mt-1 text-[11px] text-ink/60">
                  11px · letter-spacing 0.12em · uppercase · muted
                </p>
              </div>
              <div className="h-px bg-paper-line" />
              <div>
                <div className="kicker">SCREEN HEADER</div>
                <h2 className="mt-1 text-[22px] font-semibold tracking-tight">연습생 명단</h2>
                <p className="mt-1 text-[13px] text-ink/60">
                  모든 화면 헤더는 영문 키커와 한글 제목을 짝으로 씁니다.
                </p>
              </div>
              <div className="h-px bg-paper-line" />
              <div className="flex flex-wrap items-end gap-x-8 gap-y-4">
                <FigureSample label="formatWon" value={formatWon(48_500_000)} />
                <FigureSample label="formatWonShort" value={formatWonShort(1_240_000_000)} />
                <FigureSample label="formatCount" value={formatCount(123_400, '장')} />
                <FigureSample label="tabular-nums" value="00 11 22 33 44" />
              </div>
            </div>
          </Card>
        </Section>

        <Section kicker="CARD" title="카드 · 3가지 변형">
          <div className="grid gap-3 lg:grid-cols-3">
            <Card
              variant="paper"
              kicker="TRAINEE ROSTER"
              title="연습생 명단"
              action={<Tag tone="neon">12명</Tag>}
              footer={
                <div className="flex items-center justify-between text-[12px] text-ink/60">
                  <span>월 유지비</span>
                  <span className="tabular font-medium text-ink">{formatWon(14_400_000)}</span>
                </div>
              }
            >
              <p className="text-[13px] text-ink/60">
                paper — 잉크 셸 위에 올라가는 기본 카드. 제품 전반의 지배적인 패턴입니다.
              </p>
            </Card>

            <Card variant="ink" kicker="BROADCAST" title="음악방송 편성" action={<Tag tone="neon" surface="ink">D-2</Tag>}>
              <p className="text-[13px] text-muted">
                ink — 셸과 이어지는 어두운 표면. 방송·중계처럼 무대 쪽 정보에 씁니다.
              </p>
            </Card>

            <Card variant="outline" kicker="EMPTY STATE" title="배정된 일정 없음">
              <p className="text-[13px] text-muted">
                outline — 헤어라인만 있는 컨테이너. 무게 없이 묶을 때 사용합니다.
              </p>
            </Card>
          </div>
        </Section>

        <Section kicker="METRIC TILE" title="지표 타일">
          <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
            <MetricTile
              kicker="FIRST WEEK SALES"
              value={formatCount(123_400, '장')}
              sublabel="초동 판매량"
              delta={18.4}
              deltaLabel="+18.4%"
              emphasis
            />
            <MetricTile
              kicker="FANDOM SIZE"
              value={formatCount(84_200, '명')}
              sublabel="팬덤 규모"
              delta={4_120}
              deltaLabel="+4,120"
            />
            <MetricTile
              kicker="CHART PEAK"
              value="7위"
              sublabel="차트 최고 순위"
              delta={-3}
              deltaLabel="-3"
            />
            <MetricTile
              kicker="NET PROFIT"
              value={formatWonShort(-24_000_000)}
              sublabel="순손익"
              surface="ink"
              delta={-12.1}
              deltaLabel="-12.1%"
            />
          </div>
        </Section>

        <Section kicker="BUTTON" title="버튼">
          <Card variant="ink">
            <div className="flex flex-col gap-5">
              <ButtonRow label="primary — 화면당 하나">
                <NeonButton variant="primary">데뷔 확정</NeonButton>
                <NeonButton variant="primary" size="sm">
                  작게
                </NeonButton>
                <NeonButton variant="primary" loading={loading} onClick={() => {
                  setLoading(true);
                  window.setTimeout(() => setLoading(false), 1800);
                }}>
                  로딩 테스트
                </NeonButton>
                <NeonButton variant="primary" disabled>
                  비활성
                </NeonButton>
              </ButtonRow>

              <ButtonRow label="ghost — 기본값">
                <NeonButton variant="ghost">다시 뽑기</NeonButton>
                <NeonButton variant="ghost" size="sm">
                  작게
                </NeonButton>
                <NeonButton variant="ghost" loading>
                  처리 중
                </NeonButton>
                <NeonButton variant="ghost" disabled>
                  비활성
                </NeonButton>
              </ButtonRow>

              <ButtonRow label="danger — 계약 해지 등">
                <NeonButton variant="danger">계약 해지</NeonButton>
                <NeonButton variant="danger" size="sm">
                  작게
                </NeonButton>
                <NeonButton variant="danger" loading>
                  해지 중
                </NeonButton>
                <NeonButton variant="danger" disabled>
                  비활성
                </NeonButton>
              </ButtonRow>
            </div>
          </Card>
        </Section>

        <Section kicker="STATS" title="스탯 표시">
          <div className="grid gap-3 lg:grid-cols-2">
            <Card variant="paper" kicker="TRAINEE 04" title="김하늘" action={<GradeTag grade="A" />}>
              <div className="flex flex-col gap-2.5">
                {STAT_KEYS.map((key) => (
                  <StatBar
                    key={key}
                    label={STAT_LABELS[key]}
                    value={SAMPLE_STATS[key]}
                    potential={SAMPLE_POTENTIAL[key]}
                    surface="paper"
                  />
                ))}
              </div>
              <p className="mt-4 text-[11px] text-ink/60">
                옅은 구간은 잠재력 상한, 50·100 지점에 헤어라인 눈금이 있습니다.
              </p>
            </Card>

            <Card variant="paper" kicker="ABILITY RADAR" title="6축 능력치">
              <div className="flex items-center justify-center py-2">
                <StatHexagon stats={SAMPLE_STATS} potential={SAMPLE_POTENTIAL} size={260} surface="paper" />
              </div>
            </Card>

            <Card variant="ink" kicker="ON INK SURFACE" title="어두운 표면에서">
              <div className="flex flex-col items-center gap-5 sm:flex-row">
                <StatHexagon stats={SAMPLE_STATS} size={180} surface="ink" />
                <div className="flex w-full flex-col gap-2.5">
                  {STAT_KEYS.slice(0, 4).map((key) => (
                    <StatBar
                      key={key}
                      label={STAT_LABELS[key]}
                      value={SAMPLE_STATS[key]}
                      surface="ink"
                    />
                  ))}
                </div>
              </div>
            </Card>

            <Card variant="paper" kicker="THUMBNAIL" title="축소 렌더링">
              <div className="flex flex-wrap items-center gap-4">
                {[64, 88, 120].map((s) => (
                  <StatHexagon key={s} stats={SAMPLE_STATS} size={s} showLabels={false} surface="paper" />
                ))}
                <p className="text-[12px] text-ink/60">라벨을 끄면 목록 썸네일로 씁니다.</p>
              </div>
            </Card>
          </div>
        </Section>

        <Section kicker="TAG / CHIP" title="태그와 등급">
          <div className="grid gap-3 lg:grid-cols-2">
            <Card variant="paper" kicker="ON PAPER" title="밝은 카드 위">
              <div className="flex flex-col gap-4">
                <TagRow label="콘셉트">
                  {Object.values(CONCEPT_LABELS).map((c) => (
                    <Tag key={c}>{c}</Tag>
                  ))}
                </TagRow>
                <TagRow label="포지션">
                  {Object.values(POSITION_LABELS).slice(0, 6).map((p) => (
                    <Tag key={p} tone="outline">
                      {p}
                    </Tag>
                  ))}
                </TagRow>
                <TagRow label="강조">
                  <Tag tone="neon">선택됨</Tag>
                  <Tag tone="solid">확정</Tag>
                  <Tag tone="neon">LIVE</Tag>
                </TagRow>
                <TagRow label="등급">
                  {GRADES.map((g) => (
                    <GradeTag key={g} grade={g} />
                  ))}
                </TagRow>
              </div>
            </Card>

            <Card variant="ink" kicker="ON INK" title="어두운 표면 위">
              <div className="flex flex-col gap-4">
                <TagRow label="콘셉트" surface="ink">
                  {Object.values(CONCEPT_LABELS).map((c) => (
                    <Tag key={c} surface="ink">
                      {c}
                    </Tag>
                  ))}
                </TagRow>
                <TagRow label="강조" surface="ink">
                  <Tag tone="neon" surface="ink">
                    선택됨
                  </Tag>
                  <Tag tone="solid" surface="ink">
                    확정
                  </Tag>
                  <Tag tone="outline" surface="ink">
                    대기
                  </Tag>
                </TagRow>
                <TagRow label="등급" surface="ink">
                  {GRADES.map((g) => (
                    <GradeTag key={g} grade={g} surface="ink" />
                  ))}
                </TagRow>
                <TagRow label="작은 등급" surface="ink">
                  {GRADES.map((g) => (
                    <GradeTag key={g} grade={g} surface="ink" size="sm" />
                  ))}
                </TagRow>
              </div>
            </Card>
          </div>
        </Section>

        <Section kicker="STEPPER" title="페이즈 진행 레일">
          <Card variant="ink">
            <Stepper steps={steps} current={step} repeatLabel="2/4주차" />
            <div className="mt-5 flex flex-wrap gap-2">
              <NeonButton
                variant="ghost"
                size="sm"
                onClick={() => setStep((s) => Math.max(0, s - 1))}
                disabled={step === 0}
              >
                이전 단계
              </NeonButton>
              <NeonButton
                variant="ghost"
                size="sm"
                onClick={() => setStep((s) => Math.min(steps.length - 1, s + 1))}
                disabled={step === steps.length - 1}
              >
                다음 단계
              </NeonButton>
              <span className="tabular self-center text-[12px] text-muted">
                현재: {steps[step]?.label}
              </span>
            </div>
          </Card>
        </Section>

        <Section kicker="OVERLAY" title="모달과 토스트">
          <Card variant="ink">
            <div className="flex flex-wrap gap-2">
              <NeonButton onClick={() => setModalOpen(true)}>paper 모달 열기</NeonButton>
              <NeonButton variant="ghost" onClick={() => setInkModalOpen(true)}>
                ink 모달 열기
              </NeonButton>
            </div>
            <p className="mt-4 text-[12px] text-muted">
              토스트는 화면 우측 상단(모바일은 하단)에 상시 표시되어 있습니다.
            </p>
          </Card>
        </Section>

        <Section kicker="LAYOUT" title="셸 구성">
          <Card variant="paper">
            <ul className="flex list-none flex-col gap-2 p-0 text-[13px] text-ink/60">
              <li>
                <span className="font-medium text-ink">티커</span> — 최상단 전체 폭, 업계 헤드라인이
                흐릅니다.
              </li>
              <li>
                <span className="font-medium text-ink">좌측 아이콘 레일</span> — 64px, 로고 + 페이즈
                아이콘. 활성 단계만 네온.
              </li>
              <li>
                <span className="font-medium text-ink">상단 바</span> — 회사명 / 보유 자금 / 현재 주차.
                자금은 핵심 숫자이므로 네온.
              </li>
              <li>
                <span className="font-medium text-ink">모바일</span> — lg 미만에서 레일이 하단 바로
                내려갑니다. 창을 줄여 확인하세요.
              </li>
            </ul>
          </Card>
        </Section>
      </div>

      <Modal
        open={modalOpen}
        kicker="INCIDENT REPORT"
        title="열애설 보도"
        onClose={() => setModalOpen(false)}
        footer={
          <>
            <NeonButton variant="ghost" onClick={() => setModalOpen(false)}>
              무대응
            </NeonButton>
            <NeonButton onClick={() => setModalOpen(false)}>공식 입장 발표</NeonButton>
          </>
        }
      >
        <p className="m-0">
          연예 매체가 멤버 김하늘의 열애설을 보도했습니다. 팬덤 반응이 갈리고 있어 대응 방식에 따라
          충성도와 유해도가 크게 달라집니다.
        </p>
        <div className="mt-4 flex flex-wrap gap-1.5">
          <Tag tone="neon">긴급</Tag>
          <Tag>팬덤 −3</Tag>
          <Tag>평판 −5</Tag>
        </div>
      </Modal>

      <Modal
        open={inkModalOpen}
        variant="ink"
        kicker="MUSIC SHOW"
        title="1위 후보 발표"
        onClose={() => setInkModalOpen(false)}
        footer={<NeonButton onClick={() => setInkModalOpen(false)}>결과 확인</NeonButton>}
      >
        <p className="m-0">
          이번 주 음악방송 1위 후보에 올랐습니다. 음원 점수와 방송 점수 합산 결과를 기다리는 중입니다.
        </p>
      </Modal>

      <Toast
        items={[
          { id: 't1', kicker: 'CHART UPDATE', text: '타이틀곡이 실시간 차트 12위에 진입했습니다.', tone: 'good' },
          { id: 't2', kicker: 'SCHEDULE', text: '김하늘의 피로도가 위험 수준입니다.', tone: 'critical' },
          { id: 't3', text: '연습생 2명의 계약이 이번 달 만료됩니다.', tone: 'bad' },
        ]}
      />
    </AppShell>
  );
}

// ---------------------------------------------------------------------------
// Local layout helpers — styleguide only.
// ---------------------------------------------------------------------------

function Header() {
  return (
    <div className="border-b border-ink-line pb-6">
      <div className="kicker">DESIGN SYSTEM / STYLEGUIDE</div>
      <h1 className="mt-2 text-[26px] font-semibold tracking-tight text-paper sm:text-[32px]">
        디자인 시스템 점검용 화면
      </h1>
      <p className="mt-2 max-w-[60ch] text-[13px] text-muted">
        개발 전용 화면입니다. 모든 컴포넌트를 모든 변형으로 한 화면에 펼쳐둡니다. 실제 게임에서는
        접근할 수 없습니다.
      </p>
    </div>
  );
}

function Section({
  kicker,
  title,
  children,
}: {
  kicker: string;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className="flex flex-col gap-3">
      <div className="flex items-baseline gap-3">
        <div>
          <div className="kicker">{kicker}</div>
          <h2 className="mt-0.5 text-[17px] font-semibold tracking-tight text-paper">{title}</h2>
        </div>
        <span className="h-px flex-1 bg-ink-line" />
      </div>
      {children}
    </section>
  );
}

function ButtonRow({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-2">
      <span className="kicker">{label}</span>
      <div className="flex flex-wrap items-center gap-2">{children}</div>
    </div>
  );
}

function TagRow({
  label,
  surface = 'paper',
  children,
}: {
  label: string;
  surface?: 'paper' | 'ink';
  children: React.ReactNode;
}) {
  return (
    <div className="flex flex-col gap-2">
      <span className={`text-[11px] ${surface === 'paper' ? 'text-muted' : 'text-muted'}`}>
        {label}
      </span>
      <div className="flex flex-wrap gap-1.5">{children}</div>
    </div>
  );
}

function FigureSample({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div className="kicker">{label}</div>
      <div className="tabular mt-1 text-[22px] font-semibold tracking-tight">{value}</div>
    </div>
  );
}
