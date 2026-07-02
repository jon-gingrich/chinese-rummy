---
title: "Lay-off phase + wild relocation"
---

## Parent

[PRD: Chinese Rummy v1](../PRD.md)

## What to build

Post-opening play end-to-end. After **Opening turn**, a player may **lay off** only — no new melds for the rest of the **Round**. **Lay off** becomes available starting the turn **after** opening (not on opening turn). Players may **lay off** on any player's melds on the table. **Wild relocation** on swap: replacing a **Wild** with a **Natural** moves the wild to another meld on the same owner's board; relocating player chooses destination; adjacency rules waived during relocation. UI supports lay-off targets and wild relocation choice.

## Acceptance criteria

- [ ] Opened player cannot create new melds for the rest of the round
- [ ] Lay off blocked on opening turn; allowed from next turn onward
- [ ] Player can lay off on own or others' melds
- [ ] Wild replacement requires relocating wild to another meld on same owner
- [ ] Relocating player chooses destination meld; adjacency waived on relocation
- [ ] All table melds visible to all players
- [ ] Rules Engine unit tests cover lay-off timing and wild relocation edge cases

## Blocked by

- #4
