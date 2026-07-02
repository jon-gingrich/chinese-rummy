import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import type { Id } from "./_generated/dataModel";
import type { MutationCtx } from "./_generated/server";
import {
  assertPlayerInGame,
  buildTableView,
  getGameForRoom,
  handForPlayer,
} from "./lib/games";
import { getCurrentUser } from "./lib/auth";
import { applyAction, legalActions } from "./lib/rules";
import type { GameState } from "./lib/rules";
import {
  actionResultValidator,
  cardValidator,
  legalActionsValidator,
  openingMeldValidator,
  tableViewValidator,
  wildRelocationValidator,
} from "./lib/rules/validators";

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
  }

  const table = await buildTableView(ctx, { ...game, state }, state);
  return {
    table,
    hand: handForPlayer(state, playerId),
    legalActions: legalActions(state, playerId),
    error,
  };
}

export const getGame = query({
  args: { roomId: v.id("rooms") },
  returns: v.union(tableViewValidator, v.null()),
  handler: async (ctx, args) => {
    await getCurrentUser(ctx);
    const room = await ctx.db.get("rooms", args.roomId);
    if (!room?.gameId) {
      return null;
    }
    const game = await ctx.db.get("games", room.gameId);
    if (!game) {
      return null;
    }
    return await buildTableView(ctx, game, game.state as GameState);
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

export const layOff = mutation({
  args: {
    roomId: v.id("rooms"),
    targetMeldId: v.string(),
    card: cardValidator,
    replaceWildCardId: v.optional(v.string()),
    relocation: v.optional(wildRelocationValidator),
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
