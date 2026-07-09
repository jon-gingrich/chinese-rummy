import { describe, expect, it } from "vitest";
import {
  isStagingHandDropId,
  meldGapDropId,
  parseMeldGapDropId,
  parseStagingPileDropId,
  STAGING_HAND_DROP_ID,
  stagingPileDropId,
} from "../../src/lib/cardDrag";

describe("meldGapDropId", () => {
  it("round-trips add gaps when meld id contains colons", () => {
    const meldId = "auto:bot-1-meld-0";
    const gap = { insertIndex: 2, mode: "add" as const };
    const id = meldGapDropId(meldId, gap);

    expect(parseMeldGapDropId(id)).toEqual({ meldId, gap });
  });

  it("round-trips replace-wild gaps when meld id contains colons", () => {
    const meldId = "auto:bot-1-meld-1";
    const gap = {
      insertIndex: 1,
      mode: "replaceWild" as const,
      replaceWildCardId: "joker-JOKER-0",
    };
    const id = meldGapDropId(meldId, gap);

    expect(parseMeldGapDropId(id)).toEqual({
      meldId,
      gap: { insertIndex: -1, mode: "replaceWild", replaceWildCardId: gap.replaceWildCardId },
    });
  });

  it("round-trips human player meld ids", () => {
    const meldId = "player-0-meld-0";
    const gap = { insertIndex: 0, mode: "add" as const };
    const id = meldGapDropId(meldId, gap);

    expect(parseMeldGapDropId(id)).toEqual({ meldId, gap });
  });
});

describe("staging drop ids", () => {
  it("round-trips staging pile indices", () => {
    expect(parseStagingPileDropId(stagingPileDropId(0))).toBe(0);
    expect(parseStagingPileDropId(stagingPileDropId(2))).toBe(2);
    expect(parseStagingPileDropId("gap:x:add:0")).toBeNull();
  });

  it("recognizes the main-hand drop zone", () => {
    expect(isStagingHandDropId(STAGING_HAND_DROP_ID)).toBe(true);
    expect(isStagingHandDropId(stagingPileDropId(0))).toBe(false);
  });
});
