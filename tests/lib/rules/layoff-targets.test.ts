import { describe, expect, it } from "vitest";
import { findLayOffTargets } from "../../../convex/lib/rules/layoffs";
import { makeCard } from "../../../convex/lib/rules/melds";
import type { TableMeld } from "../../../convex/lib/rules/types";

function tableMeld(
  id: string,
  ownerId: string,
  kind: "set" | "run",
  cards: ReturnType<typeof makeCard>[],
  wildDeclarations: Array<{ cardId: string; asRank: "5" | "7" | "8" | "9" | "10" }> = [],
): TableMeld {
  return { id, ownerId, kind, cards, wildDeclarations };
}

describe("findLayOffTargets", () => {
  it("tags each target with the card it applies to", () => {
    const five = makeCard("diamonds", "5");
    const ten = makeCard("clubs", "10");
    const melds = [
      tableMeld("five-set", "player-1", "set", [
        makeCard("hearts", "5"),
        makeCard("spades", "5"),
        makeCard("clubs", "5"),
      ]),
      tableMeld("ten-set", "player-2", "set", [
        makeCard("hearts", "10"),
        makeCard("diamonds", "10"),
        makeCard("spades", "10"),
      ]),
    ];

    const targets = findLayOffTargets(melds, [five, ten], true, false);

    expect(targets).toContainEqual({ cardId: five.id, meldId: "five-set", mode: "add" });
    expect(targets).toContainEqual({ cardId: ten.id, meldId: "ten-set", mode: "add" });
    expect(targets.some((target) => target.cardId === five.id && target.meldId === "ten-set")).toBe(
      false,
    );
  });

  it("does not offer wild replacement on sets", () => {
    const joker = makeCard("joker", "JOKER", 0);
    const naturalFive = makeCard("diamonds", "5");
    const melds = [
      tableMeld(
        "five-set",
        "player-1",
        "set",
        [makeCard("hearts", "5"), makeCard("spades", "5"), joker],
        [{ cardId: joker.id, asRank: "5" }],
      ),
      tableMeld("other-set", "player-1", "set", [
        makeCard("clubs", "5"),
        makeCard("diamonds", "5"),
        makeCard("hearts", "5"),
      ]),
    ];

    const targets = findLayOffTargets(melds, [naturalFive], true, false);

    expect(targets.some((target) => target.mode === "replaceWild")).toBe(false);
    expect(targets).toContainEqual({
      cardId: naturalFive.id,
      meldId: "five-set",
      mode: "add",
    });
  });

  it("allows adding a sixth five to a five-set with a joker", () => {
    const joker = makeCard("joker", "JOKER", 0);
    const fiveDiamond = makeCard("diamonds", "5", 0);
    const melds = [
      tableMeld(
        "five-set",
        "player-1",
        "set",
        [
          makeCard("hearts", "5", 0),
          makeCard("hearts", "5", 1),
          joker,
          makeCard("clubs", "5", 0),
          makeCard("spades", "5", 0),
        ],
        [{ cardId: joker.id, asRank: "5" }],
      ),
    ];

    const targets = findLayOffTargets(melds, [fiveDiamond], true, false);

    expect(targets).toContainEqual({
      cardId: fiveDiamond.id,
      meldId: "five-set",
      mode: "add",
    });
  });

  it("offers lay-off targets for a joker on a matching set", () => {
    const joker = makeCard("joker", "JOKER", 0);
    const melds = [
      tableMeld("seven-set", "player-1", "set", [
        makeCard("hearts", "7"),
        makeCard("spades", "7"),
        makeCard("clubs", "7"),
      ]),
    ];

    const targets = findLayOffTargets(melds, [joker], true, false);

    expect(targets).toContainEqual({
      cardId: joker.id,
      meldId: "seven-set",
      mode: "add",
      wildRanks: ["7"],
    });
  });

  it("offers lay-off for a second wild on a set when not adjacent", () => {
    const existingWild = makeCard("joker", "JOKER", 0);
    const newWild = makeCard("joker", "JOKER", 1);
    const melds = [
      tableMeld(
        "queen-set",
        "player-1",
        "set",
        [makeCard("hearts", "Q"), makeCard("spades", "Q"), existingWild],
        [{ cardId: existingWild.id, asRank: "Q" }],
      ),
    ];

    const targets = findLayOffTargets(melds, [newWild], true, false);

    expect(targets).toContainEqual({
      cardId: newWild.id,
      meldId: "queen-set",
      mode: "add",
      wildRanks: ["Q"],
    });
  });

  it("offers lay-off targets for a joker extending a run", () => {
    const joker = makeCard("joker", "JOKER", 0);
    const melds = [
      tableMeld("heart-run", "player-1", "run", [
        makeCard("hearts", "5"),
        makeCard("hearts", "6"),
        makeCard("hearts", "7"),
      ]),
    ];

    const targets = findLayOffTargets(melds, [joker], true, false);

    expect(targets).toContainEqual({
      cardId: joker.id,
      meldId: "heart-run",
      mode: "add",
      wildRanks: ["4", "8"],
    });
  });

  it("offers wild replacement on runs", () => {
    const joker = makeCard("joker", "JOKER", 0);
    const naturalEight = makeCard("hearts", "8");
    const melds = [
      tableMeld(
        "run-a",
        "player-1",
        "run",
        [makeCard("hearts", "7"), joker, makeCard("hearts", "9")],
        [{ cardId: joker.id, asRank: "8" }],
      ),
      tableMeld("run-b", "player-1", "run", [
        makeCard("hearts", "10"),
        makeCard("hearts", "J"),
        makeCard("hearts", "Q"),
      ]),
    ];

    const targets = findLayOffTargets(melds, [naturalEight], true, false);

    expect(targets).toContainEqual({
      cardId: naturalEight.id,
      meldId: "run-a",
      mode: "replaceWild",
      replaceWildCardId: joker.id,
      relocationDestinations: ["run-b"],
    });
  });
});
