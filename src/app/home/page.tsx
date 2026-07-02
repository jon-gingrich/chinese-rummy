"use client";

import { useAuthActions } from "@convex-dev/auth/react";
import { useMutation, useQuery } from "convex/react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { FormEvent, useEffect, useState } from "react";
import { api } from "../../../convex/_generated/api";

function MyGamesList() {
  const router = useRouter();
  const myGames = useQuery(api.games.getMyGames);

  if (myGames === undefined) {
    return <p className="mt-4 text-sm text-[var(--muted)]">Loading your games…</p>;
  }

  if (myGames.length === 0) {
    return (
      <p className="mt-4 text-sm text-[var(--muted)]">No games in progress.</p>
    );
  }

  return (
    <ul className="mt-4 space-y-3">
      {myGames.map((game) => (
        <li
          key={game.gameId}
          className="flex items-center justify-between gap-4 rounded-xl border border-white/10 bg-black/20 px-4 py-3"
        >
          <div className="min-w-0">
            <p className="font-medium tracking-wide">{game.roomCode}</p>
            <p className="text-sm text-[var(--muted)]">
              Round {game.roundNumber} · {game.contract}
            </p>
            <p className="text-xs text-[var(--muted)]">
              {game.playerCount} players
              {game.phase === "roundEnd" ? " · between rounds" : null}
            </p>
          </div>
          <button
            type="button"
            onClick={() => router.push(`/room/${game.roomId}`)}
            className="shrink-0 rounded-lg bg-[var(--accent)] px-3 py-2 text-sm font-semibold text-black"
          >
            Resume
          </button>
        </li>
      ))}
    </ul>
  );
}

function RoomActions() {
  const router = useRouter();
  const createRoom = useMutation(api.rooms.createRoom);
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleCreateRoom() {
    setCreating(true);
    setError(null);
    try {
      const roomId = await createRoom({});
      router.push(`/room/${roomId}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not create room");
      setCreating(false);
    }
  }

  return (
    <div className="mt-4 flex flex-wrap gap-3">
      <button
        type="button"
        onClick={() => void handleCreateRoom()}
        disabled={creating}
        className="rounded-xl bg-[var(--accent)] px-4 py-3 text-sm font-semibold text-black disabled:opacity-60"
      >
        {creating ? "Creating…" : "Create room"}
      </button>
      <Link
        href="/join"
        className="rounded-xl border border-white/10 px-4 py-3 text-sm font-medium hover:border-white/20"
      >
        Join with code
      </Link>
      {error ? <p className="w-full text-sm text-red-300">{error}</p> : null}
    </div>
  );
}

export default function HomePage() {
  const viewer = useQuery(api.users.viewer);
  const ensureCurrentUser = useMutation(api.users.ensureCurrentUser);
  const updateDisplayName = useMutation(api.users.updateDisplayName);
  const { signOut } = useAuthActions();
  const [displayName, setDisplayName] = useState("");
  const [status, setStatus] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    void ensureCurrentUser().catch(() => undefined);
  }, [ensureCurrentUser]);

  useEffect(() => {
    if (viewer?.displayName) {
      setDisplayName(viewer.displayName);
    }
  }, [viewer?.displayName]);

  async function handleSave(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    setStatus(null);
    try {
      const updated = await updateDisplayName({ displayName });
      setDisplayName(updated.displayName);
      setStatus("Display name saved.");
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "Could not save display name");
    } finally {
      setSaving(false);
    }
  }

  if (viewer === undefined) {
    return (
      <main className="mx-auto flex min-h-screen max-w-lg items-center justify-center px-6">
        <p className="text-[var(--muted)]">Loading your profile…</p>
      </main>
    );
  }

  if (viewer === null) {
    return (
      <main className="mx-auto flex min-h-screen max-w-lg items-center justify-center px-6">
        <p className="text-[var(--muted)]">Sign in to manage your profile.</p>
      </main>
    );
  }

  const profile = viewer;

  return (
    <main className="mx-auto flex min-h-screen max-w-lg flex-col gap-8 px-6 py-12">
      <header className="flex items-start justify-between gap-4">
        <div className="space-y-1">
          <p className="text-sm uppercase tracking-[0.25em] text-[var(--accent)]">
            Welcome
          </p>
          <h1 className="text-3xl font-semibold">{profile.displayName}</h1>
          {profile.email ? (
            <p className="text-sm text-[var(--muted)]">{profile.email}</p>
          ) : null}
        </div>
        <button
          type="button"
          onClick={() => void signOut()}
          className="rounded-lg border border-white/10 px-3 py-2 text-sm text-[var(--muted)] hover:text-white"
        >
          Sign out
        </button>
      </header>

      <section className="rounded-2xl border border-white/10 bg-[var(--card)] p-6">
        <h2 className="text-lg font-medium">Display name</h2>
        <p className="mt-1 text-sm text-[var(--muted)]">
          Other players will see this at the table.
        </p>
        <form onSubmit={(event) => void handleSave(event)} className="mt-4 space-y-3">
          <input
            value={displayName}
            onChange={(event) => setDisplayName(event.target.value)}
            minLength={2}
            maxLength={40}
            required
            className="w-full rounded-xl border border-white/10 bg-black/20 px-4 py-3 outline-none ring-[var(--accent)] focus:ring-2"
          />
          <button
            type="submit"
            disabled={saving}
            className="rounded-xl bg-[var(--accent)] px-4 py-3 text-sm font-semibold text-black disabled:opacity-60"
          >
            {saving ? "Saving…" : "Save display name"}
          </button>
        </form>
        {status ? <p className="mt-3 text-sm text-[var(--muted)]">{status}</p> : null}
      </section>

      <section className="rounded-2xl border border-white/10 bg-[var(--card)] p-6">
        <h2 className="text-lg font-medium">My games</h2>
        <p className="mt-1 text-sm text-[var(--muted)]">
          Resume a game you left — your seat, hand, and scores are saved.
        </p>
        <MyGamesList />
      </section>

      <section className="rounded-2xl border border-white/10 bg-[var(--card)] p-6">
        <h2 className="text-lg font-medium">Rooms</h2>
        <p className="mt-1 text-sm text-[var(--muted)]">
          Create a table for your family or join with a room code.
        </p>
        <RoomActions />
      </section>
    </main>
  );
}