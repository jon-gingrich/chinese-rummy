import { describe, expect, it } from "vitest";
import {
  createEmptyStagingPiles,
  moveCardBetweenStaging,
  pruneStagingPiles,
  stageCardsIntoPile,
  syncStagingPileCount,
  unstagePile,
  unstagedCards,
} from "../../src/lib/handStaging";
import type { Card } from "../../convex/lib/rules/types";

function card(id: string): Card {
  return { id, rank: "A", suit: "spades", deckIndex: 0 };
}

describe("handStaging", () => {
  it("creates one empty pile per contract meld", () => {
    expect(createEmptyStagingPiles(2)).toEqual([{ cardIds: [] }, { cardIds: [] }]);
  });

  it("stages cards into a pile and removes them from other piles", () => {
    const piles = [
      { cardIds: ["a", "b"] },
      { cardIds: ["c"] },
    ];
    expect(stageCardsIntoPile(piles, 1, ["a", "d"])).toEqual([
      { cardIds: ["b"] },
      { cardIds: ["c", "a", "d"] },
    ]);
  });

  it("unstages a whole pile", () => {
    const piles = [{ cardIds: ["a"] }, { cardIds: ["b", "c"] }];
    expect(unstagePile(piles, 1)).toEqual([{ cardIds: ["a"] }, { cardIds: [] }]);
  });

  it("moves a card back to the main hand", () => {
    const piles = [{ cardIds: ["a", "b"] }, { cardIds: [] }];
    expect(moveCardBetweenStaging(piles, "a", null)).toEqual([
      { cardIds: ["b"] },
      { cardIds: [] },
    ]);
  });

  it("prunes cards that left the hand", () => {
    const piles = [{ cardIds: ["a", "gone"] }, { cardIds: ["b"] }];
    expect(pruneStagingPiles(piles, new Set(["a", "b"]))).toEqual([
      { cardIds: ["a"] },
      { cardIds: ["b"] },
    ]);
  });

  it("syncs pile count when the contract changes", () => {
    expect(syncStagingPileCount([{ cardIds: ["a"] }], 2)).toEqual([
      { cardIds: ["a"] },
      { cardIds: [] },
    ]);
    expect(syncStagingPileCount([{ cardIds: ["a"] }, { cardIds: ["b"] }], 1)).toEqual([
      { cardIds: ["a", "b"] },
    ]);
  });

  it("keeps staged cards out of the main fan list", () => {
    const hand = [card("a"), card("b"), card("c")];
    const piles = [{ cardIds: ["b"] }, { cardIds: [] }];
    expect(unstagedCards(hand, piles).map((entry) => entry.id)).toEqual(["a", "c"]);
  });
});
