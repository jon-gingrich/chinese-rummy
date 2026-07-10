import type { CardSize, SeatSlot } from "./cardDisplay";

/** Card size used for hand, staging, and center piles on the game table. */
export const TABLE_CARD_SIZE = "md" as const satisfies CardSize;

/** ~25% smaller than {@link TABLE_CARD_SIZE}; used on compact viewports. */
export const TABLE_CARD_SIZE_COMPACT = "sm" as const satisfies CardSize;

/** Card size used for table melds on large viewports. */
export const TABLE_MELD_CARD_SIZE = "md" as const satisfies CardSize;

/** ~50% of compact hand size; used for melds on laptop/iPad viewports. */
export const TABLE_MELD_CARD_SIZE_COMPACT = "xxs" as const satisfies CardSize;

/** Maps seat slot → CSS grid area on the felt. */
export const FELT_GRID_AREA: Record<SeatSlot, string> = {
  top: "felt-top",
  bottom: "felt-bottom",
  left: "felt-left",
  right: "felt-right",
  "top-left": "felt-top-left",
  "top-right": "felt-top-right",
};

/** Alignment for stacked player boards inside a felt grid cell. */
export const FELT_SEAT_STACK_ALIGN: Record<SeatSlot, string> = {
  top: "items-center",
  /** Pin the viewer's board to the bottom of the band so leftover height sits above. */
  bottom: "items-center justify-end",
  left: "items-start",
  right: "items-end",
  "top-left": "items-start",
  "top-right": "items-end",
};

/** Extra inset so side/corner boards keep clear of the center and each other. */
export const FELT_SEAT_INSET: Record<SeatSlot, string> = {
  top: "px-2",
  /** Small gap above the wood rail — leftover band height stays above the melds. */
  bottom: "px-2 pb-1",
  left: "pr-3 md:pr-5",
  right: "pl-3 md:pl-5",
  "top-left": "pr-3 md:pr-5",
  "top-right": "pl-3 md:pl-5",
};

/**
 * Lower rows sit above upper rows when content would otherwise spill across grid bands,
 * so drag targets on nearer opponents stay reachable.
 */
export const FELT_SEAT_Z_INDEX: Record<SeatSlot, number> = {
  top: 10,
  "top-left": 10,
  "top-right": 10,
  left: 20,
  right: 20,
  bottom: 30,
};

export function meldOverlapPx(
  cardWidth: number,
  kind: "set" | "run",
  compact: boolean,
  cardCount = 1,
): number {
  // Match staging-pile density (~68% cover); keep a little more peek on long runs.
  if (!compact) {
    return Math.round(cardWidth * 0.62);
  }
  if (kind === "set") {
    return Math.round(cardWidth * 0.68);
  }
  const extraCards = Math.max(0, cardCount - 3);
  const ratio = Math.max(0.55, 0.68 - extraCards * 0.02);
  return Math.round(cardWidth * ratio);
}

export function meldSpreadWidthPx(
  cardWidth: number,
  cardCount: number,
  kind: "set" | "run",
  compact: boolean,
): number {
  if (cardCount <= 0) {
    return cardWidth;
  }
  const overlap = meldOverlapPx(cardWidth, kind, compact, cardCount);
  return cardWidth + (cardCount - 1) * (cardWidth - overlap);
}
