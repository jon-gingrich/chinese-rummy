import { getAuthSessionId } from "@convex-dev/auth/server";
import type { Doc, Id } from "../_generated/dataModel";
import type { MutationCtx } from "../_generated/server";
import type { GameState } from "./rules";

type CreateOrUpdateUserArgs = {
  existingUserId: Id<"users"> | null;
  type: "oauth" | "credentials" | "email" | "phone" | "verification";
  provider: { id: string; type: string; allowDangerousEmailAccountLinking?: boolean };
  profile: Record<string, unknown> & {
    email?: string;
    phone?: string;
    emailVerified?: boolean;
    phoneVerified?: boolean;
    isAnonymous?: boolean;
  };
  shouldLink?: boolean;
};

function profileUserData(args: CreateOrUpdateUserArgs) {
  const {
    profile: {
      emailVerified: profileEmailVerified,
      phoneVerified: profilePhoneVerified,
      isAnonymous: _isAnonymous,
      ...profile
    },
    provider,
    type,
  } = args;

  const emailVerified =
    profileEmailVerified ??
    ((provider.type === "oauth" || provider.type === "oidc") &&
      provider.allowDangerousEmailAccountLinking !== false);
  const phoneVerified = profilePhoneVerified ?? false;

  return {
    userData: {
      ...(emailVerified ? { emailVerificationTime: Date.now() } : null),
      ...(phoneVerified ? { phoneVerificationTime: Date.now() } : null),
      ...profile,
      isAnonymous: false,
    },
    emailVerified,
    phoneVerified,
    shouldLinkViaEmail: args.shouldLink || emailVerified || type === "email",
  };
}

async function uniqueUserWithVerifiedEmail(ctx: MutationCtx, email: string) {
  const users = await ctx.db
    .query("users")
    .withIndex("email", (q) => q.eq("email", email))
    .filter((q) => q.neq(q.field("emailVerificationTime"), undefined))
    .take(2);
  return users.length === 1 ? users[0] : null;
}

async function sessionUserId(ctx: MutationCtx): Promise<Id<"users"> | null> {
  const sessionId = await getAuthSessionId(ctx);
  if (!sessionId) {
    return null;
  }
  const session = await ctx.db.get("authSessions", sessionId);
  return session?.userId ?? null;
}

async function anonymousSessionUserId(ctx: MutationCtx): Promise<Id<"users"> | null> {
  const userId = await sessionUserId(ctx);
  if (!userId) {
    return null;
  }
  const user = await ctx.db.get("users", userId);
  if (!user?.isAnonymous) {
    return null;
  }
  return userId;
}

export async function createOrUpdateUser(
  ctx: MutationCtx,
  args: CreateOrUpdateUserArgs,
): Promise<Id<"users">> {
  if (args.type === "credentials" && args.provider.id === "anonymous") {
    return await ctx.db.insert("users", {
      isAnonymous: true,
      displayName: "Guest",
    });
  }

  const { userData, shouldLinkViaEmail } = profileUserData(args);

  const anonymousUserId = await anonymousSessionUserId(ctx);
  if (anonymousUserId !== null) {
    await ctx.db.patch("users", anonymousUserId, userData);
    return anonymousUserId;
  }

  if (args.existingUserId !== null) {
    await ctx.db.patch("users", args.existingUserId, userData);
    return args.existingUserId;
  }

  let userId: Id<"users"> | null = null;
  if (typeof args.profile.email === "string" && shouldLinkViaEmail) {
    const existing = await uniqueUserWithVerifiedEmail(ctx, args.profile.email);
    userId = existing?._id ?? null;
  }

  if (userId !== null) {
    await ctx.db.patch("users", userId, userData);
    return userId;
  }

  return await ctx.db.insert("users", userData);
}

function replaceUserIdInGameState(state: GameState, fromUserId: string, toUserId: string): GameState {
  if (fromUserId === toUserId) {
    return state;
  }

  return {
    ...state,
    players: state.players.map((player) =>
      player.id === fromUserId ? { ...player, id: toUserId } : player,
    ),
    melds: state.melds.map((meld) =>
      meld.ownerId === fromUserId
        ? {
            ...meld,
            ownerId: toUserId,
            id: meld.id.replace(fromUserId, toUserId),
          }
        : meld,
    ),
  };
}

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

  if (guest.displayName && (!target.displayName || target.displayName === "Guest")) {
    await ctx.db.patch("users", args.targetUserId, { displayName: guest.displayName });
  }

  const rooms = await ctx.db.query("rooms").collect();
  for (const room of rooms) {
    let changed = false;
    const seats = room.seats.map((seat) => {
      if (seat?.userId === args.guestUserId) {
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
        const nextState = replaceUserIdInGameState(
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
