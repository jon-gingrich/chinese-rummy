import { describe, expect, it } from "vitest";
import { formatContract } from "../../../convex/lib/rules/contracts";
import {
  findValidWildRanksForOpeningMeld,
  hasAdjacentWilds,
  isWildInMeld,
  makeCard,
  orderRunCards,
  validateOpeningMeld,
  validateOpeningMelds,
} from "../../../convex/lib/rules/melds";

describe("wild adjacency", () => {
  it("flags adjacent jokers in a set", () => {
    const jokerA = makeCard("joker", "JOKER", 0);
    const jokerB = makeCard("joker", "JOKER", 1);
    const seven = makeCard("hearts", "7");

    expect(
      hasAdjacentWilds(
        [jokerA, jokerB, seven],
        [
          { cardId: jokerA.id, asRank: "7" },
          { cardId: jokerB.id, asRank: "7" },
        ],
      ),
    ).toBe(true);
  });

  it("flags joker next to a wild two", () => {
    const joker = makeCard("joker", "JOKER", 0);
    const wildTwo = makeCard("hearts", "2");
    const seven = makeCard("spades", "7");

    expect(
      isWildInMeld(wildTwo, [{ cardId: wildTwo.id, asRank: "7" }]),
    ).toBe(true);
    expect(
      hasAdjacentWilds(
        [joker, wildTwo, seven],
        [
          { cardId: joker.id, asRank: "7" },
          { cardId: wildTwo.id, asRank: "7" },
        ],
      ),
    ).toBe(true);
  });

  it("allows natural twos with no wild declaration", () => {
    const two = makeCard("hearts", "2");
    const three = makeCard("hearts", "3");
    const four = makeCard("hearts", "4");

    expect(isWildInMeld(two, [])).toBe(false);
    expect(validateOpeningMeld({ kind: "run", cards: [two, three, four], wildDeclarations: [] })).toBeNull();
  });
});

describe("set validation", () => {
  it("accepts a valid set with duplicate suits", () => {
    const result = validateOpeningMeld({
      kind: "set",
      cards: [
        makeCard("hearts", "9"),
        makeCard("spades", "9"),
        makeCard("clubs", "9"),
      ],
      wildDeclarations: [],
    });
    expect(result).toBeNull();
  });

  it("rejects a set with mixed ranks", () => {
    const result = validateOpeningMeld({
      kind: "set",
      cards: [
        makeCard("hearts", "9"),
        makeCard("spades", "8"),
        makeCard("clubs", "9"),
      ],
      wildDeclarations: [],
    });
    expect(result).toBe("Set cards must share the same rank");
  });

  it("rejects undeclared jokers", () => {
    const joker = makeCard("joker", "JOKER", 0);
    const result = validateOpeningMeld({
      kind: "set",
      cards: [makeCard("hearts", "9"), makeCard("spades", "9"), joker],
      wildDeclarations: [],
    });
    expect(result).toBe("Wild card must declare a rank");
  });
});

describe("run validation", () => {
  it("accepts ace-low runs", () => {
    const result = validateOpeningMeld({
      kind: "run",
      cards: [
        makeCard("hearts", "A"),
        makeCard("hearts", "2"),
        makeCard("hearts", "3"),
      ],
      wildDeclarations: [],
    });
    expect(result).toBeNull();
  });

  it("accepts ace-high runs", () => {
    const result = validateOpeningMeld({
      kind: "run",
      cards: [
        makeCard("hearts", "Q"),
        makeCard("hearts", "K"),
        makeCard("hearts", "A"),
      ],
      wildDeclarations: [],
    });
    expect(result).toBeNull();
  });

  it("rejects K-A-2 wraparound", () => {
    const result = validateOpeningMeld({
      kind: "run",
      cards: [
        makeCard("hearts", "K"),
        makeCard("hearts", "A"),
        makeCard("hearts", "2"),
      ],
      wildDeclarations: [],
    });
    expect(result).toBe("Run cards must be consecutive");
  });

  it("accepts a run with a two played as a wild bridge card", () => {
    const eight = makeCard("diamonds", "8");
    const two = makeCard("hearts", "2");
    const ten = makeCard("diamonds", "10");

    expect(
      validateOpeningMeld({
        kind: "run",
        cards: [eight, two, ten],
        wildDeclarations: [],
      }),
    ).toBe("Run cards must share the same suit");

    expect(
      validateOpeningMeld({
        kind: "run",
        cards: [eight, two, ten],
        wildDeclarations: [{ cardId: two.id, asRank: "9" }],
      }),
    ).toBeNull();
  });
});

describe("opening wild rank suggestions", () => {
  it("finds the only valid wild rank for a bridging two in a run", () => {
    const eight = makeCard("diamonds", "8");
    const two = makeCard("hearts", "2");
    const ten = makeCard("diamonds", "10");

    expect(
      findValidWildRanksForOpeningMeld("run", [eight, two, ten], two, []),
    ).toEqual(["9"]);
  });

  it("orders run cards by effective rank, not hand order", () => {
    const eight = makeCard("diamonds", "8");
    const two = makeCard("hearts", "2");
    const ten = makeCard("diamonds", "10");

    expect(
      orderRunCards([ten, eight, two], [{ cardId: two.id, asRank: "9" }]).map((card) => card.id),
    ).toEqual([eight.id, two.id, ten.id]);
  });
});

describe("opening contract coverage", () => {
  it.each([1, 2, 3, 4, 5, 6, 7, 8, 9, 10] as const)(
    "round %i accepts melds matching its contract",
    (round) => {
      const requirements = formatContract(round).split(", ");
      const melds = requirements.map((label) => {
        const [kind, sizeString] = label.split(" of ");
        const size = Number(sizeString);
        if (kind === "set") {
          return {
            kind: "set" as const,
            cards: Array.from({ length: size }, (_, index) =>
              makeCard(index % 2 === 0 ? "hearts" : "spades", "7"),
            ),
            wildDeclarations: [],
          };
        }
        return {
          kind: "run" as const,
          cards: Array.from({ length: size }, (_, index) =>
            makeCard("clubs", String(3 + index) as "3"),
          ),
          wildDeclarations: [],
        };
      });

      expect(validateOpeningMelds(melds, round)).toBeNull();
    },
  );

  it("rejects partial contracts", () => {
    const result = validateOpeningMelds(
      [
        {
          kind: "set",
          cards: [
            makeCard("hearts", "7"),
            makeCard("spades", "7"),
            makeCard("clubs", "7"),
          ],
          wildDeclarations: [],
        },
      ],
      1,
    );
    expect(result).toBe("Opening melds do not match the round contract");
  });
});
