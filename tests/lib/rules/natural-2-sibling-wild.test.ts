import { describe, expect, it } from "vitest";
import {
  findValidWildRanksForOpeningMeld,
  makeCard,
  validateOpeningMeld,
} from "../../../convex/lib/rules/melds";

describe("natural 2 with a second undeclared wild two", () => {
  it("keeps natural same-suit 2 available while a sibling 2 is still undeclared", () => {
    const twoH = makeCard("hearts", "2");
    const twoS = makeCard("spades", "2");
    const threeH = makeCard("hearts", "3");
    const fourH = makeCard("hearts", "4");
    const fiveH = makeCard("hearts", "5");
    const cards = [twoH, twoS, threeH, fourH, fiveH];

    // Sibling can still become A or 6 — natural 2H must remain offered.
    expect(findValidWildRanksForOpeningMeld("run", cards, twoH, [])).toContain("2");
    expect(findValidWildRanksForOpeningMeld("run", cards, twoS, [])).toEqual(["A", "6"]);
  });

  it("accepts natural same-suit 2 once the sibling two is declared wild", () => {
    const twoH = makeCard("hearts", "2");
    const twoS = makeCard("spades", "2");
    const threeH = makeCard("hearts", "3");
    const fourH = makeCard("hearts", "4");
    const fiveH = makeCard("hearts", "5");
    const cards = [twoH, twoS, threeH, fourH, fiveH];

    expect(
      validateOpeningMeld({
        kind: "run",
        cards,
        wildDeclarations: [{ cardId: twoS.id, asRank: "6" }],
      }),
    ).toBeNull();

    expect(
      findValidWildRanksForOpeningMeld("run", cards, twoH, [
        { cardId: twoS.id, asRank: "6" },
      ]),
    ).toContain("2");
  });

  it("still works when the second wild is a joker", () => {
    const twoH = makeCard("hearts", "2");
    const threeH = makeCard("hearts", "3");
    const fourH = makeCard("hearts", "4");
    const fiveH = makeCard("hearts", "5");
    const joker = makeCard("joker", "JOKER", 0);
    const cards = [twoH, threeH, fourH, fiveH, joker];

    expect(findValidWildRanksForOpeningMeld("run", cards, twoH, [])).toContain("2");
    // Joker may also be "2" if the printed 2 instead plays as A or 6.
    expect(findValidWildRanksForOpeningMeld("run", cards, joker, [])).toEqual(
      expect.arrayContaining(["A", "6"]),
    );
    expect(
      validateOpeningMeld({
        kind: "run",
        cards,
        wildDeclarations: [{ cardId: joker.id, asRank: "6" }],
      }),
    ).toBeNull();
  });

  it("rejects natural for a wrong-suit 2 even with an undeclared sibling", () => {
    const twoH = makeCard("hearts", "2");
    const twoS = makeCard("spades", "2");
    const threeH = makeCard("hearts", "3");
    const fourH = makeCard("hearts", "4");
    const fiveH = makeCard("hearts", "5");
    const cards = [twoH, twoS, threeH, fourH, fiveH];

    expect(findValidWildRanksForOpeningMeld("run", cards, twoS, [])).not.toContain("2");
  });
});
