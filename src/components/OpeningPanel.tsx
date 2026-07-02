"use client";

import { useMutation } from "convex/react";
import { useMemo, useState } from "react";
import { api } from "../../convex/_generated/api";
import type { Id } from "../../convex/_generated/dataModel";
import { getContractForRound } from "../../convex/lib/rules/contracts";
import { isJoker } from "../../convex/lib/rules/melds";
import type { Card, NaturalRank, OpeningMeld } from "../../convex/lib/rules/types";
import { formatCardLabel, type HandSortMode } from "../lib/cards";
import { CardFan } from "./CardFan";
import { ConfirmDialog } from "./ConfirmDialog";

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

type OpeningPanelProps = {
  roomId: Id<"rooms">;
  roundNumber: number;
  contract: string;
  hand: Card[];
  sortMode: HandSortMode;
  onSortModeChange: (mode: HandSortMode) => void;
  onStatus: (message: string | null) => void;
};

export function OpeningPanel({
  roomId,
  roundNumber,
  contract,
  hand,
  sortMode,
  onSortModeChange,
  onStatus,
}: OpeningPanelProps) {
  const open = useMutation(api.games.open);
  const [pendingMelds, setPendingMelds] = useState<OpeningMeld[]>([]);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [wildRanks, setWildRanks] = useState<Record<string, NaturalRank>>({});
  const [showConfirm, setShowConfirm] = useState(false);
  const [busy, setBusy] = useState(false);

  const requirements = useMemo(() => getContractForRound(roundNumber), [roundNumber]);
  const nextRequirement = requirements[pendingMelds.length];
  const usedCardIds = new Set(pendingMelds.flatMap((meld) => meld.cards.map((card) => card.id)));
  const availableHand = hand.filter((card) => !usedCardIds.has(card.id));
  const selectedCards = availableHand.filter((card) => selectedIds.includes(card.id));

  function toggleCard(cardId: string) {
    if (!nextRequirement || busy) {
      return;
    }
    setSelectedIds((current) => {
      if (current.includes(cardId)) {
        return current.filter((id) => id !== cardId);
      }
      if (current.length >= nextRequirement.size) {
        return current;
      }
      return [...current, cardId];
    });
  }

  function wildDeclarationsForSelection(): OpeningMeld["wildDeclarations"] {
    return selectedCards.flatMap((card) => {
      if (isJoker(card)) {
        const asRank = wildRanks[card.id];
        return asRank ? [{ cardId: card.id, asRank }] : [];
      }
      if (card.rank === "2" && wildRanks[card.id] && wildRanks[card.id] !== "2") {
        return [{ cardId: card.id, asRank: wildRanks[card.id]! }];
      }
      return [];
    });
  }

  function addMeld() {
    if (!nextRequirement) {
      return;
    }
    if (selectedCards.length !== nextRequirement.size) {
      onStatus(`Select ${nextRequirement.size} cards for the next ${nextRequirement.kind}.`);
      return;
    }

    for (const card of selectedCards) {
      if (isJoker(card) && !wildRanks[card.id]) {
        onStatus("Declare a rank for each joker.");
        return;
      }
    }

    const meld: OpeningMeld = {
      kind: nextRequirement.kind,
      cards: selectedCards,
      wildDeclarations: wildDeclarationsForSelection(),
    };

    setPendingMelds((current) => [...current, meld]);
    setSelectedIds([]);
    setWildRanks({});
    onStatus(null);
  }

  async function submitOpening() {
    if (pendingMelds.length !== requirements.length) {
      onStatus("Complete every contract meld before submitting.");
      return;
    }

    setBusy(true);
    onStatus(null);
    try {
      const result = await open({ roomId, melds: pendingMelds });
      if (result.error) {
        onStatus(result.error);
      } else {
        setPendingMelds([]);
        setSelectedIds([]);
        setWildRanks({});
        setShowConfirm(false);
      }
    } catch (error) {
      onStatus(error instanceof Error ? error.message : "Opening failed");
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="rounded-2xl border border-white/10 bg-[var(--card)] p-6">
      <ConfirmDialog
        open={showConfirm}
        title="Submit opening melds?"
        message={
          <div className="space-y-2">
            <p>Lay down your full contract in one opening turn:</p>
            <ul className="list-disc space-y-1 pl-5">
              {pendingMelds.map((meld, index) => (
                <li key={`${meld.kind}-${index}`}>
                  {meld.kind} {index + 1}:{" "}
                  {meld.cards.map((card) => formatCardLabel(card)).join(", ")}
                </li>
              ))}
            </ul>
          </div>
        }
        confirmLabel="Lay contract"
        busy={busy}
        onCancel={() => setShowConfirm(false)}
        onConfirm={() => void submitOpening()}
      />

      <div className="mb-4 space-y-1">
        <h3 className="text-lg font-medium">Opening turn</h3>
        <p className="text-sm text-[var(--muted)]">Contract: {contract}</p>
        <p className="text-sm text-[var(--muted)]">
          {nextRequirement
            ? `Tap ${nextRequirement.size} cards for the next ${nextRequirement.kind}.`
            : "All contract melds are ready to submit."}
        </p>
      </div>

      {pendingMelds.length > 0 ? (
        <div className="mb-4 space-y-2">
          {pendingMelds.map((meld, index) => (
            <div key={`${meld.kind}-${index}`} className="rounded-xl border border-white/10 px-4 py-3 text-sm">
              <p className="font-medium capitalize">
                {meld.kind} {index + 1}
              </p>
              <p className="text-[var(--muted)]">
                {meld.cards.map((card) => formatCardLabel(card)).join(", ")}
              </p>
            </div>
          ))}
        </div>
      ) : null}

      {nextRequirement ? (
        <>
          <CardFan
            cards={availableHand}
            selectedIds={selectedIds}
            onToggle={toggleCard}
            disabled={busy}
            sortMode={sortMode}
            onSortModeChange={onSortModeChange}
          />

          {selectedCards.some((card) => isJoker(card) || card.rank === "2") ? (
            <div className="mb-4 space-y-2">
              {selectedCards
                .filter((card) => isJoker(card) || card.rank === "2")
                .map((card) => (
                  <label key={card.id} className="flex items-center gap-3 text-sm">
                    <span className="min-w-16">{formatCardLabel(card)} as</span>
                    <select
                      value={wildRanks[card.id] ?? (card.rank === "2" ? "2" : "")}
                      onChange={(event) =>
                        setWildRanks((current) => ({
                          ...current,
                          [card.id]: event.target.value as NaturalRank,
                        }))
                      }
                      className="rounded-lg border border-white/10 bg-black/40 px-3 py-2"
                    >
                      {isJoker(card) ? <option value="">Select rank</option> : null}
                      {card.rank === "2" ? <option value="2">Natural 2</option> : null}
                      {NATURAL_RANKS.filter((rank) => rank !== "2" || card.rank === "2").map(
                        (rank) => (
                          <option key={rank} value={rank}>
                            {rank}
                          </option>
                        ),
                      )}
                    </select>
                  </label>
                ))}
            </div>
          ) : null}

          <button
            type="button"
            disabled={busy}
            onClick={() => addMeld()}
            className="rounded-lg border border-white/10 px-4 py-2 text-sm disabled:opacity-50"
          >
            Add {nextRequirement.kind}
          </button>
        </>
      ) : (
        <button
          type="button"
          disabled={busy}
          onClick={() => setShowConfirm(true)}
          className="rounded-lg bg-[var(--accent)] px-4 py-2 text-sm font-semibold text-black disabled:opacity-50"
        >
          Submit opening
        </button>
      )}
    </section>
  );
}
