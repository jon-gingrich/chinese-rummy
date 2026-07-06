# Automated players

Automated players fill three needs: solo practice, filling empty seats before start, and host-initiated substitution when a human disconnects mid-game. They share one domain concept with dedicated IDs (`auto:<uuid>`) in game state — not rows in the users table — so resume, auth, and guest linking stay human-only.

Delivery is phased: solo practice first (opponent count 1–4, legal greedy heuristics, scheduler-driven turns with visible think delays), then lobby fill (host-only, auto-ready), then host-manual substitution with no seat reclaim. Practice games bypass rooms (`gameMode: "practice"`, optional `roomId`); multiplayer is unchanged.

Automated players never call rummy or take back discards. Humans retain full rummy rights against automated discards. Intelligence starts at legal-move baseline with room for difficulty tiers later.
