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

  it("rejects a set when wilds must be adjacent (too many wilds)", () => {
    const jokerA = makeCard("joker", "JOKER", 0);
    const jokerB = makeCard("joker", "JOKER", 1);
    const jokerC = { ...makeCard("joker", "JOKER", 1), id: "joker-JOKER-2" };
    const three = makeCard("hearts", "3");

    expect(
      validateOpeningMeld({
        kind: "set",
        cards: [jokerA, jokerB, jokerC, three],
        wildDeclarations: [
          { cardId: jokerA.id, asRank: "3" },
          { cardId: jokerB.id, asRank: "3" },
          { cardId: jokerC.id, asRank: "3" },
        ],
      }),
    ).toBe("Wild cards cannot be adjacent");
  });
});

describe("set wild ordering", () => {
  it("accepts a set whose hand order has adjacent wilds when a legal interleaving exists", () => {
    const jokerA = makeCard("joker", "JOKER", 0);
    const jokerB = makeCard("joker", "JOKER", 1);
    const threeHearts = makeCard("hearts", "3");
    const threeSpades = makeCard("spades", "3");
    const declarations = [
      { cardId: jokerA.id, asRank: "3" as const },
      { cardId: jokerB.id, asRank: "3" as const },
    ];

    // Opening selection follows hand order, which often groups wilds together.
    // Player may have clicked wild → 3 → wild → 3; adjacency must use a legal layout.
    const handOrder = [jokerA, jokerB, threeHearts, threeSpades];
    expect(hasAdjacentWilds(handOrder, declarations)).toBe(true);

    expect(
      validateOpeningMeld({
        kind: "set",
        cards: handOrder,
        wildDeclarations: declarations,
      }),
    ).toBeNull();
  });

  it("accepts a three-card set with two wilds when hand order groups the wilds", () => {
    const jokerA = makeCard("joker", "JOKER", 0);
    const jokerB = makeCard("joker", "JOKER", 1);
    const three = makeCard("hearts", "3");
    const declarations = [
      { cardId: jokerA.id, asRank: "3" as const },
      { cardId: jokerB.id, asRank: "3" as const },
    ];

    expect(
      validateOpeningMeld({
        kind: "set",
        cards: [jokerA, jokerB, three],
        wildDeclarations: declarations,
      }),
    ).toBeNull();
  });
});

describe("run wild ordering", () => {
  it("accepts a run of 4 with two wilds when hand order groups the wilds", () => {
    const jokerA = makeCard("joker", "JOKER", 0);
    const jokerB = makeCard("joker", "JOKER", 1);
    const three = makeCard("hearts", "3");
    const five = makeCard("hearts", "5");
    const declarations = [
      { cardId: jokerA.id, asRank: "4" as const },
      { cardId: jokerB.id, asRank: "6" as const },
    ];

    // Hand order groups wilds; declared ranks place them in non-adjacent slots.
    const handOrder = [jokerA, jokerB, three, five];
    expect(hasAdjacentWilds(handOrder, declarations)).toBe(true);
    expect(
      hasAdjacentWilds(orderRunCards(handOrder, declarations), declarations),
    ).toBe(false);

    expect(
      validateOpeningMeld({
        kind: "run",
        cards: handOrder,
        wildDeclarations: declarations,
      }),
    ).toBeNull();
  });

  it("accepts a run of 4 with naturals together and wilds at both ends", () => {
    const jokerA = makeCard("joker", "JOKER", 0);
    const jokerB = makeCard("joker", "JOKER", 1);
    const seven = makeCard("clubs", "7");
    const eight = makeCard("clubs", "8");

    expect(
      validateOpeningMeld({
        kind: "run",
        cards: [jokerA, jokerB, seven, eight],
        wildDeclarations: [
          { cardId: jokerA.id, asRank: "6" },
          { cardId: jokerB.id, asRank: "9" },
        ],
      }),
    ).toBeNull();
  });

  it("rejects a run when declared ranks force wilds adjacent", () => {
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

  it("orders ace after king in ace-high runs", () => {
    const jack = makeCard("hearts", "J");
    const queen = makeCard("joker", "JOKER", 0);
    const king = makeCard("hearts", "K");
    const ace = makeCard("hearts", "A");

    expect(
      orderRunCards([ace, jack, queen, king], [{ cardId: queen.id, asRank: "Q" }]).map(
        (card) => card.rank,
      ),
    ).toEqual(["J", "JOKER", "K", "A"]);
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
