"use client";

import { useAuthActions } from "@convex-dev/auth/react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { FormEvent, useState } from "react";
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
    <main className="mx-auto flex min-h-screen max-w-md flex-col justify-center gap-8 px-6 py-12">
      <div className="space-y-2">
        <Link href="/" className="text-sm text-[var(--muted)] hover:text-white">
          ← Back
        </Link>
        <h1 className="text-3xl font-semibold">Sign in</h1>
        <p className="text-sm text-[var(--muted)]">
          Use Google or a magic link sent to your email.
        </p>
      </div>

      <button
        type="button"
        onClick={() => void handleGoogleSignIn()}
        disabled={loading !== null}
        className="rounded-xl border border-white/10 bg-[var(--card)] px-4 py-3 text-sm font-medium transition hover:border-white/20 disabled:opacity-60"
      >
        {loading === "google" ? "Redirecting…" : "Continue with Google"}
      </button>

      <form onSubmit={(event) => void handleEmailSignIn(event)} className="space-y-3">
        <label className="block space-y-2 text-sm">
          <span className="text-[var(--muted)]">Email magic link</span>
          <input
            type="email"
            required
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            placeholder="you@example.com"
            className="w-full rounded-xl border border-white/10 bg-[var(--card)] px-4 py-3 outline-none ring-[var(--accent)] focus:ring-2"
          />
        </label>
        <button
          type="submit"
          disabled={loading !== null}
          className="w-full rounded-xl bg-[var(--accent)] px-4 py-3 text-sm font-semibold text-black disabled:opacity-60"
        >
          {loading === "email" ? "Sending…" : "Send magic link"}
        </button>
      </form>

      {message ? (
        <p className="rounded-xl border border-white/10 bg-[var(--card)] px-4 py-3 text-sm">
          {message}
        </p>
      ) : null}
    </main>
  );
}
