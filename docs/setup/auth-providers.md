# Auth providers: Google, Microsoft, Yahoo OAuth, and Resend magic links

Chinese Rummy uses [Convex Auth](https://labs.convex.dev/auth) with Google, Microsoft (Hotmail/Outlook), and Yahoo sign-in, plus Resend email magic links. The app code is already wired (`convex/auth.ts`, sign-in page, middleware). You only need deployment secrets and provider console configuration.

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

4. Copy the **Client ID** and **Client secret**.

### 2. Set Convex environment variables

```bash
npx convex env set AUTH_GOOGLE_ID "<client-id>"
npx convex env set AUTH_GOOGLE_SECRET "<client-secret>"
```

### 3. OAuth consent screen

If Google shows "app not verified", add your Google account as a **test user** on the OAuth consent screen while developing.

## Microsoft OAuth (Hotmail / Outlook)

Uses the built-in [Microsoft Entra ID](https://authjs.dev/getting-started/providers/microsoft-entra-id) provider. With the default `common` tenant, personal Microsoft accounts (Hotmail, Outlook.com) and work/school accounts can sign in.

### 1. Create credentials

1. Open [Microsoft Entra → App registrations](https://entra.microsoft.com/#view/Microsoft_AAD_RegisteredApps/ApplicationsListBlade).
2. **New registration** → supported account types: **Accounts in any organizational directory and personal Microsoft accounts**.
3. Under **Authentication** → **Platform configurations** → **Web**, add redirect URI:

   ```
   https://<your-deployment>.convex.site/api/auth/callback/microsoft-entra-id
   ```

   Use the **Web** platform, not **Single-page application**. SPA registrations require PKCE in ways that conflict with Convex Auth's defaults.

4. Under **Certificates & secrets**, create a **Client secret**.
5. Copy the **Application (client) ID** and **Client secret**.

### 2. Set Convex environment variables

```bash
npx convex env set AUTH_MICROSOFT_ENTRA_ID_ID "<application-client-id>"
npx convex env set AUTH_MICROSOFT_ENTRA_ID_SECRET "<client-secret>"
```

Optional: restrict to a single Azure AD tenant by also setting `AUTH_MICROSOFT_ENTRA_ID_ISSUER` to `https://login.microsoftonline.com/<tenant-id>/v2.0/`.

### 3. Troubleshooting Microsoft sign-in

If Microsoft sends you back to `/home` and you are still a guest, check Convex logs for `GET /api/auth/callback/microsoft-entra-id`. A common failure is:

```
server responded with an error in the response body
```

That usually means Microsoft's multi-tenant issuer did not match during ID token validation (a known `@convex-dev/auth` issue with the `/common` endpoint). This repo applies a `patch-package` fix for that.

Other usual causes:

- **Redirect URI mismatch** — re-copy the callback URL above into Entra → Authentication → Web redirect URIs.
- **Expired client secret** — create a new secret under Certificates & secrets and update `AUTH_MICROSOFT_ENTRA_ID_SECRET`.
- **Wrong account types** — registration must allow personal Microsoft accounts (Hotmail/Outlook), not work/school only.
- **Admin consent** — on API permissions, click **Grant admin consent for Default Directory** if status is blank.

After updating Entra settings, wait a minute and try again.

## Yahoo OAuth

Yahoo uses a custom OIDC provider (`convex/lib/yahooProvider.ts`).

### 1. Create credentials

1. Open the [Yahoo Developer Network](https://developer.yahoo.com/apps/) and create an app.
2. Choose **Confidential Client** (server-side web app), not Installed Application.
3. Under **Redirect URI(s)**, add the full callback URL exactly (no trailing slash):

   ```
   https://<your-deployment>.convex.site/api/auth/callback/yahoo
   ```

   For this project's dev deployment:

   ```
   https://handsome-snake-32.convex.site/api/auth/callback/yahoo
   ```

   Yahoo is strict about an exact character-for-character match. If you only set a callback *domain*, also add the full `/api/auth/callback/yahoo` path in Redirect URI(s).

4. Enable **OpenID Connect** permissions: Email and Profile (this grants `openid`, `profile`, `email` scopes).
5. Copy the **Client ID** (Consumer Key) and **Client secret** (Consumer Secret).

### 2. Set Convex environment variables

```bash
npx convex env set AUTH_YAHOO_ID "<client-id>"
npx convex env set AUTH_YAHOO_SECRET "<client-secret>"
```

### 3. Troubleshooting Yahoo sign-in

If Yahoo sends you back to `/home` and you are still a guest, check the Convex dashboard logs for `GET /api/auth/callback/yahoo`. A common failure is:

```
OAuth Provider returned an error
```

That means Yahoo rejected the authorization request before token exchange. Usual causes:

- Redirect URI mismatch — re-copy the callback URL above into the Yahoo app settings.
- Yahoo propagation delay — redirect URI changes can take hours; creating a fresh app with the same settings often works faster.
- Missing OpenID Connect permissions on the Yahoo app.
- User clicked **Not now** on the Yahoo consent screen (`error=access_denied`).

After updating Yahoo app settings, wait a few minutes and try again.

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

From the repo root, after you have provider credentials:

```powershell
.\scripts\setup-auth-providers.ps1
```

The script reads `NEXT_PUBLIC_CONVEX_SITE_URL` from `.env.local` and prints the OAuth redirect URIs to use.

## Verify

1. Start the app: `npm run dev`
2. Open [http://localhost:3000/sign-in](http://localhost:3000/sign-in)
3. **Google / Microsoft / Yahoo**: click the provider button — you should return to `/home` signed in.
4. **Email**: enter an address Resend can deliver to, click "Send magic link", then open the link in your email.

Check Convex logs in the dashboard if sign-in fails.

## Production

When you add a production Convex deployment:

1. Run `npx @convex-dev/auth --web-server-url https://your-domain.com --prod`
2. Add the production `.convex.site` callback URLs to each OAuth app (or create separate apps per environment).
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
| `AUTH_MICROSOFT_ENTRA_ID_ID` | You | Microsoft application (client) ID |
| `AUTH_MICROSOFT_ENTRA_ID_SECRET` | You | Microsoft client secret |
| `AUTH_YAHOO_ID` | You | Yahoo OAuth client ID |
| `AUTH_YAHOO_SECRET` | You | Yahoo OAuth client secret |
| `AUTH_RESEND_KEY` | You | Resend API key |
| `AUTH_EMAIL_FROM` | You | Sender address for magic-link emails |

## OAuth callback URLs (summary)

Replace `<your-deployment>` with your Convex site hostname (from `NEXT_PUBLIC_CONVEX_SITE_URL`):

```
https://<your-deployment>.convex.site/api/auth/callback/google
https://<your-deployment>.convex.site/api/auth/callback/microsoft-entra-id
https://<your-deployment>.convex.site/api/auth/callback/yahoo
```
