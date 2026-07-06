import type { Doc } from "../_generated/dataModel";
import type { MutationCtx } from "../_generated/server";
import { scheduleAutomatedTurnIfNeeded } from "../automatedTurnScheduler";
import {
  buildTableView,
  handForPlayer,
  markGameFinished,
  touchGameParticipants,
} from "./games";
import { legalActions } from "./rules";
import type { GameState } from "./rules";

export async function persistGameState(
  ctx: MutationCtx,
  game: Doc<"games">,
  state: GameState,
  playerId: string,
  error?: string,
) {
  if (!error) {
    const now = Date.now();
    await ctx.db.patch("games", game._id, {
      state,
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
      await scheduleAutomatedTurnIfNeeded(ctx, game._id, state);
    }
  }

  const table = await buildTableView(ctx, { ...game, state }, state, playerId);
  return {
    table,
    hand: handForPlayer(state, playerId),
    legalActions: legalActions(state, playerId),
    error,
  };
}
