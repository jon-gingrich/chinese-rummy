"use client";

import { useMutation, useQuery } from "convex/react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { FormEvent, useEffect, useState } from "react";
import { api } from "../../../convex/_generated/api";
import { AppShell } from "@/components/AppShell";
import { LinkAccountPrompt } from "../../components/LinkAccountPrompt";
import { AuthErrorBanner } from "../../components/AuthErrorBanner";
import { useGuestAuth } from "../../hooks/useGuestAuth";

function MyGamesList() {
  const router = useRouter();
  const myGames = useQuery(api.games.getMyGames);

  if (myGames === undefined) {
    return <p className="mt-4 text-sm text-[var(--muted)]">Loading your games…</p>;
  }

  if (myGames.length === 0) {
    return <p className="mt-4 text-sm text-[var(--muted)]">No games in progress.</p>;
  }

  return (
    <ul className="mt-4 space-y-3">
      {myGames.map((game) => (
        <li
          key={game.gameId}
          className="flex items-center justify-between gap-4 rounded-xl bg-black/20 px-4 py-3"
        >
          <div className="min-w-0">
            <p className="font-bold tracking-wide text-[var(--cream)]">{game.roomCode}</p>
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
            className="game-btn-primary shrink-0 px-3 py-2 text-xs"
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
        className="game-btn-primary"
      >
        {creating ? "Creating…" : "Create room"}
      </button>
      <Link href="/join" className="game-btn-secondary">
        Join with code
      </Link>
      {error ? <p className="w-full text-sm text-[var(--danger)]">{error}</p> : null}
    </div>
  );
}

export default function HomePage() {
  const { viewer, isLoading, isGuest } = useGuestAuth();
  const ensureCurrentUser = useMutation(api.users.ensureCurrentUser);
  const updateDisplayName = useMutation(api.users.updateDisplayName);
  const [displayName, setDisplayName] = useState("");
  const [status, setStatus] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (viewer) {
      void ensureCurrentUser().catch(() => undefined);
    }
  }, [ensureCurrentUser, viewer]);

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

  if (isLoading || !viewer) {
    return (
      <AppShell>
        <p className="text-center text-[var(--muted)]">Loading your profile…</p>
      </AppShell>
    );
  }

  return (
    <AppShell wide>
      <header className="mb-8 flex items-start justify-between gap-4">
        <div className="space-y-1">
          <p className="text-sm font-bold uppercase tracking-[0.25em] text-[var(--accent-soft)]">
            {isGuest ? "Guest table" : "Welcome back"}
          </p>
          <h1 className="text-3xl font-extrabold text-[var(--cream)]">{viewer.displayName}</h1>
          {viewer.email ? (
            <p className="text-sm text-[var(--muted)]">{viewer.email}</p>
          ) : isGuest ? (
            <p className="text-sm text-[var(--muted)]">Playing without an account</p>
          ) : null}
        </div>
        {!isGuest ? (
          <div className="flex flex-wrap gap-2">
            <Link href="/home/settings" className="game-btn-secondary text-sm">
              Settings
            </Link>
            <Link href="/sign-in" className="game-btn-secondary text-sm">
              Account
            </Link>
          </div>
        ) : (
          <Link href="/home/settings" className="game-btn-secondary text-sm">
            Settings
          </Link>
        )}
      </header>

      <AuthErrorBanner isGuest={isGuest} />

      {isGuest ? (
        <LinkAccountPrompt
          userId={viewer.userId}
          description="Link an account before using My games to resume on another device."
        />
      ) : null}

      <div className="grid gap-6 lg:grid-cols-2">
        <section className="game-panel p-6">
          <h2 className="text-lg font-bold text-[var(--accent-soft)]">Display name</h2>
          <p className="mt-1 text-sm text-[var(--muted)]">Other players will see this at the table.</p>
          <form onSubmit={(event) => void handleSave(event)} className="mt-4 space-y-3">
            <input
              value={displayName}
              onChange={(event) => setDisplayName(event.target.value)}
              minLength={2}
              maxLength={40}
              required
              className="game-input"
            />
            <button type="submit" disabled={saving} className="game-btn-primary">
              {saving ? "Saving…" : "Save display name"}
            </button>
          </form>
          {status ? <p className="mt-3 text-sm text-[var(--muted)]">{status}</p> : null}
        </section>

        <section className="game-panel p-6">
          <h2 className="text-lg font-bold text-[var(--accent-soft)]">Rooms</h2>
          <p className="mt-1 text-sm text-[var(--muted)]">
            Create a table for your family or join with a room code.
          </p>
          <RoomActions />
        </section>

        <section className="game-panel p-6 lg:col-span-2">
          <h2 className="text-lg font-bold text-[var(--accent-soft)]">My games</h2>
          <p className="mt-1 text-sm text-[var(--muted)]">
            {isGuest
              ? "Sign in to keep a list of games you can resume later."
              : "Resume a game you left — your seat, hand, and scores are saved."}
          </p>
          {isGuest ? (
            <p className="mt-4 text-sm text-[var(--muted)]">Guest sessions work in this browser only.</p>
          ) : (
            <MyGamesList />
          )}
        </section>
      </div>
    </AppShell>
  );
}
