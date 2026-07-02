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

export type NaturalRank = Exclude<Rank, "JOKER">;

export type Card = {
  id: string;
  suit: Suit;
  rank: Rank;
  deckIndex: 0 | 1;
};

export type WildDeclaration = {
  cardId: string;
  asRank: NaturalRank;
};

export type PlayerPhase = "notOpened" | "opened";

export type TurnPhase = "draw" | "discard";

export type GamePhase = "playing" | "roundEnd" | "gameEnd";

export type RoundPhase = "active" | "scored";

export type MeldKind = "set" | "run";

export type TableMeld = {
  id: string;
  ownerId: string;
  kind: MeldKind;
  cards: Card[];
  wildDeclarations: WildDeclaration[];
};

export type OpeningMeld = {
  kind: MeldKind;
  cards: Card[];
  wildDeclarations: WildDeclaration[];
};

export type PlayerState = {
  id: string;
  seatIndex: number;
  playerPhase: PlayerPhase;
  openedThisTurn?: boolean;
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
  melds: TableMeld[];
  cumulativeScores: number[];
};

export type CreateGameConfig = {
  players: Array<{
    id: string;
    seatIndex: number;
  }>;
};

export type WildRelocation = {
  destinationMeldId: string;
  wildDeclaration?: WildDeclaration;
};

export type LayOffTarget =
  | {
      meldId: string;
      mode: "add";
    }
  | {
      meldId: string;
      mode: "replaceWild";
      replaceWildCardId: string;
      relocationDestinations: string[];
    };

export type Action =
  | { kind: "draw"; source: "stock" | "discard" }
  | { kind: "open"; melds: OpeningMeld[] }
  | {
      kind: "layOff";
      targetMeldId: string;
      card: Card;
      replaceWildCardId?: string;
      relocation?: WildRelocation;
    }
  | { kind: "discard"; card: Card };

export type LegalActions = {
  canDrawFromStock: boolean;
  canDrawFromDiscard: boolean;
  canOpen: boolean;
  canLayOff: boolean;
  canDiscard: boolean;
  discardableCards: Card[];
  layOffTargets: LayOffTarget[];
};

export type ApplyActionResult = {
  state: GameState;
  error?: string;
};

export type ShuffleOptions = {
  seed?: number;
};
