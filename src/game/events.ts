/**
 * The random event deck.
 *
 * Events are pure data plus pure resolvers. Rolling draws from the seeded RNG,
 * and applying a choice returns a delta rather than mutating anything — the
 * store is what commits the result.
 */

import { randInt, randPick, randWeighted, type Rng } from './rng';
import type {
  EventEffect,
  GameEvent,
  GameState,
  Id,
  Member,
  PendingEvent,
  Relationship,
} from './types';

/**
 * The deck.
 *
 * `{a}` / `{b}` are the targeted member names, `{group}` the group name. Every
 * choice states its trade-off in the label so the player is never guessing
 * blind, and no choice is strictly better than the others.
 */
export const EVENTS: readonly GameEvent[] = [
  {
    id: 'member_conflict',
    kicker: 'INTERNAL',
    title: '멤버 간 갈등 발생',
    body:
      '{a}와 {b}가 연습실에서 크게 부딪혔습니다.\n' +
      '스태프가 말렸지만 둘 다 그날 스케줄 내내 말을 섞지 않았습니다.\n' +
      '다른 멤버들도 눈치를 보고 있습니다.',
    category: 'member',
    target: 'pair',
    weight: 22,
    choices: [
      {
        id: 'mediate',
        label: '대표가 직접 중재한다',
        resultText: '대표가 두 사람을 따로 불러 앉혔습니다. 앙금은 남았지만 대화는 재개됐습니다.',
        effects: { teamwork: 4, conflict: -6, pairAffinity: 12, fatigue: 3 },
      },
      {
        id: 'ignore',
        label: '둘이 풀도록 둔다',
        resultText: '개입하지 않았습니다. 팀 분위기가 눈에 띄게 굳었습니다.',
        effects: { teamwork: -7, conflict: 10, pairAffinity: -14 },
      },
    ],
  },
  {
    id: 'dating_rumor',
    kicker: 'SCANDAL',
    title: '열애설 제기',
    body:
      '연예 매체가 {a}와 {b}의 열애설을 보도했습니다.\n' +
      '숙소 앞에서 찍힌 사진 두 장이 함께 올라왔습니다.\n' +
      '팬 커뮤니티 반응이 갈리고 있고, 기자들이 회사 입장을 기다립니다.',
    category: 'scandal',
    target: 'romance_pair',
    weight: 16,
    choices: [
      {
        id: 'admit',
        label: '인정한다',
        resultText:
          '공식 입장을 냈습니다. 떠나는 팬도 있었지만 응원 글이 더 오래 남았습니다.',
        effects: {
          fanLoyalty: -10,
          awareness: 6,
          buzz: 30,
          sentiment: 8,
          scandalRisk: -12,
          pairAffinity: 10,
        },
      },
      {
        id: 'deny',
        label: '부인한다',
        resultText: '사실무근이라고 밝혔습니다. 당장은 잠잠해졌지만 불씨는 남았습니다.',
        effects: {
          fanLoyalty: 4,
          awareness: 3,
          buzz: 18,
          sentiment: -6,
          scandalRisk: 14,
          pairAffinity: -6,
        },
      },
      {
        id: 'silence',
        label: '무대응으로 간다',
        resultText: '아무 입장도 내지 않았습니다. 기사만 계속 재생산됩니다.',
        effects: {
          fanLoyalty: -4,
          awareness: 4,
          buzz: 22,
          sentiment: -2,
          scandalRisk: 6,
        },
      },
    ],
  },
  {
    id: 'trending',
    kicker: 'VIRAL',
    title: '실검·커뮤 화제성 폭발',
    body:
      '{group}의 무대 직캠이 커뮤니티에서 하루 만에 퍼졌습니다.\n' +
      '평소 유입이 없던 게시판까지 글이 올라오고 있습니다.\n' +
      '지금 화력을 어디에 쓸지 정해야 합니다.',
    category: 'lucky',
    target: 'none',
    weight: 18,
    choices: [
      {
        id: 'push_ads',
        label: '광고를 태워 화력을 키운다',
        resultText: '집행한 광고가 붙어 유입이 며칠 더 이어졌습니다.',
        effects: { won: -1_500_000, buzz: 34, awareness: 7, fanSize: 2_600, streams: 40 },
      },
      {
        id: 'ride',
        label: '자연 확산에 맡긴다',
        resultText: '돈을 쓰지 않았습니다. 화제성은 짧고 굵게 지나갔습니다.',
        effects: { buzz: 18, awareness: 3, fanSize: 1_100, streams: 18 },
      },
    ],
  },
  {
    id: 'hate_comments',
    kicker: 'BACKLASH',
    title: '악성 댓글 이슈',
    body:
      '{a}를 겨냥한 악성 댓글이 며칠째 이어지고 있습니다.\n' +
      '본인은 괜찮다고 하지만 연습실에서 표정이 눈에 띄게 어둡습니다.\n' +
      '팬덤은 회사가 나서 주길 바라고 있습니다.',
    category: 'member',
    target: 'lowest_mental',
    weight: 20,
    choices: [
      {
        id: 'legal',
        label: '법적 대응을 공지한다',
        resultText: '고소 방침을 공지했습니다. 팬덤이 결집했고 본인도 한숨 돌렸습니다.',
        effects: { won: -800_000, fanLoyalty: 8, sentiment: 4, mentalHit: 6, buzz: 10 },
      },
      {
        id: 'shield',
        label: '스케줄을 줄이고 쉬게 한다',
        resultText: '일정을 덜어냈습니다. 회복은 빨랐지만 그 주 노출이 줄었습니다.',
        effects: { memberFatigue: -25, mentalHit: 4, buzz: -8, fanSize: -400, teamwork: 2 },
      },
      {
        id: 'endure',
        label: '대응하지 않고 활동을 이어간다',
        resultText: '아무 조치도 하지 않았습니다. 본인이 무대에서 실수를 반복했습니다.',
        effects: { mentalHit: 18, fanLoyalty: -6, sentiment: -5, memberFatigue: 12 },
      },
    ],
  },
  {
    id: 'senior_comeback',
    kicker: 'INDUSTRY',
    title: '선배 아티스트 컴백 겹침',
    body:
      '같은 주에 대형 기획사 선배 그룹이 컴백을 확정했습니다.\n' +
      '음악방송 큐시트와 음원 차트가 그쪽으로 쏠릴 것이 확실합니다.\n' +
      '{group}의 노출 계획을 다시 짜야 합니다.',
    category: 'industry',
    target: 'none',
    weight: 17,
    choices: [
      {
        id: 'avoid',
        label: '정면 충돌을 피하고 팬덤에 집중한다',
        resultText: '대중 노출을 줄이고 팬덤 행사에 힘을 실었습니다.',
        effects: { awareness: -3, buzz: -10, fanLoyalty: 9, sales: 900, streams: -12 },
      },
      {
        id: 'fight',
        label: '그대로 부딪힌다',
        resultText: '일정을 바꾸지 않았습니다. 음원은 밀렸지만 이름은 같이 오르내렸습니다.',
        effects: { streams: -30, sales: -400, awareness: 5, buzz: 14, fatigue: 5 },
      },
    ],
  },
  {
    id: 'fandom_streaming',
    kicker: 'FANDOM',
    title: '팬덤 총공 성공',
    body:
      '{group} 팬덤이 자발적으로 스트리밍 총공을 조직했습니다.\n' +
      '목표 순위를 넘겼고, 인증 글이 밤새 올라왔습니다.\n' +
      '회사가 화답할지 결정해야 합니다.',
    category: 'fandom',
    target: 'none',
    weight: 15,
    choices: [
      {
        id: 'thanks_content',
        label: '감사 콘텐츠를 급하게 찍는다',
        resultText: '새벽에 찍은 감사 영상이 올라갔습니다. 팬덤이 크게 반응했습니다.',
        effects: { won: -400_000, fanLoyalty: 12, fanSize: 1_800, streams: 26, fatigue: 6 },
      },
      {
        id: 'quiet_thanks',
        label: 'SNS 글로만 감사를 전한다',
        resultText: '짧은 글을 올렸습니다. 충분하다는 반응과 아쉽다는 반응이 함께 나왔습니다.',
        effects: { fanLoyalty: 5, fanSize: 700, streams: 16 },
      },
    ],
  },
  {
    id: 'broadcast_accident',
    kicker: 'ON AIR',
    title: '생방송 사고',
    body:
      '음악방송 생방송 중 {a}의 인이어가 빠졌습니다.\n' +
      '박자가 반 마디 밀렸고 그대로 방송을 탔습니다.\n' +
      '클립이 이미 돌고 있습니다.',
    category: 'industry',
    target: 'member',
    weight: 16,
    choices: [
      {
        id: 'live_again',
        label: '라이브 영상을 따로 찍어 올린다',
        resultText: '같은 곡을 라이브로 다시 찍어 올렸습니다. 실력 논란이 뒤집혔습니다.',
        effects: { won: -300_000, sentiment: 7, buzz: 16, fanLoyalty: 6, memberFatigue: 10 },
      },
      {
        id: 'let_pass',
        label: '언급하지 않고 넘어간다',
        resultText: '따로 대응하지 않았습니다. 클립이 며칠 더 돌았습니다.',
        effects: { sentiment: -8, buzz: 8, mentalHit: 10 },
      },
    ],
  },
  {
    id: 'live_praise',
    kicker: 'ON AIR',
    title: '라이브 극찬',
    body:
      '{a}의 생방송 라이브가 음악 커뮤니티에서 화제입니다.\n' +
      '"신인 맞냐"는 댓글이 상위에 올라와 있습니다.\n' +
      '이 흐름을 어떻게 쓸지 정해야 합니다.',
    category: 'lucky',
    target: 'member',
    weight: 14,
    choices: [
      {
        id: 'solo_stage',
        label: '개인 무대 영상을 밀어준다',
        resultText: '개인 무대를 따로 편집해 올렸습니다. 본인 팬이 크게 늘었습니다.',
        effects: { memberFans: 2_400, buzz: 18, sentiment: 6, teamwork: -3 },
      },
      {
        id: 'group_stage',
        label: '그룹 무대로 묶어서 낸다',
        resultText: '팀 무대로 묶어 냈습니다. 화제성은 덜했지만 팀이 고르게 올라갔습니다.',
        effects: { fanSize: 1_500, buzz: 11, sentiment: 4, teamwork: 4 },
      },
    ],
  },
  {
    id: 'self_written_buzz',
    kicker: 'CREDITS',
    title: '자작곡 화제',
    body:
      '{a}가 참여한 수록곡이 뒤늦게 입소문을 타고 있습니다.\n' +
      '"타이틀보다 낫다"는 반응이 이어지고 있습니다.\n' +
      '회사가 이 흐름을 밀지 결정해야 합니다.',
    category: 'lucky',
    target: 'member',
    weight: 13,
    choices: [
      {
        id: 'push_bside',
        label: '수록곡 무대를 편성한다',
        resultText: '수록곡 무대를 따로 잡았습니다. 음원이 역주행하기 시작했습니다.',
        effects: { won: -500_000, streams: 34, buzz: 15, fanLoyalty: 7, memberFans: 1_200 },
      },
      {
        id: 'keep_focus',
        label: '타이틀곡에 집중한다',
        resultText: '타이틀 프로모션을 유지했습니다. 수록곡 흐름은 조용히 식었습니다.',
        effects: { streams: 8, sales: 500 },
      },
    ],
  },
] as const;

/** Look up a single event by id. */
export function getEvent(id: string): GameEvent | undefined {
  return EVENTS.find((event) => event.id === id);
}

// ---------------------------------------------------------------------------
// Eligibility
// ---------------------------------------------------------------------------

/** A 썸 or 연애 pair, which the dating rumour needs to exist. */
function romancePairs(relationships: readonly Relationship[]): Relationship[] {
  return relationships.filter((r) => r.type === 'crush' || r.type === 'dating');
}

/** Pairs that could plausibly blow up: already negative or rivalrous. */
function frictionPairs(relationships: readonly Relationship[]): Relationship[] {
  return relationships.filter(
    (r) => r.type === 'conflict' || r.type === 'rival' || r.affinity < 10,
  );
}

/**
 * Events whose preconditions the current state satisfies — a dating rumour
 * cannot fire without a 썸 pair, and 자작곡 화제 needs a credited b-side.
 */
export function eligibleEvents(state: GameState): GameEvent[] {
  const group = state.group;
  if (!group) return [];

  const album = state.albums.find((a) => a.id === state.activeAlbumId);
  const hasSelfWritten = Boolean(
    album?.tracks.some((t) => t.participantIds.length > 0),
  );
  const hasRomance = romancePairs(group.relationships).length > 0;
  const hasFriction = frictionPairs(group.relationships).length > 0;

  return EVENTS.filter((event) => {
    if (event.id === 'dating_rumor') return hasRomance;
    if (event.id === 'self_written_buzz') return hasSelfWritten;
    if (event.target === 'pair') return hasFriction;
    return true;
  });
}

// ---------------------------------------------------------------------------
// Firing
// ---------------------------------------------------------------------------

/** Fill `{a}` / `{b}` / `{group}` in an event body or headline. */
export function fillEventText(
  text: string,
  groupName: string,
  a?: Member,
  b?: Member,
): string {
  return text
    .replaceAll('{group}', groupName)
    .replaceAll('{a}', a?.name ?? '멤버')
    .replaceAll('{b}', b?.name ?? '멤버');
}

/** The member with the lowest 멘탈 — who a hate-comment wave actually hurts. */
export function lowestMentalMember(members: readonly Member[]): Member | undefined {
  if (members.length === 0) return undefined;
  return members.reduce((lo, m) => (m.stats.mental < lo.stats.mental ? m : lo));
}

/**
 * Draw this week's events.
 *
 * Draw order: for each pick, the event, then its target. Distinct events only —
 * the same headline twice in one week reads as a bug.
 */
export function rollWeeklyEvents(
  rng: Rng,
  state: GameState,
  count: number,
): PendingEvent[] {
  const group = state.group;
  if (!group) return [];

  const pool = eligibleEvents(state);
  const out: PendingEvent[] = [];
  const used = new Set<string>();

  for (let i = 0; i < count; i += 1) {
    const available = pool.filter((e) => !used.has(e.id));
    if (available.length === 0) break;

    const event = randWeighted(rng, available, (e) => e.weight);
    used.add(event.id);

    let a: Member | undefined;
    let b: Member | undefined;

    if (event.target === 'member') {
      a = randPick(rng, group.members);
    } else if (event.target === 'lowest_mental') {
      a = lowestMentalMember(group.members);
    } else if (event.target === 'romance_pair') {
      const pairs = romancePairs(group.relationships);
      if (pairs.length > 0) {
        const pair = randPick(rng, pairs);
        a = group.members.find((m) => m.id === pair.a);
        b = group.members.find((m) => m.id === pair.b);
      }
    } else if (event.target === 'pair') {
      const pairs = frictionPairs(group.relationships);
      if (pairs.length > 0) {
        const pair = randPick(rng, pairs);
        a = group.members.find((m) => m.id === pair.a);
        b = group.members.find((m) => m.id === pair.b);
      }
    }

    out.push({
      id: `ev_${state.week}_${i}_${randInt(rng, 0, 9999)}`,
      eventId: event.id,
      week: state.week,
      memberId: a?.id,
      pairA: a?.id,
      pairB: b?.id,
      body: fillEventText(event.body, group.name, a, b),
    });
  }

  return out;
}

/** Resolve a player's choice into the effect that should be applied. */
export function resolveChoice(eventId: string, choiceId: string): EventEffect | null {
  const event = getEvent(eventId);
  const choice = event?.choices.find((c) => c.id === choiceId);
  return choice ? choice.effects : null;
}

/** The Korean line a choice writes into the recap. */
export function choiceResultText(eventId: string, choiceId: string): string {
  const event = getEvent(eventId);
  return event?.choices.find((c) => c.id === choiceId)?.resultText ?? '';
}

/** The headline for a pending event, with names already spliced in. */
export function pendingEventTitle(pending: PendingEvent, groupName: string, members: readonly Member[]): string {
  const event = getEvent(pending.eventId);
  if (!event) return '';
  const a = members.find((m) => m.id === pending.pairA);
  const b = members.find((m) => m.id === pending.pairB);
  return fillEventText(event.title, groupName, a, b);
}

/** Ids of every member an effect should be aimed at. */
export function effectTargets(pending: PendingEvent): { memberId?: Id; pair?: [Id, Id] } {
  return {
    memberId: pending.memberId,
    pair: pending.pairA && pending.pairB ? [pending.pairA, pending.pairB] : undefined,
  };
}
