import { describe, expect, it } from "vitest";
import type { Card } from "../../convex/lib/rules/types";
import { fanMarginExtra, fanRotation, formatCardLabel, sortHand } from "../../src/lib/cards";

function card(
  id: string,
  suit: Card["suit"],
  rank: Card["rank"],
  deckIndex: 0 | 1 = 0,
): Card {
  return { id, suit, rank, deckIndex };
}

describe("sortHand", () => {
  const sample = [
    card("k-spades", "spades", "K"),
    card("3-hearts", "hearts", "3"),
    card("joker", "joker", "JOKER"),
    card("2-clubs", "clubs", "2"),
    card("10-diamonds", "diamonds", "10"),
  ];

  it("sorts by suit then rank within suit", () => {
    const sorted = sortHand(sample, "suit");
    expect(sorted.map((entry) => entry.id)).toEqual([
      "2-clubs",
      "10-diamonds",
      "3-hearts",
      "k-spades",
      "joker",
    ]);
  });

  it("sorts by rank then suit within rank", () => {
    const sorted = sortHand(sample, "rank");
    expect(sorted.map((entry) => entry.id)).toEqual([
      "2-clubs",
      "3-hearts",
      "10-diamonds",
      "k-spades",
      "joker",
    ]);
  });
});

describe("formatCardLabel", () => {
  it("formats natural cards with suit symbols", () => {
    expect(formatCardLabel(card("a", "hearts", "A"))).toBe("A♥");
    expect(formatCardLabel(card("j", "spades", "J"))).toBe("J♠");
  });

  it("formats jokers", () => {
    expect(formatCardLabel(card("joker", "joker", "JOKER"))).toBe("Joker");
  });
});

describe("fanRotation", () => {
  it("centers rotation around the middle card", () => {
    expect(fanRotation(0, 3)).toBeLessThan(0);
    expect(fanRotation(1, 3)).toBe(0);
    expect(fanRotation(2, 3)).toBeGreaterThan(0);
  });

  it("returns zero for a single card", () => {
    expect(fanRotation(0, 1)).toBe(0);
  });
});

describe("fanMarginExtra", () => {
  it("adds spread on both sides of a lone selected card", () => {
    const selected = new Set([2]);
    expect(fanMarginExtra(0, selected)).toBe(0);
    expect(fanMarginExtra(1, selected)).toBe(0);
    expect(fanMarginExtra(2, selected)).toBe(7);
    expect(fanMarginExtra(3, selected)).toBe(7);
  });

  it("does not add spread between adjacent selected cards", () => {
    const selected = new Set([2, 3]);
    expect(fanMarginExtra(2, selected)).toBe(7);
    expect(fanMarginExtra(3, selected)).toBe(0);
    expect(fanMarginExtra(4, selected)).toBe(7);
  });
});
