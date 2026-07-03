import type { Id } from "../_generated/dataModel";
import type { MutationCtx } from "../_generated/server";
import { getAnonymousSessionUserId } from "./auth";
import { displayNameFromOAuthProfile } from "./displayName";
import { uniqueUserWithVerifiedEmail } from "./userByVerifiedEmail";

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
      given_name: _givenName,
      family_name: _familyName,
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

  // Convex optional fields reject explicit null; omit unset OAuth profile values.
  const sanitizedProfile = Object.fromEntries(
    Object.entries(profile).filter(([, value]) => value !== null && value !== undefined),
  );

  const oauthDisplayName =
    (provider.type === "oauth" || provider.type === "oidc") && args.type === "oauth"
      ? displayNameFromOAuthProfile(args.profile)
      : undefined;

  return {
    userData: {
      ...(emailVerified ? { emailVerificationTime: Date.now() } : null),
      ...(phoneVerified ? { phoneVerificationTime: Date.now() } : null),
      ...sanitizedProfile,
      ...(oauthDisplayName ? { displayName: oauthDisplayName } : null),
      isAnonymous: false,
    },
    emailVerified,
    phoneVerified,
    shouldLinkViaEmail: args.shouldLink || emailVerified || type === "email",
  };
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

  const anonymousUserId = await getAnonymousSessionUserId(ctx);
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
    if (existing) {
      userId = existing._id;
    }
  }

  if (userId !== null) {
    await ctx.db.patch("users", userId, userData);
    return userId;
  }

  return await ctx.db.insert("users", userData);
}
