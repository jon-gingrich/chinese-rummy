/// <reference types="vitest/importMeta" />

import { convexTest, type TestConvex } from "convex-test";
import type { GenericSchema, SchemaDefinition } from "convex/server";
import schema from "../../convex/schema";

const modules = import.meta.glob("../../convex/**/*.ts");

export function createTestContext(): TestConvex<SchemaDefinition<GenericSchema, boolean>> {
  return convexTest(schema, modules);
}

export async function withSeededPlayer(
  t: TestConvex<SchemaDefinition<GenericSchema, boolean>>,
  profile: { name: string; email: string },
) {
  const userId = await t.run(async (ctx) => {
    return await ctx.db.insert("users", {
      name: profile.name,
      email: profile.email,
    });
  });

  return t.withIdentity({
    subject: `${userId}|test-session`,
    email: profile.email,
    name: profile.name,
  });
}

export async function withAnonymousPlayer(
  t: TestConvex<SchemaDefinition<GenericSchema, boolean>>,
  profile: { displayName: string },
) {
  const userId = await t.run(async (ctx) => {
    return await ctx.db.insert("users", {
      isAnonymous: true,
      displayName: profile.displayName,
    });
  });

  return t.withIdentity({
    subject: `${userId}|test-session`,
  });
}
