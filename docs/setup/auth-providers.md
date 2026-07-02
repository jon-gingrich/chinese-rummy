# Auth providers: Google OAuth and Resend magic links

Chinese Rummy uses [Convex Auth](https://labs.convex.dev/auth) with Google sign-in and Resend email magic links. The app code is already wired (`convex/auth.ts`, sign-in page, middleware). You only need deployment secrets and provider console configuration.

## Prerequisites

1. Convex dev deployment linked (`npx convex dev` at least once).
2. Base auth keys generated:

   ```bash
   npx @convex-dev/auth --web-server-url http://localhost:3000 --skip-git-check
   ```

   This sets `SITE_URL`, `JWT_PRIVATE_KEY`, and `JWKS` on your Convex deployment.

3. `.env.local` contains `NEXT_PUBLIC_CONVEX_URL` and `NEXT_PUBLIC_CONVEX_SITE_URL` from `npx convex dev`.

## Google OAuth

### 1. Create credentials

1. Open [Google Cloud Console → Credentials](https://console.cloud.google.com/apis/credentials).
2. Create an **OAuth client ID** (application type: **Web application**).
3. Under **Authorized redirect URIs**, add your Convex site callback (not localhost):

   ```
   https://<your-deployment>.convex.site/api/auth/callback/google
   ```

   For this project's dev deployment:

   ```
   https://handsome-snake-32.convex.site/api/auth/callback/google
   ```

4. Copy the **Client ID** and **Client secret**.

### 2. Set Convex environment variables

```bash
npx convex env set AUTH_GOOGLE_ID "<client-id>"
npx convex env set AUTH_GOOGLE_SECRET "<client-secret>"
```

Or run the helper script (see [Quick setup](#quick-setup) below).

### 3. OAuth consent screen

If Google shows "app not verified", add your Google account as a **test user** on the OAuth consent screen while developing.

## Resend magic links

### 1. API key

1. Sign up at [resend.com](https://resend.com).
2. Create an API key with **Sending access**.

### 2. From address

| Environment | `AUTH_EMAIL_FROM` | Notes |
|-------------|-------------------|-------|
| Local dev (no domain) | `Chinese Rummy <onboarding@resend.dev>` | Resend only delivers to the email on your Resend account |
| Production | `Chinese Rummy <noreply@yourdomain.com>` | Verify the domain in Resend first |

### 3. Set Convex environment variables

```bash
npx convex env set AUTH_RESEND_KEY "<resend-api-key>"
npx convex env set AUTH_EMAIL_FROM "Chinese Rummy <onboarding@resend.dev>"
```

## Quick setup

From the repo root, after you have Google and Resend credentials:

```powershell
.\scripts\setup-auth-providers.ps1
```

The script reads `NEXT_PUBLIC_CONVEX_SITE_URL` from `.env.local` and prints the Google redirect URI to use.

## Verify

1. Start the app: `npm run dev`
2. Open [http://localhost:3000/sign-in](http://localhost:3000/sign-in)
3. **Google**: click "Continue with Google" — you should return to `/home` signed in.
4. **Email**: enter an address Resend can deliver to, click "Send magic link", then open the link in your email.

Check Convex logs in the dashboard if sign-in fails.

## Production

When you add a production Convex deployment:

1. Run `npx @convex-dev/auth --web-server-url https://your-domain.com --prod`
2. Add the production `.convex.site` callback URL to the same Google OAuth client (or create a separate client).
3. Set `AUTH_*` variables on production: `npx convex env set AUTH_GOOGLE_ID ... --prod`
4. Use a verified domain in `AUTH_EMAIL_FROM`.

## Reference: required Convex env vars

| Variable | Set by | Purpose |
|----------|--------|---------|
| `SITE_URL` | `@convex-dev/auth` CLI | Local app URL for redirects (`http://localhost:3000`) |
| `JWT_PRIVATE_KEY` | `@convex-dev/auth` CLI | Signs session tokens |
| `JWKS` | `@convex-dev/auth` CLI | Public keys for token verification |
| `AUTH_GOOGLE_ID` | You | Google OAuth client ID |
| `AUTH_GOOGLE_SECRET` | You | Google OAuth client secret |
| `AUTH_RESEND_KEY` | You | Resend API key |
| `AUTH_EMAIL_FROM` | You | Sender address for magic-link emails |
