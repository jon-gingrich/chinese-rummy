"use client";

import { useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";

const OAUTH_PENDING_KEY = "oauthPendingProvider";

const CONVEX_SITE_URL =
  process.env.NEXT_PUBLIC_CONVEX_SITE_URL ?? "https://<your-deployment>.convex.site";

const YAHOO_REDIRECT_URI = `${CONVEX_SITE_URL}/api/auth/callback/yahoo`;
const MICROSOFT_REDIRECT_URI = `${CONVEX_SITE_URL}/api/auth/callback/microsoft-entra-id`;

export function markOAuthPending(provider: string) {
  sessionStorage.setItem(OAUTH_PENDING_KEY, provider);
}

export function clearOAuthPending() {
  sessionStorage.removeItem(OAUTH_PENDING_KEY);
}

function friendlyAuthError(error: string, description: string | null) {
  const normalized = description?.toLowerCase() ?? error.toLowerCase();

  if (normalized.includes("redirect")) {
    return {
      title: "Redirect URI mismatch",
      message: `Add this exact URL to your Yahoo app's Redirect URI list: ${YAHOO_REDIRECT_URI}`,
    };
  }

  if (error === "access_denied") {
    return {
      title: "Sign-in cancelled",
      message: "Yahoo access was not granted. Try again and click Agree on the consent screen.",
    };
  }

  if (error === "yahoo") {
    return {
      title: "Yahoo sign-in failed",
      message: `Yahoo rejected the sign-in request. In the Yahoo Developer Console, add this Redirect URI exactly: ${YAHOO_REDIRECT_URI}. Also confirm the app is a Confidential Client with OpenID Connect Email and Profile permissions enabled.`,
    };
  }

  if (error === "microsoft-entra-id") {
    return {
      title: "Microsoft sign-in failed",
      message: `Microsoft rejected the sign-in. In Microsoft Entra → App registrations → Authentication, add this Redirect URI under the Web platform (not SPA): ${MICROSOFT_REDIRECT_URI}. Confirm personal Microsoft accounts are allowed and the client secret is valid.`,
    };
  }

  if (normalized.includes("code_verifier") || normalized.includes("code_challenge")) {
    return {
      title: "Microsoft PKCE error",
      message:
        "Microsoft requires a matching PKCE verifier. Ensure the redirect URI is registered as a Web app (not Single-page application), then try sign-in again.",
    };
  }

  if (
    normalized.includes("invalid_client") ||
    normalized.includes("invalid_grant") ||
    normalized.includes("unauthorized_client")
  ) {
    return {
      title: "Microsoft sign-in failed",
      message: `Microsoft OAuth error: ${description ?? error}. Check the redirect URI (${MICROSOFT_REDIRECT_URI}), client secret expiry, and that personal Microsoft accounts are allowed.`,
    };
  }

  return {
    title: "Sign-in failed",
    message: description ?? error,
  };
}

type AuthErrorBannerProps = {
  isGuest?: boolean;
};

export function AuthErrorBanner({ isGuest = true }: AuthErrorBannerProps) {
  const searchParams = useSearchParams();
  const [visible, setVisible] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [description, setDescription] = useState<string | null>(null);

  useEffect(() => {
    const authError = searchParams.get("authError");
    const authErrorDescription = searchParams.get("authErrorDescription");

    if (authError) {
      setError(authError);
      setDescription(authErrorDescription);
      setVisible(true);
      clearOAuthPending();

      const url = new URL(window.location.href);
      url.searchParams.delete("authError");
      url.searchParams.delete("authErrorDescription");
      window.history.replaceState({}, "", url.toString());
      return;
    }

    if (!isGuest) {
      clearOAuthPending();
      return;
    }

    const pendingProvider = sessionStorage.getItem(OAUTH_PENDING_KEY);
    if (!pendingProvider) {
      return;
    }

    const hasAuthCode = searchParams.get("code") !== null;
    if (hasAuthCode) {
      return;
    }

    setError(pendingProvider);
    setDescription(null);
    setVisible(true);
    clearOAuthPending();
  }, [isGuest, searchParams]);

  if (!visible || !error) {
    return null;
  }

  const friendly = friendlyAuthError(error, description);

  return (
    <div className="mb-6 rounded-xl border border-[var(--danger)]/40 bg-[var(--danger)]/10 px-4 py-3 text-sm text-[var(--cream)]">
      <p className="font-semibold text-[var(--danger)]">{friendly.title}</p>
      <p className="mt-1 text-[var(--muted)]">{friendly.message}</p>
      <button
        type="button"
        onClick={() => setVisible(false)}
        className="mt-3 text-xs font-semibold text-[var(--accent-soft)] underline"
      >
        Dismiss
      </button>
    </div>
  );
}
