"use client";

import { useAuthActions } from "@convex-dev/auth/react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { rememberGuestUserId } from "../lib/guestSession";

type LinkAccountPromptProps = {
  userId: string;
  title?: string;
  description?: string;
  compact?: boolean;
};

export function LinkAccountPrompt({
  userId,
  title = "Save your seat across devices",
  description = "Create or link an account to resume games later on another device.",
  compact = false,
}: LinkAccountPromptProps) {
  const pathname = usePathname();
  const { signIn } = useAuthActions();
  const returnTo = encodeURIComponent(pathname || "/home");

  function handleGoogleSignIn() {
    rememberGuestUserId(userId);
    void signIn("google", { redirectTo: pathname || "/home" });
  }

  if (compact) {
    return (
      <Link
        href={`/sign-in?returnTo=${returnTo}`}
        onClick={() => rememberGuestUserId(userId)}
        className="game-btn-secondary px-2 py-1 text-xs"
      >
        Link account
      </Link>
    );
  }

  return (
    <section className="game-panel border-amber-500/40 p-6">
      <h2 className="text-lg font-bold text-[var(--accent-soft)]">{title}</h2>
      <p className="mt-1 text-sm text-[var(--muted)]">{description}</p>
      <div className="mt-4 flex flex-wrap gap-3">
        <button type="button" onClick={() => void handleGoogleSignIn()} className="game-btn-primary">
          Continue with Google
        </button>
        <Link
          href={`/sign-in?returnTo=${returnTo}`}
          onClick={() => rememberGuestUserId(userId)}
          className="game-btn-secondary"
        >
          Email magic link
        </Link>
      </div>
    </section>
  );
}
