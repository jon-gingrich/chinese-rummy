"use client";

import { useSyncExternalStore } from "react";
import type { CardSize } from "../lib/cardDisplay";
import {
  TABLE_CARD_SIZE,
  TABLE_CARD_SIZE_COMPACT,
  TABLE_MELD_CARD_SIZE,
  TABLE_MELD_CARD_SIZE_COMPACT,
} from "../lib/feltLayout";

/**
 * Covers laptop and iPad landscape widths where the felt still needs denser
 * melds. Full-size melds only kick in on large desktop monitors.
 */
const COMPACT_MELD_QUERY = "(max-width: 1599px)";

/** Slightly tighter threshold for hand / stock / staging cards. */
const COMPACT_HAND_QUERY = "(max-width: 1279px)";

function subscribeToQuery(query: string, onStoreChange: () => void) {
  const media = window.matchMedia(query);
  media.addEventListener("change", onStoreChange);
  return () => media.removeEventListener("change", onStoreChange);
}

function useMediaQuery(query: string, serverSnapshot = false) {
  return useSyncExternalStore(
    (onStoreChange) => subscribeToQuery(query, onStoreChange),
    () => window.matchMedia(query).matches,
    () => serverSnapshot,
  );
}

/** True on laptop/iPad widths where the felt uses a denser layout. */
export function useCompactTableLayout() {
  return useMediaQuery(COMPACT_HAND_QUERY);
}

/**
 * Card size for hand, staging, and center piles. Compact viewports use a
 * smaller size so the rail fits without crowding the felt.
 */
export function useTableCardSize(): CardSize {
  const compact = useMediaQuery(COMPACT_HAND_QUERY);
  return compact ? TABLE_CARD_SIZE_COMPACT : TABLE_CARD_SIZE;
}

/**
 * Card size for table melds. On laptop/iPad widths, melds are half of the
 * normal table card size so more of the board stays in view.
 */
export function useTableMeldCardSize(): CardSize {
  const compact = useMediaQuery(COMPACT_MELD_QUERY);
  return compact ? TABLE_MELD_CARD_SIZE_COMPACT : TABLE_MELD_CARD_SIZE;
}
