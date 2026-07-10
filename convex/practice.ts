import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import type { Id } from "./_generated/dataModel";
import { getCurrentUser } from "./lib/auth";
import { createAutomatedPlayers } from "./lib/automatedPlayers";
import { scheduleAutomatedTurnIfNeeded } from "./automatedTurnScheduler";
import {
  abandonPracticeGame as abandonPracticeGameRecord,
  assertHumanParticipant,
  buildTableView,
  getGameDocument,
  handForPlayer,
  insertPracticeParticipant,
} from "./lib/games";
import { persistGameState } from "./lib/persistGame";
import {
  applyAction,
  applyCallRummy,
  applyTakeBackDiscard,
  continueToNextRound,
  createGame,
  legalActions,
  startRound,
} from "./lib/rules";
import type { GameState } from "./lib/rules";
import { withNormalizedRunMelds } from "./lib/rules/melds";
import {
  actionResultValidator,
  cardValidator,
  legalActionsValidator,
  openingMeldValidator,
  tableViewValidator,
  wildRelocationValidator,
  wildDeclarationValidator,
} from "./lib/rules/validators";

async function getPracticeGameForUser(
  ctx: Parameters<typeof getGameDocument>[0],
  gameId: Id<"games">,
  userId: Id<"users">,
  options?: { requireActive?: boolean },
) {
  await assertHumanParticipant(ctx, gameId, userId, options);
  return await getGameDocument(ctx, gameId);
}

export const startPracticeGame = mutation({
  args: {
    opponentCount: v.number(),
  },
  returns: v.id("games"),
  handler: async (ctx, args) => {
    const user = await getCurrentUser(ctx);
    if (!Number.isInteger(args.opponentCount) || args.opponentCount < 1 || args.opponentCount > 4) {
      throw new Error("Choose 1 to 4 automated opponents");
    }

    const automatedPlayers = createAutomatedPlayers(args.opponentCount);
    const players = [
      { id: user._id, seatIndex: 0 },
      ...automatedPlayers.map((bot, index) => ({
        id: bot.id,
        seatIndex: index + 1,
      })),
    ];

    const state = startRound(createGame({ players }));
    const now = Date.now();
    const gameId = await ctx.db.insert("games", {
      gameMode: "practice",
      automatedPlayers,
      state,
      createdAt: now,
      updatedAt: now,
    });

    await insertPracticeParticipant(ctx, {
      gameId,
      userId: user._id,
      now,
    });
    await scheduleAutomatedTurnIfNeeded(ctx, gameId, state);

    return gameId;
  },
});

export const abandonPracticeGame = mutation({
  args: {
    gameId: v.id("games"),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const user = await getCurrentUser(ctx);
    await abandonPracticeGameRecord(ctx, {
      gameId: args.gameId,
      userId: user._id,
      now: Date.now(),
    });
    return null;
  },
});

export const getGame = query({
  args: { gameId: v.id("games") },
  returns: v.union(tableViewValidator, v.null()),
  handler: async (ctx, args) => {
    const user = await getCurrentUser(ctx);
    try {
      const game = await getPracticeGameForUser(ctx, args.gameId, user._id);
      return await buildTableView(ctx, game, game.state as GameState, user._id);
    } catch {
      return null;
    }
  },
});

export const getMyHand = query({
  args: { gameId: v.id("games") },
  returns: v.union(v.array(cardValidator), v.null()),
  handler: async (ctx, args) => {
    const user = await getCurrentUser(ctx);
    try {
      const game = await getPracticeGameForUser(ctx, args.gameId, user._id);
      return handForPlayer(game.state as GameState, user._id);
    } catch {
      return null;
    }
  },
});

export const getLegalActions = query({
  args: { gameId: v.id("games") },
  returns: v.union(legalActionsValidator, v.null()),
  handler: async (ctx, args) => {
    const user = await getCurrentUser(ctx);
    try {
      const game = await getPracticeGameForUser(ctx, args.gameId, user._id);
      const state = game.state as GameState;
      if (!state.players.some((player) => player.id === user._id)) {
        return null;
      }
      return legalActions(withNormalizedRunMelds(state), user._id);
    } catch {
      return null;
    }
  },
});

export const draw = mutation({
  args: {
    gameId: v.id("games"),
    source: v.union(v.literal("stock"), v.literal("discard")),
  },
  returns: actionResultValidator,
  handler: async (ctx, args) => {
    const user = await getCurrentUser(ctx);
    const game = await getPracticeGameForUser(ctx, args.gameId, user._id, {
      requireActive: true,
    });
    const state = game.state as GameState;
    const result = applyAction(state, { kind: "draw", source: args.source }, user._id);
    return await persistGameState(ctx, game, result.state, user._id, result.error);
  },
});

export const discard = mutation({
  args: {
    gameId: v.id("games"),
    card: cardValidator,
  },
  returns: actionResultValidator,
  handler: async (ctx, args) => {
    const user = await getCurrentUser(ctx);
    const game = await getPracticeGameForUser(ctx, args.gameId, user._id, {
      requireActive: true,
    });
    const state = game.state as GameState;
    const result = applyAction(state, { kind: "discard", card: args.card }, user._id);
    return await persistGameState(ctx, game, result.state, user._id, result.error);
  },
});

export const open = mutation({
  args: {
    gameId: v.id("games"),
    melds: v.array(openingMeldValidator),
  },
  returns: actionResultValidator,
  handler: async (ctx, args) => {
    const user = await getCurrentUser(ctx);
    const game = await getPracticeGameForUser(ctx, args.gameId, user._id, {
      requireActive: true,
    });
    const state = game.state as GameState;
    const result = applyAction(state, { kind: "open", melds: args.melds }, user._id);
    return await persistGameState(ctx, game, result.state, user._id, result.error);
  },
});

export const callRummy = mutation({
  args: { gameId: v.id("games") },
  returns: actionResultValidator,
  handler: async (ctx, args) => {
    const user = await getCurrentUser(ctx);
    const game = await getPracticeGameForUser(ctx, args.gameId, user._id, {
      requireActive: true,
    });
    const state = game.state as GameState;
    const result = applyCallRummy(state, user._id);
    return await persistGameState(ctx, game, result.state, user._id, result.error);
  },
});

export const takeBackDiscard = mutation({
  args: { gameId: v.id("games") },
  returns: actionResultValidator,
  handler: async (ctx, args) => {
    const user = await getCurrentUser(ctx);
    const game = await getPracticeGameForUser(ctx, args.gameId, user._id, {
      requireActive: true,
    });
    const state = game.state as GameState;
    const result = applyTakeBackDiscard(state, user._id);
    return await persistGameState(ctx, game, result.state, user._id, result.error);
  },
});

export const layOff = mutation({
  args: {
    gameId: v.id("games"),
    targetMeldId: v.string(),
    card: cardValidator,
    replaceWildCardId: v.optional(v.string()),
    relocation: v.optional(wildRelocationValidator),
    wildDeclaration: v.optional(wildDeclarationValidator),
  },
  returns: actionResultValidator,
  handler: async (ctx, args) => {
    const user = await getCurrentUser(ctx);
    const game = await getPracticeGameForUser(ctx, args.gameId, user._id, {
      requireActive: true,
    });
    const state = game.state as GameState;
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
  args: { gameId: v.id("games") },
  returns: actionResultValidator,
  handler: async (ctx, args) => {
    const user = await getCurrentUser(ctx);
    const game = await getPracticeGameForUser(ctx, args.gameId, user._id, {
      requireActive: true,
    });
    const state = game.state as GameState;

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
