"use client";

import { useMutation, useQuery } from "convex/react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useState } from "react";
import { api } from "../../../../convex/_generated/api";
import type { Id } from "../../../../convex/_generated/dataModel";
import { GameTable } from "../../../components/GameTable";

export default function RoomLobbyPage() {
  const params = useParams<{ roomId: string }>();
  const roomId = params.roomId as Id<"rooms">;
  const viewer = useQuery(api.users.viewer);
  const ensureCurrentUser = useMutation(api.users.ensureCurrentUser);
  const room = useQuery(api.rooms.getRoom, { roomId });
  const joinSeat = useMutation(api.rooms.joinSeat);
  const setReady = useMutation(api.rooms.setReady);
  const startGame = useMutation(api.rooms.startGame);
  const [status, setStatus] = useState<string | null>(null);
  const [busySeat, setBusySeat] = useState<number | null>(null);
  const [starting, setStarting] = useState(false);

  useEffect(() => {
    void ensureCurrentUser().catch(() => undefined);
  }, [ensureCurrentUser]);

  const mySeatIndex =
    viewer && room
      ? room.seats.findIndex((seat) => seat?.userId === viewer.userId)
      : -1;
  const isHost = viewer && room ? room.hostId === viewer.userId : false;
  const seatedCount = room?.seats.filter((seat) => seat !== null).length ?? 0;
  const allReady =
    room?.seats
      .filter((seat): seat is NonNullable<typeof seat> => seat !== null)
      .every((seat) => seat.ready) ?? false;
  const canStart = isHost && seatedCount >= 2 && allReady && room?.status === "lobby";
  const shareUrl =
    typeof window !== "undefined" && room
      ? `${window.location.origin}/join?code=${room.code}`
      : "";

  async function handleJoinSeat(seatIndex: number) {
    if (!room) {
      return;
    }
    setBusySeat(seatIndex);
    setStatus(null);
    try {
      await joinSeat({ code: room.code, seatIndex });
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "Could not join seat");
    } finally {
      setBusySeat(null);
    }
  }

  async function handleReadyToggle() {
    if (!room || mySeatIndex < 0) {
      return;
    }
    const current = room.seats[mySeatIndex];
    if (!current) {
      return;
    }
    setStatus(null);
    try {
      await setReady({ roomId, ready: !current.ready });
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "Could not update ready status");
    }
  }

  async function handleStartGame() {
    setStarting(true);
    setStatus(null);
    try {
      await startGame({ roomId });
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "Could not start game");
    } finally {
      setStarting(false);
    }
  }

  async function handleCopyLink() {
    if (!shareUrl) {
      return;
    }
    await navigator.clipboard.writeText(shareUrl);
    setStatus("Invite link copied.");
  }

  if (room === undefined || viewer === undefined) {
    return (
      <main className="mx-auto flex min-h-screen max-w-2xl items-center justify-center px-6">
        <p className="text-[var(--muted)]">Loading room…</p>
      </main>
    );
  }

  if (room === null) {
    return (
      <main className="mx-auto flex min-h-screen max-w-2xl flex-col items-center justify-center gap-4 px-6">
        <p className="text-[var(--muted)]">Room not found.</p>
        <Link href="/home" className="text-sm text-[var(--accent)] hover:underline">
          Back to home
        </Link>
      </main>
    );
  }

  return (
    <main className="mx-auto flex min-h-screen max-w-2xl flex-col gap-8 px-6 py-12">
      <header className="flex flex-wrap items-start justify-between gap-4">
        <div className="space-y-1">
          <Link href="/home" className="text-sm text-[var(--muted)] hover:text-white">
            ← Home
          </Link>
          <p className="text-sm uppercase tracking-[0.25em] text-[var(--accent)]">
            {room.status === "lobby" ? "Room lobby" : "Game table"}
          </p>
          <h1 className="font-mono text-4xl font-semibold tracking-[0.2em]">{room.code}</h1>
          <p className="text-sm text-[var(--muted)]">
            {room.status === "lobby"
              ? "Choose a seat, mark ready, and wait for the host to start."
              : "The game is in progress."}
          </p>
        </div>
        <div className="rounded-xl border border-white/10 bg-[var(--card)] px-4 py-3 text-sm">
          <p className="text-[var(--muted)]">Seated</p>
          <p className="text-2xl font-semibold">{seatedCount} / 5</p>
        </div>
      </header>

      {room.status === "playing" ? <GameTable roomId={roomId} /> : null}

      {room.status === "lobby" ? (
        <>
      <section className="rounded-2xl border border-white/10 bg-[var(--card)] p-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="text-lg font-medium">Invite link</h2>
          <button
            type="button"
            onClick={() => void handleCopyLink()}
            className="rounded-lg border border-white/10 px-3 py-2 text-sm hover:border-white/20"
          >
            Copy link
          </button>
        </div>
        <p className="mt-2 break-all text-sm text-[var(--muted)]">{shareUrl || "…"}</p>
      </section>

      <section className="grid gap-3 sm:grid-cols-2">
        {room.seats.map((seat, index) => {
          const isMine = index === mySeatIndex;
          const isOpen = seat === null;
          const canClaim = isOpen && room.status === "lobby" && mySeatIndex < 0;

          return (
            <div
              key={index}
              className={`rounded-2xl border p-4 ${
                isMine ? "border-[var(--accent)] bg-[var(--accent)]/10" : "border-white/10 bg-black/20"
              }`}
            >
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-sm text-[var(--muted)]">Seat {index + 1}</p>
                  <p className="text-lg font-medium">
                    {seat ? seat.displayName : "Open"}
                  </p>
                </div>
                {seat ? (
                  <span
                    className={`rounded-full px-3 py-1 text-xs font-medium ${
                      seat.ready
                        ? "bg-emerald-500/20 text-emerald-200"
                        : "bg-white/10 text-[var(--muted)]"
                    }`}
                  >
                    {seat.ready ? "Ready" : "Not ready"}
                  </span>
                ) : null}
              </div>

              {canClaim ? (
                <button
                  type="button"
                  disabled={busySeat === index}
                  onClick={() => void handleJoinSeat(index)}
                  className="mt-4 w-full rounded-xl border border-white/10 px-4 py-2 text-sm hover:border-white/20 disabled:opacity-60"
                >
                  {busySeat === index ? "Joining…" : "Take this seat"}
                </button>
              ) : null}
            </div>
          );
        })}
      </section>

      {mySeatIndex >= 0 && room.status === "lobby" ? (
        <section className="flex flex-wrap gap-3">
          <button
            type="button"
            onClick={() => void handleReadyToggle()}
            className="rounded-xl bg-[var(--accent)] px-5 py-3 text-sm font-semibold text-black"
          >
            {room.seats[mySeatIndex]?.ready ? "Mark not ready" : "Mark ready"}
          </button>

          {isHost ? (
            <button
              type="button"
              disabled={!canStart || starting}
              onClick={() => void handleStartGame()}
              className="rounded-xl border border-white/10 px-5 py-3 text-sm font-medium disabled:opacity-50"
            >
              {starting ? "Starting…" : "Start game"}
            </button>
          ) : null}
        </section>
      ) : null}

      {isHost && room.status === "lobby" && seatedCount < 2 ? (
        <p className="text-sm text-[var(--muted)]">
          Waiting for at least one more player before you can start.
        </p>
      ) : null}

      {isHost && room.status === "lobby" && seatedCount >= 2 && !allReady ? (
        <p className="text-sm text-[var(--muted)]">
          Waiting for every seated player to mark ready.
        </p>
      ) : null}

      {status ? <p className="text-sm text-[var(--muted)]">{status}</p> : null}
        </>
      ) : null}
    </main>
  );
}
