import { getContractForRound } from "./contracts";
import {
  findValidWildRanksForOpeningMeld,
  normalizeOpeningMeld,
  validateOpeningMeld,
} from "./melds";
import type { Card, MeldKind, OpeningMeld, WildDeclaration } from "./types";

function combinations(cards: Card[], size: number): Card[][] {
  if (size === 0) {
    return [[]];
  }
  if (cards.length < size) {
    return [];
  }

  const [first, ...rest] = cards;
  const withFirst = combinations(rest, size - 1).map((combo) => [first!, ...combo]);
  const withoutFirst = combinations(rest, size);
  return [...withFirst, ...withoutFirst];
}

function wildCardsIn(cards: Card[]): Card[] {
  return cards.filter((card) => card.rank === "JOKER" || card.rank === "2");
}

function enumerateWildDeclarations(
  kind: MeldKind,
  cards: Card[],
  wildIndex: number,
  declarations: WildDeclaration[],
): WildDeclaration[][] {
  const wilds = wildCardsIn(cards);
  if (wildIndex >= wilds.length) {
    return validateOpeningMeld({ kind, cards, wildDeclarations: declarations }) === null
      ? [declarations]
      : [];
  }

  const wildCard = wilds[wildIndex]!;
  const ranks = findValidWildRanksForOpeningMeld(kind, cards, wildCard, declarations);
  const results: WildDeclaration[][] = [];

  for (const asRank of ranks) {
    const nextDeclarations = [
      ...declarations.filter((entry) => entry.cardId !== wildCard.id),
      { cardId: wildCard.id, asRank },
    ];
    results.push(...enumerateWildDeclarations(kind, cards, wildIndex + 1, nextDeclarations));
  }

  return results;
}

function meldsForRequirement(hand: Card[], kind: MeldKind, size: number): OpeningMeld[] {
  const melds: OpeningMeld[] = [];
  const seen = new Set<string>();

  for (const cards of combinations(hand, size)) {
    const declarationSets =
      wildCardsIn(cards).length === 0
        ? [[] as WildDeclaration[]]
        : enumerateWildDeclarations(kind, cards, 0, []);

    for (const wildDeclarations of declarationSets) {
      const meld = normalizeOpeningMeld({ kind, cards, wildDeclarations });
      if (validateOpeningMeld(meld) !== null) {
        continue;
      }
      const key = meld.cards
        .map((card) => card.id)
        .sort()
        .join(",");
      if (seen.has(key)) {
        continue;
      }
      seen.add(key);
      melds.push(meld);
    }
  }

  return melds;
}

function searchContractMelds(
  hand: Card[],
  requirementIndex: number,
  contractRound: number,
  accumulated: OpeningMeld[],
): OpeningMeld[] | null {
  const requirements = getContractForRound(contractRound);
  if (requirementIndex >= requirements.length) {
    return accumulated;
  }

  const requirement = requirements[requirementIndex]!;
  const usedIds = new Set(accumulated.flatMap((meld) => meld.cards.map((card) => card.id)));
  const available = hand.filter((card) => !usedIds.has(card.id));

  for (const meld of meldsForRequirement(available, requirement.kind, requirement.size)) {
    const result = searchContractMelds(hand, requirementIndex + 1, contractRound, [
      ...accumulated,
      meld,
    ]);
    if (result) {
      return result;
    }
  }

  return null;
}

export function findOpeningMeldsForContract(
  hand: Card[],
  contractRound: number,
): OpeningMeld[] | null {
  return searchContractMelds(hand, 0, contractRound, []);
}
