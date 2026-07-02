import type { Card, Rank, Suit } from "./types";

const STANDARD_SUITS: Suit[] = ["clubs", "diamonds", "hearts", "spades"];
const STANDARD_RANKS: Rank[] = [
  "A",
  "2",
  "3",
  "4",
  "5",
  "6",
  "7",
  "8",
  "9",
  "10",
  "J",
  "Q",
  "K",
];

export function buildShoe(): Card[] {
  const cards: Card[] = [];

  for (const deckIndex of [0, 1] as const) {
    for (const suit of STANDARD_SUITS) {
      for (const rank of STANDARD_RANKS) {
        cards.push({
          id: `${suit}-${rank}-${deckIndex}`,
          suit,
          rank,
          deckIndex,
        });
      }
    }
  }

  for (let jokerIndex = 0; jokerIndex < 4; jokerIndex += 1) {
    cards.push({
      id: `joker-JOKER-${jokerIndex}`,
      suit: "joker",
      rank: "JOKER",
      deckIndex: jokerIndex < 2 ? 0 : 1,
    });
  }

  return cards;
}

export function mulberry32(seed: number): () => number {
  let t = seed >>> 0;
  return () => {
    t += 0x6d2b79f5;
    let r = Math.imul(t ^ (t >>> 15), t | 1);
    r ^= r + Math.imul(r ^ (r >>> 7), r | 61);
    return ((r ^ (r >>> 14)) >>> 0) / 4294967296;
  };
}

export function shuffleCards(cards: Card[], seed?: number): Card[] {
  const shuffled = [...cards];
  const random = seed === undefined ? Math.random : mulberry32(seed);

  for (let index = shuffled.length - 1; index > 0; index -= 1) {
    const swapIndex = Math.floor(random() * (index + 1));
    const current = shuffled[index]!;
    shuffled[index] = shuffled[swapIndex]!;
    shuffled[swapIndex] = current;
  }

  return shuffled;
}
