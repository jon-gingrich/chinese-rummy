---
title: "Project scaffold + auth + display name"
---

## Parent

[PRD: Chinese Rummy v1](../PRD.md)

## What to build

Stand up the application shell: Next.js (App Router), Convex backend, and Convex Auth with Google OAuth and email magic link. A signed-in player lands on a home page where they can set and see a **display name**. No **Room** or **Game** gameplay yet — this slice proves deployability, auth, and the reactive client ↔ Convex connection.

## Acceptance criteria

- [ ] Next.js app runs locally with Convex dev integration
- [ ] Player can sign in with Google
- [ ] Player can sign in with email magic link
- [ ] Player can set and persist a display name shown after sign-in
- [ ] Unauthenticated visitors are redirected to sign-in for protected routes
- [ ] Project TypeScript strict mode enabled; Convex ESLint plugin configured

## Blocked by

None — can start immediately
