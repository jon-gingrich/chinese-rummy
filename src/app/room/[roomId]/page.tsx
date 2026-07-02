"use client";

import { useMutation, useQuery } from "convex/react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useState } from "react";
import { api } from "../../../../convex/_generated/api";
import type { Id } from "../../../../convex/_generated/dataModel";
import { AppShell } from "@/components/AppShell";
import { GameTable } from "../../../components/GameTable";
import { LinkAccountPrompt } from "../../../components/LinkAccountPrompt";
import { ScreenSizeGate } from "../../../components/ScreenSizeGate";
import { useGuestAuth } from "../../../hooks/useGuestAuth";

export default function RoomLobbyPage() {
  const params = useParams<{ roomId: string }>();
  const roomId = params.roomId as Id<"rooms">;
  const { viewer, isLoading, isGuest } = useGuestAuth();
  const ensureCurrentUser = useMutation(api.users.ensureCurrentUser);
  const room = useQuery(api.rooms.getRoom, { roomId });
  const joinSeat = useMutation(api.rooms.joinSeat);
  const setReady = useMutation(api.rooms.setReady);
  const startGame = useMutation(api.rooms.startGame);
  const [status, setStatus] = useState<string | null>(null);
  const [busySeat, setBusySeat] = useState<number | null>(null);
  const [starting, setStarting] = useState(false);

  useEffect(() => {
    if (viewer) {
      void ensureCurrentUser().catch(() => undefined);
    }
  }, [ensureCurrentUser, viewer]);

  const mySeatIndex =
    viewer && room ? room.seats.findIndex((seat) => seat?.userId === viewer.userId) : -1;
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
  const isPlaying = room?.status === "playing";

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

  if (room === undefined || isLoading || viewer === null) {
    return (
      <AppShell>
        <p className="text-center text-[var(--muted)]">Loading room…</p>
      </AppShell>
    );
  }

  if (room === null) {
    return (
      <AppShell backHref="/home" title="Room not found">
        <Link href="/home" className="game-btn-primary inline-block">
          Back to home
        </Link>
      </AppShell>
    );
  }

  if (isPlaying) {
    return (
      <ScreenSizeGate>
        <div className="flex h-screen flex-col p-1 md:p-2">
          <div className="mb-1 flex shrink-0 items-center justify-between px-1">
            <Link href="/home" className="text-sm font-semibold text-[var(--muted)] hover:text-[var(--cream)]">
              ← Home
            </Link>
            <p className="font-mono text-sm font-bold tracking-[0.2em] text-[var(--accent-soft)]">
              {room.code}
            </p>
            {isGuest && viewer ? <LinkAccountPrompt userId={viewer.userId} compact /> : null}
          </div>
          <div className="flex min-h-0 flex-1 flex-col">
            <GameTable roomId={roomId} />
          </div>
        </div>
      </ScreenSizeGate>
    );
  }

  return (
    <AppShell backHref="/home" wide>
      <header className="mb-6 flex flex-wrap items-start justify-between gap-4">
        <div className="space-y-1">
          <p className="text-sm font-bold uppercase tracking-[0.25em] text-[var(--accent-soft)]">
            Room lobby
          </p>
          <h1 className="font-mono text-4xl font-extrabold tracking-[0.2em] text-[var(--cream)]">
            {room.code}
          </h1>
          <p className="text-sm text-[var(--muted)]">
            Choose a seat, mark ready, and wait for the host to start.
          </p>
        </div>
        <div className="game-panel px-4 py-3 text-center">
          <p className="text-xs font-semibold text-[var(--muted)]">Seated</p>
          <p className="text-2xl font-extrabold text-[var(--accent-soft)]">{seatedCount} / 5</p>
        </div>
      </header>

      {isGuest && viewer ? (
        <LinkAccountPrompt userId={viewer.userId} />
      ) : null}

      <section className="game-panel mb-6 p-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="font-bold text-[var(--accent-soft)]">Invite link</h2>
          <button type="button" onClick={() => void handleCopyLink()} className="game-btn-secondary text-sm">
            Copy link
          </button>
        </div>
        <p className="mt-2 break-all text-sm text-[var(--muted)]">{shareUrl || "…"}</p>
      </section>

      <section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {room.seats.map((seat, index) => {
          const isMine = index === mySeatIndex;
          const isOpen = seat === null;
          const canClaim = isOpen && room.status === "lobby" && mySeatIndex < 0;

          return (
            <div
              key={index}
              className={`game-panel p-4 ${isMine ? "ring-2 ring-[var(--accent)]" : ""}`}
            >
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-sm font-semibold text-[var(--muted)]">Seat {index + 1}</p>
                  <p className="text-lg font-bold text-[var(--cream)]">
                    {seat ? seat.displayName : "Open"}
                  </p>
                </div>
                {seat ? (
                  <span
                    className={`rounded-full px-3 py-1 text-xs font-bold ${
                      seat.ready
                        ? "bg-[var(--success)]/25 text-[var(--success)]"
                        : "bg-black/25 text-[var(--muted)]"
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
                  className="game-btn-secondary mt-4 w-full text-sm"
                >
                  {busySeat === index ? "Joining…" : "Take this seat"}
                </button>
              ) : null}
            </div>
          );
        })}
      </section>

      {mySeatIndex >= 0 && room.status === "lobby" ? (
        <section className="mt-6 flex flex-wrap gap-3">
          <button type="button" onClick={() => void handleReadyToggle()} className="game-btn-primary">
            {room.seats[mySeatIndex]?.ready ? "Mark not ready" : "Mark ready"}
          </button>

          {isHost ? (
            <button
              type="button"
              disabled={!canStart || starting}
              onClick={() => void handleStartGame()}
              className="game-btn-secondary"
            >
              {starting ? "Starting…" : "Start game"}
            </button>
          ) : null}
        </section>
      ) : null}

      {isHost && room.status === "lobby" && seatedCount < 2 ? (
        <p className="mt-4 text-sm text-[var(--muted)]">
          Waiting for at least one more player before you can start.
        </p>
      ) : null}

      {isHost && room.status === "lobby" && seatedCount >= 2 && !allReady ? (
        <p className="mt-4 text-sm text-[var(--muted)]">
          Waiting for every seated player to mark ready.
        </p>
      ) : null}

      {status ? <p className="mt-4 text-sm text-[var(--muted)]">{status}</p> : null}
    </AppShell>
  );
}
