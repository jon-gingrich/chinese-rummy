import { getAuthUserId } from "@convex-dev/auth/server";
import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { getCurrentUser, getCurrentUserOrNull, playerDisplayName } from "./lib/auth";
import { mergeGuestUserData } from "./lib/accountLinking";

const playerValidator = v.object({
  userId: v.id("users"),
  displayName: v.string(),
  email: v.optional(v.string()),
  isGuest: v.boolean(),
});

export const viewer = query({
  args: {},
  returns: v.union(playerValidator, v.null()),
  handler: async (ctx) => {
    const user = await getCurrentUserOrNull(ctx);
    if (!user) {
      return null;
    }
    return {
      userId: user._id,
      displayName: playerDisplayName(user),
      email: user.email,
      isGuest: user.isAnonymous === true,
    };
  },
});

export const mergeGuestAccount = mutation({
  args: {
    guestUserId: v.id("users"),
  },
  returns: playerValidator,
  handler: async (ctx, args) => {
    const user = await getCurrentUser(ctx);
    await mergeGuestUserData(ctx, {
      guestUserId: args.guestUserId,
      targetUserId: user._id,
    });

    const updated = await ctx.db.get("users", user._id);
    if (!updated) {
      throw new Error("User not found");
    }

    return {
      userId: updated._id,
      displayName: playerDisplayName(updated),
      email: updated.email,
      isGuest: updated.isAnonymous === true,
    };
  },
});

export const updateDisplayName = mutation({
  args: {
    displayName: v.string(),
  },
  returns: playerValidator,
  handler: async (ctx, args) => {
    const trimmed = args.displayName.trim();
    if (trimmed.length < 2) {
      throw new Error("Display name must be at least 2 characters");
    }
    if (trimmed.length > 40) {
      throw new Error("Display name must be at most 40 characters");
    }

    const user = await getCurrentUser(ctx);
    await ctx.db.patch("users", user._id, { displayName: trimmed });

    const updated = await ctx.db.get("users", user._id);
    if (!updated) {
      throw new Error("User not found");
    }

    return {
      userId: updated._id,
      displayName: playerDisplayName(updated),
      email: updated.email,
      isGuest: updated.isAnonymous === true,
    };
  },
});

export const ensureCurrentUser = mutation({
  args: {},
  returns: playerValidator,
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      throw new Error("Not authenticated");
    }

    const user = await ctx.db.get("users", userId);
    if (!user) {
      throw new Error("User not found");
    }

    return {
      userId: user._id,
      displayName: playerDisplayName(user),
      email: user.email,
      isGuest: user.isAnonymous === true,
    };
  },
});
