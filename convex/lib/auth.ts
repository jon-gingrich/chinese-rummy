import { getAuthSessionId, getAuthUserId } from "@convex-dev/auth/server";
import type { Doc, Id } from "../_generated/dataModel";
import type { MutationCtx, QueryCtx } from "../_generated/server";
import { displayNameFromOAuthProfile } from "./displayName";

export async function getCurrentUserOrNull(
  ctx: QueryCtx | MutationCtx,
): Promise<Doc<"users"> | null> {
  const userId = await getAuthUserId(ctx);
  if (!userId) {
    return null;
  }
  return await ctx.db.get("users", userId);
}

export async function getCurrentUser(
  ctx: QueryCtx | MutationCtx,
): Promise<Doc<"users">> {
  const user = await getCurrentUserOrNull(ctx);
  if (!user) {
    throw new Error("Not authenticated");
  }
  return user;
}

export function playerDisplayName(user: Doc<"users">): string {
  if (user.displayName && user.displayName !== "Guest") {
    return user.displayName;
  }

  const fromProfile = user.name
    ? displayNameFromOAuthProfile({ name: user.name })
    : undefined;
  if (fromProfile) {
    return fromProfile;
  }

  return user.name ?? user.email ?? user.displayName ?? "Player";
}

export async function getAuthSessionUserId(
  ctx: QueryCtx | MutationCtx,
): Promise<Id<"users"> | null> {
  const sessionId = await getAuthSessionId(ctx);
  if (!sessionId) {
    return null;
  }
  const session = await ctx.db.get("authSessions", sessionId);
  return session?.userId ?? null;
}

export async function getAnonymousSessionUserId(
  ctx: QueryCtx | MutationCtx,
): Promise<Id<"users"> | null> {
  const userId = await getAuthSessionUserId(ctx);
  if (!userId) {
    return null;
  }
  const user = await ctx.db.get("users", userId);
  if (!user?.isAnonymous) {
    return null;
  }
  return userId;
}
