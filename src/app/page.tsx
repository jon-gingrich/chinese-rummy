import Link from "next/link";

export default function LandingPage() {
  return (
    <main className="mx-auto flex min-h-screen max-w-2xl flex-col items-center justify-center gap-8 px-6 text-center">
      <div className="space-y-3">
        <p className="text-sm uppercase tracking-[0.3em] text-[var(--accent)]">
          Family contract rummy
        </p>
        <h1 className="text-4xl font-semibold tracking-tight sm:text-5xl">
          Chinese Rummy
        </h1>
        <p className="text-[var(--muted)]">
          Play your house rules online with two to five players. Jump in as a
          guest or sign in to resume games across devices.
        </p>
      </div>
      <div className="flex flex-wrap items-center justify-center gap-3">
        <Link
          href="/join"
          className="rounded-full bg-[var(--accent)] px-8 py-3 text-sm font-semibold text-black transition hover:brightness-110"
        >
          Play as guest
        </Link>
        <Link
          href="/sign-in"
          className="rounded-full border border-white/10 px-8 py-3 text-sm font-medium hover:border-white/20"
        >
          Sign in
        </Link>
      </div>
    </main>
  );
}
