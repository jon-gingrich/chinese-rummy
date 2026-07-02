"use client";

import { useMutation, useQuery } from "convex/react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { FormEvent, useEffect, useState } from "react";
import { api } from "../../../convex/_generated/api";

export default function JoinRoomPage() {
  const router = useRouter();
  const viewer = useQuery(api.users.viewer);
  const ensureCurrentUser = useMutation(api.users.ensureCurrentUser);
  const [code, setCode] = useState("");
  const [status, setStatus] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    void ensureCurrentUser().catch(() => undefined);
  }, [ensureCurrentUser]);

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

  if (viewer === undefined) {
    return (
      <main className="mx-auto flex min-h-screen max-w-lg items-center justify-center px-6">
        <p className="text-[var(--muted)]">Loading…</p>
      </main>
    );
  }

  return (
    <main className="mx-auto flex min-h-screen max-w-lg flex-col gap-8 px-6 py-12">
      <header className="space-y-2">
        <Link href="/home" className="text-sm text-[var(--muted)] hover:text-white">
          ← Back to home
        </Link>
        <h1 className="text-3xl font-semibold">Join a room</h1>
        <p className="text-sm text-[var(--muted)]">
          Enter the six-character room code from your host.
        </p>
      </header>

      <form onSubmit={(event) => void handleJoin(event)} className="space-y-4">
        <label className="block space-y-2 text-sm">
          <span className="text-[var(--muted)]">Room code</span>
          <input
            value={code}
            onChange={(event) => setCode(event.target.value.toUpperCase())}
            minLength={6}
            maxLength={6}
            required
            placeholder="ABC123"
            className="w-full rounded-xl border border-white/10 bg-[var(--card)] px-4 py-3 font-mono tracking-[0.35em] uppercase outline-none ring-[var(--accent)] focus:ring-2"
          />
        </label>

        {roomPreview === undefined && normalizedCode.length === 6 ? (
          <p className="text-sm text-[var(--muted)]">Looking up room…</p>
        ) : null}

        {normalizedCode.length === 6 && roomPreview === null ? (
          <p className="text-sm text-red-300">No room found for that code.</p>
        ) : null}

        {roomPreview ? (
          <div className="rounded-xl border border-white/10 bg-[var(--card)] px-4 py-3 text-sm">
            <p>
              Room found — {roomPreview.seats.filter((seat) => seat !== null).length} of 5
              seats taken.
            </p>
          </div>
        ) : null}

        <button
          type="submit"
          disabled={loading || !roomPreview}
          className="w-full rounded-xl bg-[var(--accent)] px-4 py-3 text-sm font-semibold text-black disabled:opacity-60"
        >
          {loading ? "Opening…" : "Continue to seats"}
        </button>
      </form>

      {status ? <p className="text-sm text-[var(--muted)]">{status}</p> : null}
    </main>
  );
}
