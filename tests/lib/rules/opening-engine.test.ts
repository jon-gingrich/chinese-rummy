import { describe, expect, it } from "vitest";
import {
  applyAction,
  createGame,
  legalActions,
  startRound,
} from "../../../convex/lib/rules";
import { getContractForRound } from "../../../convex/lib/rules/contracts";
import { makeCard } from "../../../convex/lib/rules/melds";
import type { Card, GameState, OpeningMeld } from "../../../convex/lib/rules/types";

function seatedPlayers(count: number) {
  return Array.from({ length: count }, (_, index) => ({
    id: `player-${index}`,
    seatIndex: index,
  }));
}

function afterDraw(state = startRound(createGame({ players: seatedPlayers(2) }), { seed: 1 })) {
  const activeId = state.players.find((player) => player.seatIndex === state.activeSeatIndex)!.id;
  return applyAction(state, { kind: "draw", source: "stock" }, activeId).state;
}

function roundOneOpeningCards(): Card[] {
  return [
    makeCard("hearts", "7"),
    makeCard("spades", "7"),
    makeCard("clubs", "7"),
    makeCard("diamonds", "8"),
    makeCard("hearts", "8"),
    makeCard("spades", "8"),
  ];
}

function roundOneMelds(openingCards: Card[]): OpeningMeld[] {
  return [
    { kind: "set", cards: openingCards.slice(0, 3), wildDeclarations: [] },
    { kind: "set", cards: openingCards.slice(3, 6), wildDeclarations: [] },
  ];
}

function preparedOpeningLeaving(
  leftover: Card,
  options: { discard?: Card[]; rummyPenaltyCounts?: Record<string, number> } = {},
): { state: GameState; activeId: string; melds: OpeningMeld[] } {
  const state = afterDraw();
  const activeId = state.players.find((player) => player.seatIndex === state.activeSeatIndex)!.id;
  const openingCards = roundOneOpeningCards();
  const melds = roundOneMelds(openingCards);
  const discardPile = options.discard ?? [
    makeCard("clubs", "3"),
    makeCard("diamonds", "4"),
    makeCard("spades", "5"),
  ];
  const prepared: GameState = {
    ...state,
    discard: discardPile,
    rummyPenaltyCounts: options.rummyPenaltyCounts ?? {},
    players: state.players.map((player) =>
      player.id === activeId ? { ...player, hand: [...openingCards, leftover] } : player,
    ),
  };
  return { state: prepared, activeId, melds };
}

describe("applyAction open", () => {
  it("lays a full opening contract and marks the player opened", () => {
    const state = afterDraw();
    const activeId = state.players.find((player) => player.seatIndex === state.activeSeatIndex)!.id;
    const [reqA, reqB] = getContractForRound(state.roundNumber);

    const openingCards = [
      makeCard("hearts", "7"),
      makeCard("spades", "7"),
      makeCard("clubs", "7"),
      makeCard("diamonds", "8"),
      makeCard("hearts", "8"),
      makeCard("spades", "8"),
    ];
    const hand = [...openingCards, makeCard("clubs", "9")];
    const prepared = {
      ...state,
      players: state.players.map((player) =>
        player.id === activeId ? { ...player, hand } : player,
      ),
    };

    const result = applyAction(
      prepared,
      {
        kind: "open",
        melds: [
          { kind: reqA.kind, cards: openingCards.slice(0, reqA.size), wildDeclarations: [] },
          { kind: reqB.kind, cards: openingCards.slice(reqA.size), wildDeclarations: [] },
        ],
      },
      activeId,
    );

    expect(result.error).toBeUndefined();
    expect(result.state.melds).toHaveLength(2);
    expect(
      result.state.players.find((player) => player.id === activeId)?.playerPhase,
    ).toBe("opened");
    expect(
      result.state.players.find((player) => player.id === activeId)?.hand,
    ).toHaveLength(1);
  });

  it("rejects opening before drawing", () => {
    const state = startRound(createGame({ players: seatedPlayers(2) }), { seed: 1 });
    const activeId = state.players.find((player) => player.seatIndex === state.activeSeatIndex)!.id;

    const result = applyAction(
      state,
      {
        kind: "open",
        melds: [
          {
            kind: "set",
            cards: [makeCard("hearts", "7"), makeCard("spades", "7"), makeCard("clubs", "7")],
            wildDeclarations: [],
          },
          {
            kind: "set",
            cards: [makeCard("diamonds", "8"), makeCard("hearts", "8"), makeCard("spades", "8")],
            wildDeclarations: [],
          },
        ],
      },
      activeId,
    );

    expect(result.error).toBe("Must draw before opening");
  });

  it("rejects partial openings", () => {
    const state = afterDraw();
    const activeId = state.players.find((player) => player.seatIndex === state.activeSeatIndex)!.id;
    const partialCards = [
      makeCard("hearts", "7"),
      makeCard("spades", "7"),
      makeCard("clubs", "7"),
    ];
    const prepared = {
      ...state,
      players: state.players.map((player) =>
        player.id === activeId ? { ...player, hand: partialCards } : player,
      ),
    };

    const result = applyAction(
      prepared,
      {
        kind: "open",
        melds: [
          {
            kind: "set",
            cards: partialCards,
            wildDeclarations: [],
          },
        ],
      },
      activeId,
    );

    expect(result.error).toBe("Opening melds do not match the round contract");
  });

  it("rejects a second opening attempt in the same round", () => {
    let state = afterDraw();
    const activeId = state.players.find((player) => player.seatIndex === state.activeSeatIndex)!.id;
    const opening = {
      kind: "open" as const,
      melds: [
        {
          kind: "set" as const,
          cards: [makeCard("hearts", "7"), makeCard("spades", "7"), makeCard("clubs", "7")],
          wildDeclarations: [],
        },
        {
          kind: "set" as const,
          cards: [makeCard("diamonds", "8"), makeCard("hearts", "8"), makeCard("spades", "8")],
          wildDeclarations: [],
        },
      ],
    };

    const hand = [
      ...opening.melds.flatMap((meld) => meld.cards),
      makeCard("clubs", "9"),
    ];
    state = {
      ...state,
      players: state.players.map((player) =>
        player.id === activeId ? { ...player, hand } : player,
      ),
    };

    state = applyAction(state, opening, activeId).state;
    const retry = applyAction(state, opening, activeId);
    expect(retry.error).toBe("Already opened this round");
  });

  it("applies stuck-wild pickup when opening leaves only a joker", () => {
    const joker = makeCard("joker", "JOKER", 0);
    const { state, activeId, melds } = preparedOpeningLeaving(joker);
    const expectedPickup = state.discard.slice(-2);

    const result = applyAction(state, { kind: "open", melds }, activeId);

    expect(result.error).toBeUndefined();
    expect(result.state.players.find((player) => player.id === activeId)?.playerPhase).toBe(
      "opened",
    );
    expect(result.state.turnPhase).toBe("discard");
    expect(result.state.rummyPenaltyCounts[activeId]).toBe(1);
    expect(result.state.discard).toHaveLength(1);
    const hand = result.state.players.find((player) => player.id === activeId)!.hand;
    expect(hand.map((card) => card.id).sort()).toEqual(
      [joker.id, ...expectedPickup.map((card) => card.id)].sort(),
    );
    expect(legalActions(result.state, activeId).discardableCards.length).toBeGreaterThan(0);
  });

  it("picks up the entire discard pile on a later stuck-wild opening", () => {
    const two = makeCard("hearts", "2");
    const prepared = preparedOpeningLeaving(two);
    const { activeId, melds } = prepared;
    const state: GameState = {
      ...prepared.state,
      rummyPenaltyCounts: { [activeId]: 1 },
    };
    const expectedPickup = [...state.discard];

    const result = applyAction(state, { kind: "open", melds }, activeId);

    expect(result.error).toBeUndefined();
    expect(result.state.rummyPenaltyCounts[activeId]).toBe(2);
    expect(result.state.discard).toHaveLength(0);
    const hand = result.state.players.find((player) => player.id === activeId)!.hand;
    expect(hand.map((card) => card.id).sort()).toEqual(
      [two.id, ...expectedPickup.map((card) => card.id)].sort(),
    );
  });

  it("picks up two from stock when opening leaves only a wild and discard is empty", () => {
    const joker = makeCard("joker", "JOKER", 0);
    const { state, activeId, melds } = preparedOpeningLeaving(joker, { discard: [] });
    const stockTop = state.stock.slice(-2);

    const result = applyAction(state, { kind: "open", melds }, activeId);

    expect(result.error).toBeUndefined();
    expect(result.state.rummyPenaltyCounts[activeId]).toBe(1);
    expect(result.state.discard).toHaveLength(0);
    expect(result.state.stock).toHaveLength(state.stock.length - 2);
    const hand = result.state.players.find((player) => player.id === activeId)!.hand;
    expect(hand.map((card) => card.id).sort()).toEqual(
      [joker.id, ...stockTop.map((card) => card.id)].sort(),
    );
  });
});
