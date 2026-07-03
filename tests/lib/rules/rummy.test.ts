import { describe, expect, it } from "vitest";
import {
  applyAction,
  applyCallRummy,
  applyTakeBackDiscard,
  createGame,
  legalActions,
  startRound,
  type GameState,
} from "../../../convex/lib/rules";
import type { Card, TableMeld } from "../../../convex/lib/rules/types";
import {
  discardableHandCards,
  isPlayableDiscard,
  isUndiscardable,
} from "../../../convex/lib/rules/rummy";

function makeCard(
  suit: Card["suit"],
  rank: Card["rank"],
  id = `${suit}-${rank}`,
): Card {
  return { id, suit, rank, deckIndex: 0 };
}

function seatedPlayers(count: number) {
  return Array.from({ length: count }, (_, index) => ({
    id: `player-${index}`,
    seatIndex: index,
  }));
}

function gameWithDealtHands(): GameState {
  const game = createGame({ players: seatedPlayers(2) });
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

function setOfSevens(ownerId: string): TableMeld {
  return {
    id: "set-7",
    ownerId,
    kind: "set",
    cards: [
      makeCard("diamonds", "7", "d7"),
      makeCard("clubs", "7", "c7"),
      makeCard("spades", "7", "s7"),
    ],
    wildDeclarations: [],
  };
}

describe("rummy helpers", () => {
  it("treats jokers and twos as undiscardable", () => {
    expect(isUndiscardable(makeCard("joker", "JOKER"))).toBe(true);
    expect(isUndiscardable(makeCard("hearts", "2"))).toBe(true);
    expect(isUndiscardable(makeCard("hearts", "9"))).toBe(false);
  });

  it("filters discardable hand cards", () => {
    const hand = [makeCard("hearts", "9"), makeCard("hearts", "2"), makeCard("joker", "JOKER")];
    expect(discardableHandCards(hand).map((card) => card.id)).toEqual(["hearts-9"]);
  });

  it("detects structural playable discards", () => {
    const card = makeCard("hearts", "7", "h7");
    expect(isPlayableDiscard(card, [setOfSevens("player-1")])).toBe(true);
    expect(isPlayableDiscard(makeCard("hearts", "9"), [])).toBe(false);
  });
});

describe("rummy window", () => {
  it("opens a rummy window on a playable discard", () => {
    let state = gameWithDealtHands();
    const activeId = activePlayerId(state);
    const opponentId = otherPlayerId(state);

    state = {
      ...state,
      turnPhase: "discard",
      melds: [setOfSevens(opponentId)],
      players: state.players.map((player) =>
        player.id === activeId
          ? { ...player, playerPhase: "opened", hand: [makeCard("hearts", "7", "h7"), makeCard("clubs", "3")] }
          : { ...player, playerPhase: "opened" },
      ),
    };

    const result = applyAction(
      state,
      { kind: "discard", card: makeCard("hearts", "7", "h7") },
      activeId,
    );

    expect(result.error).toBeUndefined();
    expect(result.state.turnPhase).toBe("rummyWindow");
    expect(result.state.rummyWindow?.discarderId).toBe(activeId);
    expect(result.state.rummyWindow?.wouldGoOut).toBe(false);
    expect(activePlayerId(result.state)).toBe(opponentId);
  });

  it("lets the discarder take back before a call", () => {
    let state = gameWithDealtHands();
    const activeId = activePlayerId(state);
    const opponentId = otherPlayerId(state);
    const playable = makeCard("hearts", "7", "h7");

    state = {
      ...state,
      turnPhase: "discard",
      melds: [setOfSevens(opponentId)],
      players: state.players.map((player) =>
        player.id === activeId
          ? { ...player, playerPhase: "opened", hand: [playable, makeCard("clubs", "3")] }
          : { ...player, playerPhase: "opened" },
      ),
    };

    state = applyAction(state, { kind: "discard", card: playable }, activeId).state;

    const result = applyTakeBackDiscard(state, activeId);

    expect(result.error).toBeUndefined();
    expect(result.state.turnPhase).toBe("discard");
    expect(result.state.rummyWindow).toBeUndefined();
    expect(result.state.activeSeatIndex).toBe(
      state.players.find((p) => p.id === activeId)!.seatIndex,
    );
    expect(
      result.state.players.find((p) => p.id === activeId)!.hand.some((c) => c.id === "h7"),
    ).toBe(true);
    expect(result.state.discard).toHaveLength(0);
  });

  it("applies a two-card pickup on the first rummy call", () => {
    let state = gameWithDealtHands();
    const activeId = activePlayerId(state);
    const opponentId = otherPlayerId(state);
    const playable = makeCard("hearts", "7", "h7");
    const underCard = makeCard("clubs", "3", "c3");

    state = {
      ...state,
      turnPhase: "discard",
      discard: [underCard],
      melds: [setOfSevens(opponentId)],
      players: state.players.map((player) =>
        player.id === activeId
          ? { ...player, playerPhase: "opened", hand: [playable, makeCard("diamonds", "4")] }
          : { ...player, playerPhase: "opened" },
      ),
    };

    state = applyAction(state, { kind: "discard", card: playable }, activeId).state;

    const result = applyCallRummy(state, opponentId);

    expect(result.error).toBeUndefined();
    expect(result.state.turnPhase).toBe("discard");
    expect(result.state.rummyPenaltyCounts[activeId]).toBe(1);
    expect(result.state.discard).toHaveLength(0);
    const offenderHand = result.state.players.find((p) => p.id === activeId)!.hand;
    expect(offenderHand.map((card) => card.id).sort()).toEqual(["c3", "diamonds-4", "h7"].sort());
    expect(result.state.activeSeatIndex).toBe(
      state.players.find((p) => p.id === activeId)!.seatIndex,
    );
  });

  it("closes the window without a call when the next player draws", () => {
    let state = gameWithDealtHands();
    const activeId = activePlayerId(state);
    const opponentId = otherPlayerId(state);
    const playable = makeCard("hearts", "7", "h7");

    state = {
      ...state,
      turnPhase: "discard",
      melds: [setOfSevens(opponentId)],
      players: state.players.map((player) =>
        player.id === activeId
          ? { ...player, playerPhase: "opened", hand: [playable, makeCard("clubs", "3")] }
          : { ...player, playerPhase: "opened" },
      ),
    };

    state = applyAction(state, { kind: "discard", card: playable }, activeId).state;

    const result = applyAction(state, { kind: "draw", source: "stock" }, opponentId);

    expect(result.error).toBeUndefined();
    expect(result.state.turnPhase).toBe("discard");
    expect(result.state.rummyWindow).toBeUndefined();
  });

  it("delays going out until the rummy window closes", () => {
    let state = gameWithDealtHands();
    const activeId = activePlayerId(state);
    const opponentId = otherPlayerId(state);
    const playable = makeCard("hearts", "7", "h7");

    state = {
      ...state,
      turnPhase: "discard",
      melds: [setOfSevens(opponentId)],
      players: state.players.map((player) =>
        player.id === activeId
          ? { ...player, playerPhase: "opened", hand: [playable] }
          : { ...player, playerPhase: "opened" },
      ),
    };

    state = applyAction(state, { kind: "discard", card: playable }, activeId).state;

    expect(state.phase).toBe("playing");
    expect(state.rummyWindow?.wouldGoOut).toBe(true);

    const closed = applyAction(state, { kind: "draw", source: "stock" }, opponentId).state;

    expect(closed.phase).toBe("roundEnd");
    expect(closed.lastRoundSummary?.goerPlayerId).toBe(activeId);
  });

  it("rejects discarding jokers and twos", () => {
    let state = gameWithDealtHands();
    const activeId = activePlayerId(state);

    state = {
      ...state,
      turnPhase: "discard",
      players: state.players.map((player) =>
        player.id === activeId
          ? {
              ...player,
              hand: [makeCard("joker", "JOKER"), makeCard("hearts", "2"), makeCard("clubs", "9")],
            }
          : player,
      ),
    };

    expect(
      applyAction(state, { kind: "discard", card: makeCard("joker", "JOKER") }, activeId).error,
    ).toBe("Jokers and twos cannot be discarded");
    expect(
      applyAction(state, { kind: "discard", card: makeCard("hearts", "2") }, activeId).error,
    ).toBe("Jokers and twos cannot be discarded");
  });
});

describe("legalActions during rummy window", () => {
  it("exposes call and take-back actions to the right players", () => {
    let state = gameWithDealtHands();
    const activeId = activePlayerId(state);
    const opponentId = otherPlayerId(state);
    const playable = makeCard("hearts", "7", "h7");

    state = {
      ...state,
      turnPhase: "discard",
      melds: [setOfSevens(opponentId)],
      players: state.players.map((player) =>
        player.id === activeId
          ? { ...player, playerPhase: "opened", hand: [playable, makeCard("clubs", "3")] }
          : { ...player, playerPhase: "opened" },
      ),
    };

    state = applyAction(state, { kind: "discard", card: playable }, activeId).state;

    expect(legalActions(state, opponentId)).toMatchObject({
      canCallRummy: true,
      canTakeBackDiscard: false,
      canDrawFromStock: true,
    });
    expect(legalActions(state, activeId)).toMatchObject({
      canCallRummy: false,
      canTakeBackDiscard: true,
      canDrawFromStock: false,
    });
  });
});
