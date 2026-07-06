import { describe, expect, it } from "vitest";
import {
  advanceFromReshuffle,
  applyAction,
  createGame,
  legalActions,
  startRound,
  type GameState,
} from "../../../convex/lib/rules";
import { discardableHandCards } from "../../../convex/lib/rules/rummy";
import type { Card } from "../../../convex/lib/rules/types";

function seatedPlayers(count: number) {
  return Array.from({ length: count }, (_, index) => ({
    id: `player-${index}`,
    seatIndex: index,
  }));
}

function gameWithDealtHands(playerCount: 2 | 3 | 4 | 5 = 2): GameState {
  const game = createGame({ players: seatedPlayers(playerCount) });
  return startRound(game, { seed: 42 });
}

function activePlayerId(state: GameState): string {
  const active = state.players.find((p) => p.seatIndex === state.activeSeatIndex);
  if (!active) {
    throw new Error("No active player");
  }
  return active.id;
}

function otherPlayerId(state: GameState): string {
  const other = state.players.find((p) => p.seatIndex !== state.activeSeatIndex);
  if (!other) {
    throw new Error("No other player");
  }
  return other.id;
}

describe("createGame + startRound", () => {
  it("deals thirteen cards to each seated player", () => {
    const state = gameWithDealtHands(3);

    for (const player of state.players) {
      expect(player.hand).toHaveLength(13);
    }
  });

  it("uses a shoe of two decks plus four jokers", () => {
    const state = gameWithDealtHands(2);
    const dealt = state.players.flatMap((p) => p.hand);
    const inPlay = [...dealt, ...state.stock, ...state.discard];
    expect(inPlay).toHaveLength(108);
  });

  it("sets lead player seated left of the round-one dealer", () => {
    const state = gameWithDealtHands(2);
    const seatedIndices = state.players.map((p) => p.seatIndex).sort((a, b) => a - b);
    const dealerIndex = seatedIndices.indexOf(state.dealerSeatIndex);
    const expectedLead =
      seatedIndices[(dealerIndex + 1) % seatedIndices.length] ?? seatedIndices[0];
    expect(state.activeSeatIndex).toBe(expectedLead);
    expect(state.turnPhase).toBe("draw");
  });

  it("starts round one with an empty discard pile", () => {
    const state = gameWithDealtHands(2);
    expect(state.discard).toEqual([]);
    expect(state.roundNumber).toBe(1);
  });
});

describe("legalActions", () => {
  it("allows the active player to draw from stock or discard when discard has a card", () => {
    let state = gameWithDealtHands(2);
    const activeId = activePlayerId(state);

    expect(legalActions(state, activeId)).toEqual({
      canDrawFromStock: true,
      canDrawFromDiscard: false,
      canOpen: false,
      canLayOff: false,
      canDiscard: false,
      discardableCards: [],
      layOffTargets: [],
      canCallRummy: false,
      canTakeBackDiscard: false,
    });

    state = applyAction(state, { kind: "draw", source: "stock" }, activeId).state;
    const discardable = discardableHandCards(
      state.players.find((p) => p.id === activeId)!.hand,
    );

    expect(legalActions(state, activeId)).toEqual({
      canDrawFromStock: false,
      canDrawFromDiscard: false,
      canOpen: true,
      canLayOff: false,
      canDiscard: true,
      discardableCards: discardable,
      layOffTargets: [],
      canCallRummy: false,
      canTakeBackDiscard: false,
    });
  });

  it("returns no actions for non-active players", () => {
    const state = gameWithDealtHands(2);
    const inactiveId = otherPlayerId(state);

    expect(legalActions(state, inactiveId)).toEqual({
      canDrawFromStock: false,
      canDrawFromDiscard: false,
      canOpen: false,
      canLayOff: false,
      canDiscard: false,
      discardableCards: [],
      layOffTargets: [],
      canCallRummy: false,
      canTakeBackDiscard: false,
    });
  });
});

describe("applyAction draw", () => {
  it("adds the top stock card to the active hand", () => {
    const state = gameWithDealtHands(2);
    const activeId = activePlayerId(state);
    const stockTop = state.stock[state.stock.length - 1]!;

    const result = applyAction(state, { kind: "draw", source: "stock" }, activeId);
    const hand = result.state.players.find((p) => p.id === activeId)!.hand;

    expect(result.error).toBeUndefined();
    expect(hand).toHaveLength(14);
    expect(hand.some((card) => card.id === stockTop.id)).toBe(true);
    expect(result.state.stock).toHaveLength(state.stock.length - 1);
    expect(result.state.turnPhase).toBe("discard");
  });

  it("adds the top discard card to the active hand", () => {
    let state = gameWithDealtHands(2);
    const activeId = activePlayerId(state);
    state = applyAction(state, { kind: "draw", source: "stock" }, activeId).state;
    const discardCard = state.players.find((p) => p.id === activeId)!.hand[0]!;
    state = applyAction(state, { kind: "discard", card: discardCard }, activeId).state;

    const topDiscard = state.discard[state.discard.length - 1]!;
    const nextActive = activePlayerId(state);
    const handBefore = state.players.find((p) => p.id === nextActive)!.hand.length;

    const result = applyAction(state, { kind: "draw", source: "discard" }, nextActive);

    expect(result.error).toBeUndefined();
    expect(result.state.players.find((p) => p.id === nextActive)!.hand).toHaveLength(
      handBefore + 1,
    );
    expect(result.state.discard[result.state.discard.length - 1]?.id).not.toBe(
      topDiscard.id,
    );
  });

  it("rejects draw when it is not the player's turn", () => {
    const state = gameWithDealtHands(2);
    const inactiveId = otherPlayerId(state);

    const result = applyAction(state, { kind: "draw", source: "stock" }, inactiveId);

    expect(result.error).toBe("Not your turn");
    expect(result.state).toBe(state);
  });

  it("rejects drawing from an empty discard pile", () => {
    const state = gameWithDealtHands(2);
    const activeId = activePlayerId(state);

    const result = applyAction(state, { kind: "draw", source: "discard" }, activeId);

    expect(result.error).toBe("Discard pile is empty");
  });
});

describe("applyAction discard", () => {
  it("moves a card to the discard pile and advances turn clockwise", () => {
    let state = gameWithDealtHands(2);
    const firstActive = activePlayerId(state);
    state = applyAction(state, { kind: "draw", source: "stock" }, firstActive).state;

    const card = state.players.find((p) => p.id === firstActive)!.hand[0]!;
    const result = applyAction(state, { kind: "discard", card }, firstActive);

    expect(result.error).toBeUndefined();
    expect(result.state.discard[result.state.discard.length - 1]).toEqual(card);
    expect(result.state.players.find((p) => p.id === firstActive)!.hand).toHaveLength(13);
    expect(activePlayerId(result.state)).not.toBe(firstActive);
    expect(result.state.turnPhase).toBe("draw");
  });

  it("rejects discard before drawing", () => {
    const state = gameWithDealtHands(2);
    const activeId = activePlayerId(state);
    const card = state.players.find((p) => p.id === activeId)!.hand[0]!;

    const result = applyAction(state, { kind: "discard", card }, activeId);

    expect(result.error).toBe("Must draw before discarding");
  });

  it("rejects discarding a card not in hand", () => {
    let state = gameWithDealtHands(2);
    const activeId = activePlayerId(state);
    state = applyAction(state, { kind: "draw", source: "stock" }, activeId).state;

    const fakeCard: Card = {
      id: "fake-card",
      suit: "hearts",
      rank: "A",
      deckIndex: 0,
    };

    const result = applyAction(state, { kind: "discard", card: fakeCard }, activeId);

    expect(result.error).toBe("Card not in hand");
  });
});

describe("stock reshuffle", () => {
  it("reshuffles after discard when stock is empty, before the next turn", () => {
    let state = gameWithDealtHands(2);
    const activeId = activePlayerId(state);
    state = applyAction(state, { kind: "draw", source: "stock" }, activeId).state;

    const player = state.players.find((p) => p.id === activeId)!;
    const discardCard = discardableHandCards(player.hand)[0]!;

    state = {
      ...state,
      stock: [],
      discard: [{ id: "bottom", suit: "clubs", rank: "3", deckIndex: 0 }],
      turnPhase: "discard",
    };

    const result = applyAction(state, { kind: "discard", card: discardCard }, activeId);

    expect(result.error).toBeUndefined();
    expect(result.state.turnPhase).toBe("reshuffle");
    expect(result.state.reshufflePause?.resumeTurnPhase).toBe("draw");
    expect(result.state.discard).toEqual([discardCard]);
    expect(result.state.stock).toHaveLength(1);
    expect(activePlayerId(result.state)).not.toBe(activeId);
  });

  it("advances from reshuffle pause into the next turn phase", () => {
    let state = gameWithDealtHands(2);
    const activeId = activePlayerId(state);
    state = applyAction(state, { kind: "draw", source: "stock" }, activeId).state;

    const player = state.players.find((p) => p.id === activeId)!;
    const discardCard = discardableHandCards(player.hand)[0]!;

    state = {
      ...state,
      stock: [],
      discard: [{ id: "bottom", suit: "clubs", rank: "3", deckIndex: 0 }],
      turnPhase: "discard",
    };

    const afterDiscard = applyAction(state, { kind: "discard", card: discardCard }, activeId).state;
    const resumed = advanceFromReshuffle(afterDiscard);

    expect(resumed.turnPhase).toBe("draw");
    expect(resumed.reshufflePause).toBeUndefined();
    expect(resumed.stock).toHaveLength(1);
  });

  it("rejects stock draw when stock is empty and discard cannot be reshuffled", () => {
    const state = gameWithDealtHands(2);
    const activeId = activePlayerId(state);

    const exhausted = {
      ...state,
      stock: [],
      discard: [{ id: "only-top", suit: "hearts", rank: "5", deckIndex: 0 }],
      turnPhase: "draw" as const,
    };

    const result = applyAction(exhausted, { kind: "draw", source: "stock" }, activeId);

    expect(result.error).toBe("Stock is empty");
  });
});
