# Development

## Prerequisites

- Node.js 18+
- A [Convex](https://convex.dev) account

## Setup

```bash
npm install
npx convex dev
```

Follow the Convex CLI prompts to create/link a deployment. Then configure auth:

```bash
npx @convex-dev/auth --web-server-url http://localhost:3000 --skip-git-check
```

Set OAuth and email provider secrets on your Convex deployment:

```bash
npx convex env set AUTH_GOOGLE_ID <client-id>
npx convex env set AUTH_GOOGLE_SECRET <client-secret>
npx convex env set AUTH_RESEND_KEY <resend-api-key>
npx convex env set AUTH_EMAIL_FROM "Chinese Rummy <onboarding@yourdomain.com>"
```

Copy `.env.example` to `.env.local` and set `NEXT_PUBLIC_CONVEX_URL` from the Convex dashboard.

## Run

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## Scripts

- `npm run dev` — Next.js + Convex dev servers
- `npm run lint` — ESLint with Convex plugin
- `npm run typecheck` — TypeScript
- `npm run test` — Convex function tests (Vitest + convex-test)
