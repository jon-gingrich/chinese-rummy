"use client";

import { useAuthActions } from "@convex-dev/auth/react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { rememberGuestUserId } from "../lib/guestSession";

type LinkAccountPromptProps = {
  userId: string;
  title?: string;
  description?: string;
};

export function LinkAccountPrompt({
  userId,
  title = "Save your seat across devices",
  description = "Create or link an account to resume games later on another device.",
}: LinkAccountPromptProps) {
  const pathname = usePathname();
  const { signIn } = useAuthActions();
  const returnTo = encodeURIComponent(pathname || "/home");

  function handleGoogleSignIn() {
    rememberGuestUserId(userId);
    void signIn("google", { redirectTo: pathname || "/home" });
  }

  return (
    <section className="rounded-2xl border border-amber-400/30 bg-amber-400/10 p-6">
      <h2 className="text-lg font-medium text-amber-100">{title}</h2>
      <p className="mt-1 text-sm text-[var(--muted)]">{description}</p>
      <div className="mt-4 flex flex-wrap gap-3">
        <button
          type="button"
          onClick={() => void handleGoogleSignIn()}
          className="rounded-xl bg-[var(--accent)] px-4 py-3 text-sm font-semibold text-black"
        >
          Continue with Google
        </button>
        <Link
          href={`/sign-in?returnTo=${returnTo}`}
          onClick={() => rememberGuestUserId(userId)}
          className="rounded-xl border border-white/10 px-4 py-3 text-sm font-medium hover:border-white/20"
        >
          Email magic link
        </Link>
      </div>
    </section>
  );
}
