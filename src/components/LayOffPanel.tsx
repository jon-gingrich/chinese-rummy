"use client";

import { useMutation } from "convex/react";
import { useEffect, useMemo, useState } from "react";
import { api } from "../../convex/_generated/api";
import type { Id } from "../../convex/_generated/dataModel";
import { findLayOffTargets } from "../../convex/lib/rules/layoffs";
import type { Card, LayOffTarget, NaturalRank, TableMeld } from "../../convex/lib/rules/types";

const NATURAL_RANKS: NaturalRank[] = [
  "A",
  "2",
  "3",
  "4",
  "5",
  "6",
  "7",
  "8",
  "9",
  "10",
  "J",
  "Q",
  "K",
];

type LayOffPanelProps = {
  roomId: Id<"rooms">;
  hand: Card[];
  melds: TableMeld[];
  selectedCardId: string | null;
  meldLabels: Record<string, string>;
  onStatus: (message: string | null) => void;
  onComplete?: () => void;
};

function targetKey(target: LayOffTarget): string {
  if (target.mode === "add") {
    return `add:${target.meldId}`;
  }
  return `replace:${target.meldId}:${target.replaceWildCardId}`;
}

export function LayOffPanel({
  roomId,
  hand,
  melds,
  selectedCardId,
  meldLabels,
  onStatus,
  onComplete,
}: LayOffPanelProps) {
  const layOff = useMutation(api.games.layOff);
  const [selectedTargetKey, setSelectedTargetKey] = useState<string | null>(null);
  const [destinationMeldId, setDestinationMeldId] = useState<string | null>(null);
  const [wildRank, setWildRank] = useState<NaturalRank>("7");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    setSelectedTargetKey(null);
    setDestinationMeldId(null);
  }, [selectedCardId]);

  const selectedCard = useMemo(
    () => hand.find((entry) => entry.id === selectedCardId) ?? null,
    [hand, selectedCardId],
  );

  const cardTargets = useMemo(() => {
    if (!selectedCard) {
      return [];
    }
    return findLayOffTargets(melds, [selectedCard], true, false);
  }, [melds, selectedCard]);

  const selectedTarget = useMemo(
    () => cardTargets.find((target) => targetKey(target) === selectedTargetKey) ?? null,
    [cardTargets, selectedTargetKey],
  );

  async function submitLayOff() {
    if (!selectedCard || !selectedTarget) {
      onStatus("Select a card and lay-off target");
      return;
    }

    if (selectedTarget.mode === "replaceWild" && !destinationMeldId) {
      onStatus("Choose where to relocate the wild");
      return;
    }

    setBusy(true);
    onStatus(null);
    try {
      const result = await layOff({
        roomId,
        targetMeldId: selectedTarget.meldId,
        card: selectedCard,
        replaceWildCardId:
          selectedTarget.mode === "replaceWild"
            ? selectedTarget.replaceWildCardId
            : undefined,
        relocation:
          selectedTarget.mode === "replaceWild" && destinationMeldId
            ? {
                destinationMeldId,
                wildDeclaration: { cardId: selectedTarget.replaceWildCardId, asRank: wildRank },
              }
            : undefined,
      });

      if (result.error) {
        onStatus(result.error);
      } else {
        setSelectedTargetKey(null);
        setDestinationMeldId(null);
        onComplete?.();
      }
    } catch (error) {
      onStatus(error instanceof Error ? error.message : "Lay-off failed");
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="rounded-2xl border border-white/10 bg-[var(--card)] p-6">
      <div className="mb-4 space-y-1">
        <h3 className="text-lg font-medium">Lay off</h3>
        <p className="text-sm text-[var(--muted)]">
          Tap a card in your hand below, choose a meld, then lay off.
        </p>
      </div>

      {selectedCardId ? (
        <div className="mb-4 space-y-2">
          {cardTargets.length > 0 ? (
            cardTargets.map((target) => (
              <button
                key={targetKey(target)}
                type="button"
                disabled={busy}
                onClick={() => setSelectedTargetKey(targetKey(target))}
                className={`block w-full rounded-xl border px-4 py-3 text-left text-sm ${
                  selectedTargetKey === targetKey(target)
                    ? "border-[var(--accent)] bg-[var(--accent)]/10"
                    : "border-white/10"
                }`}
              >
                {target.mode === "add"
                  ? `Add to ${meldLabels[target.meldId] ?? target.meldId}`
                  : `Replace wild on ${meldLabels[target.meldId] ?? target.meldId}`}
              </button>
            ))
          ) : (
            <p className="text-sm text-[var(--muted)]">
              This card cannot be laid off on any meld.
            </p>
          )}
        </div>
      ) : (
        <p className="mb-4 text-sm text-[var(--muted)]">Select a card from your hand to begin.</p>
      )}

      {selectedTarget?.mode === "replaceWild" ? (
        <div className="mb-4 space-y-3">
          <label className="block text-sm">
            <span className="text-[var(--muted)]">Relocate wild to</span>
            <select
              value={destinationMeldId ?? ""}
              onChange={(event) => setDestinationMeldId(event.target.value)}
              className="mt-1 w-full rounded-lg border border-white/10 bg-black/40 px-3 py-2"
            >
              <option value="">Choose destination meld</option>
              {selectedTarget.relocationDestinations.map((meldId) => (
                <option key={meldId} value={meldId}>
                  {meldLabels[meldId] ?? meldId}
                </option>
              ))}
            </select>
          </label>
          <label className="block text-sm">
            <span className="text-[var(--muted)]">Wild represents</span>
            <select
              value={wildRank}
              onChange={(event) => setWildRank(event.target.value as NaturalRank)}
              className="mt-1 w-full rounded-lg border border-white/10 bg-black/40 px-3 py-2"
            >
              {NATURAL_RANKS.map((rank) => (
                <option key={rank} value={rank}>
                  {rank}
                </option>
              ))}
            </select>
          </label>
        </div>
      ) : null}

      <button
        type="button"
        disabled={busy || !selectedCard || !selectedTarget}
        onClick={() => void submitLayOff()}
        className="rounded-lg bg-[var(--accent)] px-4 py-2 text-sm font-semibold text-black disabled:opacity-50"
      >
        Lay off card
      </button>
    </section>
  );
}
