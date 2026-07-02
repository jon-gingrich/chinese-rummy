---
title: "Room lobby — create, join, seat, ready, start"
---

## Parent

[PRD: Chinese Rummy v1](../PRD.md)

## What to build

End-to-end **Room** lobby. A **Host** creates a **Room** and receives a short code plus shareable link. Players join by code, pick an open **Seat**, mark **Ready**, and the **Host** starts when 2–5 seated players are all **Ready**. Lobby state persists in Convex and updates reactively for everyone in the **Room**. No card play yet.

## Acceptance criteria

- [ ] Host can create a Room and see a short room code
- [ ] Share link opens join flow with code pre-filled
- [ ] Player can join by code and choose an open Seat (2–5 capacity)
- [ ] Each seated player can toggle Ready
- [ ] Host can start only when ≥2 seats filled and all seated players are Ready
- [ ] All lobby participants see seat occupancy and Ready status in real time
- [ ] Room document persists after all clients disconnect

## Blocked by

- #1
