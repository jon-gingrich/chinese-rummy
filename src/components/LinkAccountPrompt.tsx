"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { OAuthSignInButtons } from "@/components/OAuthSignInButtons";
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
  const returnTo = encodeURIComponent(pathname || "/home");

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
      <div className="mt-4 space-y-4">
        <OAuthSignInButtons
          redirectTo={pathname || "/home"}
          onBeforeSignIn={() => rememberGuestUserId(userId)}
        />
        <Link
          href={`/sign-in?returnTo=${returnTo}`}
          onClick={() => rememberGuestUserId(userId)}
          className="game-btn-secondary inline-flex"
        >
          Email magic link
        </Link>
      </div>
    </section>
  );
}
