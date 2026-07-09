"use client";

import { useEffect, useMemo, useState } from "react";
import { getContractForRound } from "../../convex/lib/rules/contracts";
import {
  findValidWildRanksForOpeningMeld,
  isJoker,
  normalizeOpeningMeld,
  validateOpeningMeld,
} from "../../convex/lib/rules/melds";
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
  submitOpen,
  roundNumber,
  hand,
  onStatus,
}: {
  submitOpen: (melds: OpeningMeld[]) => Promise<{ error?: string } | undefined>;
  roundNumber: number;
  hand: Card[];
  onStatus: (message: string | null) => void;
}) {
  const [pendingMelds, setPendingMelds] = useState<OpeningMeld[]>([]);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [wildRanks, setWildRanks] = useState<Record<string, NaturalRank>>({});
  const [showConfirm, setShowConfirm] = useState(false);
  const [busy, setBusy] = useState(false);

  const requirements = useMemo(() => getContractForRound(roundNumber), [roundNumber]);
  const nextRequirement = requirements[pendingMelds.length];
  const usedCardIds = useMemo(
    () => new Set(pendingMelds.flatMap((meld) => meld.cards.map((card) => card.id))),
    [pendingMelds],
  );
  const availableHand = useMemo(
    () => hand.filter((card) => !usedCardIds.has(card.id)),
    [hand, usedCardIds],
  );
  const selectedCards = useMemo(
    () => availableHand.filter((card) => selectedIds.includes(card.id)),
    [availableHand, selectedIds],
  );

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

  function wildDeclarationsForSelection(
    cards: Card[],
    ranks: Record<string, NaturalRank>,
  ): OpeningMeld["wildDeclarations"] {
    return cards.flatMap((card) => {
      if (isJoker(card)) {
        const asRank = ranks[card.id];
        return asRank ? [{ cardId: card.id, asRank }] : [];
      }
      if (card.rank === "2" && ranks[card.id] && ranks[card.id] !== "2") {
        return [{ cardId: card.id, asRank: ranks[card.id]! }];
      }
      return [];
    });
  }

  function currentWildRank(card: Card, ranks: Record<string, NaturalRank>): NaturalRank | undefined {
    if (isJoker(card)) {
      return ranks[card.id];
    }
    if (card.rank === "2") {
      return ranks[card.id] ?? "2";
    }
    return undefined;
  }

  const validRanksByCardId = useMemo(() => {
    if (!nextRequirement || selectedCards.length !== nextRequirement.size) {
      return {} as Record<string, NaturalRank[]>;
    }

    const result: Record<string, NaturalRank[]> = {};
    for (const card of selectedCards) {
      if (!isJoker(card) && card.rank !== "2") {
        continue;
      }
      const otherDeclarations = wildDeclarationsForSelection(
        selectedCards.filter((entry) => entry.id !== card.id),
        wildRanks,
      );
      result[card.id] = findValidWildRanksForOpeningMeld(
        nextRequirement.kind,
        selectedCards,
        card,
        otherDeclarations,
      );
    }
    return result;
  }, [nextRequirement, selectedCards, wildRanks]);

  useEffect(() => {
    if (!nextRequirement || selectedIds.length !== nextRequirement.size) {
      return;
    }

    setWildRanks((current) => {
      let next: Record<string, NaturalRank> | null = null;

      for (const card of selectedCards) {
        if (!isJoker(card) && card.rank !== "2") {
          continue;
        }

        const otherDeclarations = wildDeclarationsForSelection(
          selectedCards.filter((entry) => entry.id !== card.id),
          current,
        );
        const validRanks = findValidWildRanksForOpeningMeld(
          nextRequirement.kind,
          selectedCards,
          card,
          otherDeclarations,
        );
        const chosenRank = currentWildRank(card, current);

        if (chosenRank && validRanks.includes(chosenRank)) {
          continue;
        }

        if (validRanks.length > 0) {
          if (!next) {
            next = { ...current };
          }
          next[card.id] = validRanks[0]!;
        }
      }

      return next ?? current;
    });
  }, [nextRequirement, selectedIds, availableHand]);

  function buildMeldFromSelection(): OpeningMeld | null {
    if (!nextRequirement || selectedCards.length !== nextRequirement.size) {
      return null;
    }

    return normalizeOpeningMeld({
      kind: nextRequirement.kind,
      cards: selectedCards,
      wildDeclarations: wildDeclarationsForSelection(selectedCards, wildRanks),
    });
  }

  const selectionValidation = useMemo(() => {
    if (!nextRequirement) {
      return { canAdd: false, error: null as string | null };
    }
    if (selectedCards.length !== nextRequirement.size) {
      return { canAdd: false, error: null };
    }

    for (const card of selectedCards) {
      if (isJoker(card) && !wildRanks[card.id]) {
        return { canAdd: false, error: "Declare a rank for each joker." };
      }

      if (card.rank === "2" && nextRequirement.kind === "run") {
        const otherDeclarations = wildDeclarationsForSelection(
          selectedCards.filter((entry) => entry.id !== card.id),
          wildRanks,
        );
        const validRanks = findValidWildRanksForOpeningMeld(
          nextRequirement.kind,
          selectedCards,
          card,
          otherDeclarations,
        );
        const chosenRank = currentWildRank(card, wildRanks);
        if (chosenRank && !validRanks.includes(chosenRank)) {
          return {
            canAdd: false,
            error: "That 2 cannot play as a natural card in this run. Pick the rank it substitutes.",
          };
        }
        if (
          chosenRank === "2" &&
          validRanks.some((rank) => rank !== "2") &&
          !validRanks.includes("2")
        ) {
          return {
            canAdd: false,
            error: "This run needs the 2 played as a wild. Pick the rank it substitutes.",
          };
        }
      }
    }

    const meld = buildMeldFromSelection();
    if (!meld) {
      return { canAdd: false, error: null };
    }

    const error = validateOpeningMeld(meld);
    return { canAdd: error === null, error };
  }, [nextRequirement, selectedCards, wildRanks]);

  function addMeld() {
    if (!nextRequirement) {
      return;
    }
    if (selectedCards.length !== nextRequirement.size) {
      onStatus(`Select ${nextRequirement.size} cards for the next ${nextRequirement.kind}.`);
      return;
    }

    const meld = buildMeldFromSelection();
    if (!meld) {
      return;
    }

    const validationError = validateOpeningMeld(meld);
    if (validationError) {
      onStatus(validationError);
      return;
    }

    setPendingMelds((current) => [...current, meld]);
    setSelectedIds([]);
    setWildRanks({});
    onStatus(null);
  }

  function removePendingMeldsFrom(index: number) {
    if (busy || index < 0) {
      return;
    }
    setPendingMelds((current) => {
      if (index >= current.length) {
        return current;
      }
      return current.slice(0, index);
    });
    setSelectedIds([]);
    setWildRanks({});
    onStatus(null);
  }

  function undoLastMeld() {
    if (busy) {
      return;
    }
    setPendingMelds((current) => (current.length === 0 ? current : current.slice(0, -1)));
    setSelectedIds([]);
    setWildRanks({});
    onStatus(null);
  }

  function clearSelection() {
    setSelectedIds([]);
    setWildRanks({});
    onStatus(null);
  }

  function seedSelection(cardIds: string[]) {
    if (!nextRequirement || busy) {
      return;
    }
    const allowed = new Set(availableHand.map((card) => card.id));
    const next = cardIds.filter((id) => allowed.has(id)).slice(0, nextRequirement.size);
    setSelectedIds(next);
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
      const result = await submitOpen(pendingMelds);
      if (result?.error) {
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
    validRanksByCardId,
    wildCardsNeedingRank,
    naturalRanks: NATURAL_RANKS,
    canAddMeld: selectionValidation.canAdd,
    selectionValidationError: selectionValidation.error,
    busy,
    showConfirm,
    setShowConfirm,
    toggleCard,
    seedSelection,
    addMeld,
    undoLastMeld,
    clearSelection,
    removePendingMeldsFrom,
    submitOpening,
    progressLabel: nextRequirement
      ? `${nextRequirement.kind} ${pendingMelds.length + 1} of ${requirements.length} — pick ${nextRequirement.size} cards`
      : `All ${requirements.length} melds ready — submit your opening`,
  };
}
