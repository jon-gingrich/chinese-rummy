import type { Card, Rank, Suit } from "../../convex/lib/rules/types";

export type HandSortMode = "suit" | "rank";

const SUIT_ORDER: Record<Suit, number> = {
  clubs: 0,
  diamonds: 1,
  hearts: 2,
  spades: 3,
  joker: 4,
};

const RANK_ORDER: Record<Rank, number> = {
  A: 0,
  "2": 1,
  "3": 2,
  "4": 3,
  "5": 4,
  "6": 5,
  "7": 6,
  "8": 7,
  "9": 8,
  "10": 9,
  J: 10,
  Q: 11,
  K: 12,
  JOKER: 13,
};

export function formatCardLabel(card: Card): string {
  if (card.rank === "JOKER") {
    return "Joker";
  }
  const suitSymbol =
    card.suit === "hearts"
      ? "♥"
      : card.suit === "diamonds"
        ? "♦"
        : card.suit === "clubs"
          ? "♣"
          : card.suit === "spades"
            ? "♠"
            : "";
  return `${card.rank}${suitSymbol}`;
}

export function suitColorClass(suit: string): string {
  if (suit === "hearts" || suit === "diamonds") {
    return "text-rose-300";
  }
  return "text-slate-100";
}

function compareBySuit(a: Card, b: Card): number {
  const suitDiff = SUIT_ORDER[a.suit] - SUIT_ORDER[b.suit];
  if (suitDiff !== 0) {
    return suitDiff;
  }
  const rankDiff = RANK_ORDER[a.rank] - RANK_ORDER[b.rank];
  if (rankDiff !== 0) {
    return rankDiff;
  }
  return a.deckIndex - b.deckIndex;
}

function compareByRank(a: Card, b: Card): number {
  const rankDiff = RANK_ORDER[a.rank] - RANK_ORDER[b.rank];
  if (rankDiff !== 0) {
    return rankDiff;
  }
  const suitDiff = SUIT_ORDER[a.suit] - SUIT_ORDER[b.suit];
  if (suitDiff !== 0) {
    return suitDiff;
  }
  return a.deckIndex - b.deckIndex;
}

export function sortHand(cards: Card[], mode: HandSortMode): Card[] {
  const compare = mode === "suit" ? compareBySuit : compareByRank;
  return [...cards].sort(compare);
}

export function fanRotation(index: number, total: number): number {
  if (total <= 1) {
    return 0;
  }
  const spread = Math.min(total * 5, total > 10 ? 34 : 44);
  const start = -spread / 2;
  const step = spread / (total - 1);
  return start + index * step;
}

export function fanCardStep(total: number, cardWidth = 118): number {
  if (total <= 8) {
    return Math.round(cardWidth * 0.58);
  }
  if (total <= 11) {
    return Math.round(cardWidth * 0.5);
  }
  return Math.round(cardWidth * 0.45);
}

export function fanContainerHeight(total: number, cardHeight = 130): number {
  const spread = total <= 1 ? 0 : Math.min(total * 5, total > 10 ? 34 : 44);
  return cardHeight + spread;
}

export function fanTranslateY(index: number, total: number): number {
  const rotation = Math.abs(fanRotation(index, total));
  return rotation * 0.35;
}

/** Extra horizontal gap opened beside selected cards so neighbors stay tappable. */
export const FAN_SELECTION_SPREAD_PX = 14;

/** Vertical lift applied to a selected card in the fan. */
export const FAN_SELECTED_LIFT_PX = 8;
export const FAN_JUST_DRAWN_LIFT_PX = 18;

export function fanMarginExtra(
  index: number,
  selectedIndices: ReadonlySet<number>,
  spreadPx = FAN_SELECTION_SPREAD_PX,
): number {
  if (index === 0) {
    return 0;
  }
  const half = spreadPx / 2;
  const prevSelected = selectedIndices.has(index - 1);
  const currentSelected = selectedIndices.has(index);

  if (prevSelected && currentSelected) {
    return 0;
  }
  if (currentSelected || prevSelected) {
    return half;
  }
  return 0;
}

export function fanTotalSpreadWidth(
  cardCount: number,
  selectedIndices: ReadonlySet<number>,
  spreadPx = FAN_SELECTION_SPREAD_PX,
): number {
  let total = 0;
  for (let index = 1; index < cardCount; index++) {
    total += fanMarginExtra(index, selectedIndices, spreadPx);
  }
  return total;
}
