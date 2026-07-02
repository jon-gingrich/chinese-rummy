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
          Play your house rules online with two to five players. Sign in to set
          your table name and get ready for the first room.
        </p>
      </div>
      <Link
        href="/sign-in"
        className="rounded-full bg-[var(--accent)] px-8 py-3 text-sm font-semibold text-black transition hover:brightness-110"
      >
        Sign in to play
      </Link>
    </main>
  );
}
