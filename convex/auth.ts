import Google from "@auth/core/providers/google";
import Resend from "@auth/core/providers/resend";
import { Anonymous } from "@convex-dev/auth/providers/Anonymous";
import { convexAuth } from "@convex-dev/auth/server";
import type { GenericMutationCtx } from "convex/server";
import type { DataModel } from "./_generated/dataModel";
import { createOrUpdateUser as linkCreateOrUpdateUser } from "./lib/accountLinking";

export const { auth, signIn, signOut, store, isAuthenticated } = convexAuth({
  providers: [
    Anonymous,
    Google,
    Resend({
      apiKey: process.env.AUTH_RESEND_KEY,
      from: process.env.AUTH_EMAIL_FROM ?? "Chinese Rummy <onboarding@resend.dev>",
    }),
  ],
  callbacks: {
    async createOrUpdateUser(ctx, args) {
      return linkCreateOrUpdateUser(
        ctx as unknown as GenericMutationCtx<DataModel>,
        args,
      );
    },
  },
});
