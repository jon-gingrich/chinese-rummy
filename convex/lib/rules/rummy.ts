import { findLayOffTargets } from "./layoffs";
import { isJoker } from "./melds";
import type { Card, GameState, TableMeld } from "./types";

export function isUndiscardable(card: Card): boolean {
  return isJoker(card) || card.rank === "2";
}

export function isStuckWildCard(card: Card): boolean {
  return isUndiscardable(card);
}

export function discardableHandCards(hand: Card[]): Card[] {
  return hand.filter((card) => !isUndiscardable(card));
}

export function isPlayableDiscard(card: Card, melds: TableMeld[]): boolean {
  if (melds.length === 0) {
    return false;
  }
  return findLayOffTargets(melds, [card], true, false).length > 0;
}

export function rummyPenaltyCount(state: GameState, playerId: string): number {
  return (state.rummyPenaltyCounts ?? {})[playerId] ?? 0;
}

export function takePickupCards(
  discard: Card[],
  offenseIndex: number,
): { picked: Card[]; remaining: Card[] } {
  if (offenseIndex === 0) {
    const count = Math.min(2, discard.length);
    return {
      picked: discard.slice(-count),
      remaining: discard.slice(0, -count),
    };
  }
  return { picked: [...discard], remaining: [] };
}

export function incrementRummyPenaltyCount(
  counts: Record<string, number>,
  playerId: string,
): Record<string, number> {
  return { ...counts, [playerId]: (counts[playerId] ?? 0) + 1 };
}
