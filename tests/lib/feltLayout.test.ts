import { describe, expect, it } from "vitest";
import { groupLayoutsBySlot } from "../../src/components/table/FeltSeatStack";
import { meldOverlapPx, meldSpreadWidthPx } from "../../src/lib/feltLayout";

describe("feltLayout", () => {
  it("fans out longer runs with less overlap", () => {
    const shortRun = meldOverlapPx(94, "run", true, 3);
    const longRun = meldOverlapPx(94, "run", true, 8);

    expect(longRun).toBeLessThan(shortRun);
  });

  it("gives long runs a wider spread than the old fixed overlap", () => {
    const cardWidth = 94;
    const cardCount = 8;
    const spread = meldSpreadWidthPx(cardWidth, cardCount, "run", true);
    const legacyOverlap = Math.round(cardWidth * 0.38);
    const legacySpread = cardWidth + (cardCount - 1) * (cardWidth - legacyOverlap);

    expect(spread).toBeGreaterThan(legacySpread);
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
