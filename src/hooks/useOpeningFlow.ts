"use client";

import { useMutation } from "convex/react";
import { useMemo, useState } from "react";
import { api } from "../../convex/_generated/api";
import type { Id } from "../../convex/_generated/dataModel";
import { getContractForRound } from "../../convex/lib/rules/contracts";
import { isJoker } from "../../convex/lib/rules/melds";
import type { Card, NaturalRank, OpeningMeld } from "../../convex/lib/rules/types";

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

export function useOpeningFlow({
  roomId,
  roundNumber,
  hand,
  onStatus,
}: {
  roomId: Id<"rooms">;
  roundNumber: number;
  hand: Card[];
  onStatus: (message: string | null) => void;
}) {
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

  const wildCardsNeedingRank = selectedCards.filter((card) => isJoker(card) || card.rank === "2");

  return {
    requirements,
    nextRequirement,
    pendingMelds,
    availableHand,
    selectedIds,
    selectedCards,
    wildRanks,
    setWildRanks,
    wildCardsNeedingRank,
    naturalRanks: NATURAL_RANKS,
    busy,
    showConfirm,
    setShowConfirm,
    toggleCard,
    addMeld,
    submitOpening,
    progressLabel: nextRequirement
      ? `${nextRequirement.kind} ${pendingMelds.length + 1} of ${requirements.length} — pick ${nextRequirement.size} cards`
      : `All ${requirements.length} melds ready — submit your opening`,
  };
}
