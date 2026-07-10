import { describe, expect, it } from "vitest";
import { groupLayoutsBySlot } from "../../src/components/table/FeltSeatStack";
import { meldOverlapPx, meldSpreadWidthPx } from "../../src/lib/feltLayout";

describe("feltLayout", () => {
  it("keeps dense staging-like overlap on short runs", () => {
    const shortRun = meldOverlapPx(94, "run", true, 3);

    expect(shortRun).toBeGreaterThanOrEqual(Math.round(94 * 0.65));
  });

  it("eases overlap slightly on longer runs so ranks stay peekable", () => {
    const shortRun = meldOverlapPx(94, "run", true, 3);
    const longRun = meldOverlapPx(94, "run", true, 8);

    expect(longRun).toBeLessThan(shortRun);
    expect(longRun).toBeGreaterThanOrEqual(Math.round(94 * 0.55));
  });

  it("packs melds tighter than the previous loose spread", () => {
    const cardWidth = 94;
    const cardCount = 8;
    const spread = meldSpreadWidthPx(cardWidth, cardCount, "run", true);
    const legacyOverlap = Math.round(cardWidth * 0.38);
    const legacySpread = cardWidth + (cardCount - 1) * (cardWidth - legacyOverlap);

    expect(spread).toBeLessThan(legacySpread);
  });
});

describe("groupLayoutsBySlot", () => {
  it("groups multiple players that share a seat slot", () => {
    const grouped = groupLayoutsBySlot([
      { slot: "right" as const, playerId: "a" },
      { slot: "right" as const, playerId: "b" },
      { slot: "left" as const, playerId: "c" },
    ]);

    expect(grouped.get("right")?.map((entry) => entry.playerId)).toEqual(["a", "b"]);
    expect(grouped.get("left")?.map((entry) => entry.playerId)).toEqual(["c"]);
  });
});
