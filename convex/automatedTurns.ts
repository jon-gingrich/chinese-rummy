import { v } from "convex/values";
import { internalMutation } from "./_generated/server";
import {
  applyAction,
} from "./lib/rules";
import type { GameState } from "./lib/rules";
import { chooseAutomatedTurnStep } from "./lib/rules/automated";
import {
  markGameFinished,
  touchGameParticipants,
} from "./lib/games";
import { scheduleStockReshuffleAdvanceIfNeeded } from "./stockReshuffle";

export const runStep = internalMutation({
  args: {
    gameId: v.id("games"),
    expectedPlayerId: v.string(),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const game = await ctx.db.get("games", args.gameId);
    if (!game) {
      return null;
    }

    const state = game.state as GameState;
    if (state.phase === "gameEnd") {
      return null;
    }

    const active = state.players.find(
      (player) => player.seatIndex === state.activeSeatIndex,
    );
    if (!active || active.id !== args.expectedPlayerId) {
      return null;
    }

    const step = chooseAutomatedTurnStep(state, args.expectedPlayerId);
    if (step.kind === "idle") {
      return null;
    }

    const result = applyAction(state, step.action, args.expectedPlayerId);
    if (result.error) {
      console.error("Automated turn failed", {
        gameId: args.gameId,
        playerId: args.expectedPlayerId,
        error: result.error,
      });
      return null;
    }

    const now = Date.now();
    const nextState = result.state;

    await ctx.db.patch("games", args.gameId, {
      state: nextState,
      updatedAt: now,
    });
    await touchGameParticipants(ctx, args.gameId, now);

    if (nextState.phase === "gameEnd") {
      await markGameFinished(ctx, {
        gameId: args.gameId,
        roomId: game.roomId,
        now,
      });
      return null;
    }

    await scheduleStockReshuffleAdvanceIfNeeded(ctx, args.gameId, nextState);

    return null;
  },
});
