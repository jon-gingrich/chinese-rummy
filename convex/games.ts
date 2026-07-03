import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import type { Id } from "./_generated/dataModel";
import type { MutationCtx } from "./_generated/server";
import {
  assertPlayerInGame,
  buildTableView,
  getGameForRoom,
  handForPlayer,
  markGameFinished,
  touchGameParticipants,
} from "./lib/games";
import { getCurrentUser } from "./lib/auth";
import { applyAction, applyCallRummy, applyTakeBackDiscard, continueToNextRound, legalActions } from "./lib/rules";
import type { GameState } from "./lib/rules";
import { effectiveContractRound, formatContract } from "./lib/rules/contracts";
import {
  actionResultValidator,
  cardValidator,
  legalActionsValidator,
  openingMeldValidator,
  tableViewValidator,
  wildDeclarationValidator,
  wildRelocationValidator,
} from "./lib/rules/validators";

const myGameSummaryValidator = v.object({
  roomId: v.id("rooms"),
  roomCode: v.string(),
  gameId: v.id("games"),
  roundNumber: v.number(),
  contract: v.string(),
  phase: v.union(v.literal("playing"), v.literal("roundEnd"), v.literal("gameEnd")),
  playerCount: v.number(),
  updatedAt: v.number(),
});

async function persistAndRespond(
  ctx: MutationCtx,
  gameId: Id<"games">,
  state: GameState,
  playerId: string,
  error?: string,
) {
  const game = await ctx.db.get("games", gameId);
  if (!game) {
    throw new Error("Game not found");
  }

  if (!error) {
    const now = Date.now();
    await ctx.db.patch("games", gameId, {
      state,
      updatedAt: now,
    });
    await touchGameParticipants(ctx, gameId, now);

    if (state.phase === "gameEnd") {
      await markGameFinished(ctx, {
        gameId,
        roomId: game.roomId,
        now,
      });
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

export const getMyGames = query({
  args: {},
  returns: v.array(myGameSummaryValidator),
  handler: async (ctx) => {
    const user = await getCurrentUser(ctx);
    if (user.isAnonymous) {
      return [];
    }
    const memberships = await ctx.db
      .query("gameParticipants")
      .withIndex("by_user", (q) => q.eq("userId", user._id))
      .collect();

    const summaries = await Promise.all(
      memberships
        .filter((membership) => membership.status === "playing")
        .map(async (membership) => {
          const game = await ctx.db.get("games", membership.gameId);
          if (!game) {
            return null;
          }
          const state = game.state as GameState;
          if (state.phase === "gameEnd") {
            return null;
          }
          const viewer = state.players.find((player) => player.id === user._id);
          const contractRound = viewer
            ? effectiveContractRound(viewer, state.roundNumber)
            : state.roundNumber;
          return {
            roomId: membership.roomId,
            roomCode: membership.roomCode,
            gameId: membership.gameId,
            roundNumber: state.roundNumber,
            contract: formatContract(contractRound),
            phase: state.phase,
            playerCount: state.players.length,
            updatedAt: game.updatedAt,
          };
        }),
    );

    return summaries
      .filter((summary): summary is NonNullable<typeof summary> => summary !== null)
      .sort((left, right) => right.updatedAt - left.updatedAt);
  },
});

export const getGame = query({
  args: { roomId: v.id("rooms") },
  returns: v.union(tableViewValidator, v.null()),
  handler: async (ctx, args) => {
    const user = await getCurrentUser(ctx);
    const room = await ctx.db.get("rooms", args.roomId);
    if (!room?.gameId) {
      return null;
    }
    const game = await ctx.db.get("games", room.gameId);
    if (!game) {
      return null;
    }
    return await buildTableView(ctx, game, game.state as GameState, user._id);
  },
});

export const getMyHand = query({
  args: { roomId: v.id("rooms") },
  returns: v.union(v.array(cardValidator), v.null()),
  handler: async (ctx, args) => {
    const user = await getCurrentUser(ctx);
    const room = await ctx.db.get("rooms", args.roomId);
    if (!room?.gameId) {
      return null;
    }
    const game = await ctx.db.get("games", room.gameId);
    if (!game) {
      return null;
    }
    const state = game.state as GameState;
    try {
      return handForPlayer(state, user._id);
    } catch {
      return null;
    }
  },
});

export const getLegalActions = query({
  args: { roomId: v.id("rooms") },
  returns: v.union(legalActionsValidator, v.null()),
  handler: async (ctx, args) => {
    const user = await getCurrentUser(ctx);
    const room = await ctx.db.get("rooms", args.roomId);
    if (!room?.gameId) {
      return null;
    }
    const game = await ctx.db.get("games", room.gameId);
    if (!game) {
      return null;
    }
    const state = game.state as GameState;
    if (!state.players.some((player) => player.id === user._id)) {
      return null;
    }
    return legalActions(state, user._id);
  },
});

export const draw = mutation({
  args: {
    roomId: v.id("rooms"),
    source: v.union(v.literal("stock"), v.literal("discard")),
  },
  returns: actionResultValidator,
  handler: async (ctx, args) => {
    const user = await getCurrentUser(ctx);
    const { game } = await getGameForRoom(ctx, args.roomId);
    const state = game.state as GameState;
    assertPlayerInGame(state, user._id);

    const result = applyAction(
      state,
      { kind: "draw", source: args.source },
      user._id,
    );

    return await persistAndRespond(
      ctx,
      game._id,
      result.state,
      user._id,
      result.error,
    );
  },
});

export const discard = mutation({
  args: {
    roomId: v.id("rooms"),
    card: cardValidator,
  },
  returns: actionResultValidator,
  handler: async (ctx, args) => {
    const user = await getCurrentUser(ctx);
    const { game } = await getGameForRoom(ctx, args.roomId);
    const state = game.state as GameState;
    assertPlayerInGame(state, user._id);

    const result = applyAction(state, { kind: "discard", card: args.card }, user._id);

    return await persistAndRespond(
      ctx,
      game._id,
      result.state,
      user._id,
      result.error,
    );
  },
});

export const open = mutation({
  args: {
    roomId: v.id("rooms"),
    melds: v.array(openingMeldValidator),
  },
  returns: actionResultValidator,
  handler: async (ctx, args) => {
    const user = await getCurrentUser(ctx);
    const { game } = await getGameForRoom(ctx, args.roomId);
    const state = game.state as GameState;
    assertPlayerInGame(state, user._id);

    const result = applyAction(state, { kind: "open", melds: args.melds }, user._id);

    return await persistAndRespond(
      ctx,
      game._id,
      result.state,
      user._id,
      result.error,
    );
  },
});

export const callRummy = mutation({
  args: { roomId: v.id("rooms") },
  returns: actionResultValidator,
  handler: async (ctx, args) => {
    const user = await getCurrentUser(ctx);
    const { game } = await getGameForRoom(ctx, args.roomId);
    const state = game.state as GameState;
    assertPlayerInGame(state, user._id);

    const result = applyCallRummy(state, user._id);

    return await persistAndRespond(
      ctx,
      game._id,
      result.state,
      user._id,
      result.error,
    );
  },
});

export const takeBackDiscard = mutation({
  args: { roomId: v.id("rooms") },
  returns: actionResultValidator,
  handler: async (ctx, args) => {
    const user = await getCurrentUser(ctx);
    const { game } = await getGameForRoom(ctx, args.roomId);
    const state = game.state as GameState;
    assertPlayerInGame(state, user._id);

    const result = applyTakeBackDiscard(state, user._id);

    return await persistAndRespond(
      ctx,
      game._id,
      result.state,
      user._id,
      result.error,
    );
  },
});

export const layOff = mutation({
  args: {
    roomId: v.id("rooms"),
    targetMeldId: v.string(),
    card: cardValidator,
    replaceWildCardId: v.optional(v.string()),
    relocation: v.optional(wildRelocationValidator),
    wildDeclaration: v.optional(wildDeclarationValidator),
  },
  returns: actionResultValidator,
  handler: async (ctx, args) => {
    const user = await getCurrentUser(ctx);
    const { game } = await getGameForRoom(ctx, args.roomId);
    const state = game.state as GameState;
    assertPlayerInGame(state, user._id);

    const result = applyAction(
      state,
      {
        kind: "layOff",
        targetMeldId: args.targetMeldId,
        card: args.card,
        replaceWildCardId: args.replaceWildCardId,
        relocation: args.relocation,
        wildDeclaration: args.wildDeclaration,
      },
      user._id,
    );

    return await persistAndRespond(
      ctx,
      game._id,
      result.state,
      user._id,
      result.error,
    );
  },
});

export const continueRound = mutation({
  args: { roomId: v.id("rooms") },
  returns: actionResultValidator,
  handler: async (ctx, args) => {
    const user = await getCurrentUser(ctx);
    const { game } = await getGameForRoom(ctx, args.roomId);
    const state = game.state as GameState;
    assertPlayerInGame(state, user._id);

    let nextState: GameState;
    try {
      nextState = continueToNextRound(state);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Cannot continue round";
      return await persistAndRespond(ctx, game._id, state, user._id, message);
    }

    return await persistAndRespond(ctx, game._id, nextState, user._id);
  },
});
