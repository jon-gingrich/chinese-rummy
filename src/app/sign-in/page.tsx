"use client";

import { useAuthActions } from "@convex-dev/auth/react";
import { useSearchParams } from "next/navigation";
import { FormEvent, useState } from "react";
import { AppShell } from "@/components/AppShell";
import { rememberGuestUserId } from "../../lib/guestSession";
import { useGuestAuth } from "../../hooks/useGuestAuth";

export default function SignInPage() {
  const { signIn } = useAuthActions();
  const { viewer } = useGuestAuth();
  const searchParams = useSearchParams();
  const returnTo = searchParams.get("returnTo") ?? "/home";
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState<string | null>(null);
  const [loading, setLoading] = useState<"google" | "email" | null>(null);

  function rememberGuestBeforeLinking() {
    if (viewer?.isGuest) {
      rememberGuestUserId(viewer.userId);
    }
  }

  async function handleGoogleSignIn() {
    rememberGuestBeforeLinking();
    setLoading("google");
    setMessage(null);
    try {
      await signIn("google", { redirectTo: returnTo });
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Google sign-in failed");
      setLoading(null);
    }
  }

  async function handleEmailSignIn(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    rememberGuestBeforeLinking();
    setLoading("email");
    setMessage(null);
    try {
      await signIn("resend", { email, redirectTo: returnTo });
      setMessage("Check your email for a magic link.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Magic link failed");
    } finally {
      setLoading(null);
    }
  }

  return (
    <AppShell backHref="/" backLabel="← Home" title="Sign in" subtitle="Use Google or a magic link sent to your email.">
      <div className="game-panel mx-auto max-w-md space-y-6 p-6">
        <button
          type="button"
          onClick={() => void handleGoogleSignIn()}
          disabled={loading !== null}
          className="game-btn-secondary w-full"
        >
          {loading === "google" ? "Redirecting…" : "Continue with Google"}
        </button>

        <form onSubmit={(event) => void handleEmailSignIn(event)} className="space-y-3">
          <label className="block space-y-2 text-sm">
            <span className="font-semibold text-[var(--muted)]">Email magic link</span>
            <input
              type="email"
              required
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              placeholder="you@example.com"
              className="game-input"
            />
          </label>
          <button type="submit" disabled={loading !== null} className="game-btn-primary w-full">
            {loading === "email" ? "Sending…" : "Send magic link"}
          </button>
        </form>

        {message ? (
          <p className="rounded-lg bg-black/20 px-4 py-3 text-sm text-[var(--cream)]">{message}</p>
        ) : null}
      </div>
    </AppShell>
  );
}
