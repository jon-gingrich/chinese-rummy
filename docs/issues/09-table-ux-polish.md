---
title: "Table UX polish + rules reference"
---

## Parent

[PRD: Chinese Rummy v1](../PRD.md)

## What to build

Mobile-first table UX polish on the complete game. **Hand** displayed as sortable fan (by suit or rank). Tap-to-select card interaction. Confirmation dialog before discard and before opening lay-down. Inline rules reference panel covering **Contract schedule**, **Wild adjacency**, **lay off** timing, and **Deadwood scoring** — wording aligned with `CONTEXT.md`.

## Acceptance criteria

- [ ] Hand renders as sortable fan (suit and rank sort options)
- [ ] Tap-to-select works for draw/discard/open/lay-off flows
- [ ] Confirm dialog before submitting discard
- [ ] Confirm dialog before submitting opening melds
- [ ] Rules reference panel accessible from table without leaving the game
- [ ] Rules content matches CONTEXT.md domain language

## Blocked by

- #6
