import { v } from "convex/values";
import { internal } from "./_generated/api";
import { internalMutation } from "./_generated/server";
import { scheduleAutomatedTurnIfNeeded } from "./automatedTurnScheduler";
import { touchGameParticipants } from "./lib/games";
import { advanceFromReshuffle } from "./lib/rules";
import type { GameState } from "./lib/rules";

export const RESHUFFLE_ANIMATION_MS = 1800;

export async function scheduleStockReshuffleAdvanceIfNeeded(
  ctx: Parameters<typeof scheduleAutomatedTurnIfNeeded>[0],
  gameId: Parameters<typeof scheduleAutomatedTurnIfNeeded>[1],
  state: GameState,
) {
  if (state.turnPhase !== "reshuffle") {
    await scheduleAutomatedTurnIfNeeded(ctx, gameId, state);
    return;
  }

  await ctx.scheduler.runAfter(RESHUFFLE_ANIMATION_MS, internal.stockReshuffle.advance, {
    gameId,
  });
}

export const advance = internalMutation({
  args: {
    gameId: v.id("games"),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const game = await ctx.db.get("games", args.gameId);
    if (!game) {
      return null;
    }

    const state = game.state as GameState;
    if (state.turnPhase !== "reshuffle") {
      return null;
    }

    const nextState = advanceFromReshuffle(state);
    const now = Date.now();

    await ctx.db.patch("games", args.gameId, {
      state: nextState,
      updatedAt: now,
    });
    await touchGameParticipants(ctx, args.gameId, now);
    await scheduleAutomatedTurnIfNeeded(ctx, args.gameId, nextState);

    return null;
  },
});
