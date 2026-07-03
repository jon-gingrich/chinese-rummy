import type { Doc } from "../_generated/dataModel";
import type { MutationCtx } from "../_generated/server";

export async function uniqueUserWithVerifiedEmail(
  ctx: MutationCtx,
  email: string,
): Promise<Doc<"users"> | null> {
  const users = await ctx.db
    .query("users")
    .withIndex("email", (q) => q.eq("email", email))
    // eslint-disable-next-line @convex-dev/no-filter-in-query -- verified-email check on email index
    .filter((q) => q.neq(q.field("emailVerificationTime"), undefined))
    .take(2);
  return users.length === 1 ? users[0] : null;
}
