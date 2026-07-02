import { matchesContract } from "./contracts";
import type { Card, Rank, Suit, WildDeclaration } from "./types";

const NATURAL_RANKS: Rank[] = [
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

export type OpeningMeldInput = {
  kind: "set" | "run";
  cards: Card[];
  wildDeclarations: WildDeclaration[];
};

function declarationFor(
  cardId: string,
  wildDeclarations: WildDeclaration[],
): WildDeclaration | undefined {
  return wildDeclarations.find((entry) => entry.cardId === cardId);
}

export function isJoker(card: Card): boolean {
  return card.rank === "JOKER";
}

export function isWildInMeld(card: Card, wildDeclarations: WildDeclaration[]): boolean {
  if (isJoker(card)) {
    return true;
  }
  if (card.rank !== "2") {
    return false;
  }
  const declaration = declarationFor(card.id, wildDeclarations);
  return declaration !== undefined && declaration.asRank !== "2";
}

export function hasAdjacentWilds(cards: Card[], wildDeclarations: WildDeclaration[]): boolean {
  for (let index = 0; index < cards.length - 1; index += 1) {
    const current = cards[index]!;
    const next = cards[index + 1]!;
    if (isWildInMeld(current, wildDeclarations) && isWildInMeld(next, wildDeclarations)) {
      return true;
    }
  }
  return false;
}

function undeclaredWild(card: Card, wildDeclarations: WildDeclaration[]): boolean {
  if (isJoker(card)) {
    return declarationFor(card.id, wildDeclarations) === undefined;
  }
  return false;
}

function effectiveRank(
  card: Card,
  wildDeclarations: WildDeclaration[],
): Rank | { error: string } {
  if (isJoker(card)) {
    const declaration = declarationFor(card.id, wildDeclarations);
    if (!declaration) {
      return { error: "Wild card must declare a rank" };
    }
    return declaration.asRank;
  }

  if (card.rank === "2") {
    const declaration = declarationFor(card.id, wildDeclarations);
    if (declaration) {
      return declaration.asRank;
    }
    return "2";
  }

  return card.rank;
}

function rankValue(rank: Rank, aceHigh: boolean): number {
  if (rank === "JOKER") {
    throw new Error("Joker has no rank value");
  }
  if (rank === "A") {
    return aceHigh ? 14 : 1;
  }
  return NATURAL_RANKS.indexOf(rank) + 1;
}

function validateSet(
  cards: Card[],
  wildDeclarations: WildDeclaration[],
  exactSize: number,
): string | null {
  if (cards.length !== exactSize) {
    return `Set must have exactly ${exactSize} cards`;
  }

  for (const card of cards) {
    if (undeclaredWild(card, wildDeclarations)) {
      return "Wild card must declare a rank";
    }
  }

  if (hasAdjacentWilds(cards, wildDeclarations)) {
    return "Wild cards cannot be adjacent";
  }

  const ranks: Rank[] = [];
  for (const card of cards) {
    const rank = effectiveRank(card, wildDeclarations);
    if (typeof rank === "object") {
      return rank.error;
    }
    ranks.push(rank);
  }

  const target = ranks[0]!;
  if (!ranks.every((rank) => rank === target)) {
    return "Set cards must share the same rank";
  }

  return null;
}

function validateRunWithAceMode(
  cards: Card[],
  wildDeclarations: WildDeclaration[],
  exactSize: number,
  aceHigh: boolean,
): string | null {
  if (cards.length !== exactSize) {
    return `Run must have exactly ${exactSize} cards`;
  }

  for (const card of cards) {
    if (undeclaredWild(card, wildDeclarations)) {
      return "Wild card must declare a rank";
    }
  }

  if (hasAdjacentWilds(cards, wildDeclarations)) {
    return "Wild cards cannot be adjacent";
  }

  const naturals = cards.filter((card) => !isWildInMeld(card, wildDeclarations));
  if (naturals.length === 0) {
    return "Run must include at least one natural card";
  }

  const suit = naturals[0]!.suit;
  if (naturals.some((card) => card.suit !== suit)) {
    return "Run cards must share the same suit";
  }

  const values: number[] = [];
  for (const card of cards) {
    const rank = effectiveRank(card, wildDeclarations);
    if (typeof rank === "object") {
      return rank.error;
    }
    values.push(rankValue(rank, aceHigh));
  }

  const sorted = [...values].sort((left, right) => left - right);
  for (let index = 1; index < sorted.length; index += 1) {
    if (sorted[index] !== sorted[index - 1]! + 1) {
      return "Run cards must be consecutive";
    }
  }

  return null;
}

function validateRun(
  cards: Card[],
  wildDeclarations: WildDeclaration[],
  exactSize: number,
): string | null {
  const aceLow = validateRunWithAceMode(cards, wildDeclarations, exactSize, false);
  if (aceLow === null) {
    return null;
  }
  const aceHigh = validateRunWithAceMode(cards, wildDeclarations, exactSize, true);
  if (aceHigh === null) {
    return null;
  }
  return aceLow;
}

export function validateOpeningMeld(meld: OpeningMeldInput): string | null {
  if (meld.kind === "set") {
    return validateSet(meld.cards, meld.wildDeclarations, meld.cards.length);
  }
  return validateRun(meld.cards, meld.wildDeclarations, meld.cards.length);
}

export function validateOpeningMelds(
  melds: OpeningMeldInput[],
  roundNumber: number,
): string | null {
  if (!matchesContract(melds, roundNumber)) {
    return "Opening melds do not match the round contract";
  }

  for (const meld of melds) {
    const error = validateOpeningMeld(meld);
    if (error) {
      return error;
    }
  }

  return null;
}

export function makeCard(
  suit: Suit,
  rank: Rank,
  deckIndex: 0 | 1 = 0,
): Card {
  return {
    id: `${suit}-${rank}-${deckIndex}`,
    suit,
    rank,
    deckIndex,
  };
}
