import { Field, SelectInput, Tag, TextInput } from '../../components/ui';
import {
  ALBUM_CONCEPTS,
  ALBUM_FORM,
  GENRE_LABELS,
  MOOD_TAGS,
  MOOD_TAG_IDS,
} from '../../game/constants';
import type { AlbumConcept, Genre, MoodTag } from '../../game/types';
import { QualityGauge } from './QualityGauge';

export interface TitleTrackStepProps {
  title: string;
  genre: Genre;
  bpm: number;
  moods: MoodTag[];
  concept: AlbumConcept;
  /** Raw expected quality; only the grade reaches the player. */
  qualityScore: number;
  titleError?: string;
  onTitle: (v: string) => void;
  onGenre: (v: Genre) => void;
  onBpm: (v: number) => void;
  onToggleMood: (v: MoodTag) => void;
}

const GENRE_IDS = Object.keys(GENRE_LABELS) as Genre[];

/** Step 2 — the promoted single. */
export function TitleTrackStep({
  title,
  genre,
  bpm,
  moods,
  concept,
  qualityScore,
  titleError,
  onTitle,
  onGenre,
  onBpm,
  onToggleMood,
}: TitleTrackStepProps) {
  const fit = ALBUM_CONCEPTS[concept].genreFit[genre];
  const moodsFull = moods.length >= ALBUM_FORM.moodMax;

  return (
    <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_300px] lg:items-start">
      <div className="flex flex-col gap-5">
        <Field
          kicker="Track title"
          label="곡명"
          htmlFor="tt-title"
          counter={`${title.trim().length}/${ALBUM_FORM.trackTitleMax}`}
          error={titleError}
        >
          <TextInput
            id="tt-title"
            value={title}
            maxLength={ALBUM_FORM.trackTitleMax}
            placeholder="예: 새벽 세 시"
            autoComplete="off"
            invalid={Boolean(titleError)}
            onChange={(e) => onTitle(e.target.value)}
          />
        </Field>

        <Field
          kicker="Genre"
          label="장르"
          htmlFor="tt-genre"
          hint={
            fit === undefined
              ? '이 컨셉과 특별한 상성은 없습니다.'
              : fit >= 1.2
                ? '이 컨셉과 잘 맞는 장르입니다.'
                : fit < 0.9
                  ? '이 컨셉과는 어울리기 어려운 장르입니다.'
                  : '무난한 조합입니다.'
          }
        >
          <SelectInput id="tt-genre" value={genre} onChange={(e) => onGenre(e.target.value as Genre)}>
            {GENRE_IDS.map((g) => (
              <option key={g} value={g}>
                {GENRE_LABELS[g]}
              </option>
            ))}
          </SelectInput>
        </Field>

        <Field kicker="Tempo" label="BPM" htmlFor="tt-bpm">
          <div className="flex items-center gap-4">
            <input
              id="tt-bpm"
              type="range"
              min={ALBUM_FORM.bpmMin}
              max={ALBUM_FORM.bpmMax}
              step={1}
              value={bpm}
              onChange={(e) => onBpm(Number(e.target.value))}
              className="h-1.5 flex-1 cursor-pointer appearance-none rounded-chip bg-paper-soft accent-neon"
            />
            <span className="tabular w-16 shrink-0 rounded-chip border border-paper-line px-2 py-1 text-center text-[13px] font-semibold text-ink">
              {bpm}
            </span>
          </div>
          <div className="mt-1 flex justify-between text-[10px] text-ink/35">
            <span className="tabular">{ALBUM_FORM.bpmMin} 느림</span>
            <span className="tabular">{ALBUM_FORM.bpmMax} 빠름</span>
          </div>
        </Field>

        <Field
          kicker="Mood"
          label="곡 분위기"
          hint={`최대 ${ALBUM_FORM.moodMax}개까지 고를 수 있습니다.`}
          counter={`${moods.length}/${ALBUM_FORM.moodMax}`}
        >
          <div className="flex flex-wrap gap-1.5">
            {MOOD_TAG_IDS.map((m) => {
              const active = moods.includes(m);
              const blocked = !active && moodsFull;
              return (
                <button
                  key={m}
                  type="button"
                  aria-pressed={active}
                  disabled={blocked}
                  onClick={() => onToggleMood(m)}
                  className={`h-8 rounded-chip border px-3 text-[12px] transition-colors disabled:cursor-not-allowed disabled:opacity-40 ${
                    active
                      ? 'border-neon bg-neon/10 text-neon'
                      : 'border-paper-line text-ink/70 hover:border-ink/30 hover:text-ink'
                  }`}
                >
                  {MOOD_TAGS[m]}
                </button>
              );
            })}
          </div>
        </Field>
      </div>

      <div className="flex flex-col gap-3">
        <QualityGauge score={qualityScore} />

        <div className="rounded-chip border border-paper-line px-4 py-3">
          <div className="kicker">Reading</div>
          <p className="m-0 mt-2 text-[12.5px] leading-relaxed text-ink/60">
            퀄리티는 팀 실기 스탯과 컨셉 적합도, 프로듀싱 예산 비중, 팀워크가 함께 만듭니다.
            정확한 수치는 발매 전까지 알 수 없습니다.
          </p>
          <div className="mt-3 flex flex-wrap gap-1.5">
            <Tag tone="outline">{ALBUM_CONCEPTS[concept].label}</Tag>
            <Tag tone="outline">{GENRE_LABELS[genre]}</Tag>
            <Tag tone="outline">{bpm} BPM</Tag>
            {moods.map((m) => (
              <Tag key={m} tone="neon">
                {MOOD_TAGS[m]}
              </Tag>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
