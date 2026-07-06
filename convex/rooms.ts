import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import type { MutationCtx, QueryCtx } from "./_generated/server";
import { getCurrentUser, playerDisplayName } from "./lib/auth";
import { createAutomatedSeatProfile } from "./lib/automatedPlayers";
import {
  automatedDisplayNamesInUse,
  canStartGame,
  countSeated,
  emptySeats,
  findPlayerSeat,
  isAutomatedSeat,
  isAutomatedSeatAt,
  isHumanSeat,
  isSeatOpen,
  type Seat,
} from "./lib/rooms";
import {
  automatedPlayersFromRoom,
  humanUserIdsFromRoom,
  insertGameParticipants,
  seatedPlayersFromRoom,
  substituteHumanWithAutomated,
} from "./lib/games";
import { scheduleAutomatedTurnIfNeeded } from "./automatedTurnScheduler";
import { createGame, startRound } from "./lib/rules";
import type { Id } from "./_generated/dataModel";

const CODE_ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
const CODE_LENGTH = 6;

const humanSeatViewValidator = v.object({
  kind: v.literal("human"),
  userId: v.id("users"),
  ready: v.boolean(),
  displayName: v.string(),
});

const automatedSeatViewValidator = v.object({
  kind: v.literal("automated"),
  id: v.string(),
  ready: v.boolean(),
  displayName: v.string(),
});

const roomViewValidator = v.object({
  _id: v.id("rooms"),
  code: v.string(),
  hostId: v.id("users"),
  status: v.union(
    v.literal("lobby"),
    v.literal("playing"),
    v.literal("finished"),
  ),
  gameId: v.optional(v.id("games")),
  seats: v.array(v.union(humanSeatViewValidator, automatedSeatViewValidator, v.null())),
  createdAt: v.number(),
});

async function generateUniqueCode(ctx: MutationCtx): Promise<string> {
  for (let attempt = 0; attempt < 20; attempt += 1) {
    let code = "";
    for (let i = 0; i < CODE_LENGTH; i += 1) {
      code += CODE_ALPHABET[Math.floor(Math.random() * CODE_ALPHABET.length)];
    }

    const existing = await ctx.db
      .query("rooms")
      .withIndex("by_code", (q) => q.eq("code", code))
      .unique();

    if (!existing) {
      return code;
    }
  }

  throw new Error("Could not generate a unique room code");
}

async function buildRoomView(
  ctx: QueryCtx | MutationCtx,
  room: {
    _id: Id<"rooms">;
    code: string;
    hostId: Id<"users">;
    status: "lobby" | "playing" | "finished";
    gameId?: Id<"games">;
    seats: Seat[];
    createdAt: number;
  },
) {
  const seats = await Promise.all(
    room.seats.map(async (seat) => {
      if (!seat) {
        return null;
      }
      if (isAutomatedSeat(seat)) {
        return {
          kind: "automated" as const,
          id: seat.id,
          ready: seat.ready,
          displayName: seat.displayName,
        };
      }
      if (isHumanSeat(seat)) {
        const user = await ctx.db.get("users", seat.userId);
        if (!user) {
          throw new Error("Seated player not found");
        }
        return {
          kind: "human" as const,
          userId: seat.userId,
          ready: seat.ready,
          displayName: playerDisplayName(user),
        };
      }
      return null;
    }),
  );

  return {
    _id: room._id,
    code: room.code,
    hostId: room.hostId,
    status: room.status,
    gameId: room.gameId,
    seats,
    createdAt: room.createdAt,
  };
}

function assertHost(room: { hostId: Id<"users"> }, userId: Id<"users">) {
  if (room.hostId !== userId) {
    throw new Error("Only the host can manage automated players");
  }
}

function assertLobby(room: { status: string }) {
  if (room.status !== "lobby") {
    throw new Error("Room is no longer in the lobby");
  }
}

export const createRoom = mutation({
  args: {},
  returns: v.id("rooms"),
  handler: async (ctx) => {
    const user = await getCurrentUser(ctx);
    const code = await generateUniqueCode(ctx);
    const seats = emptySeats();
    seats[0] = { kind: "human", userId: user._id, ready: false };

    return await ctx.db.insert("rooms", {
      code,
      hostId: user._id,
      status: "lobby",
      seats,
      createdAt: Date.now(),
    });
  },
});

export const getRoom = query({
  args: { roomId: v.id("rooms") },
  returns: v.union(roomViewValidator, v.null()),
  handler: async (ctx, args) => {
    const room = await ctx.db.get("rooms", args.roomId);
    if (!room) {
      return null;
    }
    return await buildRoomView(ctx, room);
  },
});

export const getRoomByCode = query({
  args: { code: v.string() },
  returns: v.union(roomViewValidator, v.null()),
  handler: async (ctx, args) => {
    const normalized = args.code.trim().toUpperCase();
    const room = await ctx.db
      .query("rooms")
      .withIndex("by_code", (q) => q.eq("code", normalized))
      .unique();

    if (!room) {
      return null;
    }

    return await buildRoomView(ctx, room);
  },
});

export const joinSeat = mutation({
  args: {
    code: v.string(),
    seatIndex: v.number(),
  },
  returns: v.id("rooms"),
  handler: async (ctx, args) => {
    const user = await getCurrentUser(ctx);
    const normalized = args.code.trim().toUpperCase();
    const room = await ctx.db
      .query("rooms")
      .withIndex("by_code", (q) => q.eq("code", normalized))
      .unique();

    if (!room) {
      throw new Error("Room not found");
    }
    assertLobby(room);

    const existingSeat = findPlayerSeat(room.seats, user._id);
    if (existingSeat !== null) {
      throw new Error("You are already seated in this room");
    }

    if (!Number.isInteger(args.seatIndex)) {
      throw new Error("Invalid seat");
    }
    if (!isSeatOpen(room.seats, args.seatIndex)) {
      throw new Error("Seat is not available");
    }

    const seats = [...room.seats];
    seats[args.seatIndex] = { kind: "human", userId: user._id, ready: false };
    await ctx.db.patch("rooms", room._id, { seats });

    return room._id;
  },
});

export const setReady = mutation({
  args: {
    roomId: v.id("rooms"),
    ready: v.boolean(),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const user = await getCurrentUser(ctx);
    const room = await ctx.db.get("rooms", args.roomId);
    if (!room) {
      throw new Error("Room not found");
    }
    assertLobby(room);

    const seatIndex = findPlayerSeat(room.seats, user._id);
    if (seatIndex === null) {
      throw new Error("You are not seated in this room");
    }

    const seats = [...room.seats];
    const seat = seats[seatIndex];
    if (!seat || !isHumanSeat(seat)) {
      throw new Error("You are not seated in this room");
    }
    seats[seatIndex] = { ...seat, ready: args.ready };
    await ctx.db.patch("rooms", room._id, { seats });

    return null;
  },
});

export const addAutomatedPlayer = mutation({
  args: {
    roomId: v.id("rooms"),
    seatIndex: v.number(),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const user = await getCurrentUser(ctx);
    const room = await ctx.db.get("rooms", args.roomId);
    if (!room) {
      throw new Error("Room not found");
    }
    assertLobby(room);
    assertHost(room, user._id);

    if (!Number.isInteger(args.seatIndex)) {
      throw new Error("Invalid seat");
    }
    if (!isSeatOpen(room.seats, args.seatIndex)) {
      throw new Error("Seat is not available");
    }

    const profile = createAutomatedSeatProfile(automatedDisplayNamesInUse(room.seats));
    const seats = [...room.seats];
    seats[args.seatIndex] = {
      kind: "automated",
      id: profile.id,
      displayName: profile.displayName,
      ready: true,
    };
    await ctx.db.patch("rooms", room._id, { seats });

    return null;
  },
});

export const removeAutomatedPlayer = mutation({
  args: {
    roomId: v.id("rooms"),
    seatIndex: v.number(),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const user = await getCurrentUser(ctx);
    const room = await ctx.db.get("rooms", args.roomId);
    if (!room) {
      throw new Error("Room not found");
    }
    assertLobby(room);
    assertHost(room, user._id);

    if (!Number.isInteger(args.seatIndex)) {
      throw new Error("Invalid seat");
    }
    if (!isAutomatedSeatAt(room.seats, args.seatIndex)) {
      throw new Error("Seat does not have an automated player");
    }

    const seats = [...room.seats];
    seats[args.seatIndex] = null;
    await ctx.db.patch("rooms", room._id, { seats });

    return null;
  },
});

export const startGame = mutation({
  args: { roomId: v.id("rooms") },
  returns: v.null(),
  handler: async (ctx, args) => {
    const user = await getCurrentUser(ctx);
    const room = await ctx.db.get("rooms", args.roomId);
    if (!room) {
      throw new Error("Room not found");
    }
    if (room.hostId !== user._id) {
      throw new Error("Only the host can start the game");
    }
    if (room.status !== "lobby") {
      throw new Error("Game has already started");
    }

    if (countSeated(room.seats) < 2) {
      throw new Error("At least two players must be seated");
    }
    if (!canStartGame(room.seats)) {
      throw new Error("Not all seated players are ready");
    }

    const players = seatedPlayersFromRoom(room);
    const automatedPlayers = automatedPlayersFromRoom(room);
    const state = startRound(createGame({ players }));
    const now = Date.now();
    const gameId = await ctx.db.insert("games", {
      gameMode: "multiplayer",
      roomId: room._id,
      automatedPlayers,
      state,
      createdAt: now,
      updatedAt: now,
    });

    await ctx.db.patch("rooms", room._id, {
      status: "playing",
      gameId,
    });

    await insertGameParticipants(ctx, {
      gameId,
      roomId: room._id,
      roomCode: room.code,
      userIds: humanUserIdsFromRoom(room),
      now,
    });

    await scheduleAutomatedTurnIfNeeded(ctx, gameId, state);

    return null;
  },
});

export const substituteAutomatedPlayer = mutation({
  args: {
    roomId: v.id("rooms"),
    seatIndex: v.number(),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const user = await getCurrentUser(ctx);
    const room = await ctx.db.get("rooms", args.roomId);
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

    await substituteHumanWithAutomated(ctx, {
      room,
      game,
      seatIndex: args.seatIndex,
      hostUserId: user._id,
    });

    return null;
  },
});
