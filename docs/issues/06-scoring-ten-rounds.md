---
title: "Going out, scoring, full ten-round game"
---

## Parent

[PRD: Chinese Rummy v1](../PRD.md)

## What to build

Complete **Game** lifecycle end-to-end. A player **goes out** by **discarding** their last card (meld-out not allowed). **Deadwood scoring** applies to non-goers using the house point table; goer scores zero for the **Round**. Show round summary. **Dealer** rotates clockwise; advance through all ten rounds of the **Contract schedule**. After round 10, declare game winner (lowest cumulative deadwood). UI shows cumulative scores and opponent **Hand** sizes (not cards).

## Acceptance criteria

- [ ] Round ends when a player goes out via final discard
- [ ] Meld-out without discard is rejected
- [ ] Deadwood scored correctly (Ace 15; K/Q/J/10 10; 3–9 5; 2/Joker 20)
- [ ] Goer scores 0 for the round; others score deadwood
- [ ] Round summary shown after each round
- [ ] Dealer and Lead player rotate correctly between rounds
- [ ] Full ten-round game completes and lowest cumulative score wins
- [ ] Opponent hand sizes visible; opponent cards hidden

## Blocked by

- #5
