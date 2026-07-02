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

export function meldOverlapPx(
  cardWidth: number,
  kind: "set" | "run",
  compact: boolean,
): number {
  if (!compact) {
    return Math.round(cardWidth * 0.45);
  }
  // Runs need more of each card visible; sets can overlap tighter.
  return kind === "run" ? Math.round(cardWidth * 0.38) : Math.round(cardWidth * 0.55);
}
