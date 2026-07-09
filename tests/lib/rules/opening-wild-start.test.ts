import { describe, expect, it } from "vitest";
import {
  findValidWildRanksForOpeningMeld,
  makeCard,
  validateOpeningMeld,
} from "../../../convex/lib/rules/melds";

describe("opening run starting with a wild", () => {
  it("allows a joker declared as 2 to start a run of 2-3-4", () => {
    const joker = makeCard("joker", "JOKER", 0);
    const three = makeCard("hearts", "3");
    const four = makeCard("hearts", "4");

    expect(
      findValidWildRanksForOpeningMeld("run", [joker, three, four], joker, []),
    ).toEqual(["2", "5"]);

    expect(
      validateOpeningMeld({
        kind: "run",
        cards: [joker, three, four],
        wildDeclarations: [{ cardId: joker.id, asRank: "2" }],
      }),
    ).toBeNull();
  });
});
