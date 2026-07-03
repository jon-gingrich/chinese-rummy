# Development

## Prerequisites

- Node.js 18+
- A [Convex](https://convex.dev) account

## Setup

```bash
npm install
npx convex dev
```

Follow the Convex CLI prompts to create/link a deployment. Copy `.env.example` to `.env.local` — `npx convex dev` fills in `NEXT_PUBLIC_CONVEX_URL` and `NEXT_PUBLIC_CONVEX_SITE_URL`.

Then configure auth (one-time):

```bash
npx @convex-dev/auth --web-server-url http://localhost:3000 --skip-git-check
```

Set Google, Microsoft, Yahoo OAuth, and Resend secrets on your Convex deployment. See **[docs/setup/auth-providers.md](docs/setup/auth-providers.md)** for provider console steps.

Quick path (interactive):

```powershell
.\scripts\setup-auth-providers.ps1
```

Or set variables manually:

```bash
npx convex env set AUTH_GOOGLE_ID <client-id>
npx convex env set AUTH_GOOGLE_SECRET <client-secret>
npx convex env set AUTH_RESEND_KEY <resend-api-key>
npx convex env set AUTH_EMAIL_FROM "Chinese Rummy <onboarding@resend.dev>"
```

OAuth redirect URIs must use your Convex site URL (from `NEXT_PUBLIC_CONVEX_SITE_URL`), for example:

- `https://<deployment>.convex.site/api/auth/callback/google`
- `https://<deployment>.convex.site/api/auth/callback/microsoft-entra-id`
- `https://<deployment>.convex.site/api/auth/callback/yahoo`

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
