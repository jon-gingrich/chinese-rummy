import { matchesContract } from "./contracts";
import type { Card, GameState, MeldKind, NaturalRank, Rank, Suit, TableMeld, WildDeclaration } from "./types";

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

export function effectiveRankForCard(
  card: Card,
  wildDeclarations: WildDeclaration[],
): Rank | { error: string } {
  return effectiveRank(card, wildDeclarations);
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

export function validateSetStructure(
  cards: Card[],
  wildDeclarations: WildDeclaration[],
  waiveAdjacency = false,
): boolean {
  if (cards.length < 3) {
    return false;
  }

  for (const card of cards) {
    if (undeclaredWild(card, wildDeclarations)) {
      return false;
    }
  }

  if (!waiveAdjacency && hasAdjacentWilds(cards, wildDeclarations)) {
    return false;
  }

  const ranks: Rank[] = [];
  for (const card of cards) {
    const rank = effectiveRank(card, wildDeclarations);
    if (typeof rank === "object") {
      return false;
    }
    ranks.push(rank);
  }

  const target = ranks[0]!;
  return ranks.every((rank) => rank === target);
}

function validateRunWithAceModeStructure(
  cards: Card[],
  wildDeclarations: WildDeclaration[],
  aceHigh: boolean,
  waiveAdjacency: boolean,
): boolean {
  if (cards.length < 3) {
    return false;
  }

  for (const card of cards) {
    if (undeclaredWild(card, wildDeclarations)) {
      return false;
    }
  }

  if (!waiveAdjacency && hasAdjacentWilds(cards, wildDeclarations)) {
    return false;
  }

  const naturals = cards.filter((card) => !isWildInMeld(card, wildDeclarations));
  if (naturals.length === 0) {
    return false;
  }

  const suit = naturals[0]!.suit;
  if (naturals.some((card) => card.suit !== suit)) {
    return false;
  }

  const values: number[] = [];
  for (const card of cards) {
    const rank = effectiveRank(card, wildDeclarations);
    if (typeof rank === "object") {
      return false;
    }
    values.push(rankValue(rank, aceHigh));
  }

  const sorted = [...values].sort((left, right) => left - right);
  for (let index = 1; index < sorted.length; index += 1) {
    if (sorted[index] !== sorted[index - 1]! + 1) {
      return false;
    }
  }

  return true;
}

export function validateRunStructure(
  cards: Card[],
  wildDeclarations: WildDeclaration[],
  waiveAdjacency = false,
): boolean {
  return (
    validateRunWithAceModeStructure(cards, wildDeclarations, false, waiveAdjacency) ||
    validateRunWithAceModeStructure(cards, wildDeclarations, true, waiveAdjacency)
  );
}

function resolveRunAceHigh(
  cards: Card[],
  wildDeclarations: WildDeclaration[],
  waiveAdjacency = false,
): boolean {
  if (validateRunWithAceModeStructure(cards, wildDeclarations, false, waiveAdjacency)) {
    return false;
  }
  return true;
}

export function orderRunCards(cards: Card[], wildDeclarations: WildDeclaration[]): Card[] {
  const aceHigh = resolveRunAceHigh(cards, wildDeclarations, true);

  return [...cards].sort((left, right) => {
    const leftRank = effectiveRankForCard(left, wildDeclarations);
    const rightRank = effectiveRankForCard(right, wildDeclarations);
    if (typeof leftRank === "object" || typeof rightRank === "object") {
      return left.id.localeCompare(right.id);
    }
    const diff = rankValue(leftRank, aceHigh) - rankValue(rightRank, aceHigh);
    return diff !== 0 ? diff : left.id.localeCompare(right.id);
  });
}

export function normalizeOpeningMeld(meld: OpeningMeldInput): OpeningMeldInput {
  if (meld.kind !== "run") {
    return meld;
  }
  return {
    ...meld,
    cards: orderRunCards(meld.cards, meld.wildDeclarations),
  };
}

export function normalizeRunMeldCards(
  cards: Card[],
  wildDeclarations: WildDeclaration[],
): Card[] {
  return orderRunCards(cards, wildDeclarations);
}

export function normalizeTableMeld(meld: TableMeld): TableMeld {
  if (meld.kind !== "run") {
    return meld;
  }
  return {
    ...meld,
    cards: normalizeRunMeldCards(meld.cards, meld.wildDeclarations),
  };
}

export function withNormalizedRunMelds(state: GameState): GameState {
  return {
    ...state,
    melds: state.melds.map(normalizeTableMeld),
  };
}

export function findValidWildRanksForOpeningMeld(
  kind: MeldKind,
  cards: Card[],
  wildCard: Card,
  otherDeclarations: WildDeclaration[],
): NaturalRank[] {
  if (!isJoker(wildCard) && wildCard.rank !== "2") {
    return [];
  }

  const ranks: NaturalRank[] = [];
  const declarationsFor = (asRank: NaturalRank | "natural"): WildDeclaration[] => {
    const declarations = otherDeclarations.filter((entry) => entry.cardId !== wildCard.id);
    if (asRank === "natural") {
      return declarations;
    }
    return [...declarations, { cardId: wildCard.id, asRank }];
  };

  if (wildCard.rank === "2") {
    if (validateOpeningMeld({ kind, cards, wildDeclarations: declarationsFor("natural") }) === null) {
      ranks.push("2");
    }
  }

  for (const asRank of NATURAL_RANKS) {
    if (wildCard.rank === "2" && asRank === "2") {
      continue;
    }
    if (validateOpeningMeld({ kind, cards, wildDeclarations: declarationsFor(asRank) }) === null) {
      ranks.push(asRank);
    }
  }

  return ranks;
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

  if (!validateSetStructure(cards, wildDeclarations)) {
    if (hasAdjacentWilds(cards, wildDeclarations)) {
      return "Wild cards cannot be adjacent";
    }
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

  if (!validateRunWithAceModeStructure(cards, wildDeclarations, aceHigh, false)) {
    const naturals = cards.filter((card) => !isWildInMeld(card, wildDeclarations));
    if (naturals.length === 0) {
      return "Run must include at least one natural card";
    }
    if (naturals.some((card) => card.suit !== naturals[0]!.suit)) {
      return "Run cards must share the same suit";
    }
    return "Run cards must be consecutive";
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
