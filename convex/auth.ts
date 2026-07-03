import Google from "@auth/core/providers/google";
import Resend from "@auth/core/providers/resend";
import { Anonymous } from "@convex-dev/auth/providers/Anonymous";
import { convexAuth } from "@convex-dev/auth/server";
import type { MutationCtx } from "./_generated/server";
import { createOrUpdateUser as linkCreateOrUpdateUser } from "./lib/createOrUpdateUser";
import Microsoft from "./lib/microsoftProvider";
import Yahoo from "./lib/yahooProvider";

export const { auth, signIn, signOut, store, isAuthenticated } = convexAuth({
  providers: [
    Anonymous,
    Google,
    Microsoft(),
    Yahoo({}),
    Resend({
      apiKey: process.env.AUTH_RESEND_KEY,
      from: process.env.AUTH_EMAIL_FROM ?? "Chinese Rummy <onboarding@resend.dev>",
    }),
  ],
  callbacks: {
    async createOrUpdateUser(ctx, args) {
      return linkCreateOrUpdateUser(ctx as unknown as MutationCtx, args);
    },
  },
});
