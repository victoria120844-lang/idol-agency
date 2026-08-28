# IDOL AGENCY SIMULATOR

A single-player, browser-based Korean idol agency management simulator.
Distributed free on Twitter/X and Korean community sites, so it is a **fully
client-side static web app**: no backend, no login, no API keys, no analytics.
The whole game must run from a folder of static files.

---

## Tech stack

Use exactly this. Do not add a router, a state library, or a CSS framework.

| Concern | Choice |
| --- | --- |
| Build | Vite |
| UI | React 18 + TypeScript |
| Styling | Tailwind CSS v4 — tokens in `tailwind.config.ts`, loaded by `@config` from `src/styles/index.css` |
| State | Zustand + `persist` middleware → localStorage key `idol-sim-save-v1` |
| Animation | framer-motion |
| Routing | **None.** The game is a single-page state machine driven by `GameState.phase` |

Node is installed at `~/.local/node/node-v24.19.0-darwin-arm64/bin`; prepend it
to `PATH` before running npm.

```bash
export PATH="$HOME/.local/node/node-v24.19.0-darwin-arm64/bin:$PATH"
npm run dev      # dev server
npm run build    # tsc -b && vite build — must pass with zero TS errors
```

---

## Hard rules

These override any default habit. Every one of them is a review gate.

### 1. All game logic lives in `src/game/` as pure functions

React components never compute game math inline. A component reads state, calls
a function from `src/game/`, and renders the result. If you catch yourself
writing `sales * 0.7 + fans / 100` inside a `.tsx` file, stop and move it to
`formulas.ts`.

Functions in `src/game/` must not import React, read the store, touch
`localStorage`, or call `Date.now()` / `Math.random()`. Inputs in, value out.

### 2. All randomness goes through the seeded RNG in `src/game/rng.ts`

`Math.random()` is banned outside `createSeed()`. The generator is mulberry32.
The seed **and cursor** are stored in the save file, so a playthrough replays
identically from a seed. Create an `Rng` from `state.rng`, use it, then write
`snapshot(rng)` back into the store in the same action.

### 3. Korean for the player, English for the code

- Every string the player sees is **KOREAN** — labels, buttons, event text,
  results, tooltips, error messages.
- Every identifier, comment, file name, commit message, and type name is
  **ENGLISH**.
- Korean UI strings live next to the data they describe (`STAT_LABELS`,
  `CONCEPT_LABELS`, … in `constants.ts`), never scattered as inline literals in
  logic files.

### 4. Currency is Korean Won, formatted through helpers

- `formatWon(n)` → `"₩5,000,000"` — the default for money anywhere in the UI.
- `formatWonShort(n)` → `"1억 2,000만"` for tight spaces.
- `formatCount(n, unit)` uses 만/억 where natural → `formatCount(123400, '장')`
  gives `"12만 3,400장"`.

Never build a currency string by hand and never use `$` or `KRW`.

### 5. Never hardcode balance numbers inside components

Everything that affects how the game plays — costs, gains, thresholds,
probabilities, growth curves — goes in `src/game/constants.ts`. Components read
constants; they never define them. This keeps the entire balance surface
tunable from one file.

### 6. Every phase transition must be resumable from localStorage

Any change worth resuming goes through a store action so `persist` writes it.
After any transition the player can refresh the tab and land on the same screen
with the same state. Never hold game-relevant data in component `useState`.
Transient UI state (a modal being open, a hovered card) is fine in local state.

### 7. Performance and responsive targets

- Target **60fps**. Animate `transform` and `opacity` only; never animate
  `width`/`height`/`top`/`left` on a per-frame basis. Keep list re-renders
  narrow with selective Zustand selectors.
- **Mobile-first**: the game must be fully playable at **390px** width. Design
  each screen for 390px first, then add `sm:` / `lg:` for larger breakpoints.
- It must also look good on **desktop 1440px** — no stretched full-width text
  columns; content caps out and centres.
- Respect `prefers-reduced-motion` (already handled globally in
  `src/styles/index.css`).

---

## Game phase state machine

```
intro → company_create → trainee_recruit → debut_group → fandom_setup
      → album_produce → comeback_week (×4) → results → agency_hub
                              ↑                              │
                              └──────────────────────────────┘
```

`comeback_week` repeats 4 times per album cycle, tracked by
`GameState.promoWeek` (1–4). `agency_hub` is the loop-back point where the
player starts the next album cycle, incrementing `GameState.cycle`.

The union type is `GamePhase` in `src/game/types.ts`. Adding a phase means
updating that union, `PHASE_ORDER`, and `PhaseRouter`.

---

## Folder structure

```
src/
  app/              App entry, phase router, title screen, Zustand store
  dev/              StyleGuide — dev-only, delete before release
  features/         One folder per phase screen
    company/        기획사 설립
    trainees/       연습생 모집 / 육성
    debut/          데뷔조 결성
    fandom/         팬덤 설정
    album/          앨범 제작
    comeback/       4주 컴백 활동
    results/        컴백 결산
  components/ui/    Reusable primitives only — see the Design system section
  game/             Pure logic — no React imports allowed
    types.ts        Full data model + GamePhase union
    constants.ts    Every balance number and Korean label map
    rng.ts          Seeded mulberry32 + randInt/randPick/randWeighted/gaussian
    generators.ts   Seeded content generation (trainees, names, titles)
    formulas.ts     Game math + formatWon/formatCount
    events.ts       Random event deck and resolvers
    week.ts         Weekly comeback resolution
    settle.ts       Comeback settlement and generated result copy
    hub.ts          Between-cycle systems: costs, training, closure
    __tests__/      Balance simulation (vitest, node only)
  styles/           Tailwind entry and design tokens
```

A `features/` folder owns its screen component and any sub-components used only
by that screen. Anything used by two or more features moves to
`components/ui/`.

---

## Data model quick reference

Defined in `src/game/types.ts`:

`Company` · `CompanyDraft` · `District` · `AgencyTierId` · `StaffMember` ·
`Trainee` · `Stats` · `Group` · `Member` · `Relationship` · `Fandom` · `Album` ·
`Track` · `ScheduleSlot` · `WeekLog` · `GameEvent` · `ComebackResult` ·
`GameState`

`Company.tier` is a cached read of `agencyTier(awareness)` — derive it, never
set it by hand. Whenever awareness changes, refresh the tier in the same action.

### Stats are a closed set of six

`vocal · dance · rap · visual · charisma(매력) · mental` — and nothing else.
These are exactly the six axes of `StatHexagon`, so the radar chart and the stat
list can never drift apart. Adding a seventh stat means changing `Stats`,
`STAT_KEYS`, `STAT_LABELS`, `HEXAGON_AXES` and the hexagon geometry together.

### Relationships are the story engine

Every unordered member pair gets a `Relationship`: a type, a 호감도 from -100 to
+100, a generated Korean origin sentence, and an **event log that starts empty
and accumulates**. Later phases append `RelationshipEvent`s to `log`; nothing
may overwrite it.

- `dating` never appears at debut. Only `crush` can exist at creation, and every
  pair starts `romanceLocked: false` — romance has to develop through play.
- Origin sentences are dealt **without replacement** per type. A nine-member
  group is 36 pairs and one type can claim a dozen of them, so drawing
  uniformly repeats the same line four or five times. Keep the shuffled-queue
  approach in `generateRelationships`, and keep the template pools large.
- 팀워크 / 갈등 지수 / 스캔들 리스크 are all derived by `teamChemistry` from the
  matrix. Never set them by hand — recompute after any change to a relationship.

### Percentages that must total 100

Budget allocation and title-track part shares both have to sum to 100 at all
times. The invariant lives in `rebalanceAllocation` / `rebalanceShares`, which
absorb any change proportionally across the other entries and settle rounding
drift on the largest one — **not** in the UI. Never validate a total in a
component; call the rebalancer and the total is a property of the result.

### Wizards hold one draft

A multi-step screen keeps a single draft object at the top and passes slices
down. Nothing is stored per-step, so stepping back can never lose input. Both
`DebutGroup` and `AlbumProduce` do this, and both preview their result by
building it from `createRng(state.rng)` — a local generator at the saved stream
position produces exactly what the commit will, without consuming a draw.

### The weekly loop

`src/game/week.ts` holds the whole comeback resolution: schedule effects →
fatigue and benching → relationship progression → recap. It is pure; the store
only commits what it returns.

- Order matters. Effectiveness is read from the fatigue members carried *into*
  the week, then the week's own fatigue lands, then benching is decided for the
  week after. Over-booking hurts the following week — that is the pressure the
  phase runs on.
- Fatigue and awareness are **scaled** before they land
  (`COMEBACK.weeklyFatigueScale`, `awarenessScale`). The raw activity sums are
  "how tiring / how visible this booking is", not per-member weekly deltas.
  Without the scaling every member is benched by week 3 and a small label
  reaches 중견 in one comeback.
- Any projection the UI shows must apply the same scaling as the resolver.
  `WeekReport` does; keep it that way or the number the player plans against
  stops matching the outcome.

### Settlement and the results screen

`src/game/settle.ts` turns four weeks of logs into the six headline numbers,
the grade and every generated Korean line. It runs once, inside the final
`closeWeek`, and freezes onto `Album.result` — the results screen only reads.

- **Money is a settlement, not gross.** `ECONOMY.wonPerAlbum` is the retail
  price and `wonPerThousandStreams` the platform payout; the label sees
  `RESULTS.labelAlbumMargin` / `labelStreamMargin` of each. Without those a
  debut mini album returned ₩3.3억 on a ₩2.5M budget and every later financial
  decision stopped mattering.
- **Every metric ships with a Korean reason.** A number with no explanation is
  not a result, it is a readout. `ResultMetric.reason` is required.
- The four-week chart plots `WeekLog.fandomAfter` / `buzzAfter` — absolute
  snapshots. Accumulating deltas drifts away from the headline number because
  event effects land while the player answers, outside any week's delta.
- Generated copy varies by grade (`reactionTone`) and every member note is
  chosen most-specific-first. Five identical sentences down the roster read as
  a bug, not a settlement.

### PNG export

`ShareCard` renders off-screen at exactly 1200x675 and is exported with
`toPng`. Two things matter: `pixelRatio: 1`, because the node is already at the
target size, and `skipFonts: true`, because the Pretendard and JetBrains Mono
stylesheets are cross-origin and html-to-image logs a `SecurityError` per sheet
trying to inline them. The card declares its own font stack with system Korean
fallbacks, so nothing is lost.

### The agency hub closes the loop

`src/game/hub.ts` owns everything that happens *between* comebacks: operating
costs, rest, departure rolls, 강습 and the closure path.

- `settleCycle` is charged **once per cycle**, guarded by `settledCycle`. It
  runs from a `useEffect` on the hub, so a re-render or a refresh must not
  charge rent twice.
- **Training cannot beat the potential grade.** `trainingOutcome` scales the
  gain by the grade and stops dead at that grade's ceiling — money turning a D
  into an ace would make the hidden grade, and paying to reveal it, pointless.
- Two consecutive cycles closing in the red end the run. One bad comeback is a
  crisis the player can trade out of; two is a closure.
- The closure ending is **not a phase.** `GameState.gameOver` is rendered by
  `App` ahead of `PhaseRouter`, so the documented state machine stays exactly
  as it is.

### Draws triggered from an effect must be idempotent

`openWeekEvents` is called from a `useEffect` that fires whenever the board is
full. Answering the last event empties `pendingEvents`, which looks identical
to "not drawn yet" — so the draw is guarded by `eventsDrawnWeek`, not by the
queue being empty. Any other once-per-week draw needs the same kind of marker.

### Draw order is part of the save format

`generateTrainee` draws id → age → nationality → stats → signature stat →
bonus → potential → personality → specialty. Reordering or inserting a draw
changes what every existing seed produces. **Append new draws at the end.**

`GameState` is the entire save file. It must stay JSON-serializable: no class
instances, no `Map`/`Set`, no `Date` objects, no functions. Bump `SAVE_VERSION`
in `constants.ts` whenever the shape changes and add a branch to `migrate` in
`store.ts`. Current version: **2**.

### Session vs. save

`GameStore.booted` is the one field that is *not* persisted. It is false on
every page load, so the app always opens on the intro screen no matter how far
the save has progressed; 이어하기 sets it true and drops back into the persisted
phase, 새 게임 resets first. Anything else you add to the store must go in
`partialize` or it will silently fail to save.

### RNG discipline in actions

A store action that needs randomness follows the same three steps every time:

```ts
const rng = createRng(get().rng);   // resume the stream where the save left it
const thing = makeThing(rng, …);    // pure function from src/game/
set({ thing, rng: snapshot(rng) }); // write the cursor back in the same set()
```

Never create an `Rng` outside an action, never keep one in a component, and
never `set` the result without also writing `snapshot(rng)`.

---

## Design system

Art direction: **K-pop label operations dashboard.** Editorial, high-contrast,
precise — Bloomberg terminal crossed with a label's A&R deck. Card-based
throughout. This is a dashboard, not a mobile game.

### Tokens

Declared twice on purpose: `tailwind.config.ts` (loaded via `@config`) drives
the utility classes, and `:root` in `src/styles/index.css` carries the identical
values as raw CSS variables for inline SVG and the glow shadow. Change a value
in both, never in a component.

| Token | Value | Use |
| --- | --- | --- |
| `--ink` | `#0A0A0B` | primary dark background (the shell) |
| `--ink-soft` | `#141416` | elevated dark surface |
| `--ink-line` | `#26262A` | dark hairline |
| `--paper` | `#FFFFFF` | light background / card face |
| `--paper-soft` | `#F4F4F5` | muted light surface |
| `--paper-line` | `#E4E4E7` | light hairline |
| `--neon` | `#FF1F3D` | the ONLY accent colour |
| `--neon-dim` | `#C4162E` | accent hover |
| `--neon-glow` | `rgba(255,31,61,.35)` | the glow shadow only |
| `--muted` | `#8A8A93` | secondary text **on ink surfaces** |

### Rules

- The app runs a **dark shell (ink) carrying white cards (paper)**. That pairing
  is the dominant pattern. Text on paper cards is ink; text on the shell is
  paper/muted.
- Neon is used **only** for: primary actions, active state, selected member,
  live indicators, key numbers, chart deltas. Never as a large fill.
- **`Fandom.color` is a secondary accent, not a second system accent.** It may
  appear in the fandom panel, the results chart series and the group profile
  card. It must never reach buttons, the rail, the top bar, the ticker or any
  other global chrome — `scratch/fandom.mjs` asserts this. Neon red stays the
  one system accent.
- Glow is `box-shadow: 0 0 0 1px var(--neon), 0 0 24px var(--neon-glow)` via the
  `.glow-neon` class, on active and primary elements only.
- No purple, no blue. The only gradient in the product is the barely-visible
  vertical ink wash on `body`.
- Radius: `rounded-chip` (4px) for chips and inputs, `rounded-card` (10px) for
  cards. Nothing is fully rounded except avatars.
- **1px hairlines everywhere instead of heavy shadows.**
- `--muted` on white is 3.4:1 and fails AA. On paper surfaces use `text-ink/60`
  for secondary text; `Card variant="paper"` and `Modal variant="paper"` add the
  `.on-paper` class, which darkens `.kicker` for the same reason.

### Typography

- Korean UI: **Pretendard**, loaded from CDN in `index.html`. Numerals and
  labels: **JetBrains Mono**, also CDN. These two stylesheets are the only
  runtime network requests the product makes — everything else is bundled.
- All stat numbers, money and chart figures carry the `.tabular` class
  (`font-variant-numeric: tabular-nums`).
- Section labels use the `.kicker` class: UPPERCASE, 11px, `0.12em`, muted —
  e.g. `TRAINEE ROSTER` above `연습생 명단`.
- **Every screen header shows an English kicker + Korean title pair.** The pairs
  for each phase live in `PHASE_LABELS` in `constants.ts`.

Korean text uses `word-break: keep-all` (set globally) so lines never break
mid-word.

### Never hardcode a Korean particle after a variable

Generated sentences splice names in constantly, and `${name}은` is wrong half
the time — a wrong 은/는 is the fastest way to make Korean copy read as machine
output. Use `josa(word, '은는' | '이가' | '을를' | '과와' | '으로로' | '이라는')`
from `formulas.ts`, which reads the 받침 off the last syllable. `scratch/josa.mjs`
checks it against the tricky cases.

### Components

`src/components/ui/` — `AppShell`, `Avatar`, `Card`, `NeonButton`, `StatBar`,
`StatHexagon`, `TierBadge`, `Field` / `TextInput` / `SelectInput` /
`ColorInput`, `Tag` / `Chip` / `GradeTag`, `MetricTile`, `Modal`, `Toast`,
`Stepper`, `TickerBar`, plus the hand-drawn `icons.tsx` set. Import from
`../components/ui`, never from the individual files.

### The `surface` prop is not optional thinking

Any component that can sit on both grounds takes `surface="paper" | "ink"` —
`NeonButton` (ghost only), `TextInput`, `SelectInput`, `StatBar`,
`StatHexagon`, `Tag`, `MetricTile`, `TierBadge`. **Set it.** Two competing
Tailwind utilities in one class string resolve by stylesheet order, not by the
order you wrote them, so `className="bg-ink-soft text-paper"` on a
paper-defaulted control silently renders white-on-white. Passing a class to
recolour a control is the bug; passing `surface` is the fix.

`AppShell` is the global chrome: ticker, fixed left icon rail, thin top bar
(회사명 / 보유 자금 / 현재 주차), padded content area. Below `lg` the rail
collapses into a bottom bar. Every phase except `intro` renders inside it.

### Styleguide

`#/styleguide` renders every component in every variant. It is dev-only —
`App.tsx` gates it behind `import.meta.env.DEV`, so it never ships. Delete
`src/dev/` once the real screens are done.

---

## Build discipline

- `npm run build` must pass with **zero TypeScript errors** before any section
  is considered done.
- No `any`. No `@ts-ignore`. Unused locals and parameters are compile errors by
  config — prefix intentionally unused parameters with `_`.
- The two font stylesheets in `index.html` are the only runtime network
  requests. Images and data are bundled or generated; never add a CDN script,
  an analytics tag, or an API call.
- Verify layout with the headless audit before calling a section done: it
  reports horizontal overflow and console errors at a given width.

  ```bash
  node scratch/audit.mjs "http://localhost:5173/#/styleguide" 390
  ```

  Both 390px and 1440px must report `offenders: []` and `errors: []`. Note the
  audit skips anything inside an `overflow-x` container, so still look at a
  screenshot — the bottom nav and the ticker have both hidden real bugs from it.
- `scratch/flow.mjs` walks intro → company_create → submit → reload and asserts
  the save round-trips.
- `scratch/recruit.mjs` recruits 21 trainees and checks the free/paid boundary,
  the generation rules, evaluation, release and persistence.
- `scratch/debut.mjs` walks the three-step debut wizard with a nine-member
  group and checks live concept fit, graph node spacing, origin coverage and
  the persisted matrix.
- `scratch/fandom.mjs` checks that the lightstick preview repaints on every
  colour change, that 개인 팬 sum to `Fandom.size`, and that the fandom colour
  never leaks into chrome.
- `scratch/album.mjs` walks the four-step production wizard, hammers the budget
  sliders, and asserts the frozen album carries every choice.
- `scratch/comeback.mjs` plays all four promotion weeks, answers every event,
  and asserts each week writes a relationship entry and that fatigue and
  benching actually move the results math.
- `scratch/results.mjs` plays a full comeback twice — once well, once badly —
  and asserts the six metrics are non-zero and explained, the grade separates
  the runs, and the PNG exports at 1200x675 with the fandom colour in its
  pixels.
- `scratch/hub.mjs` plays two full cycles back to back, trains a trainee, and
  forces the bankruptcy path — the regression net for the loop itself.
- `scratch/josa.mjs` unit-checks the Korean particle helper.

All nine suites must report zero failures before a section is done.

### The balance simulation

`npm run test:balance` runs 200 seeded first comebacks end to end through the
pure logic and prints the grade and 초동 distributions. It is the only honest
way to tune — a screenshot of one lucky run tells you nothing about the shape
of the ladder.

The composite score is deliberately **curved** (`RESULTS.scoreCurve`): a
weighted mean of six normalised metrics collapses toward the middle, and the
first simulation put 82% of runs on a D. The curve expands around the observed
centre and compresses the top so the letters actually separate. If a balance
constant changes, re-run the simulation and re-fit `center` before trusting
anything.

### Save slots

Three slots, each its own localStorage key; `src/app/saves.ts` owns the keys and
the version guard. `persist` binds to the active slot **at store creation**, so
switching slots reloads the page rather than pretending the swap can happen
live. Import refuses both newer and older saves — a shape mismatch is worse
than a refusal.

  These are the regression net for rule 6. Extend them as phases land.
- Two layout traps have already cost real bugs; check for both when a screen
  has a wide child:
  - **Grid and flex items default to `min-width: auto`.** A child with a wide
    min-content (the lightstick field, a long table) widens its whole track past
    the viewport, and an ancestor's `overflow-hidden` will not stop it. Put
    `min-w-0` on the item.
  - The audit skips anything inside an `overflow-x` container, so it cannot see
    these. Always compare `scrollWidth` to `clientWidth` as well.
