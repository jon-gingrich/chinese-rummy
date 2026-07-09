import type { ContractRequirement } from "../../convex/lib/rules/contracts";
import type { Card } from "../../convex/lib/rules/types";

export type StagingPile = {
  cardIds: string[];
};

export function requirementPileLabel(requirement: ContractRequirement): string {
  return `${requirement.kind} of ${requirement.size}`;
}

export function createEmptyStagingPiles(requirementCount: number): StagingPile[] {
  return Array.from({ length: Math.max(0, requirementCount) }, () => ({ cardIds: [] }));
}

/** Drop cards that left the hand; keep pile count stable. */
export function pruneStagingPiles(
  piles: StagingPile[],
  handCardIds: ReadonlySet<string>,
): StagingPile[] {
  let changed = false;
  const next = piles.map((pile) => {
    const cardIds = pile.cardIds.filter((id) => handCardIds.has(id));
    if (cardIds.length !== pile.cardIds.length) {
      changed = true;
    }
    return cardIds.length === pile.cardIds.length ? pile : { cardIds };
  });
  return changed ? next : piles;
}

/** Ensure one pile per contract requirement; preserve membership by index when possible. */
export function syncStagingPileCount(
  piles: StagingPile[],
  requirementCount: number,
): StagingPile[] {
  if (piles.length === requirementCount) {
    return piles;
  }
  if (piles.length > requirementCount) {
    const kept = piles.slice(0, requirementCount);
    const overflow = piles.slice(requirementCount).flatMap((pile) => pile.cardIds);
    if (overflow.length === 0 || kept.length === 0) {
      return kept.length === requirementCount
        ? kept
        : createEmptyStagingPiles(requirementCount);
    }
    return kept.map((pile, index) =>
      index === 0 ? { cardIds: [...pile.cardIds, ...overflow] } : pile,
    );
  }
  return [
    ...piles,
    ...createEmptyStagingPiles(requirementCount - piles.length),
  ];
}

export function stagedCardIdSet(piles: StagingPile[]): Set<string> {
  const ids = new Set<string>();
  for (const pile of piles) {
    for (const id of pile.cardIds) {
      ids.add(id);
    }
  }
  return ids;
}

export function unstagedCards(hand: Card[], piles: StagingPile[]): Card[] {
  const staged = stagedCardIdSet(piles);
  return hand.filter((card) => !staged.has(card.id));
}

export function cardsInStagingPile(hand: Card[], pile: StagingPile): Card[] {
  const byId = new Map(hand.map((card) => [card.id, card]));
  return pile.cardIds.flatMap((id) => {
    const card = byId.get(id);
    return card ? [card] : [];
  });
}

/** Move cards into a pile (from main hand or another pile). Order: existing pile, then new ids. */
export function stageCardsIntoPile(
  piles: StagingPile[],
  pileIndex: number,
  cardIds: string[],
): StagingPile[] {
  if (pileIndex < 0 || pileIndex >= piles.length || cardIds.length === 0) {
    return piles;
  }
  const moving = new Set(cardIds);
  const without = piles.map((pile, index) => {
    if (index === pileIndex) {
      return pile;
    }
    const cardIdsNext = pile.cardIds.filter((id) => !moving.has(id));
    return cardIdsNext.length === pile.cardIds.length ? pile : { cardIds: cardIdsNext };
  });
  const target = without[pileIndex]!;
  const existing = new Set(target.cardIds);
  const additions = cardIds.filter((id) => !existing.has(id));
  if (
    additions.length === 0 &&
    without.every((pile, index) => pile === piles[index])
  ) {
    return piles;
  }
  return without.map((pile, index) =>
    index === pileIndex ? { cardIds: [...pile.cardIds, ...additions] } : pile,
  );
}

export function unstagePile(piles: StagingPile[], pileIndex: number): StagingPile[] {
  if (pileIndex < 0 || pileIndex >= piles.length) {
    return piles;
  }
  if (piles[pileIndex]!.cardIds.length === 0) {
    return piles;
  }
  return piles.map((pile, index) => (index === pileIndex ? { cardIds: [] } : pile));
}

/** Move one card to a pile, or to main hand when pileIndex is null. */
export function moveCardBetweenStaging(
  piles: StagingPile[],
  cardId: string,
  pileIndex: number | null,
): StagingPile[] {
  if (pileIndex === null) {
    let changed = false;
    const next = piles.map((pile) => {
      if (!pile.cardIds.includes(cardId)) {
        return pile;
      }
      changed = true;
      return { cardIds: pile.cardIds.filter((id) => id !== cardId) };
    });
    return changed ? next : piles;
  }
  return stageCardsIntoPile(piles, pileIndex, [cardId]);
}
