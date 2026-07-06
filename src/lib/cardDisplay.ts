import type { Card, NaturalRank, WildDeclaration } from "../../convex/lib/rules/types";

export type CardSize = "xs" | "sm" | "md" | "lg" | "xl";

export const CARD_DIMENSIONS: Record<CardSize, { width: number; height: number }> = {
  xs: { width: 47, height: 65 },
  sm: { width: 57, height: 81 },
  md: { width: 73, height: 101 },
  lg: { width: 94, height: 130 },
  xl: { width: 108, height: 150 },
};

export type DisplayScale = "small" | "medium" | "large";

export const DISPLAY_SCALE_MULTIPLIER: Record<DisplayScale, number> = {
  small: 0.85,
  medium: 1,
  large: 1.2,
};

export const UI_SCALE_MULTIPLIER: Record<DisplayScale, number> = {
  small: 0.9,
  medium: 1,
  large: 1.12,
};

export function scaledCardDimensions(
  size: CardSize,
  scale: DisplayScale = "medium",
): { width: number; height: number } {
  const base = CARD_DIMENSIONS[size];
  const multiplier = DISPLAY_SCALE_MULTIPLIER[scale];
  return {
    width: Math.round(base.width * multiplier),
    height: Math.round(base.height * multiplier),
  };
}

export function suitSymbol(suit: Card["suit"]): string {
  switch (suit) {
    case "hearts":
      return "♥";
    case "diamonds":
      return "♦";
    case "clubs":
      return "♣";
    case "spades":
      return "♠";
    default:
      return "";
  }
}

export function isRedSuit(suit: Card["suit"]): boolean {
  return suit === "hearts" || suit === "diamonds";
}

export function wildAsRank(
  card: Card,
  wildDeclarations: WildDeclaration[] = [],
): NaturalRank | null {
  const declaration = wildDeclarations.find((entry) => entry.cardId === card.id);
  return declaration?.asRank ?? null;
}

export function isWildCard(card: Card): boolean {
  return card.rank === "JOKER" || card.rank === "2";
}

export function isPlayedAsWild(card: Card, wildDeclarations: WildDeclaration[] = []): boolean {
  if (card.rank === "JOKER") {
    return true;
  }
  const asRank = wildAsRank(card, wildDeclarations);
  return asRank !== null && asRank !== "2";
}

export type SeatSlot =
  | "bottom"
  | "left"
  | "right"
  | "top"
  | "top-left"
  | "top-right";

export function seatOffsetFromViewer(viewerSeat: number, targetSeat: number, playerCount: number): number {
  return (targetSeat - viewerSeat + playerCount) % playerCount;
}

export function seatSlotForOffset(offset: number, playerCount: number): SeatSlot {
  if (offset === 0) {
    return "bottom";
  }

  if (playerCount === 2) {
    return "top";
  }

  if (playerCount === 3) {
    if (offset === 1) {
      return "left";
    }
    return "right";
  }

  if (playerCount === 4) {
    if (offset === 1) {
      return "left";
    }
    if (offset === 2) {
      return "top";
    }
    return "right";
  }

  if (offset === 1) {
    return "left";
  }
  if (offset === 2) {
    return "top-left";
  }
  if (offset === 3) {
    return "top-right";
  }
  return "right";
}
