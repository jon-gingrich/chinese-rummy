---
title: "Resume + my games list"
---

## Parent

[PRD: Chinese Rummy v1](../PRD.md)

## What to build

Cross-session persistence for signed-in players. A **My games** list shows in-progress **Games** the player can rejoin. Returning to a persisted **Room** restores **Seat**, **Hand**, **Round**, melds, and cumulative scores. Brief disconnect does not drop the player or advance the **Game** without them.

## Acceptance criteria

- [ ] Signed-in player sees a list of in-progress Games they participate in
- [ ] Player can rejoin a Game from the list and land at the live table
- [ ] Rejoin restores correct seat, hand, round, scores, and table state
- [ ] Game state unchanged while a player is disconnected (no auto-drop in v1)
- [ ] Room/Game persists when all players disconnect

## Blocked by

- #6
