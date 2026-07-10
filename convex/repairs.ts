import { v } from "convex/values";
import { internalMutation } from "./_generated/server";
import type { Id } from "./_generated/dataModel";
import { resolveStuckWildLeftover as applyStuckWildLeftover } from "./lib/rules";
import { lowestScoreWinnerIds } from "./lib/rules/scoring";
import type { GameState } from "./lib/rules";
import { scheduleStockReshuffleAdvanceIfNeeded } from "./stockReshuffle";
import { markGameFinished, touchGameParticipants } from "./lib/games";

/** Known stuck production practice game from 2026-07-09 (round 10 leftover joker). */
const DEFAULT_STUCK_GAME_ID = "k17fdqnqkh1h796v6keaevg7r58a1fwh" as Id<"games">;

/**
 * One-off repair for games that opened leaving only a joker/two before stuck-wild
 * pickup was deployed. Safe to re-run: no-ops when the hand is not a stuck wild.
 */
export const resolveStuckWildLeftover = internalMutation({
  args: {
    gameId: v.optional(v.id("games")),
    playerId: v.optional(v.string()),
  },
  returns: v.object({
    repaired: v.boolean(),
    gameId: v.union(v.string(), v.null()),
    playerId: v.union(v.string(), v.null()),
    error: v.union(v.string(), v.null()),
    handSizeAfter: v.union(v.number(), v.null()),
  }),
  handler: async (ctx, args) => {
    const gameId = args.gameId ?? DEFAULT_STUCK_GAME_ID;
    const game = await ctx.db.get("games", gameId);
    if (!game) {
      return {
        repaired: false,
        gameId,
        playerId: null,
        error: "Game not found",
        handSizeAfter: null,
      };
    }

    const state = game.state as GameState;
    const target =
      (args.playerId
        ? state.players.find((player) => player.id === args.playerId)
        : undefined) ??
      state.players.find(
        (player) =>
          player.hand.length === 1 &&
          (player.hand[0]!.rank === "JOKER" || player.hand[0]!.rank === "2"),
      );

    if (!target) {
      return {
        repaired: false,
        gameId: game._id,
        playerId: args.playerId ?? null,
        error: "No stuck-wild hand found",
        handSizeAfter: null,
      };
    }

    const result = applyStuckWildLeftover(state, target.id);
    if (result.error) {
      return {
        repaired: false,
        gameId: game._id,
        playerId: target.id,
        error: result.error,
        handSizeAfter: target.hand.length,
      };
    }

    if (result.state === state) {
      return {
        repaired: false,
        gameId: game._id,
        playerId: target.id,
        error: "Hand is not a stuck wild leftover",
        handSizeAfter: target.hand.length,
      };
    }

    const now = Date.now();
    await ctx.db.patch("games", game._id, {
      state: result.state,
      updatedAt: now,
    });
    await touchGameParticipants(ctx, game._id, now);
    await scheduleStockReshuffleAdvanceIfNeeded(ctx, game._id, result.state);

    const repairedPlayer = result.state.players.find((player) => player.id === target.id);
    return {
      repaired: true,
      gameId: game._id,
      playerId: target.id,
      error: null,
      handSizeAfter: repairedPlayer?.hand.length ?? null,
    };
  },
});

/**
 * Force a finished round-10 game into gameEnd so the celebration UI can show.
 * Defaults to the known stuck practice game that still offered "start round 11".
 */
export const forceGameEnd = internalMutation({
  args: {
    gameId: v.optional(v.id("games")),
  },
  returns: v.object({
    repaired: v.boolean(),
    gameId: v.union(v.string(), v.null()),
    phase: v.union(v.string(), v.null()),
    winnerPlayerIds: v.array(v.string()),
    error: v.union(v.string(), v.null()),
  }),
  handler: async (ctx, args) => {
    const gameId = args.gameId ?? DEFAULT_STUCK_GAME_ID;
    const game = await ctx.db.get("games", gameId);
    if (!game) {
      return {
        repaired: false,
        gameId,
        phase: null,
        winnerPlayerIds: [],
        error: "Game not found",
      };
    }

    const state = game.state as GameState;
    if (state.phase === "gameEnd") {
      return {
        repaired: false,
        gameId: game._id,
        phase: state.phase,
        winnerPlayerIds: state.winnerPlayerIds ?? [],
        error: "Already gameEnd",
      };
    }

    if (state.roundNumber < 10 && state.phase !== "roundEnd") {
      return {
        repaired: false,
        gameId: game._id,
        phase: state.phase,
        winnerPlayerIds: [],
        error: `Unexpected state round=${state.roundNumber} phase=${state.phase}`,
      };
    }

    const cumulativeScores =
      state.lastRoundSummary?.cumulativeScores ?? state.cumulativeScores;
    const winnerPlayerIds = lowestScoreWinnerIds(state.players, cumulativeScores);
    const nextState: GameState = {
      ...state,
      phase: "gameEnd",
      roundPhase: "scored",
      cumulativeScores,
      winnerPlayerIds,
      lastRoundSummary: state.lastRoundSummary,
    };

    const now = Date.now();
    await ctx.db.patch("games", game._id, {
      state: nextState,
      updatedAt: now,
    });
    await touchGameParticipants(ctx, game._id, now);
    await markGameFinished(ctx, {
      gameId: game._id,
      roomId: game.roomId,
      now,
    });

    return {
      repaired: true,
      gameId: game._id,
      phase: nextState.phase,
      winnerPlayerIds,
      error: null,
    };
  },
});
