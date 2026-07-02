import { describe, expect, it } from "vitest";
import {
  applyAction,
  createGame,
  startRound,
} from "../../../convex/lib/rules";
import { getContractForRound } from "../../../convex/lib/rules/contracts";
import { makeCard } from "../../../convex/lib/rules/melds";

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
});
