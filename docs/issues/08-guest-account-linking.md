---
title: "Guest play + account linking prompt"
---

## Parent

[PRD: Chinese Rummy v1](../PRD.md)

## What to build

Allow guests to join a **Room** without signing in, so they can try the game quickly. When a guest would benefit from cross-device **resume**, prompt them to create or link an account. Guest **Seat** binding uses an ephemeral session until linked to a full account.

## Acceptance criteria

- [ ] Unauthenticated user can join a Room by code and take a Seat
- [ ] Guest can participate in lobby Ready flow and gameplay while in same browser session
- [ ] UI prompts guest to sign in/link account before offering cross-device resume
- [ ] Linking account preserves Seat and Game association
- [ ] Signed-in resume behavior from slice #7 still works for linked accounts

## Blocked by

- #2
