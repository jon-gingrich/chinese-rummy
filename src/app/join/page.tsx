"use client";

import { useMutation, useQuery } from "convex/react";
import { useRouter } from "next/navigation";
import { FormEvent, useEffect, useState } from "react";
import { api } from "../../../convex/_generated/api";
import { AppShell } from "@/components/AppShell";
import { useGuestAuth } from "../../hooks/useGuestAuth";

export default function JoinRoomPage() {
  const router = useRouter();
  const { viewer, isLoading } = useGuestAuth();
  const ensureCurrentUser = useMutation(api.users.ensureCurrentUser);
  const [code, setCode] = useState("");
  const [status, setStatus] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (viewer) {
      void ensureCurrentUser().catch(() => undefined);
    }
  }, [ensureCurrentUser, viewer]);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const prefill = params.get("code");
    if (prefill) {
      setCode(prefill.toUpperCase());
    }
  }, []);

  const normalizedCode = code.trim().toUpperCase();
  const roomPreview = useQuery(
    api.rooms.getRoomByCode,
    normalizedCode.length === 6 ? { code: normalizedCode } : "skip",
  );

  async function handleJoin(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!roomPreview) {
      setStatus("Room not found. Check the code and try again.");
      return;
    }

    setLoading(true);
    setStatus(null);
    try {
      router.push(`/room/${roomPreview._id}`);
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "Could not open room");
      setLoading(false);
    }
  }

  if (isLoading || viewer === null) {
    return (
      <AppShell>
        <p className="text-center text-[var(--muted)]">Loading…</p>
      </AppShell>
    );
  }

  return (
    <AppShell
      backHref="/home"
      title="Join a room"
      subtitle="Enter the six-character room code from your host."
    >
      <form onSubmit={(event) => void handleJoin(event)} className="game-panel mx-auto max-w-md space-y-4 p-6">
        <label className="block space-y-2 text-sm">
          <span className="font-semibold text-[var(--muted)]">Room code</span>
          <input
            value={code}
            onChange={(event) => setCode(event.target.value.toUpperCase())}
            minLength={6}
            maxLength={6}
            required
            placeholder="ABC123"
            className="game-input font-mono tracking-[0.35em] uppercase"
          />
        </label>

        {roomPreview === undefined && normalizedCode.length === 6 ? (
          <p className="text-sm text-[var(--muted)]">Looking up room…</p>
        ) : null}

        {normalizedCode.length === 6 && roomPreview === null ? (
          <p className="text-sm text-[var(--danger)]">No room found for that code.</p>
        ) : null}

        {roomPreview ? (
          <div className="rounded-lg bg-black/20 px-4 py-3 text-sm">
            Room found — {roomPreview.seats.filter((seat) => seat !== null).length} of 5 seats taken.
          </div>
        ) : null}

        <button type="submit" disabled={loading || !roomPreview} className="game-btn-primary w-full">
          {loading ? "Opening…" : "Continue to seats"}
        </button>

        {status ? <p className="text-sm text-[var(--muted)]">{status}</p> : null}
      </form>
    </AppShell>
  );
}
