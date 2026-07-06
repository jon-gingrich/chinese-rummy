"use client";

import { useMutation, useQuery } from "convex/react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { api } from "../../../../convex/_generated/api";
import type { Id } from "../../../../convex/_generated/dataModel";
import { AppShell } from "@/components/AppShell";
import { GameTable } from "../../../components/GameTable";
import { ScreenSizeGate } from "../../../components/ScreenSizeGate";
import { useGuestAuth } from "../../../hooks/useGuestAuth";

export default function PracticePage() {
  const params = useParams<{ gameId: string }>();
  const gameId = params.gameId as Id<"games">;
  const router = useRouter();
  const { viewer, isLoading } = useGuestAuth();
  const ensureCurrentUser = useMutation(api.users.ensureCurrentUser);
  const table = useQuery(api.practice.getGame, { gameId });
  const [status, setStatus] = useState<string | null>(null);

  useEffect(() => {
    if (viewer) {
      void ensureCurrentUser().catch(() => undefined);
    }
  }, [ensureCurrentUser, viewer]);

  useEffect(() => {
    if (table === null) {
      setStatus("Practice game not found or you no longer have access.");
    }
  }, [table]);

  if (isLoading || !viewer) {
    return (
      <AppShell>
        <p className="text-center text-[var(--muted)]">Loading practice game…</p>
      </AppShell>
    );
  }

  if (table === undefined) {
    return (
      <AppShell>
        <p className="text-center text-[var(--muted)]">Loading table…</p>
      </AppShell>
    );
  }

  if (table === null) {
    return (
      <AppShell>
        <p className="text-center text-[var(--danger)]">{status ?? "Practice game unavailable."}</p>
        <div className="mt-4 text-center">
          <Link href="/home" className="game-btn-primary">
            Back to home
          </Link>
        </div>
      </AppShell>
    );
  }

  return (
    <ScreenSizeGate>
      <div className="flex h-[100dvh] flex-col bg-[var(--felt)]">
        <div className="flex shrink-0 items-center justify-between gap-3 border-b border-black/20 px-3 py-2">
          <button type="button" onClick={() => router.push("/home")} className="game-btn-secondary text-xs">
            ← Home
          </button>
          <p className="text-sm font-bold text-[var(--cream)]">Practice vs automated players</p>
          <span className="w-16" />
        </div>
        <GameTable session={{ mode: "practice", gameId }} />
      </div>
    </ScreenSizeGate>
  );
}
