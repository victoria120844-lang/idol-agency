import { Avatar, NeonButton, Tag } from '../../components/ui';
import { ALBUM_TUNING, POSITION_LABELS, STAT_LABELS } from '../../game/constants';
import { partSkew } from '../../game/formulas';
import type { Id, Member, StatKey } from '../../game/types';

export interface PositionStepProps {
  members: readonly Member[];
  centerMemberId: Id;
  killingPartMemberId: Id;
  partShares: Record<Id, number>;
  onCenter: (id: Id) => void;
  onKillingPart: (id: Id) => void;
  onShare: (id: Id, value: number) => void;
  onEvenShares: () => void;
}

/** Weighted score used to suggest who suits a role. */
function roleScore(member: Member, keys: readonly StatKey[]): number {
  return Math.round(keys.reduce((sum, k) => sum + member.stats[k], 0) / keys.length);
}

const CENTER_STATS: readonly StatKey[] = ['visual', 'charisma'];
const KILLING_STATS: readonly StatKey[] = ['vocal', 'rap'];

/** Step 4 — centre, killing part, and how the title track's lines are split. */
export function PositionStep({
  members,
  centerMemberId,
  killingPartMemberId,
  partShares,
  onCenter,
  onKillingPart,
  onShare,
  onEvenShares,
}: PositionStepProps) {
  const skew = partSkew(partShares);
  const topName = skew.topId ? members.find((m) => m.id === skew.topId)?.name : null;

  return (
    <div className="flex flex-col gap-5">
      <div className="grid gap-4 lg:grid-cols-2">
        <RolePicker
          kicker="Center"
          label="센터"
          note="비주얼 · 매력 기준. 개인 팬이 가장 많이 늘고 대중 인지도를 끌어올립니다."
          members={members}
          statKeys={CENTER_STATS}
          selectedId={centerMemberId}
          onSelect={onCenter}
        />
        <RolePicker
          kicker="Killing part"
          label="킬링파트"
          note="보컬 · 랩 기준. 음원 성적과 숏폼 확산에 영향을 줍니다."
          members={members}
          statKeys={KILLING_STATS}
          selectedId={killingPartMemberId}
          onSelect={onKillingPart}
        />
      </div>

      {/* ---- part distribution ---- */}
      <div className="rounded-chip border border-paper-line p-4">
        <div className="flex flex-wrap items-baseline justify-between gap-3">
          <div>
            <span className="kicker">Line distribution</span>
            <p className="m-0 mt-1 text-[12.5px] text-ink/60">
              타이틀곡 파트를 100% 안에서 나눕니다. 한 명에게 몰아주면 그 멤버의 개인 팬은 크게
              늘지만 팀이 흔들립니다.
            </p>
          </div>
          <NeonButton size="sm" variant="ghost" surface="paper" onClick={onEvenShares}>
            균등 분배
          </NeonButton>
        </div>

        <div className="mt-4 flex flex-col gap-3">
          {members.map((m) => {
            const share = partShares[m.id] ?? 0;
            const isTop = skew.topId === m.id && skew.skewed;
            return (
              <div key={m.id} className="flex items-center gap-3">
                <Avatar id={m.traineeId} initial={m.name.slice(0, 1)} size={28} />
                <div className="w-20 shrink-0">
                  <div className="truncate text-[12.5px] font-medium text-ink">{m.name}</div>
                  <div className="text-[10.5px] text-ink/60">{POSITION_LABELS[m.position]}</div>
                </div>
                <input
                  type="range"
                  min={0}
                  max={100}
                  step={1}
                  value={share}
                  aria-label={`${m.name} 파트 비중`}
                  onChange={(e) => onShare(m.id, Number(e.target.value))}
                  className="h-1.5 flex-1 cursor-pointer appearance-none rounded-chip bg-paper-soft accent-neon"
                />
                <span
                  className={`tabular w-10 shrink-0 text-right text-[12.5px] font-semibold ${
                    isTop ? 'text-neon' : share === 0 ? 'text-ink/35' : 'text-ink'
                  }`}
                >
                  {share}%
                </span>
              </div>
            );
          })}
        </div>

        {/* stacked overview */}
        <div className="mt-4 flex h-2 overflow-hidden rounded-chip border border-paper-line">
          {members.map((m, i) => (
            <span
              key={m.id}
              title={`${m.name} ${partShares[m.id] ?? 0}%`}
              style={{ width: `${partShares[m.id] ?? 0}%` }}
              className={i % 2 === 0 ? 'bg-neon' : 'bg-ink/30'}
            />
          ))}
        </div>

        {skew.skewed && (
          <div className="mt-3 flex gap-2.5 rounded-chip border border-neon/40 bg-neon/8 px-3 py-2.5">
            <span className="shrink-0 text-[13px] font-bold text-neon">!</span>
            <div className="text-[12px] leading-relaxed text-ink">
              <span className="font-semibold text-neon">파트 분배가 한쪽으로 쏠려 있습니다.</span>{' '}
              {skew.silentCount > 0 && `파트가 아예 없는 멤버가 ${skew.silentCount}명 있습니다. `}
              {topName && skew.topShare >= ALBUM_TUNING.skewShareThreshold &&
                `${topName}이 ${skew.topShare}%를 가져갑니다. `}
              이대로 발매하면 팀워크가 {ALBUM_TUNING.skewTeamworkPenalty} 떨어지고 갈등 지수가{' '}
              {ALBUM_TUNING.skewConflictGain} 올라가며, 컴백 기간에 파트 분배 논란이 터질 수
              있습니다.
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function RolePicker({
  kicker,
  label,
  note,
  members,
  statKeys,
  selectedId,
  onSelect,
}: {
  kicker: string;
  label: string;
  note: string;
  members: readonly Member[];
  statKeys: readonly StatKey[];
  selectedId: Id;
  onSelect: (id: Id) => void;
}) {
  const ranked = members
    .map((m) => ({ m, score: roleScore(m, statKeys) }))
    .sort((a, b) => b.score - a.score);
  const best = ranked[0]?.m.id;

  return (
    <div className="rounded-chip border border-paper-line p-4">
      <div className="kicker">{kicker}</div>
      <h3 className="mt-1 text-[15px] font-semibold text-ink">{label}</h3>
      <p className="m-0 mt-1 text-[12px] text-ink/60">{note}</p>

      <div className="mt-3 flex flex-col gap-1.5">
        {ranked.map(({ m, score }) => {
          const active = selectedId === m.id;
          return (
            <button
              key={m.id}
              type="button"
              aria-pressed={active}
              onClick={() => onSelect(m.id)}
              className={`flex items-center gap-2.5 rounded-chip border p-2 text-left transition-colors ${
                active
                  ? 'border-neon bg-neon/8'
                  : 'border-paper-line hover:border-ink/25 hover:bg-paper-soft'
              }`}
            >
              <Avatar id={m.traineeId} initial={m.name.slice(0, 1)} size={30} />
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-1.5">
                  <span
                    className={`truncate text-[13px] font-medium ${active ? 'text-neon' : 'text-ink'}`}
                  >
                    {m.name}
                  </span>
                  {m.id === best && <Tag tone="outline">추천</Tag>}
                </div>
                <div className="tabular text-[11px] text-ink/60">
                  {statKeys.map((k) => `${STAT_LABELS[k]} ${m.stats[k]}`).join(' · ')}
                </div>
              </div>
              <span
                className={`tabular shrink-0 text-[16px] font-semibold ${active ? 'text-neon' : 'text-ink'}`}
              >
                {score}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
