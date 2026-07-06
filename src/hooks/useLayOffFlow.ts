"use client";

import { useEffect, useMemo, useState } from "react";
import { findLayOffTargets } from "../../convex/lib/rules/layoffs";
import { isJoker } from "../../convex/lib/rules/melds";
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

export function targetKey(target: LayOffTarget): string {
  if (target.mode === "add") {
    return `add:${target.meldId}`;
  }
  return `replace:${target.meldId}:${target.replaceWildCardId}`;
}

export function useLayOffFlow({
  performLayOff,
  hand,
  melds,
  selectedCardId,
  onStatus,
  onComplete,
}: {
  performLayOff: (args: {
    targetMeldId: string;
    card: Card;
    replaceWildCardId?: string;
    relocation?: {
      destinationMeldId: string;
      wildDeclaration?: { cardId: string; asRank: NaturalRank };
    };
    wildDeclaration?: { cardId: string; asRank: NaturalRank };
  }) => Promise<{ error?: string } | undefined>;
  hand: Card[];
  melds: TableMeld[];
  selectedCardId: string | null;
  onStatus: (message: string | null) => void;
  onComplete?: () => void;
}) {
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

  const validWildRanks = useMemo(() => {
    if (selectedTarget?.mode !== "add" || !selectedTarget.wildRanks) {
      return [];
    }
    return selectedTarget.wildRanks;
  }, [selectedTarget]);

  useEffect(() => {
    if (validWildRanks.length > 0 && !validWildRanks.includes(wildRank)) {
      setWildRank(validWildRanks[0]!);
    }
  }, [validWildRanks, wildRank]);

  const highlightMeldIds = useMemo(() => {
    if (!selectedCard) {
      return new Set<string>();
    }
    return new Set(cardTargets.map((target) => target.meldId));
  }, [cardTargets, selectedCard]);

  function selectMeld(meldId: string) {
    const target = cardTargets.find((entry) => entry.meldId === meldId);
    if (!target) {
      return;
    }
    setSelectedTargetKey(targetKey(target));
  }

  function selectTarget(target: LayOffTarget) {
    setSelectedTargetKey(targetKey(target));
  }

  function targetNeedsFollowUp(target: LayOffTarget, card: Card): boolean {
    if (target.mode === "replaceWild") {
      return true;
    }
    if (!target.wildRanks || target.wildRanks.length === 0) {
      return false;
    }
    return (
      isJoker(card) ||
      (card.rank === "2" && target.wildRanks.some((rank) => rank !== "2"))
    );
  }

  async function submitLayOffFor(card: Card, target: LayOffTarget) {
    if (target.mode === "replaceWild" && !destinationMeldId) {
      onStatus("Choose where to relocate the wild");
      return;
    }

    const laysAsWild =
      target.mode === "add" &&
      target.wildRanks &&
      (isJoker(card) || (card.rank === "2" && wildRank !== "2"));

    setBusy(true);
    onStatus(null);
    try {
      const result = await performLayOff({
        targetMeldId: target.meldId,
        card,
        replaceWildCardId:
          target.mode === "replaceWild" ? target.replaceWildCardId : undefined,
        relocation:
          target.mode === "replaceWild" && destinationMeldId
            ? {
                destinationMeldId,
                wildDeclaration: { cardId: target.replaceWildCardId, asRank: wildRank },
              }
            : undefined,
        wildDeclaration:
          laysAsWild ? { cardId: card.id, asRank: wildRank } : undefined,
      });

      if (result?.error) {
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

  async function submitLayOff() {
    if (!selectedCard || !selectedTarget) {
      onStatus("Select a card and lay-off target");
      return;
    }

    await submitLayOffFor(selectedCard, selectedTarget);
  }

  function clearTarget() {
    setSelectedTargetKey(null);
    setDestinationMeldId(null);
  }

  return {
    selectedCard,
    cardTargets,
    selectedTarget,
    selectedTargetKey,
    highlightMeldIds,
    destinationMeldId,
    setDestinationMeldId,
    wildRank,
    setWildRank,
    naturalRanks: NATURAL_RANKS,
    busy,
    selectMeld,
    selectTarget,
    targetNeedsFollowUp,
    submitLayOff,
    submitLayOffFor,
    clearTarget,
    needsRelocationUi: selectedTarget?.mode === "replaceWild",
    needsWildRankUi:
      selectedTarget?.mode === "add" &&
      (selectedTarget.wildRanks?.length ?? 0) > 0 &&
      (selectedCard !== null &&
        (isJoker(selectedCard) ||
          (selectedCard.rank === "2" && selectedTarget.wildRanks?.some((rank) => rank !== "2")))),
    validWildRanks,
    relocationDestinations: selectedTarget?.mode === "replaceWild" ? selectedTarget.relocationDestinations : [],
  };
}
