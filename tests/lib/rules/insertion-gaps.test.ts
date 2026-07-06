import { describe, expect, it } from "vitest";
import {
  findInsertionGaps,
  findLayOffGapTargets,
  findLayOffTargets,
} from "../../../convex/lib/rules/layoffs";
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

describe("findInsertionGaps", () => {
  it("includes legal run extension gaps", () => {
    const meld = tableMeld("run", "player-1", "run", [
      makeCard("hearts", "5"),
      makeCard("hearts", "6"),
      makeCard("hearts", "7"),
    ]);
    const card = makeCard("hearts", "8");
    const target = { cardId: card.id, meldId: "run", mode: "add" as const };

    const gaps = findInsertionGaps(meld, card, target);
    expect(gaps.length).toBeGreaterThan(0);
    expect(gaps.every((gap) => gap.mode === "add")).toBe(true);
    expect(gaps.some((gap) => gap.insertIndex === 3)).toBe(true);
  });

  it("offers a mid-run gap when replacing a wild", () => {
    const joker = makeCard("joker", "JOKER", 0);
    const meld = tableMeld(
      "run",
      "player-1",
      "run",
      [makeCard("hearts", "7"), joker, makeCard("hearts", "9")],
      [{ cardId: joker.id, asRank: "8" }],
    );
    const card = makeCard("hearts", "8");
    const target = {
      cardId: card.id,
      meldId: "run",
      mode: "replaceWild" as const,
      replaceWildCardId: joker.id,
      relocationDestinations: ["other"],
    };

    expect(findInsertionGaps(meld, card, target)).toEqual([
      { insertIndex: 1, mode: "replaceWild", replaceWildCardId: joker.id },
    ]);
  });

  it("can offer multiple set gaps when adjacency allows", () => {
    const joker = makeCard("joker", "JOKER", 0);
    const meld = tableMeld(
      "set",
      "player-1",
      "set",
      [makeCard("hearts", "Q"), makeCard("spades", "Q"), joker],
      [{ cardId: joker.id, asRank: "Q" }],
    );
    const card = makeCard("diamonds", "Q");
    const target = { cardId: card.id, meldId: "set", mode: "add" as const };

    const gaps = findInsertionGaps(meld, card, target);
    expect(gaps.length).toBeGreaterThan(1);
    expect(gaps.every((gap) => gap.mode === "add")).toBe(true);
  });
});

describe("findLayOffGapTargets", () => {
  it("expands lay-off targets into gap targets", () => {
    const joker = makeCard("joker", "JOKER", 0);
    const eight = makeCard("hearts", "8");
    const melds = [
      tableMeld(
        "run-a",
        "player-1",
        "run",
        [makeCard("hearts", "7"), joker, makeCard("hearts", "9")],
        [{ cardId: joker.id, asRank: "8" }],
      ),
      tableMeld("run-b", "player-1", "run", [
        makeCard("hearts", "3"),
        makeCard("hearts", "4"),
        makeCard("hearts", "5"),
      ]),
    ];

    const targets = findLayOffTargets(melds, [eight], true, false);
    const gapTargets = findLayOffGapTargets(melds, eight, true, false);

    expect(targets.some((target) => target.mode === "replaceWild")).toBe(true);
    expect(gapTargets.some((entry) => entry.gap.mode === "replaceWild")).toBe(true);
    expect(gapTargets.length).toBeGreaterThanOrEqual(targets.length);
  });
});
