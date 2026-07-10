# PRD: Chinese Rummy v1

**Status:** ready-for-agent  
**Labels:** ready-for-agent

---

## Problem Statement

A family plays contract rummy with house rules that differ from off-the-shelf rummy apps: wild twos, strict wild-adjacency rules, exact-size contracts across ten rounds, lay-off-only play after opening, and wild relocation on swap. They cannot play together reliably online, and no existing product implements these rules. When they do find time to play, they need to pick up an in-progress game days later without losing state.

## Solution

A mobile-friendly web app where two to five authenticated players join a persistent **Room** via a short code, play the full ten-round **Game** with server-authoritative rules, and **resume** the same **Game** after disconnecting. The app enforces house rules precisely — including wild adjacency, exact contracts, opening-turn restrictions, and discard-to-go-out — while keeping the UI simple (tap-to-select cards, visible table melds, hidden opponent hands).

## User Stories

### Account and identity

1. As a player, I want to sign in with Google, so that I can rejoin games from any device.
2. As a player, I want to sign in with an email magic link, so that I can play without linking a social account.
3. As a player, I want to set a display name, so that other players can recognize me at the table.
4. As a guest, I want to join a room without an account, so that I can try the game quickly.
5. As a guest who wants to resume later, I want to be prompted to create or link an account, so that I do not lose access to my seat if I lose my browser session.
6. As a returning player, I want to see my in-progress games, so that I can resume where I left off.

### Room and lobby

7. As a host, I want to create a room and receive a short code, so that I can invite family members.
8. As a host, I want to share a link containing the room code, so that joining is one tap on mobile.
9. As a player, I want to join a room by entering its code, so that I can sit at the table.
10. As a player, I want to choose an open seat, so that I can sit where I like.
11. As a player, I want to mark myself Ready, so that the host knows I am prepared to start.
12. As a host, I want to start the game when two to five seats are filled and all seated players are Ready, so that we only begin when everyone is present.
13. As a player, I want to see who is in each seat and their Ready status, so that I know who we are waiting on.
14. As a host, I want the room to persist if everyone disconnects, so that we can resume the same game later.
15. As a returning player, I want to rejoin my seat in a persisted room using my account, so that my hand and game progress are intact.

### Game setup and structure

16. As a player, I want a new game to run ten rounds following the contract schedule, so that we play the full family format.
17. As a player, I want the dealer to rotate clockwise each round, so that deal advantage is fair over the game.
18. As a player, I want the lead player to be seated left of the dealer, so that turn order matches our table.
19. As a player, I want each round to begin with a freshly shuffled shoe of two decks plus four jokers, so that the card distribution matches our physical game.
20. As a player, I want to receive exactly thirteen cards at the start of each round, so that hand size is correct.
21. As a player, I want to see the current round number and its contract, so that I know what I must lay on my opening turn.
22. As a player, I want to see cumulative deadwood scores for all players, so that I know who is winning across the ten rounds.

### Turn flow

23. As a player whose turn it is, I want to draw one card from the stock or the top of the discard pile, so that I follow normal turn order.
24. As a player whose turn it is, I want to discard one card to end my turn, so that play passes clockwise.
25. As a player, I want the app to reject my action if it is not my turn, so that rules cannot be broken online.
26. As a player, I want to see whose turn it is clearly, so that nobody waits unnecessarily.
27. As a player, I want the stock to be reshuffled from discards (keeping the top discard) when the stock is empty, so that the round can continue.
28. As a player, I want to see the top card of the discard pile, so that I can decide whether to draw it.

### Opening and contracts

29. As a player who has not opened, I want to lay all contract melds in a single opening turn, so that I satisfy the house rule for going down.
30. As a player, I want the app to enforce exact meld sizes for my contract (not merely minimum sizes), so that invalid openings are rejected.
31. As a player, I want to be blocked from laying partial contracts across multiple turns, so that the opening rule is enforced.
32. As a player who has opened, I want to be blocked from creating new melds for the rest of the round, so that lay-off-only play is enforced.
33. As a player who has opened, I want to lay off on my next turn (not the opening turn), so that timing matches our table.
34. As a player who has opened, I want to lay off on any player's melds, so that I can reduce deadwood strategically.

### Melds, wilds, and lay-offs

35. As a player, I want to lay valid sets (same rank, duplicate suits allowed), so that set contracts are playable.
36. As a player, I want to lay valid runs (same suit, consecutive ranks, Ace high or low without K-A-2 wrap), so that run contracts are playable.
37. As a player laying a wild, I want to declare what rank it represents, so that the meld is unambiguous.
38. As a player, I want the app to reject melds where two wilds are adjacent, so that wild adjacency is enforced.
39. As a player, I want twos to behave as wilds with the same adjacency rules as jokers, so that house rules are complete.
40. As a player laying off, I want to replace a wild with a natural card and relocate the wild to another meld on the same player's board, so that wild swap matches our table.
41. As a player laying off, I want to choose which of that player's melds receives the relocated wild, so that I control the swap destination.
42. As a player laying off, I want wild relocation to ignore adjacency rules, so that swaps remain legal when they would otherwise be blocked.

### Going out and scoring

43. As a player, I want to go out by discarding my last card, so that the round ends correctly.
44. As a player, I want the app to reject going out without a final discard, so that meld-out is not allowed.
45. As a player who went out, I want zero deadwood scored for that round, so that the incentive to go out is correct.
46. As a player who did not go out, I want my deadwood scored using the house point table, so that totals accumulate correctly.
47. As a player, I want the game to declare the lowest cumulative score winner after round ten, so that the full game has a clear outcome.
48. As a player, I want to see a round summary when someone goes out, so that I can verify scoring.

### Table UI

49. As a player, I want to see my hand as a sortable fan, so that I can manage cards on mobile.
50. As a player, I want to tap cards to select them and tap destinations to play, so that interaction works on touch screens.
51. As a player, I want to see all melds on the table, so that lay-off opportunities are visible.
52. As a player, I want opponent hand sizes visible but not their cards, so that I have table awareness without cheating.
53. As a player, I want a concise rules reference for contracts and wild rules, so that I can settle disputes without leaving the app.
54. As a player, I want confirmation before submitting a turn-ending action, so that mis-taps do not ruin the game.

### Persistence and realtime

55. As a player, I want game state to update immediately when another player acts, so that the game feels live.
56. As a player who disconnects, I want the game to wait for me, so that I am not auto-dropped for a brief outage.
57. As a player returning days later, I want the same round, hands, and scores restored, so that resume is seamless.

## Implementation Decisions

### Architecture overview

The system splits into four layers:

1. **Rules Engine** — pure TypeScript, no I/O. Owns all legality checks and state transitions for a round/game.
2. **Game Server** — Convex mutations and queries. Persists state, authenticates actors, invokes the Rules Engine, exposes reactive reads.
3. **Room Service** — Convex-backed lobby lifecycle (create, join seat, ready, start). Transitions room into an active game.
4. **Web Client** — Next.js App Router. Subscribes to Convex queries; sends mutations for player actions; tap-to-select UI.

This follows ADR 0001 (Next.js + Convex) and ADR 0007 (v1 scope).

### Rules Engine module

A single module with a narrow public interface. All house rules live here. Convex must not reimplement rule checks inline.

**Public interface (conceptual):**

- `createGame(config)` — player count, player ids, seat order.
- `startRound(state)` — shuffle shoe, deal thirteen each, set dealer/lead, attach contract for current round number.
- `legalActions(state, playerId)` — draw sources, whether opening/lay-off/discard available, valid targets.
- `applyAction(state, action)` — returns new state or structured error (illegal meld, wrong turn, wild adjacency violation, etc.).
- `scoreRound(state)` — deadwood totals when someone goes out.
- `gameComplete(state)` — true after round ten scoring.

**Key rule encodings (from ADRs and CONTEXT):**

- Contract schedule: exact meld sizes on opening (ADR 0002).
- Wild family: jokers + twos; adjacency ban on initial meld placement (ADR 0003, 0004).
- Wild relocation: on lay-off swap, wild moves to a meld on the same owner (same meld only if non-adjacent); adjacency always enforced (ADR 0003).
- Post-opening: lay-off only from the turn after opening; opening turn is contract-only (ADR 0005).
- Going out: must discard last card (ADR 0006).
- Deadwood scoring: Ace 15; K/Q/J/10 10; 3–9 5; 2/Joker 20.
- Stock exhaustion: reshuffle discards except top.

**State shape (decision-rich sketch from domain):**

```typescript
type GamePhase = "lobby" | "playing" | "roundEnd" | "gameEnd";

type RoundPhase = "active" | "scored";

type PlayerPhase = "notOpened" | "opened";

type Action =
  | { kind: "draw"; source: "stock" | "discard" }
  | { kind: "open"; melds: Meld[]; wildDeclarations: WildDeclaration[] }
  | { kind: "layOff"; target: MeldRef; card: Card; relocation?: WildRelocation }
  | { kind: "discard"; card: Card };
```

Cards are identified uniquely in the shoe (suit + rank + deck copy index) so duplicate suits in sets are representable.

### Game Server module

- Stores authoritative `GameState` documents in Convex.
- Each player action mutation: verify auth → verify seated player → verify turn → call `applyAction` → persist result.
- Queries expose: room lobby, public table view (melds, discard top, scores, turn indicator), private hand query (scoped to authenticated player only).
- Scheduled/internal mutations handle round rollover (round 1→10) and game completion.
- No mid-game join (ADR 0007). Late join only before first deal.

### Room Service module

- Host creates room → six-character code + shareable URL slug.
- Seats: 2–5 capacity; each seat binds to user id on join.
- Ready flags per seated player; host starts when all seated players ready and count ≥ 2.
- On start: instantiate Rules Engine game, link room → game id, transition phase to playing.

### Auth module

- Convex Auth with Google OAuth and email magic link (ADR 0001).
- Guest sessions allowed for join; prompt to link account before advertising cross-device resume.
- Seat binding uses authenticated user id; guests receive ephemeral token tied to seat until linked.

### Web Client module

- Pages: sign-in, game list (resume), create/join room, lobby, table.
- Tap-to-select: selected cards highlight; valid targets highlighted based on `legalActions` from server (or derived client-side from last known legal action set returned by server).
- Sort controls: by suit or rank.
- Inline rules panel: contract schedule, wild adjacency, lay-off timing, scoring table — sourced from domain language in CONTEXT.md wording.
- Confirm dialog before discard or opening lay-down.

### Schema (Convex tables, conceptual)

- **users** — auth profile, display name.
- **rooms** — code, host id, seat assignments, ready flags, status, linked game id.
- **games** — serialized Rules Engine state, round number, cumulative scores, created/updated timestamps.
- **games** index by participant user ids for resume list.

No separate “moves log” in v1 unless needed for replay; snapshot state is sufficient for resume.

### API contracts (Convex functions, conceptual)

**Queries:** `getRoom`, `getGame`, `getMyHand`, `getMyGames`, `getLegalActions` (optional convenience).

**Mutations:** `createRoom`, `joinSeat`, `setReady`, `startGame`, `draw`, `open`, `layOff`, `discard`, `leaveSeat` (lobby only).

All gameplay mutations return either updated public view + private hand or structured rule error message suitable for UI toast.

## Testing Decisions

### Proposed seam (confirm before implementation)

**Primary test seam: the Rules Engine public interface** (`applyAction` / `legalActions`).

All house-rule behavior is validated here with pure unit tests. Inputs are a game state fixture + player action; assertions are on resulting state, phase transitions, errors, and scores. No Convex, no React, no network.

This is the highest seam that still covers the riskiest logic (wild adjacency, exact contracts, lay-off timing, wild relocation, discard-to-go-out). Convex mutations get thin smoke tests only (auth + “calls engine + persists”), not duplicate rule coverage.

**Secondary seam (minimal):** Room Service state machine — seat/ready/start transitions — tested with mocked persistence.

**Not testing in v1:** Pixel-level UI, animation, OAuth provider flows end-to-end.

### What makes a good test

- Assert **observable outcomes**: legal/illegal, resulting melds, scores, whose turn, opened flag — not internal helpers.
- One scenario per house-rule edge case; name tests after table situations (“rejects adjacent wilds in set”, “rejects adjacent wilds on relocation”, “cannot lay off on opening turn”).
- Prefer table-driven tests for the contract schedule (rounds 1–10 opening requirements).

### Modules tested

| Module | Test type | Coverage |
|--------|-----------|----------|
| Rules Engine | Unit (primary) | All ADR rule decisions |
| Room Service | Unit (secondary) | Lobby/start gating |
| Game Server | Integration smoke | Auth gate + persist round-trip |
| Web Client | Manual / later E2E | Out of scope for automated v1 |

### Prior art

Greenfield — no existing tests. Establish Rules Engine test layout as the pattern for all future rule changes.

## Out of Scope

Per ADR 0007:

- Bots / single-player
- Mid-game join or spectators
- In-app chat
- Leaderboards, ELO, stats history
- Native iOS/Android apps
- House-rule editor / configurable contracts
- Full async turn-by-email play
- Rich animations beyond basic card moves
- Undo after turn submission
- Auto-pass for absent players (deferred v2)

## Further Notes

### Issue tracker

Issues published on GitHub with the **ready-for-agent** label:

| Slice | Issue |
| ----- | ----- |
| 1. Scaffold + auth | [#1](https://github.com/jon-gingrich/chinese-rummy/issues/1) |
| 2. Room lobby | [#2](https://github.com/jon-gingrich/chinese-rummy/issues/2) |
| 3. Turn loop tracer | [#3](https://github.com/jon-gingrich/chinese-rummy/issues/3) |
| 4. Opening + wilds | [#4](https://github.com/jon-gingrich/chinese-rummy/issues/4) |
| 5. Lay-off + relocation | [#5](https://github.com/jon-gingrich/chinese-rummy/issues/5) |
| 6. Scoring + ten rounds | [#6](https://github.com/jon-gingrich/chinese-rummy/issues/6) |
| 7. Resume + my games | [#7](https://github.com/jon-gingrich/chinese-rummy/issues/7) |
| 8. Guest + account linking | [#8](https://github.com/jon-gingrich/chinese-rummy/issues/8) |
| 9. Table UX polish | [#9](https://github.com/jon-gingrich/chinese-rummy/issues/9) |

Local copies: `docs/issues/`. Re-publish with `node scripts/publish-issues.mjs` (creates duplicates — for fresh repos only).

### Domain references

- Glossary: `CONTEXT.md`
- Decisions: `docs/adr/0001` through `docs/adr/0007`
