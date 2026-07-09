import { describe, expect, it } from "vitest";
import {
  findValidWildRanksForOpeningMeld,
  makeCard,
  validateOpeningMeld,
} from "../../../convex/lib/rules/melds";

describe("multi-wild opening ranks", () => {
  it("suggests ranks for a wild even when its sibling wild is still undeclared", () => {
    const jokerA = makeCard("joker", "JOKER", 0);
    const jokerB = makeCard("joker", "JOKER", 1);
    const seven = makeCard("clubs", "7");
    const eight = makeCard("clubs", "8");
    const cards = [jokerA, jokerB, seven, eight];

    const ranksA = findValidWildRanksForOpeningMeld("run", cards, jokerA, []);
    // Only the ends of 6-7-8-9 work: declaring 5/10 forces the sibling into an
    // adjacent wild slot (5-6-7-8 or 7-8-9-10).
    expect(ranksA).toEqual(["6", "9"]);

    const ranksBGivenAIs6 = findValidWildRanksForOpeningMeld("run", cards, jokerB, [
      { cardId: jokerA.id, asRank: "6" },
    ]);
    expect(ranksBGivenAIs6).toEqual(["9"]);
  });

  it("rejects adjacent wild rank pairs for a run of 4", () => {
    const jokerA = makeCard("joker", "JOKER", 0);
    const jokerB = makeCard("joker", "JOKER", 1);
    const seven = makeCard("clubs", "7");
    const eight = makeCard("clubs", "8");

    expect(
      validateOpeningMeld({
        kind: "run",
        cards: [jokerA, jokerB, seven, eight],
        wildDeclarations: [
          { cardId: jokerA.id, asRank: "9" },
          { cardId: jokerB.id, asRank: "10" },
        ],
      }),
    ).toBe("Wild cards cannot be adjacent");
  });
});
