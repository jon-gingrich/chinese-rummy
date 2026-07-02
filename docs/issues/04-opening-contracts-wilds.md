---
title: "Opening contracts + wild rules"
---

## Parent

[PRD: Chinese Rummy v1](../PRD.md)

## What to build

**Opening turn** gameplay end-to-end. A player who has not **Opened** may lay all **Contract** melds in a single turn — **exact** meld sizes per the **Contract schedule** (all ten rounds). Validate **Sets**, **Runs**, **Wild** declarations, **Wild adjacency** (jokers and twos), and twos-as-wilds. UI lets the active player select cards and submit an opening. Table shows current round number and contract. Table-driven **Rules Engine** tests for each round's contract and wild edge cases.

## Acceptance criteria

- [ ] UI displays current round number and Contract for the round
- [ ] Player can lay opening melds in one turn matching exact contract sizes
- [ ] Partial contracts across multiple turns are rejected
- [ ] Invalid melds rejected (bad set/run, wrong sizes, adjacent wilds, unnamed wilds)
- [ ] Twos behave as wilds with same adjacency rules as jokers
- [ ] Opened player status tracked per player for the round
- [ ] Unit tests cover all ten contracts and wild adjacency scenarios

## Blocked by

- #3
