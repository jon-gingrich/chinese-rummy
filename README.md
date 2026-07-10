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

## Deploy (Vercel + Convex)

Every Vercel build runs `npx convex deploy` before `pnpm run build` (see `vercel.json`), so schema/function changes ship with the frontend.

1. In the [Convex dashboard](https://dashboard.convex.dev), open your **production** deployment → Settings → Generate a **Production** deploy key (include `deployment:deploy`).
2. In Vercel → Project → Settings → Environment Variables, add:
   - Name: `CONVEX_DEPLOY_KEY`
   - Value: the production deploy key
   - Environment: **Production** only
3. (Optional) For preview deployments, generate a **Preview** deploy key on the Convex project settings page and add a second `CONVEX_DEPLOY_KEY` scoped to **Preview** only.
4. Redeploy. `convex deploy` sets `NEXT_PUBLIC_CONVEX_URL` for the build, then pushes functions to Convex.

Do not set a static `NEXT_PUBLIC_CONVEX_URL` in Vercel for production/preview if you want `convex deploy` to inject the correct deployment URL. Auth provider secrets still live on the Convex deployment (`npx convex env set`), not in Vercel.
