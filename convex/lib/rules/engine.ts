import { buildShoe, shuffleCards } from "./cards";
import { validateOpeningMelds } from "./melds";
import { findLayOffTargets, applyLayOff, validateLayOff } from "./layoffs";
import {
  gameComplete,
  lowestScoreWinnerIds,
  scoreRound,
  TOTAL_ROUNDS,
} from "./scoring";
import type {
  Action,
  ApplyActionResult,
  CreateGameConfig,
  GameState,
  LegalActions,
  OpeningMeld,
  PlayerState,
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

  if (state.roundNumber >= TOTAL_ROUNDS) {
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
  return melds.map((meld, offset) => ({
    id: `${ownerId}-meld-${nextIndex + offset}`,
    ownerId,
    kind: meld.kind,
    cards: meld.cards,
    wildDeclarations: meld.wildDeclarations,
  }));
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
    return {
      canDrawFromStock: false,
      canDrawFromDiscard: false,
      canOpen: false,
      canLayOff: false,
      canDiscard: false,
      discardableCards: [],
      layOffTargets: [],
    };
  }

  if (!isActivePlayer(state, playerId)) {
    return {
      canDrawFromStock: false,
      canDrawFromDiscard: false,
      canOpen: false,
      canLayOff: false,
      canDiscard: false,
      discardableCards: [],
      layOffTargets: [],
    };
  }

  const player = findPlayer(state, playerId);
  if (!player) {
    return {
      canDrawFromStock: false,
      canDrawFromDiscard: false,
      canOpen: false,
      canLayOff: false,
      canDiscard: false,
      discardableCards: [],
      layOffTargets: [],
    };
  }

  if (state.turnPhase === "draw") {
    const canDrawFromStock =
      state.stock.length > 0 || state.discard.length > 1;
    return {
      canDrawFromStock,
      canDrawFromDiscard: state.discard.length > 0,
      canOpen: false,
      canLayOff: false,
      canDiscard: false,
      discardableCards: [],
      layOffTargets: [],
    };
  }

  const layOffTargets = findLayOffTargets(
    state.melds,
    player.hand,
    player.playerPhase === "opened",
    hasOpenedThisTurn(player),
  );

  return {
    canDrawFromStock: false,
    canDrawFromDiscard: false,
    canOpen: player.playerPhase === "notOpened",
    canLayOff: layOffTargets.length > 0,
    canDiscard: true,
    discardableCards: [...player.hand],
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

  const playerIndex = state.players.findIndex((entry) => entry.id === playerId);
  if (playerIndex === -1) {
    return { state, error: "Player not found" };
  }

  if (action.kind === "draw") {
    if (state.turnPhase !== "draw") {
      return { state, error: "Already drew this turn" };
    }

    if (action.source === "discard") {
      if (state.discard.length === 0) {
        return { state, error: "Discard pile is empty" };
      }

      const drawn = state.discard[state.discard.length - 1]!;
      const players = [...state.players];
      const player = players[playerIndex]!;
      players[playerIndex] = {
        ...player,
        hand: [...player.hand, drawn],
      };

      return {
        state: {
          ...state,
          players,
          discard: state.discard.slice(0, -1),
          turnPhase: "discard",
        },
      };
    }

    let workingState = state;
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

    const validationError = validateOpeningMelds(action.melds, state.roundNumber);
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
    });
    if ("error" in result) {
      return { state, error: result.error };
    }

    if (wouldMeldOut(player.hand, [action.card.id])) {
      return { state, error: GO_OUT_ERROR };
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

    const players = [...state.players];
    const nextHand = removeCardsFromHand(player.hand, [action.card.id]);
    players[playerIndex] = {
      ...player,
      openedThisTurn: false,
      hand: nextHand,
    };

    const nextState: GameState = {
      ...state,
      players,
      discard: [...state.discard, action.card],
      activeSeatIndex: nextSeatClockwise(state, state.activeSeatIndex),
      turnPhase: "draw",
    };

    if (nextHand.length === 0) {
      return { state: finishRound(nextState, playerId) };
    }

    return { state: nextState };
  }

  return { state, error: "Unknown action" };
}
