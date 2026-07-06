import type { SeatSlot } from "../lib/cardDisplay";

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
  bottom: "items-center",
  left: "items-start",
  right: "items-end",
  "top-left": "items-start",
  "top-right": "items-end",
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
  if (!compact) {
    return Math.round(cardWidth * 0.45);
  }
  if (kind === "set") {
    return Math.round(cardWidth * 0.5);
  }
  // Fan out longer runs so ranks stay readable on the felt.
  const extraCards = Math.max(0, cardCount - 3);
  const ratio = Math.max(0.2, 0.34 - extraCards * 0.025);
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
