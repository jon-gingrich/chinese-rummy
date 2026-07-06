import type { GameState } from "./rules";

export function replacePlayerIdInGameState(
  state: GameState,
  fromId: string,
  toId: string,
): GameState {
  if (fromId === toId) {
    return state;
  }

  const nextPenaltyCounts = { ...state.rummyPenaltyCounts };
  if (fromId in nextPenaltyCounts) {
    nextPenaltyCounts[toId] = (nextPenaltyCounts[toId] ?? 0) + nextPenaltyCounts[fromId]!;
    delete nextPenaltyCounts[fromId];
  }

  return {
    ...state,
    players: state.players.map((player) =>
      player.id === fromId ? { ...player, id: toId } : player,
    ),
    melds: state.melds.map((meld) =>
      meld.ownerId === fromId
        ? {
            ...meld,
            ownerId: toId,
            id: meld.id.replace(fromId, toId),
          }
        : meld,
    ),
    rummyPenaltyCounts: nextPenaltyCounts,
    rummyWindow: state.rummyWindow
      ? {
          ...state.rummyWindow,
          discarderId:
            state.rummyWindow.discarderId === fromId
              ? toId
              : state.rummyWindow.discarderId,
        }
      : undefined,
    lastRoundSummary: state.lastRoundSummary
      ? {
          ...state.lastRoundSummary,
          goerPlayerId:
            state.lastRoundSummary.goerPlayerId === fromId
              ? toId
              : state.lastRoundSummary.goerPlayerId,
        }
      : undefined,
    winnerPlayerIds: state.winnerPlayerIds?.map((playerId) =>
      playerId === fromId ? toId : playerId,
    ),
  };
}
