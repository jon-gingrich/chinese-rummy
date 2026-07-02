import type { Card, GameState } from "./types";

export const TOTAL_ROUNDS = 10;

export function deadwoodValue(card: Card): number {
  if (card.rank === "JOKER" || card.rank === "2") {
    return 20;
  }
  if (card.rank === "A") {
    return 15;
  }
  if (card.rank === "K" || card.rank === "Q" || card.rank === "J" || card.rank === "10") {
    return 10;
  }
  return 5;
}

export function scoreHand(hand: Card[]): number {
  return hand.reduce((total, card) => total + deadwoodValue(card), 0);
}

export function scoreRound(
  state: GameState,
  goerPlayerId: string,
): { roundScores: number[]; cumulativeScores: number[] } {
  const goerIndex = state.players.findIndex((player) => player.id === goerPlayerId);
  if (goerIndex === -1) {
    throw new Error("Goer not found");
  }

  const roundScores = state.players.map((player, index) =>
    index === goerIndex ? 0 : scoreHand(player.hand),
  );
  const cumulativeScores = state.cumulativeScores.map(
    (score, index) => score + roundScores[index]!,
  );

  return { roundScores, cumulativeScores };
}

export function lowestScoreWinnerIds(
  players: GameState["players"],
  cumulativeScores: number[],
): string[] {
  const lowest = Math.min(...cumulativeScores);
  return players
    .filter((_, index) => cumulativeScores[index] === lowest)
    .map((player) => player.id);
}

export function gameComplete(state: GameState): boolean {
  return state.phase === "gameEnd";
}
