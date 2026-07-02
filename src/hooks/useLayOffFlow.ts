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

export function targetKey(target: LayOffTarget): string {
  if (target.mode === "add") {
    return `add:${target.meldId}`;
  }
  return `replace:${target.meldId}:${target.replaceWildCardId}`;
}

export function useLayOffFlow({
  roomId,
  hand,
  melds,
  selectedCardId,
  onStatus,
  onComplete,
}: {
  roomId: Id<"rooms">;
  hand: Card[];
  melds: TableMeld[];
  selectedCardId: string | null;
  onStatus: (message: string | null) => void;
  onComplete?: () => void;
}) {
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
    submitLayOff,
    needsRelocationUi: selectedTarget?.mode === "replaceWild",
    relocationDestinations: selectedTarget?.mode === "replaceWild" ? selectedTarget.relocationDestinations : [],
  };
}
