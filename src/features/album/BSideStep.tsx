import { NeonButton, SelectInput, Tag, TextInput } from '../../components/ui';
import { ALBUM_FORM, ALBUM_TYPES, GENRE_LABELS, SPECIALTIES } from '../../game/constants';
import type { AlbumDraft, AlbumType, Genre, Id, Member } from '../../game/types';

export interface BSideStepProps {
  bSides: AlbumDraft['bSides'];
  type: AlbumType;
  members: readonly Member[];
  onAdd: () => void;
  onRemove: (index: number) => void;
  onChange: (index: number, patch: Partial<AlbumDraft['bSides'][number]>) => void;
  onToggleParticipant: (index: number, memberId: Id) => void;
}

const GENRE_IDS = Object.keys(GENRE_LABELS) as Genre[];

/** Members whose 특기 lifts a track they are credited on. */
function isWriter(member: Member): boolean {
  return member.specialty === 'lyrics' || member.specialty === 'composing';
}

/** Step 3 — b-sides, and who wrote them. */
export function BSideStep({
  bSides,
  type,
  members,
  onAdd,
  onRemove,
  onChange,
  onToggleParticipant,
}: BSideStepProps) {
  const max = ALBUM_TYPES[type].bSideMax;
  const writers = members.filter(isWriter);

  if (max === 0) {
    return (
      <div className="flex min-h-[180px] flex-col items-center justify-center gap-2 rounded-chip border border-dashed border-paper-line text-center">
        <div className="kicker">No b-sides</div>
        <p className="m-0 max-w-[38ch] text-[13px] text-ink/60">
          싱글 앨범에는 타이틀곡 한 곡만 들어갑니다. 다음 단계로 넘어가세요.
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <span className="kicker">B-sides</span>
          <p className="m-0 mt-1 text-[12.5px] text-ink/60">
            {ALBUM_TYPES[type].label} 앨범은 수록곡을 최대 {max}곡까지 넣을 수 있습니다.
            {writers.length > 0 && ' 작사·작곡 특기 멤버가 참여하면 앨범 퀄리티와 팬덤 충성도가 오릅니다.'}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Tag tone={bSides.length >= max ? 'neon' : 'outline'}>
            {bSides.length}/{max}
          </Tag>
          <NeonButton
            size="sm"
            surface="paper"
            variant="ghost"
            onClick={onAdd}
            disabled={bSides.length >= max}
          >
            수록곡 추가
          </NeonButton>
        </div>
      </div>

      {bSides.length === 0 ? (
        <div className="flex min-h-[140px] items-center justify-center rounded-chip border border-dashed border-paper-line text-center text-[13px] text-ink/60">
          수록곡 없이 타이틀곡만 낼 수도 있습니다.
        </div>
      ) : (
        <div className="flex flex-col gap-2.5">
          {bSides.map((b, i) => (
            <div
              key={i}
              className="flex flex-col gap-3 rounded-chip border border-paper-line bg-paper-soft p-3"
            >
              <div className="flex flex-wrap items-center gap-2">
                <span className="tabular w-6 shrink-0 text-[12px] text-ink/45">
                  {String(i + 2).padStart(2, '0')}
                </span>
                <TextInput
                  aria-label={`수록곡 ${i + 1} 곡명`}
                  value={b.title}
                  maxLength={ALBUM_FORM.trackTitleMax}
                  placeholder={`수록곡 ${i + 1} 곡명`}
                  onChange={(e) => onChange(i, { title: e.target.value })}
                  className="h-9 min-w-[140px] flex-1"
                />
                <SelectInput
                  aria-label={`수록곡 ${i + 1} 장르`}
                  value={b.genre}
                  onChange={(e) => onChange(i, { genre: e.target.value as Genre })}
                  className="h-9 w-[112px]"
                >
                  {GENRE_IDS.map((g) => (
                    <option key={g} value={g}>
                      {GENRE_LABELS[g]}
                    </option>
                  ))}
                </SelectInput>
                <button
                  type="button"
                  onClick={() => onRemove(i)}
                  aria-label={`수록곡 ${i + 1} 삭제`}
                  className="flex size-9 shrink-0 items-center justify-center rounded-chip border border-paper-line text-[13px] text-ink/60 transition-colors hover:border-neon hover:text-neon"
                >
                  ×
                </button>
              </div>

              <div className="flex flex-col gap-1.5">
                <span className="kicker">참여 멤버</span>
                <div className="flex flex-wrap gap-1.5">
                  {members.map((m) => {
                    const active = b.participantIds.includes(m.id);
                    const writer = isWriter(m);
                    return (
                      <button
                        key={m.id}
                        type="button"
                        aria-pressed={active}
                        onClick={() => onToggleParticipant(i, m.id)}
                        title={writer ? `${SPECIALTIES[m.specialty].label} 특기` : undefined}
                        className={`inline-flex h-7 items-center gap-1 rounded-chip border px-2.5 text-[12px] transition-colors ${
                          active
                            ? 'border-neon bg-neon/10 text-neon'
                            : 'border-paper-line text-ink/70 hover:border-ink/30 hover:text-ink'
                        }`}
                      >
                        {m.name}
                        {writer && <span className="text-[10px] font-bold">✎</span>}
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
