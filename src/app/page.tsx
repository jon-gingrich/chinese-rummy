import Link from "next/link";
import { AppShell } from "@/components/AppShell";

export default function LandingPage() {
  return (
    <AppShell wide>
      <main className="flex min-h-[70vh] flex-col items-center justify-center gap-10 text-center">
        <div className="space-y-4">
          <p className="text-5xl">🃏</p>
          <p className="text-sm font-bold uppercase tracking-[0.35em] text-[var(--accent-soft)]">
            Family contract rummy
          </p>
          <h1 className="text-4xl font-extrabold tracking-tight text-[var(--cream)] sm:text-5xl">
            Chinese Rummy
          </h1>
          <p className="mx-auto max-w-lg text-[var(--muted)]">
            Play your house rules online with two to five players. Gather around the virtual table
            on iPad or desktop — jump in as a guest or sign in to resume games.
          </p>
        </div>
        <div className="flex flex-wrap items-center justify-center gap-3">
          <Link href="/join" className="game-btn-primary px-8 py-3">
            Play as guest
          </Link>
          <Link href="/sign-in" className="game-btn-secondary px-8 py-3">
            Sign in
          </Link>
        </div>
      </main>
    </AppShell>
  );
}
