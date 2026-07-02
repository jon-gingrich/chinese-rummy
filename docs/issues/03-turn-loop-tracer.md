---
title: "Tracer bullet — deal, draw, discard, turn rotation"
---

## Parent

[PRD: Chinese Rummy v1](../PRD.md)

## What to build

First playable table — a thin vertical slice through **Rules Engine**, Convex **Game Server**, and table UI. When the **Host** starts from the lobby, a **Game** begins: shuffle the **Shoe** (two decks + four jokers), **deal** thirteen cards each, set **Dealer** and **Lead player**, and run a turn loop — **draw** one from **Stock** or top of **Discard pile**, then **discard** one. Turns pass clockwise. **Stock** reshuffles from discards (keeping top discard) when empty. Unit tests cover turn legality at the **Rules Engine** public interface (`applyAction` / `legalActions`). No **Contract** opening, **lay off**, or scoring yet.

## Acceptance criteria

- [ ] Starting a Room creates a Game with dealt hands and correct turn order
- [ ] Active player can draw from Stock or top Discard pile only
- [ ] Active player must discard one card to end turn; turn advances clockwise
- [ ] Non-active players cannot act; server rejects out-of-turn actions
- [ ] UI shows whose turn it is, top discard, and the authenticated player's Hand only
- [ ] Stock reshuffle rule works when Stock is empty
- [ ] Rules Engine unit tests cover draw/discard/turn rotation and reshuffle

## Blocked by

- #2
