import { buildShoe, shuffleCards } from "./cards";
import { allContractsFulfilled, advanceContractRound } from "./contracts";
import { normalizeOpeningMeld, validateOpeningMelds, withNormalizedRunMelds } from "./melds";
import { findLayOffTargets, applyLayOff, validateLayOff } from "./layoffs";
import {
  discardableHandCards,
  incrementRummyPenaltyCount,
  isPlayableDiscard,
  isStuckWildCard,
  isUndiscardable,
  rummyPenaltyCount,
  takePickupCards,
} from "./rummy";
import {
  gameComplete,
  lowestScoreWinnerIds,
  scoreRound,
} from "./scoring";
import type {
  Action,
  ApplyActionResult,
  Card,
  CreateGameConfig,
  GameState,
  LegalActions,
  OpeningMeld,
  PlayerState,
  ReshufflePause,
  ShuffleOptions,
  TableMeld,
} from "./types";

const CARDS_PER_HAND = 13;

function sortPlayersBySeat(players: CreateGameConfig["players"]): PlayerState[] {
  return [...players]
    .sort((left, right) => left.seatIndex - right.seatIndex)
    .map((player) => ({
      id: player.id,
      seatIndex: player.seatIndex,
      contractRound: 1,
      playerPhase: "notOpened" as const,
      openedThisTurn: false,
      hand: [],
    }));
}

function seatedIndices(state: GameState): number[] {
  return state.players.map((player) => player.seatIndex).sort((a, b) => a - b);
}

function nextSeatClockwise(state: GameState, seatIndex: number): number {
  const seats = seatedIndices(state);
  const currentIndex = seats.indexOf(seatIndex);
  if (currentIndex === -1) {
    throw new Error("Seat not found");
  }
  return seats[(currentIndex + 1) % seats.length]!;
}

function findPlayer(state: GameState, playerId: string): PlayerState | undefined {
  return state.players.find((player) => player.id === playerId);
}

function isActivePlayer(state: GameState, playerId: string): boolean {
  const player = findPlayer(state, playerId);
  return player?.seatIndex === state.activeSeatIndex;
}

function hasOpenedThisTurn(player: PlayerState): boolean {
  return player.openedThisTurn ?? false;
}

function cardInHand(hand: PlayerState["hand"], cardId: string): boolean {
  return hand.some((card) => card.id === cardId);
}

function removeCardsFromHand(hand: PlayerState["hand"], cardIds: string[]) {
  const ids = new Set(cardIds);
  return hand.filter((entry) => !ids.has(entry.id));
}

function cardsOwnedByPlayer(hand: PlayerState["hand"], melds: OpeningMeld[]): string | null {
  const handIds = new Set(hand.map((card) => card.id));
  const seen = new Set<string>();

  for (const meld of melds) {
    for (const card of meld.cards) {
      if (!handIds.has(card.id)) {
        return "Opening cards must be in your hand";
      }
      if (seen.has(card.id)) {
        return "A card cannot appear in multiple melds";
      }
      seen.add(card.id);
    }
  }

  return null;
}

const EMPTY_LEGAL_ACTIONS: LegalActions = {
  canDrawFromStock: false,
  canDrawFromDiscard: false,
  canOpen: false,
  canLayOff: false,
  canDiscard: false,
  discardableCards: [],
  layOffTargets: [],
  canCallRummy: false,
  canTakeBackDiscard: false,
};

function applyRummyPickup(
  state: GameState,
  offenderId: string,
): { state: GameState } | { error: string } {
  const playerIndex = state.players.findIndex((entry) => entry.id === offenderId);
  if (playerIndex === -1) {
    return { error: "Player not found" };
  }

  const offenseIndex = rummyPenaltyCount(state, offenderId);
  const counts = state.rummyPenaltyCounts ?? {};
  const { picked, remaining } = takePickupCards(state.discard, offenseIndex);
  if (picked.length === 0) {
    return { error: "Discard pile is empty" };
  }

  const players = [...state.players];
  const player = players[playerIndex]!;
  players[playerIndex] = {
    ...player,
    hand: [...player.hand, ...picked],
  };

  return {
    state: {
      ...state,
      players,
      discard: remaining,
      rummyPenaltyCounts: incrementRummyPenaltyCount(counts, offenderId),
      activeSeatIndex: player.seatIndex,
      turnPhase: "discard",
      rummyWindow: undefined,
    },
  };
}

function applyTurnResume(discardedState: GameState, resume: ReshufflePause): GameState {
  return {
    ...discardedState,
    activeSeatIndex: resume.activeSeatIndex,
    turnPhase: resume.resumeTurnPhase,
    rummyWindow: resume.rummyWindow,
  };
}

function maybePauseForStockReshuffle(state: GameState, resume: ReshufflePause): GameState {
  if (state.stock.length > 0 || state.discard.length <= 1) {
    return state;
  }

  const reshuffled = reshuffleStockFromDiscard(state);
  if ("error" in reshuffled) {
    return state;
  }

  return {
    ...reshuffled,
    activeSeatIndex: resume.activeSeatIndex,
    turnPhase: "reshuffle",
    rummyWindow: undefined,
    reshufflePause: resume,
  };
}

export function advanceFromReshuffle(state: GameState): GameState {
  if (state.turnPhase !== "reshuffle" || !state.reshufflePause) {
    return state;
  }

  const pause = state.reshufflePause;
  return {
    ...state,
    turnPhase: pause.resumeTurnPhase,
    rummyWindow: pause.rummyWindow,
    activeSeatIndex: pause.activeSeatIndex,
    reshufflePause: undefined,
  };
}

function completeDiscard(
  state: GameState,
  playerIndex: number,
  playerId: string,
  card: Card,
  nextHand: PlayerState["hand"],
): ApplyActionResult {
  const players = [...state.players];
  const player = players[playerIndex]!;
  players[playerIndex] = {
    ...player,
    openedThisTurn: false,
    hand: nextHand,
  };

  const discardedState: GameState = {
    ...state,
    players,
    discard: [...state.discard, card],
  };
  const wouldGoOut = nextHand.length === 0;
  const nextSeat = nextSeatClockwise(state, state.activeSeatIndex);
  const playable = isPlayableDiscard(card, state.melds);

  const resume: ReshufflePause = playable
    ? {
        resumeTurnPhase: "rummyWindow",
        rummyWindow: {
          discarderId: playerId,
          discardedCard: card,
          wouldGoOut,
        },
        activeSeatIndex: nextSeat,
      }
    : {
        resumeTurnPhase: "draw",
        activeSeatIndex: nextSeat,
      };

  if (wouldGoOut && !playable) {
    return { state: finishRound(applyTurnResume(discardedState, resume), playerId) };
  }

  const nextState = maybePauseForStockReshuffle(applyTurnResume(discardedState, resume), resume);
  return { state: nextState };
}

const GO_OUT_ERROR = "Must discard to go out";

function wouldMeldOut(hand: PlayerState["hand"], removedCardIds: string[]): boolean {
  const ids = new Set(removedCardIds);
  return hand.filter((card) => !ids.has(card.id)).length === 0;
}

function finishRound(state: GameState, goerPlayerId: string): GameState {
  const { roundScores, cumulativeScores } = scoreRound(state, goerPlayerId);
  const lastRoundSummary = {
    roundNumber: state.roundNumber,
    goerPlayerId,
    roundScores,
    cumulativeScores,
  };

  if (allContractsFulfilled(state.players, state.roundNumber)) {
    return {
      ...state,
      phase: "gameEnd",
      roundPhase: "scored",
      cumulativeScores,
      lastRoundSummary,
      winnerPlayerIds: lowestScoreWinnerIds(state.players, cumulativeScores),
    };
  }

  return {
    ...state,
    phase: "roundEnd",
    roundPhase: "scored",
    cumulativeScores,
    lastRoundSummary,
  };
}

function buildTableMelds(ownerId: string, melds: OpeningMeld[], existing: TableMeld[]): TableMeld[] {
  const nextIndex = existing.filter((meld) => meld.ownerId === ownerId).length;
  return melds.map((meld, offset) => {
    const normalized = normalizeOpeningMeld(meld);
    return {
      id: `${ownerId}-meld-${nextIndex + offset}`,
      ownerId,
      kind: normalized.kind,
      cards: normalized.cards,
      wildDeclarations: normalized.wildDeclarations,
    };
  });
}

function reshuffleStockFromDiscard(state: GameState): GameState | { error: string } {
  if (state.discard.length <= 1) {
    return { error: "Stock is empty" };
  }

  const topDiscard = state.discard[state.discard.length - 1]!;
  const toShuffle = state.discard.slice(0, -1);

  return {
    ...state,
    stock: shuffleCards(toShuffle),
    discard: [topDiscard],
  };
}

export function createGame(config: CreateGameConfig): GameState {
  const players = sortPlayersBySeat(config.players);
  if (players.length < 2 || players.length > 5) {
    throw new Error("Game requires two to five players");
  }

  return {
    phase: "playing",
    roundNumber: 0,
    roundPhase: "active",
    players,
    dealerSeatIndex: players[0]!.seatIndex,
    activeSeatIndex: players[0]!.seatIndex,
    turnPhase: "draw",
    stock: [],
    discard: [],
    melds: [],
    cumulativeScores: players.map(() => 0),
    rummyPenaltyCounts: {},
  };
}

export function startRound(state: GameState, options: ShuffleOptions = {}): GameState {
  const shuffled = shuffleCards(buildShoe(), options.seed);
  const playerCount = state.players.length;
  const cardsNeeded = playerCount * CARDS_PER_HAND;

  if (shuffled.length < cardsNeeded) {
    throw new Error("Shoe does not have enough cards to deal");
  }

  const hands = shuffled.slice(0, cardsNeeded);
  const remainingStock = shuffled.slice(cardsNeeded);

  const dealerSeatIndex =
    state.roundNumber === 0
      ? state.players[0]!.seatIndex
      : nextSeatClockwise(
          state,
          state.dealerSeatIndex,
        );

  const leadSeatIndex = nextSeatClockwise(
    { ...state, dealerSeatIndex },
    dealerSeatIndex,
  );

  const players = state.players.map((player, index) => ({
    ...player,
    contractRound: advanceContractRound(player, state.roundNumber),
    playerPhase: "notOpened" as const,
    openedThisTurn: false,
    hand: hands.slice(index * CARDS_PER_HAND, (index + 1) * CARDS_PER_HAND),
  }));

  return {
    ...state,
    phase: "playing",
    roundNumber: state.roundNumber + 1,
    roundPhase: "active",
    players,
    dealerSeatIndex,
    activeSeatIndex: leadSeatIndex,
    turnPhase: "draw",
    stock: remainingStock,
    discard: [],
    melds: [],
    rummyWindow: undefined,
    lastRoundSummary: undefined,
    winnerPlayerIds: undefined,
  };
}

export function continueToNextRound(state: GameState): GameState {
  if (gameComplete(state)) {
    throw new Error("Game is complete");
  }
  if (state.phase !== "roundEnd" || state.roundPhase !== "scored") {
    throw new Error("Round is still active");
  }
  return startRound(state, {});
}

export function legalActions(state: GameState, playerId: string): LegalActions {
  if (state.phase !== "playing" || state.roundPhase !== "active") {
    return { ...EMPTY_LEGAL_ACTIONS };
  }

  if (state.turnPhase === "reshuffle") {
    return { ...EMPTY_LEGAL_ACTIONS };
  }

  const player = findPlayer(state, playerId);
  if (!player) {
    return { ...EMPTY_LEGAL_ACTIONS };
  }

  if (state.turnPhase === "rummyWindow" && state.rummyWindow) {
    const window = state.rummyWindow;
    const isDiscarder = playerId === window.discarderId;
    const isNextPlayer = player.seatIndex === state.activeSeatIndex;

    return {
      ...EMPTY_LEGAL_ACTIONS,
      canDrawFromStock:
        isNextPlayer && state.stock.length > 0,
      canDrawFromDiscard: isNextPlayer && state.discard.length > 0,
      canCallRummy:
        !isDiscarder && isPlayableDiscard(window.discardedCard, state.melds),
      canTakeBackDiscard: isDiscarder,
    };
  }

  if (!isActivePlayer(state, playerId)) {
    return { ...EMPTY_LEGAL_ACTIONS };
  }

  if (state.turnPhase === "draw") {
    const canDrawFromStock = state.stock.length > 0;
    return {
      ...EMPTY_LEGAL_ACTIONS,
      canDrawFromStock,
      canDrawFromDiscard: state.discard.length > 0,
    };
  }

  const layOffTargets = findLayOffTargets(
    state.melds,
    player.hand,
    player.playerPhase === "opened",
    hasOpenedThisTurn(player),
  );

  return {
    ...EMPTY_LEGAL_ACTIONS,
    canOpen: player.playerPhase === "notOpened",
    canLayOff: layOffTargets.length > 0,
    canDiscard: true,
    discardableCards: discardableHandCards(player.hand),
    layOffTargets,
  };
}

export function applyAction(
  state: GameState,
  action: Action,
  playerId: string,
): ApplyActionResult {
  if (!isActivePlayer(state, playerId)) {
    return { state, error: "Not your turn" };
  }

  state = withNormalizedRunMelds(state);

  const playerIndex = state.players.findIndex((entry) => entry.id === playerId);
  if (playerIndex === -1) {
    return { state, error: "Player not found" };
  }

  if (action.kind === "draw") {
    let workingState = state;

    if (workingState.turnPhase === "rummyWindow") {
      if (!isActivePlayer(workingState, playerId)) {
        return { state, error: "Not your turn" };
      }

      const window = workingState.rummyWindow!;
      workingState = {
        ...workingState,
        rummyWindow: undefined,
        turnPhase: "draw",
      };

      if (window.wouldGoOut) {
        return { state: finishRound(workingState, window.discarderId) };
      }
    }

    if (workingState.turnPhase !== "draw") {
      return { state, error: "Already drew this turn" };
    }

    if (action.source === "discard") {
      if (workingState.discard.length === 0) {
        return { state, error: "Discard pile is empty" };
      }

      const drawn = workingState.discard[workingState.discard.length - 1]!;
      const players = [...workingState.players];
      const player = players[playerIndex]!;
      players[playerIndex] = {
        ...player,
        hand: [...player.hand, drawn],
      };

      return {
        state: {
          ...workingState,
          players,
          discard: workingState.discard.slice(0, -1),
          turnPhase: "discard",
        },
      };
    }

    if (workingState.stock.length === 0) {
      const reshuffled = reshuffleStockFromDiscard(workingState);
      if ("error" in reshuffled) {
        return { state, error: reshuffled.error };
      }
      workingState = reshuffled;
    }

    const drawn = workingState.stock[workingState.stock.length - 1]!;
    const players = [...workingState.players];
    const player = players[playerIndex]!;
    players[playerIndex] = {
      ...player,
      hand: [...player.hand, drawn],
    };

    return {
      state: {
        ...workingState,
        players,
        stock: workingState.stock.slice(0, -1),
        turnPhase: "discard",
      },
    };
  }

  if (action.kind === "open") {
    if (state.turnPhase !== "discard") {
      return { state, error: "Must draw before opening" };
    }

    const player = state.players[playerIndex]!;
    if (player.playerPhase === "opened") {
      return { state, error: "Already opened this round" };
    }

    const ownershipError = cardsOwnedByPlayer(player.hand, action.melds);
    if (ownershipError) {
      return { state, error: ownershipError };
    }

    const contractRound = player.contractRound ?? state.roundNumber;
    const validationError = validateOpeningMelds(action.melds, contractRound);
    if (validationError) {
      return { state, error: validationError };
    }

    const meldCardIds = action.melds.flatMap((meld) => meld.cards.map((card) => card.id));
    if (wouldMeldOut(player.hand, meldCardIds)) {
      return { state, error: GO_OUT_ERROR };
    }

    const players = [...state.players];
    players[playerIndex] = {
      ...player,
      playerPhase: "opened",
      openedThisTurn: true,
      hand: removeCardsFromHand(player.hand, meldCardIds),
    };

    return {
      state: {
        ...state,
        players,
        melds: [...state.melds, ...buildTableMelds(playerId, action.melds, state.melds)],
      },
    };
  }

  if (action.kind === "layOff") {
    if (state.turnPhase !== "discard") {
      return { state, error: "Must draw before laying off" };
    }

    const player = state.players[playerIndex]!;
    const validationError = validateLayOff(
      state.melds,
      player.hand,
      {
        targetMeldId: action.targetMeldId,
        card: action.card,
        replaceWildCardId: action.replaceWildCardId,
        relocation: action.relocation,
        wildDeclaration: action.wildDeclaration,
      },
      player.playerPhase === "opened",
      hasOpenedThisTurn(player),
    );
    if (validationError) {
      return { state, error: validationError };
    }

    const result = applyLayOff(state.melds, {
      targetMeldId: action.targetMeldId,
      card: action.card,
      replaceWildCardId: action.replaceWildCardId,
      relocation: action.relocation,
      wildDeclaration: action.wildDeclaration,
    });
    if ("error" in result) {
      return { state, error: result.error };
    }

    if (wouldMeldOut(player.hand, [action.card.id])) {
      if (!isStuckWildCard(action.card)) {
        return { state, error: GO_OUT_ERROR };
      }

      const players = [...state.players];
      players[playerIndex] = {
        ...player,
        hand: removeCardsFromHand(player.hand, [action.card.id]),
      };

      const afterLayOff: GameState = {
        ...state,
        players,
        melds: result.melds,
      };

      const pickupResult = applyRummyPickup(afterLayOff, playerId);
      if ("error" in pickupResult) {
        return { state, error: pickupResult.error };
      }

      return { state: pickupResult.state };
    }

    const players = [...state.players];
    players[playerIndex] = {
      ...player,
      hand: removeCardsFromHand(player.hand, [action.card.id]),
    };

    return {
      state: {
        ...state,
        players,
        melds: result.melds,
      },
    };
  }

  if (action.kind === "discard") {
    if (state.turnPhase !== "discard") {
      return { state, error: "Must draw before discarding" };
    }

    const player = state.players[playerIndex]!;
    if (!cardInHand(player.hand, action.card.id)) {
      return { state, error: "Card not in hand" };
    }

    if (isUndiscardable(action.card)) {
      return { state, error: "Jokers and twos cannot be discarded" };
    }

    const nextHand = removeCardsFromHand(player.hand, [action.card.id]);
    return completeDiscard(state, playerIndex, playerId, action.card, nextHand);
  }

  return { state, error: "Unknown action" };
}

export function applyCallRummy(state: GameState, callerId: string): ApplyActionResult {
  if (state.turnPhase !== "rummyWindow" || !state.rummyWindow) {
    return { state, error: "No rummy window is open" };
  }

  if (!state.players.some((entry) => entry.id === callerId)) {
    return { state, error: "Player not found" };
  }

  if (callerId === state.rummyWindow.discarderId) {
    return { state, error: "Cannot call rummy on your own discard" };
  }

  if (!isPlayableDiscard(state.rummyWindow.discardedCard, state.melds)) {
    return { state, error: "Discard is not playable" };
  }

  const pickupResult = applyRummyPickup(state, state.rummyWindow.discarderId);
  if ("error" in pickupResult) {
    return { state, error: pickupResult.error };
  }

  return { state: pickupResult.state };
}

export function applyTakeBackDiscard(state: GameState, playerId: string): ApplyActionResult {
  if (state.turnPhase !== "rummyWindow" || !state.rummyWindow) {
    return { state, error: "No rummy window is open" };
  }

  if (playerId !== state.rummyWindow.discarderId) {
    return { state, error: "Only the discarder can take back" };
  }

  const playerIndex = state.players.findIndex((entry) => entry.id === playerId);
  if (playerIndex === -1) {
    return { state, error: "Player not found" };
  }

  const player = state.players[playerIndex]!;
  const card = state.rummyWindow.discardedCard;
  const players = [...state.players];
  players[playerIndex] = {
    ...player,
    hand: [...player.hand, card],
  };

  return {
    state: {
      ...state,
      players,
      discard: state.discard.slice(0, -1),
      activeSeatIndex: player.seatIndex,
      turnPhase: "discard",
      rummyWindow: undefined,
    },
  };
}
