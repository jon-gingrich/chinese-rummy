import type { Doc, Id } from "../_generated/dataModel";
import type { MutationCtx, QueryCtx } from "../_generated/server";
import { playerDisplayName } from "./auth";
import { effectiveContractRound, formatContract } from "./rules/contracts";
import type { GameState } from "./rules";
import type { Card } from "./rules/types";

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
      roomId: args.roomId,
      roomCode: args.roomCode,
      status: "playing",
      updatedAt: args.now,
    });
  }
}

export async function markGameFinished(
  ctx: MutationCtx,
  args: { gameId: Id<"games">; roomId: Id<"rooms">; now: number },
) {
  await ctx.db.patch("rooms", args.roomId, { status: "finished" });

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

export function seatedPlayersFromRoom(
  room: Doc<"rooms">,
): Array<{ id: string; seatIndex: number }> {
  return room.seats.flatMap((seat, seatIndex) =>
    seat ? [{ id: seat.userId, seatIndex }] : [],
  );
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

export async function buildTableView(
  ctx: QueryCtx | MutationCtx,
  game: Doc<"games">,
  state: GameState,
  viewerUserId?: string,
) {
  const players = await Promise.all(
    state.players.map(async (player, index) => {
      const user = await ctx.db.get("users", player.id as Id<"users">);
      if (!user) {
        throw new Error("Player not found");
      }
      return {
        id: player.id,
        seatIndex: player.seatIndex,
        displayName: playerDisplayName(user),
        handSize: player.hand.length,
        contractRound: effectiveContractRound(player, state.roundNumber),
        contract: formatContract(effectiveContractRound(player, state.roundNumber)),
        playerPhase: player.playerPhase,
        isActive: player.seatIndex === state.activeSeatIndex,
        isDealer: player.seatIndex === state.dealerSeatIndex,
        cumulativeScore: state.cumulativeScores[index] ?? 0,
        roundScore: state.lastRoundSummary?.roundScores[index],
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
    melds: state.melds,
    cumulativeScores: state.cumulativeScores,
    lastRoundSummary: state.lastRoundSummary,
    winnerPlayerIds: state.winnerPlayerIds,
    canContinueRound: state.phase === "roundEnd",
  };
}

export function handForPlayer(state: GameState, playerId: string): Card[] {
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
