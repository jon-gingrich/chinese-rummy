import type { Doc } from "../_generated/dataModel";
import type { MutationCtx } from "../_generated/server";
import { scheduleStockReshuffleAdvanceIfNeeded } from "../stockReshuffle";
import {
  buildTableView,
  handForPlayer,
  markGameFinished,
  touchGameParticipants,
} from "./games";
import { legalActions } from "./rules";
import type { GameState } from "./rules";
import { withNormalizedRunMelds } from "./rules/melds";

export async function persistGameState(
  ctx: MutationCtx,
  game: Doc<"games">,
  state: GameState,
  playerId: string,
  error?: string,
) {
  if (!error) {
    const now = Date.now();
    const normalizedState = withNormalizedRunMelds(state);
    await ctx.db.patch("games", game._id, {
      state: normalizedState,
      updatedAt: now,
    });
    await touchGameParticipants(ctx, game._id, now);

    if (state.phase === "gameEnd") {
      await markGameFinished(ctx, {
        gameId: game._id,
        roomId: game.roomId,
        now,
      });
    } else {
      await scheduleStockReshuffleAdvanceIfNeeded(ctx, game._id, normalizedState);
    }
  }

  const normalizedState = withNormalizedRunMelds(state);
  const table = await buildTableView(ctx, { ...game, state: normalizedState }, normalizedState, playerId);
  return {
    table,
    hand: handForPlayer(normalizedState, playerId),
    legalActions: legalActions(normalizedState, playerId),
    error,
  };
}
