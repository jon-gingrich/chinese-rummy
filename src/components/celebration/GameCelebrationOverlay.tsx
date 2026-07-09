"use client";

import dynamic from "next/dynamic";
import { useMutation } from "convex/react";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import { api } from "../../../convex/_generated/api";
import {
  buildPodium,
  standingsOrder,
  winnerAnnouncement,
  type CelebrationPlayer,
} from "../../lib/celebrationRanking";

const CelebrationScene = dynamic(
  () => import("./CelebrationScene").then((mod) => mod.CelebrationScene),
  { ssr: false },
);

type GameCelebrationOverlayProps = {
  open: boolean;
  players: CelebrationPlayer[];
  winnerPlayerIds?: string[];
  mode: "practice" | "multiplayer";
};

export function GameCelebrationOverlay({
  open,
  players,
  winnerPlayerIds,
  mode,
}: GameCelebrationOverlayProps) {
  const router = useRouter();
  const startPractice = useMutation(api.practice.startPracticeGame);
  const [skip, setSkip] = useState(false);
  const [showStandings, setShowStandings] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const podium = useMemo(() => buildPodium(players), [players]);
  const ordered = useMemo(() => standingsOrder(players), [players]);
  const announcement = useMemo(
    () => winnerAnnouncement(players, winnerPlayerIds),
    [players, winnerPlayerIds],
  );

  useEffect(() => {
    if (!open) {
      return;
    }
    setSkip(false);
    setShowStandings(false);
    setError(null);

    const media = window.matchMedia("(prefers-reduced-motion: reduce)");
    if (media.matches) {
      setSkip(true);
      setShowStandings(true);
    }
  }, [open]);

  if (!open) {
    return null;
  }

  async function handlePlayAgain() {
    if (mode !== "practice") {
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const opponentCount = Math.max(1, Math.min(4, players.length - 1));
      const gameId = await startPractice({ opponentCount });
      router.push(`/practice/${gameId}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not start a new game");
      setBusy(false);
    }
  }

  return (
    <div className="absolute inset-0 z-50 overflow-hidden bg-[var(--felt-dark)]">
      <div className="absolute inset-0">
        <CelebrationScene
          podium={podium}
          skip={skip}
          onSequenceComplete={() => setShowStandings(true)}
        />
      </div>

      {!showStandings ? (
        <button
          type="button"
          onClick={() => {
            setSkip(true);
            setShowStandings(true);
          }}
          className="game-btn-secondary absolute right-4 top-4 z-10 text-xs"
        >
          Skip
        </button>
      ) : null}

      <AnimatePresence>
        {showStandings ? (
          <motion.div
            initial={{ opacity: 0, y: 28 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.45, ease: "easeOut" }}
            className="absolute inset-x-0 bottom-0 z-10 flex justify-center p-4 md:p-6"
          >
            <div className="game-panel w-full max-w-lg p-5 shadow-2xl md:p-6">
              <p className="sr-only" aria-live="polite">
                {announcement}
              </p>
              <h2 className="font-[Georgia,serif] text-2xl font-extrabold text-[var(--accent-soft)]">
                {announcement}
              </h2>
              <p className="mt-1 text-xs text-[var(--muted)]">
                Lowest cumulative deadwood after ten rounds.
              </p>

              <ol className="mt-4 max-h-48 space-y-2 overflow-y-auto">
                {ordered.map((player, index) => {
                  const place = index + 1;
                  const isWinner = winnerPlayerIds?.includes(player.id) ?? place === 1;
                  return (
                    <li
                      key={player.id}
                      className={`flex items-center justify-between rounded-lg px-4 py-2.5 text-sm ${
                        isWinner ? "bg-[var(--accent)]/15 ring-1 ring-[var(--accent)]/40" : "bg-black/20"
                      }`}
                    >
                      <span className="flex items-center gap-3">
                        <span
                          className={`w-7 text-center font-extrabold ${
                            place === 1
                              ? "text-[var(--accent-soft)]"
                              : place === 2
                                ? "text-[#c0c7d0]"
                                : place === 3
                                  ? "text-[#b87333]"
                                  : "text-[var(--muted)]"
                          }`}
                        >
                          {place}
                        </span>
                        <span className="font-semibold text-[var(--cream)]">{player.displayName}</span>
                      </span>
                      <span className="tabular-nums">
                        {player.roundScore !== undefined ? (
                          <>
                            <span className="text-[var(--danger)]">+{player.roundScore}</span>
                            <span className="mx-2 text-[var(--muted)]">→</span>
                          </>
                        ) : null}
                        <span className="font-bold text-[var(--accent-soft)]">
                          {player.cumulativeScore}
                        </span>
                      </span>
                    </li>
                  );
                })}
              </ol>

              {error ? <p className="mt-3 text-sm text-[var(--danger)]">{error}</p> : null}

              <div className="mt-5 flex flex-col gap-2 sm:flex-row">
                <button
                  type="button"
                  disabled={busy}
                  onClick={() => router.push("/home")}
                  className="game-btn-secondary flex-1"
                >
                  Home
                </button>
                {mode === "practice" ? (
                  <button
                    type="button"
                    disabled={busy}
                    onClick={() => void handlePlayAgain()}
                    className="game-btn-primary flex-1"
                  >
                    {busy ? "Dealing…" : "Play again"}
                  </button>
                ) : null}
              </div>
            </div>
          </motion.div>
        ) : null}
      </AnimatePresence>
    </div>
  );
}
