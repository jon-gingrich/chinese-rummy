import { v } from "convex/values";

export const displayScaleValidator = v.union(
  v.literal("small"),
  v.literal("medium"),
  v.literal("large"),
);

export type DisplayScale = "small" | "medium" | "large";

export const playerPreferencesFields = {
  confirmBeforeDiscard: v.optional(v.boolean()),
  confirmBeforeOpening: v.optional(v.boolean()),
  cardScale: v.optional(displayScaleValidator),
  uiScale: v.optional(displayScaleValidator),
  hasSeenHowToPlay: v.optional(v.boolean()),
};

export const playerPreferencesValidator = v.object({
  confirmBeforeDiscard: v.boolean(),
  confirmBeforeOpening: v.boolean(),
  cardScale: displayScaleValidator,
  uiScale: displayScaleValidator,
  hasSeenHowToPlay: v.boolean(),
});

export type PlayerPreferences = {
  confirmBeforeDiscard: boolean;
  confirmBeforeOpening: boolean;
  cardScale: DisplayScale;
  uiScale: DisplayScale;
  hasSeenHowToPlay: boolean;
};

export const DEFAULT_PLAYER_PREFERENCES: PlayerPreferences = {
  confirmBeforeDiscard: true,
  confirmBeforeOpening: true,
  cardScale: "medium",
  uiScale: "medium",
  hasSeenHowToPlay: false,
};

export function resolvePlayerPreferences(
  stored: Partial<PlayerPreferences> | undefined | null,
): PlayerPreferences {
  return {
    confirmBeforeDiscard:
      stored?.confirmBeforeDiscard ?? DEFAULT_PLAYER_PREFERENCES.confirmBeforeDiscard,
    confirmBeforeOpening:
      stored?.confirmBeforeOpening ?? DEFAULT_PLAYER_PREFERENCES.confirmBeforeOpening,
    cardScale: stored?.cardScale ?? DEFAULT_PLAYER_PREFERENCES.cardScale,
    uiScale: stored?.uiScale ?? DEFAULT_PLAYER_PREFERENCES.uiScale,
    hasSeenHowToPlay: stored?.hasSeenHowToPlay ?? DEFAULT_PLAYER_PREFERENCES.hasSeenHowToPlay,
  };
}

export function mergePlayerPreferences(
  current: Partial<PlayerPreferences> | undefined | null,
  patch: Partial<PlayerPreferences>,
): PlayerPreferences {
  return resolvePlayerPreferences({
    ...resolvePlayerPreferences(current),
    ...patch,
  });
}
