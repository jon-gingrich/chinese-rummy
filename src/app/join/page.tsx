"use client";

import { useMutation, useQuery } from "convex/react";
import { useRouter, useSearchParams } from "next/navigation";
import { FormEvent, useEffect, useState } from "react";
import { api } from "../../../convex/_generated/api";
import { AppShell } from "@/components/AppShell";
import { useGuestAuth } from "../../hooks/useGuestAuth";
import { clearExplicitSignOut } from "../../lib/guestSession";

function readInviteCode(searchParams: URLSearchParams) {
  return (searchParams.get("room") ?? searchParams.get("code") ?? "")
    .trim()
    .toUpperCase();
}

export default function JoinRoomPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const inviteCode = readInviteCode(searchParams);
  const { viewer, isLoading } = useGuestAuth();
  const ensureCurrentUser = useMutation(api.users.ensureCurrentUser);
  const [code, setCode] = useState(inviteCode);
  const [status, setStatus] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    clearExplicitSignOut();
  }, []);

  useEffect(() => {
    if (inviteCode) {
      setCode(inviteCode);
    }
  }, [inviteCode]);

  useEffect(() => {
    if (viewer) {
      void ensureCurrentUser().catch(() => undefined);
    }
  }, [ensureCurrentUser, viewer]);

  const normalizedCode = code.trim().toUpperCase();
  const roomPreview = useQuery(
    api.rooms.getRoomByCode,
    normalizedCode.length === 6 ? { code: normalizedCode } : "skip",
  );

  const isInviteLink = inviteCode.length === 6;

  useEffect(() => {
    if (!isInviteLink || !roomPreview || isLoading || viewer === null) {
      return;
    }
    router.replace(`/room/${roomPreview._id}`);
  }, [isInviteLink, isLoading, roomPreview, router, viewer]);

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

  if (isInviteLink) {
    if (roomPreview === undefined) {
      return (
        <AppShell>
          <p className="text-center text-[var(--muted)]">Opening room…</p>
        </AppShell>
      );
    }

    if (roomPreview === null) {
      return (
        <AppShell
          backHref="/home"
          title="Join a room"
          subtitle="This invite link is no longer valid."
        >
          <form
            onSubmit={(event) => void handleJoin(event)}
            className="game-panel mx-auto max-w-md space-y-4 p-6"
          >
            <p className="text-sm text-[var(--danger)]">
              No room found for code {inviteCode}. Ask the host for a new link.
            </p>
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
            <button type="submit" disabled={loading || !roomPreview} className="game-btn-primary w-full">
              {loading ? "Opening…" : "Continue to seats"}
            </button>
            {status ? <p className="text-sm text-[var(--muted)]">{status}</p> : null}
          </form>
        </AppShell>
      );
    }

    return (
      <AppShell>
        <p className="text-center text-[var(--muted)]">Opening room…</p>
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
