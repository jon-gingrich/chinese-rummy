import type { Doc, Id } from "../_generated/dataModel";
import type { MutationCtx, QueryCtx } from "../_generated/server";
import { playerDisplayName } from "./auth";
import {
  isAutomatedPlayerId,
  type AutomatedPlayerProfile,
  createAutomatedSeatProfile,
} from "./automatedPlayers";
import { isAutomatedSeat, isHumanSeat, automatedDisplayNamesInUse } from "./rooms";
import { effectiveContractRound, formatContract } from "./rules/contracts";
import type { GameState } from "./rules";
import { withNormalizedRunMelds } from "./rules/melds";
import { replacePlayerIdInGameState } from "./substitution";
import { scheduleAutomatedTurnIfNeeded } from "../automatedTurnScheduler";

export type GameMode = "practice" | "multiplayer";

export function gameModeFor(game: Doc<"games">): GameMode {
  return game.gameMode ?? "multiplayer";
}

export async function insertGameParticipants(
  ctx: MutationCtx,
  args: {
    gameId: Id<"games">;
    roomId: Id<"rooms">;
    roomCode: string;
    userIds: Id<"users">[];
    now: number;
  },
) {
  for (const userId of args.userIds) {
    await ctx.db.insert("gameParticipants", {
      userId,
      gameId: args.gameId,
      gameMode: "multiplayer",
      roomId: args.roomId,
      roomCode: args.roomCode,
      status: "playing",
      updatedAt: args.now,
    });
  }
}

export async function insertPracticeParticipant(
  ctx: MutationCtx,
  args: {
    gameId: Id<"games">;
    userId: Id<"users">;
    now: number;
  },
) {
  await ctx.db.insert("gameParticipants", {
    userId: args.userId,
    gameId: args.gameId,
    gameMode: "practice",
    label: "Practice",
    status: "playing",
    updatedAt: args.now,
  });
}

export async function markGameFinished(
  ctx: MutationCtx,
  args: { gameId: Id<"games">; roomId?: Id<"rooms">; now: number },
) {
  if (args.roomId) {
    await ctx.db.patch("rooms", args.roomId, { status: "finished" });
  }

  const participants = await ctx.db
    .query("gameParticipants")
    .withIndex("by_game", (q) => q.eq("gameId", args.gameId))
    .collect();

  for (const participant of participants) {
    await ctx.db.patch("gameParticipants", participant._id, {
      status: "finished",
      updatedAt: args.now,
    });
  }
}

export async function touchGameParticipants(
  ctx: MutationCtx,
  gameId: Id<"games">,
  now: number,
) {
  const participants = await ctx.db
    .query("gameParticipants")
    .withIndex("by_game", (q) => q.eq("gameId", gameId))
    .collect();

  for (const participant of participants) {
    await ctx.db.patch("gameParticipants", participant._id, { updatedAt: now });
  }
}

export async function abandonPracticeGame(
  ctx: MutationCtx,
  args: { gameId: Id<"games">; userId: Id<"users">; now: number },
) {
  const game = await ctx.db.get("games", args.gameId);
  if (!game) {
    throw new Error("Game not found");
  }
  if (gameModeFor(game) !== "practice") {
    throw new Error("Only practice games can be abandoned");
  }

  const participant = await ctx.db
    .query("gameParticipants")
    .withIndex("by_user", (q) => q.eq("userId", args.userId))
    .collect();

  const membership = participant.find((entry) => entry.gameId === args.gameId);
  if (!membership) {
    throw new Error("You are not in this game");
  }

  await ctx.db.patch("gameParticipants", membership._id, {
    status: "finished",
    updatedAt: args.now,
  });
}

export function seatedPlayersFromRoom(
  room: Doc<"rooms">,
): Array<{ id: string; seatIndex: number }> {
  return room.seats.flatMap((seat, seatIndex) => {
    if (!seat) {
      return [];
    }
    if (isAutomatedSeat(seat)) {
      return [{ id: seat.id, seatIndex }];
    }
    if (isHumanSeat(seat)) {
      return [{ id: seat.userId, seatIndex }];
    }
    return [];
  });
}

export function automatedPlayersFromRoom(
  room: Doc<"rooms">,
): AutomatedPlayerProfile[] {
  return room.seats.flatMap((seat) =>
    seat && isAutomatedSeat(seat)
      ? [{ id: seat.id, displayName: seat.displayName }]
      : [],
  );
}

export function humanUserIdsFromRoom(room: Doc<"rooms">): Id<"users">[] {
  return room.seats.flatMap((seat) =>
    seat && isHumanSeat(seat) ? [seat.userId] : [],
  );
}

export async function getGameDocument(
  ctx: QueryCtx | MutationCtx,
  gameId: Id<"games">,
) {
  const game = await ctx.db.get("games", gameId);
  if (!game) {
    throw new Error("Game not found");
  }
  return game;
}

export async function getGameForRoom(
  ctx: QueryCtx | MutationCtx,
  roomId: Id<"rooms">,
) {
  const room = await ctx.db.get("rooms", roomId);
  if (!room) {
    throw new Error("Room not found");
  }
  if (!room.gameId) {
    throw new Error("Game has not started");
  }
  const game = await ctx.db.get("games", room.gameId);
  if (!game) {
    throw new Error("Game not found");
  }
  return { room, game };
}

function automatedDisplayName(
  automatedPlayers: AutomatedPlayerProfile[] | undefined,
  playerId: string,
): string | null {
  return automatedPlayers?.find((entry) => entry.id === playerId)?.displayName ?? null;
}

export async function buildTableView(
  ctx: QueryCtx | MutationCtx,
  game: Doc<"games">,
  state: GameState,
  viewerUserId?: string,
  options?: { viewerIsHost?: boolean },
) {
  const automatedPlayers = game.automatedPlayers ?? [];
  const mode = gameModeFor(game);
  const canSubstitutePlayers =
    options?.viewerIsHost === true &&
    mode === "multiplayer" &&
    state.phase !== "gameEnd";

  const players = await Promise.all(
    state.players.map(async (player, index) => {
      const automatedName = automatedDisplayName(automatedPlayers, player.id);
      let displayName = automatedName;
      if (!displayName) {
        const user = await ctx.db.get("users", player.id as Id<"users">);
        if (!user) {
          throw new Error("Player not found");
        }
        displayName = playerDisplayName(user);
      }

      const isAutomated = isAutomatedPlayerId(player.id);

      return {
        id: player.id,
        seatIndex: player.seatIndex,
        displayName,
        isAutomated,
        handSize: player.hand.length,
        contractRound: effectiveContractRound(player, state.roundNumber),
        contract: formatContract(effectiveContractRound(player, state.roundNumber)),
        playerPhase: player.playerPhase,
        isActive: player.seatIndex === state.activeSeatIndex,
        isDealer: player.seatIndex === state.dealerSeatIndex,
        cumulativeScore: state.cumulativeScores[index] ?? 0,
        roundScore: state.lastRoundSummary?.roundScores[index],
        canSubstitute:
          canSubstitutePlayers &&
          !isAutomated &&
          viewerUserId !== undefined &&
          player.id !== viewerUserId,
      };
    }),
  );

  const viewerPlayer = viewerUserId
    ? state.players.find((player) => player.id === viewerUserId)
    : undefined;
  const contractRound = viewerPlayer
    ? effectiveContractRound(viewerPlayer, state.roundNumber)
    : state.roundNumber;

  return {
    _id: game._id,
    gameMode: gameModeFor(game),
    roomId: game.roomId,
    roundNumber: state.roundNumber,
    contract: formatContract(contractRound),
    phase: state.phase,
    turnPhase: state.turnPhase,
    activeSeatIndex: state.activeSeatIndex,
    dealerSeatIndex: state.dealerSeatIndex,
    topDiscard: state.discard[state.discard.length - 1] ?? null,
    stockCount: state.stock.length,
    rummyWindow: state.rummyWindow,
    players,
    melds: withNormalizedRunMelds(state).melds,
    cumulativeScores: state.cumulativeScores,
    lastRoundSummary: state.lastRoundSummary,
    winnerPlayerIds: state.winnerPlayerIds,
    canContinueRound: state.phase === "roundEnd",
  };
}

export function handForPlayer(state: GameState, playerId: string) {
  const player = state.players.find((entry) => entry.id === playerId);
  if (!player) {
    throw new Error("Player not seated in game");
  }
  return player.hand;
}

export function assertPlayerInGame(state: GameState, playerId: string) {
  const player = state.players.find((entry) => entry.id === playerId);
  if (!player) {
    throw new Error("You are not in this game");
  }
  return player;
}

export async function assertHumanParticipant(
  ctx: QueryCtx | MutationCtx,
  gameId: Id<"games">,
  userId: Id<"users">,
) {
  const memberships = await ctx.db
    .query("gameParticipants")
    .withIndex("by_user", (q) => q.eq("userId", userId))
    .collect();

  const membership = memberships.find(
    (entry) => entry.gameId === gameId && entry.status === "playing",
  );
  if (!membership) {
    throw new Error("You are not in this game");
  }
  return membership;
}

export async function substituteHumanWithAutomated(
  ctx: MutationCtx,
  args: {
    room: Doc<"rooms">;
    game: Doc<"games">;
    seatIndex: number;
    hostUserId: Id<"users">;
  },
) {
  if (args.room.hostId !== args.hostUserId) {
    throw new Error("Only the host can substitute players");
  }
  if (args.room.status !== "playing") {
    throw new Error("Substitution is only available during a game");
  }
  if (!args.room.gameId || args.room.gameId !== args.game._id) {
    throw new Error("Game is not active in this room");
  }

  const state = args.game.state as GameState;
  if (state.phase === "gameEnd") {
    throw new Error("Game has ended");
  }

  if (!Number.isInteger(args.seatIndex) || args.seatIndex < 0 || args.seatIndex >= args.room.seats.length) {
    throw new Error("Invalid seat");
  }

  const seat = args.room.seats[args.seatIndex];
  if (!seat || !isHumanSeat(seat)) {
    throw new Error("Seat does not have a human player");
  }
  if (seat.userId === args.hostUserId) {
    throw new Error("You cannot substitute yourself");
  }

  const gamePlayer = state.players.find((player) => player.seatIndex === args.seatIndex);
  if (!gamePlayer || gamePlayer.id !== seat.userId) {
    throw new Error("Player seat mismatch");
  }
  if (isAutomatedPlayerId(gamePlayer.id)) {
    throw new Error("Player is already automated");
  }

  const usedNames = new Set([
    ...automatedDisplayNamesInUse(args.room.seats),
    ...(args.game.automatedPlayers ?? []).map((entry) => entry.displayName),
  ]);
  const profile = createAutomatedSeatProfile(usedNames);
  const nextState = replacePlayerIdInGameState(state, seat.userId, profile.id);
  const now = Date.now();

  const seats = [...args.room.seats];
  seats[args.seatIndex] = {
    kind: "automated",
    id: profile.id,
    displayName: profile.displayName,
    ready: true,
  };

  const participants = await ctx.db
    .query("gameParticipants")
    .withIndex("by_game", (q) => q.eq("gameId", args.game._id))
    .collect();

  for (const participant of participants) {
    if (participant.userId === seat.userId) {
      await ctx.db.patch("gameParticipants", participant._id, {
        status: "finished",
        updatedAt: now,
      });
    }
  }

  await ctx.db.patch("rooms", args.room._id, { seats });
  await ctx.db.patch("games", args.game._id, {
    state: nextState,
    automatedPlayers: [...(args.game.automatedPlayers ?? []), profile],
    updatedAt: now,
  });

  await scheduleAutomatedTurnIfNeeded(ctx, args.game._id, nextState);
}
