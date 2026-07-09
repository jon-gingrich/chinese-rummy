"use client";

import { useEffect, useMemo, useState } from "react";
import {
  getContractForRound,
  type ContractRequirement,
} from "../../convex/lib/rules/contracts";
import type { Card } from "../../convex/lib/rules/types";
import {
  cardsInStagingPile,
  createEmptyStagingPiles,
  moveCardBetweenStaging,
  pruneStagingPiles,
  requirementPileLabel,
  stageCardsIntoPile,
  syncStagingPileCount,
  unstagePile,
  unstagedCards,
  type StagingPile,
} from "../lib/handStaging";

export type StagingPileView = {
  index: number;
  label: string;
  requirement: ContractRequirement;
  cardIds: string[];
  cards: Card[];
};

export function useHandStaging({
  contractRound,
  hand,
  /** Cards still in hand but reserved elsewhere (e.g. opening pending melds). */
  reservedCardIds = [],
}: {
  contractRound: number;
  hand: Card[];
  reservedCardIds?: string[];
}) {
  const requirements = useMemo(
    () => getContractForRound(contractRound),
    [contractRound],
  );

  const [piles, setPiles] = useState<StagingPile[]>(() =>
    createEmptyStagingPiles(requirements.length),
  );
  const [activePileIndex, setActivePileIndex] = useState(0);

  useEffect(() => {
    setPiles(createEmptyStagingPiles(requirements.length));
    setActivePileIndex(0);
  }, [contractRound, requirements.length]);

  const handIdKey = useMemo(
    () => hand.map((card) => card.id).sort().join("|"),
    [hand],
  );
  const reservedKey = useMemo(
    () => [...reservedCardIds].sort().join("|"),
    [reservedCardIds],
  );

  useEffect(() => {
    const keepIds = new Set(hand.map((card) => card.id));
    for (const id of reservedCardIds) {
      keepIds.delete(id);
    }
    setPiles((current) => {
      const synced = syncStagingPileCount(current, requirements.length);
      return pruneStagingPiles(synced, keepIds);
    });
    // Keys track membership without depending on array identity.
    // eslint-disable-next-line react-hooks/exhaustive-deps -- intentional: prune on id set change
  }, [handIdKey, reservedKey, requirements.length]);

  useEffect(() => {
    if (activePileIndex >= requirements.length) {
      setActivePileIndex(Math.max(0, requirements.length - 1));
    }
  }, [activePileIndex, requirements.length]);

  const reservedSet = useMemo(() => new Set(reservedCardIds), [reservedKey]);

  const visiblePiles = useMemo(
    () => pruneStagingPiles(piles, new Set(hand.map((card) => card.id).filter((id) => !reservedSet.has(id)))),
    [hand, piles, reservedSet],
  );

  const pileViews: StagingPileView[] = useMemo(
    () =>
      requirements.map((requirement, index) => {
        const pile = visiblePiles[index] ?? { cardIds: [] };
        return {
          index,
          label: requirementPileLabel(requirement),
          requirement,
          cardIds: pile.cardIds,
          cards: cardsInStagingPile(hand, pile),
        };
      }),
    [hand, visiblePiles, requirements],
  );

  const mainHandCards = useMemo(
    () => unstagedCards(hand, visiblePiles),
    [hand, visiblePiles],
  );

  function cardsForFan(sourceHand: Card[]): Card[] {
    return unstagedCards(sourceHand, visiblePiles);
  }

  function stageSelected(cardIds: string[], pileIndex = activePileIndex) {
    if (cardIds.length === 0) {
      return;
    }
    setPiles((current) => stageCardsIntoPile(current, pileIndex, cardIds));
  }

  function unstage(pileIndex: number) {
    setPiles((current) => unstagePile(current, pileIndex));
  }

  function moveCard(cardId: string, pileIndex: number | null) {
    setPiles((current) => moveCardBetweenStaging(current, cardId, pileIndex));
  }

  return {
    requirements,
    piles: pileViews,
    mainHandCards,
    cardsForFan,
    activePileIndex,
    setActivePileIndex,
    stageSelected,
    unstage,
    moveCard,
  };
}
