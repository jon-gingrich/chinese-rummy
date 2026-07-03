import { v } from "convex/values";

export const suitValidator = v.union(
  v.literal("clubs"),
  v.literal("diamonds"),
  v.literal("hearts"),
  v.literal("spades"),
  v.literal("joker"),
);

export const rankValidator = v.union(
  v.literal("A"),
  v.literal("2"),
  v.literal("3"),
  v.literal("4"),
  v.literal("5"),
  v.literal("6"),
  v.literal("7"),
  v.literal("8"),
  v.literal("9"),
  v.literal("10"),
  v.literal("J"),
  v.literal("Q"),
  v.literal("K"),
  v.literal("JOKER"),
);

export const naturalRankValidator = v.union(
  v.literal("A"),
  v.literal("2"),
  v.literal("3"),
  v.literal("4"),
  v.literal("5"),
  v.literal("6"),
  v.literal("7"),
  v.literal("8"),
  v.literal("9"),
  v.literal("10"),
  v.literal("J"),
  v.literal("Q"),
  v.literal("K"),
);

export const cardValidator = v.object({
  id: v.string(),
  suit: suitValidator,
  rank: rankValidator,
  deckIndex: v.union(v.literal(0), v.literal(1)),
});

export const wildDeclarationValidator = v.object({
  cardId: v.string(),
  asRank: naturalRankValidator,
});

export const openingMeldValidator = v.object({
  kind: v.union(v.literal("set"), v.literal("run")),
  cards: v.array(cardValidator),
  wildDeclarations: v.array(wildDeclarationValidator),
});

export const tableMeldValidator = v.object({
  id: v.string(),
  ownerId: v.string(),
  kind: v.union(v.literal("set"), v.literal("run")),
  cards: v.array(cardValidator),
  wildDeclarations: v.array(wildDeclarationValidator),
});

export const wildRelocationValidator = v.object({
  destinationMeldId: v.string(),
  wildDeclaration: v.optional(wildDeclarationValidator),
});

export const layOffTargetValidator = v.union(
  v.object({
    cardId: v.string(),
    meldId: v.string(),
    mode: v.literal("add"),
    wildRanks: v.optional(v.array(naturalRankValidator)),
  }),
  v.object({
    cardId: v.string(),
    meldId: v.string(),
    mode: v.literal("replaceWild"),
    replaceWildCardId: v.string(),
    relocationDestinations: v.array(v.string()),
  }),
);

export const playerStateValidator = v.object({
  id: v.string(),
  seatIndex: v.number(),
  contractRound: v.optional(v.number()),
  playerPhase: v.union(v.literal("notOpened"), v.literal("opened")),
  openedThisTurn: v.optional(v.boolean()),
  hand: v.array(cardValidator),
});

export const roundSummaryValidator = v.object({
  roundNumber: v.number(),
  goerPlayerId: v.string(),
  roundScores: v.array(v.number()),
  cumulativeScores: v.array(v.number()),
});

export const rummyWindowValidator = v.object({
  discarderId: v.string(),
  discardedCard: cardValidator,
  wouldGoOut: v.boolean(),
});

export const gameStateValidator = v.object({
  phase: v.union(v.literal("playing"), v.literal("roundEnd"), v.literal("gameEnd")),
  roundNumber: v.number(),
  roundPhase: v.union(v.literal("active"), v.literal("scored")),
  players: v.array(playerStateValidator),
  dealerSeatIndex: v.number(),
  activeSeatIndex: v.number(),
  turnPhase: v.union(v.literal("draw"), v.literal("discard"), v.literal("rummyWindow")),
  stock: v.array(cardValidator),
  discard: v.array(cardValidator),
  melds: v.array(tableMeldValidator),
  cumulativeScores: v.array(v.number()),
  rummyPenaltyCounts: v.optional(v.record(v.string(), v.number())),
  rummyWindow: v.optional(rummyWindowValidator),
  lastRoundSummary: v.optional(roundSummaryValidator),
  winnerPlayerIds: v.optional(v.array(v.string())),
});

export const legalActionsValidator = v.object({
  canDrawFromStock: v.boolean(),
  canDrawFromDiscard: v.boolean(),
  canOpen: v.boolean(),
  canLayOff: v.boolean(),
  canDiscard: v.boolean(),
  discardableCards: v.array(cardValidator),
  layOffTargets: v.array(layOffTargetValidator),
  canCallRummy: v.boolean(),
  canTakeBackDiscard: v.boolean(),
});

export const tablePlayerValidator = v.object({
  id: v.string(),
  seatIndex: v.number(),
  displayName: v.string(),
  handSize: v.number(),
  contractRound: v.number(),
  contract: v.string(),
  playerPhase: v.union(v.literal("notOpened"), v.literal("opened")),
  isActive: v.boolean(),
  isDealer: v.boolean(),
  cumulativeScore: v.number(),
  roundScore: v.optional(v.number()),
});

export const tableViewValidator = v.object({
  _id: v.id("games"),
  roomId: v.id("rooms"),
  roundNumber: v.number(),
  contract: v.string(),
  phase: v.union(v.literal("playing"), v.literal("roundEnd"), v.literal("gameEnd")),
  turnPhase: v.union(v.literal("draw"), v.literal("discard"), v.literal("rummyWindow")),
  activeSeatIndex: v.number(),
  dealerSeatIndex: v.number(),
  topDiscard: v.union(cardValidator, v.null()),
  stockCount: v.number(),
  rummyWindow: v.optional(rummyWindowValidator),
  players: v.array(tablePlayerValidator),
  melds: v.array(tableMeldValidator),
  cumulativeScores: v.array(v.number()),
  lastRoundSummary: v.optional(roundSummaryValidator),
  winnerPlayerIds: v.optional(v.array(v.string())),
  canContinueRound: v.boolean(),
});

export const actionResultValidator = v.object({
  table: tableViewValidator,
  hand: v.array(cardValidator),
  legalActions: legalActionsValidator,
  error: v.optional(v.string()),
});
