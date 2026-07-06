import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";
import { authTables } from "@convex-dev/auth/server";
import { playerPreferencesFields } from "./lib/playerPreferences";
import { gameStateValidator } from "./lib/rules/validators";

export default defineSchema({
  ...authTables,
  users: defineTable({
    name: v.optional(v.string()),
    image: v.optional(v.string()),
    email: v.optional(v.string()),
    emailVerificationTime: v.optional(v.number()),
    phone: v.optional(v.string()),
    phoneVerificationTime: v.optional(v.number()),
    isAnonymous: v.optional(v.boolean()),
    displayName: v.optional(v.string()),
    preferences: v.optional(v.object(playerPreferencesFields)),
  }).index("email", ["email"]),
  rooms: defineTable({
    code: v.string(),
    hostId: v.id("users"),
    status: v.union(
      v.literal("lobby"),
      v.literal("playing"),
      v.literal("finished"),
    ),
    gameId: v.optional(v.id("games")),
    seats: v.array(
      v.union(
        v.object({
          kind: v.optional(v.literal("human")),
          userId: v.id("users"),
          ready: v.boolean(),
        }),
        v.object({
          kind: v.literal("automated"),
          id: v.string(),
          displayName: v.string(),
          ready: v.boolean(),
        }),
        v.null(),
      ),
    ),
    createdAt: v.number(),
  })
    .index("by_code", ["code"])
    .index("by_host", ["hostId"]),
  games: defineTable({
    gameMode: v.optional(
      v.union(v.literal("practice"), v.literal("multiplayer")),
    ),
    roomId: v.optional(v.id("rooms")),
    automatedPlayers: v.optional(
      v.array(
        v.object({
          id: v.string(),
          displayName: v.string(),
        }),
      ),
    ),
    state: gameStateValidator,
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_room", ["roomId"]),
  gameParticipants: defineTable({
    userId: v.id("users"),
    gameId: v.id("games"),
    gameMode: v.optional(
      v.union(v.literal("practice"), v.literal("multiplayer")),
    ),
    roomId: v.optional(v.id("rooms")),
    roomCode: v.optional(v.string()),
    label: v.optional(v.string()),
    status: v.union(v.literal("playing"), v.literal("finished")),
    updatedAt: v.number(),
  })
    .index("by_user", ["userId"])
    .index("by_game", ["gameId"]),
});
