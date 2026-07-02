# Next.js and Convex for real-time persisted play

We need a web client, authoritative game rules on the server, live updates when any player acts, and durable game state so a room can be resumed days later. We chose Next.js (App Router) on the frontend and Convex on the backend with Convex Auth (Google and email magic link).

Considered a custom WebSocket server with a separate database, or Firebase. Convex gives reactive subscriptions and mutations in one place, which fits turn-based card state without us operating socket infrastructure. The choice carries real lock-in: game logic, auth, and persistence will all live in Convex patterns.
