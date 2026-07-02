"use client";

import { useMutation, useQuery } from "convex/react";
import { useMemo, useState } from "react";
import { api } from "../../convex/_generated/api";
import type { Id } from "../../convex/_generated/dataModel";
import type { Card } from "../../convex/lib/rules/types";
import { OpeningPanel } from "./OpeningPanel";
import { LayOffPanel } from "./LayOffPanel";

function formatCard(card: Card): string {
  if (card.rank === "JOKER") {
    return "Joker";
  }
  const suitSymbol =
    card.suit === "hearts"
      ? "♥"
      : card.suit === "diamonds"
        ? "♦"
        : card.suit === "clubs"
          ? "♣"
          : card.suit === "spades"
            ? "♠"
            : "";
  return `${card.rank}${suitSymbol}`;
}

function suitColor(suit: string): string {
  if (suit === "hearts" || suit === "diamonds") {
    return "text-rose-300";
  }
  return "text-slate-100";
}

export function GameTable({ roomId }: { roomId: Id<"rooms"> }) {
  const viewer = useQuery(api.users.viewer);
  const table = useQuery(api.games.getGame, { roomId });
  const hand = useQuery(api.games.getMyHand, { roomId });
  const legalActions = useQuery(api.games.getLegalActions, { roomId });
  const draw = useMutation(api.games.draw);
  const discard = useMutation(api.games.discard);
  const continueRound = useMutation(api.games.continueRound);
  const [selectedCardId, setSelectedCardId] = useState<string | null>(null);
  const [status, setStatus] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const sortedHand = useMemo(
    () => (hand ? [...hand].sort((a, b) => a.id.localeCompare(b.id)) : []),
    [hand],
  );

  const myPlayer = table?.players.find((player) => player.id === viewer?.userId);
  const isMyTurn = myPlayer?.isActive ?? false;
  const canOpen =
    isMyTurn &&
    table?.turnPhase === "discard" &&
    myPlayer?.playerPhase === "notOpened" &&
    legalActions?.canOpen;

  const meldLabels = useMemo(() => {
    const labels: Record<string, string> = {};
    for (const meld of table?.melds ?? []) {
      const owner = table?.players.find((player) => player.id === meld.ownerId);
      labels[meld.id] = `${owner?.displayName ?? "Player"} ${meld.kind}`;
    }
    return labels;
  }, [table]);

  const canLayOff =
    isMyTurn && table?.turnPhase === "discard" && (legalActions?.canLayOff ?? false);

  async function handleDraw(source: "stock" | "discard") {
    setBusy(true);
    setStatus(null);
    try {
      const result = await draw({ roomId, source });
      if (result.error) {
        setStatus(result.error);
      } else {
        setSelectedCardId(null);
      }
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "Draw failed");
    } finally {
      setBusy(false);
    }
  }

  async function handleContinueRound() {
    setBusy(true);
    setStatus(null);
    try {
      const result = await continueRound({ roomId });
      if (result.error) {
        setStatus(result.error);
      }
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "Could not continue");
    } finally {
      setBusy(false);
    }
  }

  async function handleDiscard() {
    const card = sortedHand.find((entry) => entry.id === selectedCardId);
    if (!card) {
      setStatus("Select a card to discard");
      return;
    }

    setBusy(true);
    setStatus(null);
    try {
      const result = await discard({ roomId, card });
      if (result.error) {
        setStatus(result.error);
      } else {
        setSelectedCardId(null);
      }
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "Discard failed");
    } finally {
      setBusy(false);
    }
  }

  if (
    table === undefined ||
    hand === undefined ||
    legalActions === undefined ||
    legalActions === null
  ) {
    return <p className="text-sm text-[var(--muted)]">Loading table…</p>;
  }

  if (table === null) {
    return <p className="text-sm text-[var(--muted)]">Waiting for game state…</p>;
  }

  return (
    <div className="space-y-8">
      {table.phase === "gameEnd" ? (
        <section className="rounded-2xl border border-emerald-400/30 bg-emerald-500/10 p-6">
          <h2 className="text-2xl font-semibold text-emerald-100">Game over</h2>
          <p className="mt-2 text-sm text-emerald-50/90">
            Winner
            {table.winnerPlayerIds && table.winnerPlayerIds.length > 1 ? "s" : ""}:{" "}
            {table.players
              .filter((player) => table.winnerPlayerIds?.includes(player.id))
              .map((player) => player.displayName)
              .join(", ") || "—"}
          </p>
          <p className="mt-1 text-sm text-[var(--muted)]">
            Lowest cumulative deadwood after ten rounds.
          </p>
        </section>
      ) : null}

      {table.lastRoundSummary ? (
        <section className="rounded-2xl border border-white/10 bg-[var(--card)] p-6">
          <h2 className="text-xl font-semibold">Round {table.lastRoundSummary.roundNumber} summary</h2>
          <p className="mt-1 text-sm text-[var(--muted)]">
            {table.players.find((player) => player.id === table.lastRoundSummary?.goerPlayerId)
              ?.displayName ?? "A player"}{" "}
            went out.
          </p>
          <div className="mt-4 grid gap-2 sm:grid-cols-2">
            {table.players.map((player, index) => (
              <div
                key={player.id}
                className="flex items-center justify-between rounded-xl border border-white/10 px-4 py-3 text-sm"
              >
                <span>{player.displayName}</span>
                <span>
                  +{table.lastRoundSummary?.roundScores[index] ?? 0} (
                  {table.lastRoundSummary?.cumulativeScores[index] ?? 0} total)
                </span>
              </div>
            ))}
          </div>
          {table.canContinueRound ? (
            <button
              type="button"
              disabled={busy}
              onClick={() => void handleContinueRound()}
              className="mt-4 rounded-lg bg-[var(--accent)] px-4 py-2 text-sm font-semibold text-black disabled:opacity-50"
            >
              Start round {table.roundNumber + 1}
            </button>
          ) : null}
        </section>
      ) : null}

      <section className="rounded-2xl border border-white/10 bg-[var(--card)] p-6">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="text-sm uppercase tracking-[0.2em] text-[var(--accent)]">
              Round {table.roundNumber}
            </p>
            <h2 className="text-2xl font-semibold">Table</h2>
            <p className="mt-1 text-sm text-[var(--muted)]">Contract: {table.contract}</p>
            <p className="mt-1 text-sm text-[var(--muted)]">
              {table.phase === "roundEnd"
                ? "Round complete — review scores and start the next round."
                : table.phase === "gameEnd"
                  ? "Final scores are locked in."
                  : isMyTurn
                ? table.turnPhase === "draw"
                  ? "Your turn — draw a card."
                  : myPlayer?.playerPhase === "notOpened"
                    ? "Your turn — open or discard."
                    : canLayOff
                      ? "Your turn — lay off, then discard."
                      : "Your turn — discard a card."
                : `Waiting for ${
                    table.players.find((player) => player.isActive)?.displayName ??
                    "next player"
                  }.`}
            </p>
          </div>
          <div className="grid grid-cols-2 gap-3 text-sm">
            <div className="rounded-xl border border-white/10 px-4 py-3">
              <p className="text-[var(--muted)]">Stock</p>
              <p className="text-xl font-semibold">{table.stockCount}</p>
            </div>
            <div className="rounded-xl border border-white/10 px-4 py-3">
              <p className="text-[var(--muted)]">Top discard</p>
              <p className="text-xl font-semibold">
                {table.topDiscard ? formatCard(table.topDiscard) : "—"}
              </p>
            </div>
          </div>
        </div>
      </section>

      <section className="grid gap-3 sm:grid-cols-2">
        {table.players.map((player) => (
          <div
            key={player.id}
            className={`rounded-2xl border p-4 ${
              player.isActive
                ? "border-[var(--accent)] bg-[var(--accent)]/10"
                : "border-white/10 bg-black/20"
            }`}
          >
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-lg font-medium">{player.displayName}</p>
                <p className="text-sm text-[var(--muted)]">Seat {player.seatIndex + 1}</p>
              </div>
              <div className="text-right text-sm">
                <p>{player.handSize} cards</p>
                <p className="text-[var(--muted)]">{player.cumulativeScore} pts</p>
                {player.playerPhase === "opened" ? (
                  <p className="text-emerald-200">Opened</p>
                ) : null}
                {player.isDealer ? (
                  <p className="text-[var(--muted)]">Dealer</p>
                ) : null}
                {player.isActive ? (
                  <p className="font-medium text-[var(--accent)]">Active</p>
                ) : null}
              </div>
            </div>
          </div>
        ))}
      </section>

      {table.melds.length > 0 ? (
        <section className="rounded-2xl border border-white/10 bg-[var(--card)] p-6">
          <h3 className="mb-4 text-lg font-medium">Table melds</h3>
          <div className="grid gap-3 sm:grid-cols-2">
            {table.melds.map((meld) => {
              const owner = table.players.find((player) => player.id === meld.ownerId);
              return (
                <div key={meld.id} className="rounded-xl border border-white/10 px-4 py-3 text-sm">
                  <p className="font-medium capitalize">
                    {owner?.displayName ?? "Player"} — {meld.kind}
                  </p>
                  <p className="text-[var(--muted)]">
                    {meld.cards.map((card) => formatCard(card)).join(", ")}
                  </p>
                </div>
              );
            })}
          </div>
        </section>
      ) : null}

      {table.phase === "playing" && canOpen ? (
        <OpeningPanel
          roomId={roomId}
          roundNumber={table.roundNumber}
          contract={table.contract}
          hand={sortedHand}
          onStatus={setStatus}
        />
      ) : null}

      {table.phase === "playing" && canLayOff ? (
        <LayOffPanel
          roomId={roomId}
          hand={sortedHand}
          targets={legalActions.layOffTargets}
          meldLabels={meldLabels}
          onStatus={setStatus}
        />
      ) : null}

      {table.phase === "playing" ? (
      <section className="rounded-2xl border border-white/10 bg-[var(--card)] p-6">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <h3 className="text-lg font-medium">Your hand</h3>
          {isMyTurn && table.turnPhase === "draw" ? (
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                disabled={busy || !legalActions.canDrawFromStock}
                onClick={() => void handleDraw("stock")}
                className="rounded-lg bg-[var(--accent)] px-4 py-2 text-sm font-semibold text-black disabled:opacity-50"
              >
                Draw stock
              </button>
              <button
                type="button"
                disabled={busy || !legalActions.canDrawFromDiscard}
                onClick={() => void handleDraw("discard")}
                className="rounded-lg border border-white/10 px-4 py-2 text-sm disabled:opacity-50"
              >
                Take discard
              </button>
            </div>
          ) : null}
          {isMyTurn && table.turnPhase === "discard" ? (
            <button
              type="button"
              disabled={busy || !selectedCardId}
              onClick={() => void handleDiscard()}
              className="rounded-lg bg-[var(--accent)] px-4 py-2 text-sm font-semibold text-black disabled:opacity-50"
            >
              Discard selected
            </button>
          ) : null}
        </div>

        <div className="flex flex-wrap gap-2">
          {sortedHand.map((card) => {
            const selected = card.id === selectedCardId;
            const canSelect = isMyTurn && table.turnPhase === "discard";
            return (
              <button
                key={card.id}
                type="button"
                disabled={!canSelect || busy}
                onClick={() => setSelectedCardId(card.id)}
                className={`min-w-14 rounded-xl border px-3 py-4 text-sm font-medium ${
                  selected
                    ? "border-[var(--accent)] bg-[var(--accent)]/20"
                    : "border-white/10 bg-black/30"
                } ${suitColor(card.suit)} disabled:cursor-default`}
              >
                {formatCard(card)}
              </button>
            );
          })}
        </div>
      </section>
      ) : null}

      {status ? <p className="text-sm text-rose-200">{status}</p> : null}
    </div>
  );
}
