"use client";

import { useAuthActions } from "@convex-dev/auth/react";
import { useState } from "react";
import { OAUTH_PROVIDERS, type OAuthProviderId } from "@/lib/authProviders";
import { markOAuthPending } from "@/components/AuthErrorBanner";

type OAuthSignInButtonsProps = {
  redirectTo: string;
  onBeforeSignIn?: () => void;
  className?: string;
};

export function OAuthSignInButtons({
  redirectTo,
  onBeforeSignIn,
  className,
}: OAuthSignInButtonsProps) {
  const { signIn } = useAuthActions();
  const [loading, setLoading] = useState<OAuthProviderId | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function handleOAuthSignIn(provider: OAuthProviderId) {
    onBeforeSignIn?.();
    setLoading(provider);
    setError(null);
    markOAuthPending(provider);
    try {
      await signIn(provider, { redirectTo });
    } catch (signInError) {
      const providerLabel = OAUTH_PROVIDERS.find((entry) => entry.id === provider)?.label ?? provider;
      setError(
        signInError instanceof Error ? signInError.message : `${providerLabel} sign-in failed`,
      );
      setLoading(null);
    }
  }

  return (
    <div className={className}>
      <div className="space-y-3">
        {OAUTH_PROVIDERS.map((provider) => (
          <button
            key={provider.id}
            type="button"
            onClick={() => void handleOAuthSignIn(provider.id)}
            disabled={loading !== null}
            className="game-btn-secondary w-full"
          >
            {loading === provider.id ? "Redirecting…" : provider.label}
          </button>
        ))}
      </div>
      {error ? (
        <p className="mt-3 rounded-lg bg-black/20 px-4 py-3 text-sm text-[var(--cream)]">{error}</p>
      ) : null}
    </div>
  );
}
