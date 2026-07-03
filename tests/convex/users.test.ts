import { describe, expect, it } from "vitest";
import { api } from "../../convex/_generated/api";
import { createTestContext, withSeededPlayer } from "./helpers";

describe("users.updateDisplayName", () => {
  it("rejects display names shorter than two characters", async () => {
    const t = createTestContext();
    const asUser = await withSeededPlayer(t, {
      name: "Pat",
      email: "pat@example.com",
    });

    await expect(
      asUser.mutation(api.users.updateDisplayName, { displayName: " P " }),
    ).rejects.toThrow("Display name must be at least 2 characters");
  });

  it("persists a trimmed display name for the signed-in player", async () => {
    const t = createTestContext();
    const asUser = await withSeededPlayer(t, {
      name: "Pat",
      email: "pat@example.com",
    });

    const updated = await asUser.mutation(api.users.updateDisplayName, {
      displayName: "  Table Pat  ",
    });

    expect(updated.displayName).toBe("Table Pat");

    const viewer = await asUser.query(api.users.viewer, {});
    expect(viewer).toMatchObject({
      displayName: "Table Pat",
      email: "pat@example.com",
      isGuest: false,
    });
  });

  it("returns null for viewer when unauthenticated", async () => {
    const t = createTestContext();

    const viewer = await t.query(api.users.viewer, {});
    expect(viewer).toBeNull();
  });
});

describe("users.updatePreferences", () => {
  it("merges partial preference updates for the signed-in player", async () => {
    const t = createTestContext();
    const asUser = await withSeededPlayer(t, {
      name: "Pat",
      email: "pat@example.com",
    });

    const updated = await asUser.mutation(api.users.updatePreferences, {
      preferences: {
        confirmBeforeDiscard: false,
        cardScale: "large",
      },
    });

    expect(updated.preferences).toMatchObject({
      confirmBeforeDiscard: false,
      confirmBeforeOpening: true,
      cardScale: "large",
      uiScale: "medium",
    });

    const viewer = await asUser.query(api.users.viewer, {});
    expect(viewer?.preferences.confirmBeforeDiscard).toBe(false);
    expect(viewer?.preferences.cardScale).toBe("large");
  });

  it("persists hasSeenHowToPlay across viewer reads", async () => {
    const t = createTestContext();
    const asUser = await withSeededPlayer(t, {
      name: "Pat",
      email: "pat@example.com",
    });

    await asUser.mutation(api.users.updatePreferences, {
      preferences: { hasSeenHowToPlay: true },
    });

    const viewer = await asUser.query(api.users.viewer, {});
    expect(viewer?.preferences.hasSeenHowToPlay).toBe(true);
  });
});
