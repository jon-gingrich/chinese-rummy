import type { Doc, Id } from "../_generated/dataModel";
import type { MutationCtx } from "../_generated/server";
import type { GameState } from "./rules";
import { isHumanSeat } from "./rooms";
import { replacePlayerIdInGameState } from "./substitution";

export async function mergeGuestUserData(
  ctx: MutationCtx,
  args: { guestUserId: Id<"users">; targetUserId: Id<"users"> },
) {
  if (args.guestUserId === args.targetUserId) {
    return;
  }

  const guest = await ctx.db.get("users", args.guestUserId);
  const target = await ctx.db.get("users", args.targetUserId);
  if (!guest?.isAnonymous) {
    throw new Error("Guest account not found");
  }
  if (!target || target.isAnonymous) {
    throw new Error("Sign in with a full account before linking");
  }

  const guestPreferencePatch: Partial<Doc<"users">> = {};
  if (guest.displayName && (!target.displayName || target.displayName === "Guest")) {
    guestPreferencePatch.displayName = guest.displayName;
  }
  if (guest.preferences && !target.preferences) {
    guestPreferencePatch.preferences = guest.preferences;
  }
  if (Object.keys(guestPreferencePatch).length > 0) {
    await ctx.db.patch("users", args.targetUserId, guestPreferencePatch);
  }

  const rooms = await ctx.db.query("rooms").collect();
  for (const room of rooms) {
    let changed = false;
    const seats = room.seats.map((seat) => {
      if (seat !== null && isHumanSeat(seat) && seat.userId === args.guestUserId) {
        changed = true;
        return { ...seat, userId: args.targetUserId };
      }
      return seat;
    });

    const patch: Partial<Doc<"rooms">> = {};
    if (changed) {
      patch.seats = seats;
    }
    if (room.hostId === args.guestUserId) {
      patch.hostId = args.targetUserId;
    }
    if (Object.keys(patch).length > 0) {
      await ctx.db.patch("rooms", room._id, patch);
    }

    if (room.gameId) {
      const game = await ctx.db.get("games", room.gameId);
      if (game) {
        const nextState = replacePlayerIdInGameState(
          game.state as GameState,
          args.guestUserId,
          args.targetUserId,
        );
        if (nextState !== game.state) {
          await ctx.db.patch("games", game._id, { state: nextState });
        }
      }
    }
  }

  const guestMemberships = await ctx.db
    .query("gameParticipants")
    .withIndex("by_user", (q) => q.eq("userId", args.guestUserId))
    .collect();

  for (const membership of guestMemberships) {
    const existing = await ctx.db
      .query("gameParticipants")
      .withIndex("by_user", (q) => q.eq("userId", args.targetUserId))
      // eslint-disable-next-line @convex-dev/no-filter-in-query -- narrow by game within user index
      .filter((q) => q.eq(q.field("gameId"), membership.gameId))
      .unique();

    if (existing) {
      await ctx.db.delete("gameParticipants", membership._id);
    } else {
      await ctx.db.patch("gameParticipants", membership._id, {
        userId: args.targetUserId,
      });
    }
  }
}
