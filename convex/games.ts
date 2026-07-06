import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import {
  archiveGame as archiveGameRecord,
  assertPlayerInGame,
  buildTableView,
  gameModeFor,
  getGameForRoom,
  handForPlayer,
} from "./lib/games";
import { getCurrentUser } from "./lib/auth";
import { persistGameState } from "./lib/persistGame";
import { withNormalizedRunMelds } from "./lib/rules/melds";
import {
  applyAction,
  applyCallRummy,
  applyTakeBackDiscard,
  continueToNextRound,
  legalActions,
} from "./lib/rules";
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
  gameMode: v.union(v.literal("practice"), v.literal("multiplayer")),
  roomId: v.optional(v.id("rooms")),
  roomCode: v.string(),
  gameId: v.id("games"),
  roundNumber: v.number(),
  contract: v.string(),
  phase: v.union(v.literal("playing"), v.literal("roundEnd"), v.literal("gameEnd")),
  playerCount: v.number(),
  updatedAt: v.number(),
  canArchive: v.boolean(),
});

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
          const mode = membership.gameMode ?? gameModeFor(game);
          let canArchive = mode === "practice";
          if (!canArchive && membership.roomId) {
            const room = await ctx.db.get("rooms", membership.roomId);
            canArchive = room?.hostId === user._id;
          }
          return {
            gameMode: mode,
            roomId: membership.roomId,
            roomCode: membership.roomCode ?? membership.label ?? "Practice",
            gameId: membership.gameId,
            roundNumber: state.roundNumber,
            contract: formatContract(contractRound),
            phase: state.phase,
            playerCount: state.players.length,
            updatedAt: game.updatedAt,
            canArchive,
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
    const viewerIsHost = room.hostId === user._id;
    return await buildTableView(ctx, game, game.state as GameState, user._id, {
      viewerIsHost,
    });
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
    return legalActions(withNormalizedRunMelds(state), user._id);
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

    return await persistGameState(ctx, game, result.state, user._id, result.error);
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

    return await persistGameState(ctx, game, result.state, user._id, result.error);
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

    return await persistGameState(ctx, game, result.state, user._id, result.error);
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

    return await persistGameState(ctx, game, result.state, user._id, result.error);
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

    return await persistGameState(ctx, game, result.state, user._id, result.error);
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

    return await persistGameState(ctx, game, result.state, user._id, result.error);
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
      return await persistGameState(ctx, game, state, user._id, message);
    }

    return await persistGameState(ctx, game, nextState, user._id);
  },
});

export const archiveGame = mutation({
  args: { gameId: v.id("games") },
  returns: v.null(),
  handler: async (ctx, args) => {
    const user = await getCurrentUser(ctx);
    await archiveGameRecord(ctx, {
      gameId: args.gameId,
      userId: user._id,
      now: Date.now(),
    });
    return null;
  },
});
