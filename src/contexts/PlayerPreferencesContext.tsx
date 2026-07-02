"use client";

import { useMutation, useQuery } from "convex/react";
import { createContext, useContext, useEffect, useMemo, type ReactNode } from "react";
import { api } from "../../convex/_generated/api";
import type { DisplayScale, PlayerPreferences } from "../lib/playerPreferences";
import { DEFAULT_PLAYER_PREFERENCES, resolvePlayerPreferences } from "../lib/playerPreferences";
import { UI_SCALE_MULTIPLIER } from "../lib/cardDisplay";

type PreferencesPatch = Partial<PlayerPreferences>;

type PlayerPreferencesContextValue = {
  preferences: PlayerPreferences;
  isLoading: boolean;
  updatePreferences: (patch: PreferencesPatch) => Promise<void>;
};

const PlayerPreferencesContext = createContext<PlayerPreferencesContextValue | null>(null);

export function PlayerPreferencesProvider({ children }: { children: ReactNode }) {
  const viewer = useQuery(api.users.viewer);
  const updatePreferencesMutation = useMutation(api.users.updatePreferences);

  const preferences = useMemo(
    () => resolvePlayerPreferences(viewer?.preferences),
    [viewer?.preferences],
  );

  useEffect(() => {
    const multiplier = UI_SCALE_MULTIPLIER[preferences.uiScale];
    document.documentElement.style.setProperty("--ui-scale", String(multiplier));
  }, [preferences.uiScale]);

  const value = useMemo<PlayerPreferencesContextValue>(
    () => ({
      preferences: viewer ? preferences : DEFAULT_PLAYER_PREFERENCES,
      isLoading: viewer === undefined,
      updatePreferences: async (patch) => {
        await updatePreferencesMutation({ preferences: patch });
      },
    }),
    [preferences, updatePreferencesMutation, viewer],
  );

  return (
    <PlayerPreferencesContext.Provider value={value}>{children}</PlayerPreferencesContext.Provider>
  );
}

export function usePlayerPreferences() {
  const context = useContext(PlayerPreferencesContext);
  if (!context) {
    throw new Error("usePlayerPreferences must be used within PlayerPreferencesProvider");
  }
  return context;
}

export function useCardScale(): DisplayScale {
  return usePlayerPreferences().preferences.cardScale;
}
