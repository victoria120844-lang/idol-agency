import { ALBUM_CONCEPTS, ALBUM_TYPES, GENRE_LABELS, MOOD_TAGS } from '../../game/constants';
import { albumIntroText } from '../../game/generators';
import { formatWon } from '../../game/formulas';
import type { Album, Group } from '../../game/types';

export interface AlbumSummaryCardProps {
  album: Album;
  group: Group;
  /** Fandom colour, used as the letterhead rule. Secondary accent only. */
  accentColor: string;
}

/**
 * The album introduction and tracklist, set like a release page. Shown as the
 * final review before the money is spent.
 */
export function AlbumSummaryCard({ album, group, accentColor }: AlbumSummaryCardProps) {
  const concept = ALBUM_CONCEPTS[album.concept];
  const type = ALBUM_TYPES[album.type];
  const intro = album.introText || albumIntroText(album, group);

  return (
    <article className="on-paper overflow-hidden rounded-card border border-paper-line bg-paper">
      <div className="h-[3px] w-full" style={{ backgroundColor: accentColor }} />

      <div className="flex flex-col gap-4 p-5">
        <div className="flex flex-wrap items-baseline justify-between gap-2 border-b border-paper-line pb-3">
          <div>
            <div className="kicker">{type.kicker} · {concept.kicker}</div>
            <h3 className="mt-1 text-[19px] font-semibold tracking-tight text-ink">
              {album.title || '앨범명 미정'}
            </h3>
          </div>
          <div className="text-right">
            <div className="kicker">Budget</div>
            <div className="tabular mt-1 text-[13px] font-semibold text-ink">
              {formatWon(album.budget)}
            </div>
          </div>
        </div>

        <p className="m-0 max-w-[62ch] text-[13.5px] leading-relaxed text-ink">{intro}</p>

        <div>
          <div className="kicker mb-2">Tracklist</div>
          <ol className="m-0 flex list-none flex-col p-0">
            {album.tracks.map((t, i) => {
              const isTitle = t.id === album.titleTrackId;
              const credits = t.participantIds
                .map((id) => group.members.find((m) => m.id === id)?.name)
                .filter(Boolean);

              return (
                <li
                  key={t.id}
                  className="flex flex-wrap items-baseline gap-x-3 gap-y-1 border-b border-paper-line py-2 last:border-b-0"
                >
                  <span className="tabular w-6 shrink-0 text-[11.5px] text-ink/45">
                    {String(i + 1).padStart(2, '0')}
                  </span>
                  <span
                    className={`text-[13.5px] ${isTitle ? 'font-semibold text-ink' : 'text-ink'}`}
                  >
                    {t.title || '제목 없음'}
                  </span>
                  {isTitle && (
                    <span className="rounded-chip border border-neon/40 bg-neon/8 px-1.5 py-0.5 text-[10px] font-bold text-neon">
                      TITLE
                    </span>
                  )}
                  <span className="text-[11.5px] text-ink/60">{GENRE_LABELS[t.genre]}</span>
                  {t.bpm && <span className="tabular text-[11.5px] text-ink/60">{t.bpm} BPM</span>}
                  {t.moods && t.moods.length > 0 && (
                    <span className="text-[11.5px] text-ink/60">
                      {t.moods.map((m) => MOOD_TAGS[m]).join(' · ')}
                    </span>
                  )}
                  {credits.length > 0 && (
                    <span className="ml-auto text-[11.5px] text-ink/60">
                      참여 {credits.join(', ')}
                    </span>
                  )}
                </li>
              );
            })}
          </ol>
        </div>
      </div>
    </article>
  );
}
