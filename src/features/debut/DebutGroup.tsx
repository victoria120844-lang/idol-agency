import { useMemo, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';

import { Card, NeonButton, Stepper, Toast, type ToastItem } from '../../components/ui';
import { GROUP_RULES } from '../../game/constants';
import { createMember, generateRelationships } from '../../game/generators';
import { createRng } from '../../game/rng';
import type {
  Concept,
  DebutGoal,
  Id,
  Member,
  Position,
  Relationship,
  Trainee,
} from '../../game/types';
import { useGameStore } from '../../app/store';
import { GroupSetupStep } from './GroupSetupStep';
import { MemberSelectStep } from './MemberSelectStep';
import { PressReleaseCard } from './PressReleaseCard';
import { RelationshipStep } from './RelationshipStep';

const STEPS = [
  { id: 'setup', kicker: 'GROUP', label: '그룹 설정' },
  { id: 'members', kicker: 'LINEUP', label: '멤버 선발' },
  { id: 'relations', kicker: 'RELATIONS', label: '관계도' },
];

/** Default position offered when a trainee is added to the lineup. */
const DEFAULT_POSITIONS: readonly Position[] = [
  'leader',
  'main_vocal',
  'main_dancer',
  'rapper',
  'visual',
  'center',
  'lead_vocal',
  'lead_dancer',
  'maknae',
] as const;

export function DebutGroup() {
  const company = useGameStore((s) => s.company);
  const trainees = useGameStore((s) => s.trainees);
  const rngState = useGameStore((s) => s.rng);
  const createGroup = useGameStore((s) => s.createGroup);
  const setPhase = useGameStore((s) => s.setPhase);

  const [step, setStep] = useState(0);
  const [name, setName] = useState('');
  // Explicit generic: GROUP_RULES is `as const`, so inference would pin this
  // to the literal type of the default.
  const [memberCount, setMemberCount] = useState<number>(GROUP_RULES.defaultMembers);
  const [concept, setConcept] = useState<Concept>('fresh');
  const [goal, setGoal] = useState<DebutGoal>('music_show_win');
  const [selectedIds, setSelectedIds] = useState<Id[]>([]);
  const [positions, setPositions] = useState<Record<Id, Position>>({});
  const [toasts, setToasts] = useState<ToastItem[]>([]);

  const pushToast = (text: string, tone: ToastItem['tone'], kicker?: string) => {
    const item: ToastItem = { id: `${Date.now()}-${Math.random()}`, text, tone, kicker };
    setToasts((t) => [...t, item].slice(-3));
    window.setTimeout(() => setToasts((t) => t.filter((x) => x.id !== item.id)), 3600);
  };

  const trimmed = name.trim();
  const nameError =
    trimmed.length === 0
      ? undefined
      : trimmed.length < GROUP_RULES.nameMin || trimmed.length > GROUP_RULES.nameMax
        ? `그룹명은 ${GROUP_RULES.nameMin}~${GROUP_RULES.nameMax}자여야 합니다.`
        : undefined;

  const setupDone = trimmed.length >= GROUP_RULES.nameMin && !nameError;
  const lineupDone = selectedIds.length === memberCount;

  /**
   * Preview the relationship matrix without consuming the RNG stream. A local
   * generator built from the same save position produces exactly what
   * `createGroup` will commit, so what the player reviews is what they get.
   */
  const preview = useMemo(() => {
    if (!lineupDone) return { members: [] as Member[], relationships: [] as Relationship[] };

    const rng = createRng(rngState);
    const members = selectedIds
      .map((id) => trainees.find((t) => t.id === id))
      .filter((t): t is Trainee => Boolean(t))
      .map((t) => createMember(rng, t, positions[t.id] ?? 'sub_vocal'));

    return { members, relationships: generateRelationships(rng, members) };
  }, [lineupDone, rngState, selectedIds, trainees, positions]);

  const previewGroup = useMemo(() => {
    if (!lineupDone || !company) return null;
    return {
      id: 'preview',
      name: trimmed,
      concept,
      goal,
      memberIds: preview.members.map((m) => m.id),
      members: preview.members,
      relationships: preview.relationships,
      debutWeek: useGameStore.getState().week,
      teamwork: 0,
      conflictIndex: 0,
      scandalRisk: 0,
      conceptFit: 0,
      overall: 0,
      colorHex: company.ciColor,
    };
  }, [lineupDone, company, trimmed, concept, goal, preview]);

  const toggleMember = (id: Id) => {
    setSelectedIds((ids) => {
      if (ids.includes(id)) {
        setPositions((p) => {
          const next = { ...p };
          delete next[id];
          return next;
        });
        return ids.filter((x) => x !== id);
      }
      if (ids.length >= memberCount) return ids;

      // Offer the first position nobody has taken yet.
      const taken = new Set(Object.values(positions));
      const suggestion =
        DEFAULT_POSITIONS.find((p) => !taken.has(p)) ?? ('sub_vocal' as Position);
      setPositions((p) => ({ ...p, [id]: suggestion }));
      return [...ids, id];
    });
  };

  const setPosition = (id: Id, position: Position) =>
    setPositions((p) => ({ ...p, [id]: position }));

  const changeMemberCount = (n: number) => {
    setMemberCount(n);
    // Trim the lineup if the player shrinks the group after selecting.
    setSelectedIds((ids) => {
      if (ids.length <= n) return ids;
      const kept = ids.slice(0, n);
      setPositions((p) =>
        Object.fromEntries(Object.entries(p).filter(([id]) => kept.includes(id))),
      );
      return kept;
    });
  };

  const goNext = () => {
    if (step === 0) {
      if (!setupDone) {
        pushToast('그룹명을 입력해 주세요.', 'neutral', 'DEBUT');
        return;
      }
      setStep(1);
      return;
    }
    if (step === 1) {
      if (!lineupDone) {
        pushToast(`${memberCount}명을 모두 선발해야 합니다.`, 'critical', 'LINEUP');
        return;
      }
      setStep(2);
    }
  };

  const confirmDebut = () => {
    createGroup({ name: trimmed, memberCount, concept, goal, traineeIds: selectedIds, positions });
  };

  if (!company) return null;

  const enoughTrainees = trainees.length >= memberCount;

  return (
    <div className="flex flex-col gap-5">
      <header>
        <div className="kicker">Debut</div>
        <h1 className="mt-2 text-[26px] font-semibold tracking-tight text-paper sm:text-[32px]">
          데뷔조 결성
        </h1>
        <p className="mt-2 max-w-[54ch] text-[13px] text-muted">
          이름과 컨셉을 정하고, 멤버를 뽑고, 이들이 서로를 어떻게 생각하는지 확인합니다. 관계는
          데뷔 시점에 한 번 만들어지고 그 뒤로는 활동하며 쌓입니다.
        </p>
      </header>

      <Card variant="ink">
        <Stepper steps={STEPS} current={step} />
      </Card>

      <AnimatePresence mode="wait">
        <motion.div
          key={step}
          initial={{ opacity: 0, x: 16 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -16 }}
          transition={{ duration: 0.25, ease: [0.22, 1, 0.36, 1] }}
        >
          {step === 0 && (
            <GroupSetupStep
              name={name}
              memberCount={memberCount}
              concept={concept}
              goal={goal}
              nameError={nameError}
              onName={setName}
              onMemberCount={changeMemberCount}
              onConcept={setConcept}
              onGoal={setGoal}
            />
          )}

          {step === 1 && (
            <MemberSelectStep
              trainees={trainees.filter((t) => !t.debuted)}
              selectedIds={selectedIds}
              positions={positions}
              memberCount={memberCount}
              concept={concept}
              onToggle={toggleMember}
              onPosition={setPosition}
            />
          )}

          {step === 2 && previewGroup && (
            <div className="flex flex-col gap-4">
              <RelationshipStep
                members={preview.members}
                relationships={preview.relationships}
              />
              <PressReleaseCard
                companyName={company.name}
                ceoName={company.ceoName}
                group={previewGroup}
                ciColor={company.ciColor}
              />
            </div>
          )}
        </motion.div>
      </AnimatePresence>

      {/* -------- wizard controls -------- */}
      <div className="flex flex-col-reverse items-stretch gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex gap-2">
          {step > 0 ? (
            <NeonButton variant="ghost" onClick={() => setStep((s) => s - 1)}>
              이전
            </NeonButton>
          ) : (
            <NeonButton variant="ghost" onClick={() => setPhase('trainee_recruit')}>
              모집으로 돌아가기
            </NeonButton>
          )}
        </div>

        <div className="flex flex-col items-stretch gap-2 sm:flex-row sm:items-center">
          {step === 1 && !enoughTrainees && (
            <span className="text-[12px] text-neon">
              연습생이 {memberCount}명보다 적습니다. 먼저 더 모집하세요.
            </span>
          )}
          {step < 2 ? (
            <NeonButton onClick={goNext} disabled={step === 0 ? !setupDone : !lineupDone}>
              다음
            </NeonButton>
          ) : (
            <NeonButton onClick={confirmDebut}>데뷔 확정</NeonButton>
          )}
        </div>
      </div>

      <Toast items={toasts} />
    </div>
  );
}
