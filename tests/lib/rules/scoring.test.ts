import { describe, expect, it } from "vitest";
import {
  applyAction,
  continueToNextRound,
  createGame,
  deadwoodValue,
  gameComplete,
  scoreHand,
  scoreRound,
  startRound,
  type GameState,
} from "../../../convex/lib/rules";
import { makeCard } from "../../../convex/lib/rules/melds";
import type { Card } from "../../../convex/lib/rules/types";

function seatedPlayers(count: number) {
  return Array.from({ length: count }, (_, index) => ({
    id: `player-${index}`,
    seatIndex: index,
  }));
}

function gameWithDealtHands(playerCount: 2 | 3 = 2): GameState {
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

describe("deadwoodValue", () => {
  it("scores aces at 15", () => {
    expect(deadwoodValue(makeCard("hearts", "A"))).toBe(15);
  });

  it("scores face cards and tens at 10", () => {
    expect(deadwoodValue(makeCard("spades", "K"))).toBe(10);
    expect(deadwoodValue(makeCard("clubs", "Q"))).toBe(10);
    expect(deadwoodValue(makeCard("diamonds", "J"))).toBe(10);
    expect(deadwoodValue(makeCard("hearts", "10"))).toBe(10);
  });

  it("scores three through nine at 5", () => {
    expect(deadwoodValue(makeCard("spades", "9"))).toBe(5);
    expect(deadwoodValue(makeCard("clubs", "5"))).toBe(5);
    expect(deadwoodValue(makeCard("diamonds", "3"))).toBe(5);
  });

  it("scores twos and jokers at 20", () => {
    expect(deadwoodValue(makeCard("hearts", "2"))).toBe(20);
    expect(
      deadwoodValue({
        id: "joker",
        suit: "joker",
        rank: "JOKER",
        deckIndex: 0,
      }),
    ).toBe(20);
  });
});

describe("scoreHand", () => {
  it("sums deadwood for all cards in hand", () => {
    const hand = [makeCard("hearts", "A"), makeCard("spades", "5"), makeCard("clubs", "2")];
    expect(scoreHand(hand)).toBe(15 + 5 + 20);
  });
});

describe("going out via discard", () => {
  it("ends the round when a player discards their last card", () => {
    let state = gameWithDealtHands(2);
    const activeId = activePlayerId(state);
    const activeIndex = state.players.findIndex((p) => p.id === activeId);
    const lastCard = makeCard("hearts", "9");

    state = {
      ...state,
      turnPhase: "discard",
      players: state.players.map((player, index) =>
        index === activeIndex
          ? { ...player, hand: [lastCard] }
          : { ...player, hand: [makeCard("clubs", "K"), makeCard("diamonds", "4")] },
      ),
    };

    const result = applyAction(state, { kind: "discard", card: lastCard }, activeId);

    expect(result.error).toBeUndefined();
    expect(result.state.phase).toBe("roundEnd");
    expect(result.state.roundPhase).toBe("scored");
    expect(result.state.lastRoundSummary?.goerPlayerId).toBe(activeId);
    expect(result.state.lastRoundSummary?.roundScores[activeIndex]).toBe(0);
  });

  it("scores deadwood for non-goers", () => {
    let state = gameWithDealtHands(2);
    const activeId = activePlayerId(state);
    const activeIndex = state.players.findIndex((p) => p.id === activeId);
    const opponentIndex = activeIndex === 0 ? 1 : 0;
    const lastCard = makeCard("hearts", "9");

    state = {
      ...state,
      turnPhase: "discard",
      players: state.players.map((player, index) =>
        index === activeIndex
          ? { ...player, hand: [lastCard] }
          : {
              ...player,
              hand: [makeCard("clubs", "A"), makeCard("diamonds", "5")],
            },
      ),
    };

    const result = applyAction(state, { kind: "discard", card: lastCard }, activeId);

    expect(result.state.lastRoundSummary?.roundScores[opponentIndex]).toBe(15 + 5);
    expect(result.state.cumulativeScores[opponentIndex]).toBe(15 + 5);
    expect(result.state.cumulativeScores[activeIndex]).toBe(0);
  });
});

describe("meld-out rejection", () => {
  it("rejects opening that would empty the hand without a discard", () => {
    let state = gameWithDealtHands(2);
    const activeId = activePlayerId(state);
    const activeIndex = state.players.findIndex((p) => p.id === activeId);
    const openingCards = [
      makeCard("hearts", "7"),
      makeCard("spades", "7"),
      makeCard("clubs", "7"),
      makeCard("diamonds", "8"),
      makeCard("hearts", "8"),
      makeCard("spades", "8"),
    ];

    state = {
      ...state,
      turnPhase: "discard",
      players: state.players.map((player, index) =>
        index === activeIndex ? { ...player, hand: openingCards } : player,
      ),
    };

    const result = applyAction(
      state,
      {
        kind: "open",
        melds: [
          {
            kind: "set",
            cards: openingCards.slice(0, 3),
            wildDeclarations: [],
          },
          {
            kind: "set",
            cards: openingCards.slice(3, 6),
            wildDeclarations: [],
          },
        ],
      },
      activeId,
    );

    expect(result.error).toBe("Must discard to go out");
    expect(result.state.phase).toBe("playing");
  });

  it("rejects lay-off that would empty the hand without a discard", () => {
    let state = gameWithDealtHands(2);
    const activeId = activePlayerId(state);
    const activeIndex = state.players.findIndex((p) => p.id === activeId);
    const layOffCard = makeCard("hearts", "7");

    state = {
      ...state,
      turnPhase: "discard",
      players: state.players.map((player, index) =>
        index === activeIndex
          ? { ...player, playerPhase: "opened" as const, openedThisTurn: false, hand: [layOffCard] }
          : { ...player, playerPhase: "opened" as const, hand: [] },
      ),
      melds: [
        {
          id: "opponent-set",
          ownerId: state.players[activeIndex === 0 ? 1 : 0]!.id,
          kind: "set",
          cards: [
            makeCard("diamonds", "7"),
            makeCard("clubs", "7"),
            makeCard("spades", "7"),
          ],
          wildDeclarations: [],
        },
      ],
    };

    const result = applyAction(
      state,
      { kind: "layOff", targetMeldId: "opponent-set", card: layOffCard },
      activeId,
    );

    expect(result.error).toBe("Must discard to go out");
    expect(result.state.phase).toBe("playing");
  });
});

describe("scoreRound", () => {
  it("returns zero for the goer and deadwood for others", () => {
    const state = gameWithDealtHands(2);
    const goerId = state.players[0]!.id;

    const scored = scoreRound(
      {
        ...state,
        players: [
          { ...state.players[0]!, hand: [] },
          { ...state.players[1]!, hand: [makeCard("hearts", "10")] },
        ],
      },
      goerId,
    );

    expect(scored.roundScores).toEqual([0, 10]);
  });
});

describe("ten-round game lifecycle", () => {
  it("rotates dealer clockwise between rounds", () => {
    let state = gameWithDealtHands(3);
    const firstDealer = state.dealerSeatIndex;

    state = {
      ...state,
      phase: "roundEnd",
      roundPhase: "scored",
      lastRoundSummary: {
        roundNumber: 1,
        goerPlayerId: state.players[0]!.id,
        roundScores: [0, 10, 5],
        cumulativeScores: [0, 10, 5],
      },
    };

    state = continueToNextRound(state);
    const secondDealer = state.dealerSeatIndex;
    const seats = state.players.map((p) => p.seatIndex).sort((a, b) => a - b);
    const firstIndex = seats.indexOf(firstDealer);
    const expectedDealer = seats[(firstIndex + 1) % seats.length]!;

    expect(state.roundNumber).toBe(2);
    expect(secondDealer).toBe(expectedDealer);
    expect(state.activeSeatIndex).toBe(
      seats[(seats.indexOf(secondDealer) + 1) % seats.length],
    );
  });

  it("declares game end after round ten is scored", () => {
    let state = gameWithDealtHands(2);
    const activeId = activePlayerId(state);
    const activeIndex = state.players.findIndex((p) => p.id === activeId);
    const lastCard = makeCard("hearts", "9");

    state = {
      ...state,
      roundNumber: 10,
      turnPhase: "discard",
      cumulativeScores: [50, 20],
      players: state.players.map((player, index) =>
        index === activeIndex
          ? { ...player, hand: [lastCard] }
          : { ...player, hand: [makeCard("clubs", "K")] },
      ),
    };

    const result = applyAction(state, { kind: "discard", card: lastCard }, activeId);

    expect(gameComplete(result.state)).toBe(true);
    expect(result.state.phase).toBe("gameEnd");
    expect(result.state.winnerPlayerIds).toEqual(["player-1"]);
    expect(result.state.cumulativeScores).toEqual([60, 20]);
  });

  it("does not start round eleven", () => {
    let state = gameWithDealtHands(2);
    state = {
      ...state,
      roundNumber: 10,
      phase: "gameEnd",
      roundPhase: "scored",
      cumulativeScores: [60, 30],
      lastRoundSummary: {
        roundNumber: 10,
        goerPlayerId: state.players[1]!.id,
        roundScores: [10, 0],
        cumulativeScores: [60, 30],
      },
      winnerPlayerIds: ["player-1"],
    };

    expect(() => continueToNextRound(state)).toThrow("Game is complete");
  });
});
