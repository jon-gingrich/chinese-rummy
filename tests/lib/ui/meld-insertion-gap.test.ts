import { describe, expect, it } from "vitest";
import {
  GAP_EDGE_PAD_PX,
  gapLeftPx,
  spreadWidthWithGaps,
} from "../../../src/components/cards/MeldInsertionGap";

describe("meld insertion gap layout", () => {
  const cardWidth = 56;
  const overlap = 20;

  it("places the start gap before the first card, not centered on it", () => {
    expect(gapLeftPx(0, cardWidth, overlap, GAP_EDGE_PAD_PX)).toBe(0);
    // Old formula centered on the first card — must stay larger than the start gap.
    const centeredOnFirst = (cardWidth - 28) / 2;
    expect(gapLeftPx(0, cardWidth, overlap, GAP_EDGE_PAD_PX)).toBeLessThan(centeredOnFirst);
  });

  it("pads the spread so start and end gaps fit outside the cards", () => {
    const cardCount = 3;
    const width = spreadWidthWithGaps(cardCount, cardWidth, overlap);
    const cardsOnly = cardWidth + (cardCount - 1) * (cardWidth - overlap);
    expect(width).toBe(cardsOnly + 28);
  });
});
