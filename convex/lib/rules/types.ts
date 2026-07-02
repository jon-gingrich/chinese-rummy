export const SUITS = ["clubs", "diamonds", "hearts", "spades", "joker"] as const;
export type Suit = (typeof SUITS)[number];

export const RANKS = [
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
  "JOKER",
] as const;
export type Rank = (typeof RANKS)[number];

export type Card = {
  id: string;
  suit: Suit;
  rank: Rank;
  deckIndex: 0 | 1;
};

export type PlayerPhase = "notOpened" | "opened";

export type TurnPhase = "draw" | "discard";

export type GamePhase = "playing" | "roundEnd" | "gameEnd";

export type RoundPhase = "active" | "scored";

export type PlayerState = {
  id: string;
  seatIndex: number;
  playerPhase: PlayerPhase;
  hand: Card[];
};

export type GameState = {
  phase: GamePhase;
  roundNumber: number;
  roundPhase: RoundPhase;
  players: PlayerState[];
  dealerSeatIndex: number;
  activeSeatIndex: number;
  turnPhase: TurnPhase;
  stock: Card[];
  discard: Card[];
  melds: [];
  cumulativeScores: number[];
};

export type CreateGameConfig = {
  players: Array<{
    id: string;
    seatIndex: number;
  }>;
};

export type Action =
  | { kind: "draw"; source: "stock" | "discard" }
  | { kind: "discard"; card: Card };

export type LegalActions = {
  canDrawFromStock: boolean;
  canDrawFromDiscard: boolean;
  canDiscard: boolean;
  discardableCards: Card[];
};

export type ApplyActionResult = {
  state: GameState;
  error?: string;
};

export type ShuffleOptions = {
  seed?: number;
};
