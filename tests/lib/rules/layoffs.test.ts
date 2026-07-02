import { describe, expect, it } from "vitest";
import {
  applyAction,
  createGame,
  legalActions,
  startRound,
  type GameState,
  type TableMeld,
} from "../../../convex/lib/rules";
import { makeCard } from "../../../convex/lib/rules/melds";

function seatedPlayers(count: number) {
  return Array.from({ length: count }, (_, index) => ({
    id: `player-${index}`,
    seatIndex: index,
  }));
}

function tableMeld(
  id: string,
  ownerId: string,
  kind: "set" | "run",
  cards: ReturnType<typeof makeCard>[],
  wildDeclarations: Array<{ cardId: string; asRank: "7" | "8" | "9" }> = [],
): TableMeld {
  return { id, ownerId, kind, cards, wildDeclarations };
}

function stateAfterDraw(state: GameState): GameState {
  const activeId = state.players.find((player) => player.seatIndex === state.activeSeatIndex)!.id;
  return applyAction(state, { kind: "draw", source: "stock" }, activeId).state;
}

describe("lay-off timing", () => {
  it("blocks lay off on the opening turn", () => {
    const base = startRound(createGame({ players: seatedPlayers(2) }), { seed: 1 });
    const activeId = base.players.find((player) => player.seatIndex === base.activeSeatIndex)!.id;
    let state = stateAfterDraw(base);

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
      players: state.players.map((player) =>
        player.id === activeId
          ? { ...player, hand: [...openingCards, makeCard("clubs", "9")] }
          : player,
      ),
      melds: [
        tableMeld("owner-set", "player-1", "set", [
          makeCard("diamonds", "7"),
          makeCard("clubs", "7"),
          makeCard("spades", "7"),
        ]),
      ],
    };

    state = applyAction(
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
            cards: openingCards.slice(3),
            wildDeclarations: [],
          },
        ],
      },
      activeId,
    ).state;

    const actions = legalActions(state, activeId);
    expect(actions.canLayOff).toBe(false);
    expect(
      applyAction(
        state,
        {
          kind: "layOff",
          targetMeldId: "owner-set",
          card: makeCard("hearts", "7"),
        },
        activeId,
      ).error,
    ).toBe("Cannot lay off on your opening turn");
  });

  it("allows lay off on a later turn after opening", () => {
    let state = startRound(createGame({ players: seatedPlayers(2) }), { seed: 1 });
    const activeId = state.players.find((player) => player.seatIndex === state.activeSeatIndex)!.id;
    const otherId = state.players.find((player) => player.id !== activeId)!.id;

    state = {
      ...state,
      players: state.players.map((player) =>
        player.id === activeId
          ? {
              ...player,
              playerPhase: "opened",
              openedThisTurn: false,
              hand: [makeCard("hearts", "7"), makeCard("clubs", "9")],
            }
          : player,
      ),
      activeSeatIndex: state.players.find((player) => player.id === activeId)!.seatIndex,
      turnPhase: "discard",
      melds: [
        tableMeld("other-set", otherId, "set", [
          makeCard("diamonds", "7"),
          makeCard("clubs", "7"),
          makeCard("spades", "7"),
        ]),
      ],
    };

    const result = applyAction(
      state,
      {
        kind: "layOff",
        targetMeldId: "other-set",
        card: makeCard("hearts", "7"),
      },
      activeId,
    );

    expect(result.error).toBeUndefined();
    expect(result.state.melds[0]?.cards).toHaveLength(4);
    expect(
      result.state.players.find((player) => player.id === activeId)?.hand,
    ).toHaveLength(1);
  });
});

describe("wild relocation", () => {
  it("requires relocating a replaced wild to another meld on the same owner board", () => {
    const ownerId = "player-1";
    const activeId = "player-0";
    const joker = makeCard("joker", "JOKER", 0);
    const state: GameState = {
      ...startRound(createGame({ players: seatedPlayers(2) }), { seed: 1 }),
      turnPhase: "discard",
      activeSeatIndex: 0,
      players: [
        {
          id: activeId,
          seatIndex: 0,
          playerPhase: "opened",
          openedThisTurn: false,
          hand: [makeCard("hearts", "7"), makeCard("clubs", "9")],
        },
        {
          id: ownerId,
          seatIndex: 1,
          playerPhase: "opened",
          openedThisTurn: false,
          hand: [],
        },
      ],
      melds: [
        tableMeld(
          "set-a",
          ownerId,
          "set",
          [makeCard("diamonds", "7"), makeCard("clubs", "7"), joker],
          [{ cardId: joker.id, asRank: "7" }],
        ),
        tableMeld("set-b", ownerId, "set", [
          makeCard("spades", "7"),
          makeCard("hearts", "7"),
          makeCard("clubs", "7"),
        ]),
      ],
    };

    const withoutRelocation = applyAction(
      state,
      {
        kind: "layOff",
        targetMeldId: "set-a",
        card: makeCard("hearts", "7"),
        replaceWildCardId: joker.id,
      },
      activeId,
    );
    expect(withoutRelocation.error).toBe("Wild replacement requires relocation");

    const relocated = applyAction(
      state,
      {
        kind: "layOff",
        targetMeldId: "set-a",
        card: makeCard("hearts", "7"),
        replaceWildCardId: joker.id,
        relocation: { destinationMeldId: "set-b" },
      },
      activeId,
    );
    expect(relocated.error).toBeUndefined();
    expect(relocated.state.melds.find((meld) => meld.id === "set-a")?.cards).toEqual([
      makeCard("diamonds", "7"),
      makeCard("clubs", "7"),
      makeCard("hearts", "7"),
    ]);
    expect(
      relocated.state.melds.find((meld) => meld.id === "set-b")?.cards.some(
        (card) => card.id === joker.id,
      ),
    ).toBe(true);
  });

  it("waives adjacency when relocating a wild onto an existing wild", () => {
    const ownerId = "player-1";
    const activeId = "player-0";
    const wildA = makeCard("joker", "JOKER", 0);
    const wildB = makeCard("joker", "JOKER", 1);
    const state: GameState = {
      ...startRound(createGame({ players: seatedPlayers(2) }), { seed: 1 }),
      turnPhase: "discard",
      activeSeatIndex: 0,
      players: [
        {
          id: activeId,
          seatIndex: 0,
          playerPhase: "opened",
          openedThisTurn: false,
          hand: [makeCard("hearts", "9"), makeCard("clubs", "5")],
        },
        {
          id: ownerId,
          seatIndex: 1,
          playerPhase: "opened",
          openedThisTurn: false,
          hand: [],
        },
      ],
      melds: [
        tableMeld(
          "set-a",
          ownerId,
          "set",
          [makeCard("diamonds", "9"), makeCard("clubs", "9"), wildA],
          [{ cardId: wildA.id, asRank: "9" }],
        ),
        tableMeld(
          "set-b",
          ownerId,
          "set",
          [makeCard("spades", "9"), makeCard("clubs", "9"), wildB],
          [{ cardId: wildB.id, asRank: "9" }],
        ),
      ],
    };

    const result = applyAction(
      state,
      {
        kind: "layOff",
        targetMeldId: "set-a",
        card: makeCard("hearts", "9"),
        replaceWildCardId: wildA.id,
        relocation: {
          destinationMeldId: "set-b",
          wildDeclaration: { cardId: wildA.id, asRank: "9" },
        },
      },
      activeId,
    );

    expect(result.error).toBeUndefined();
    const destination = result.state.melds.find((meld) => meld.id === "set-b");
    expect(destination?.cards.filter((card) => card.rank === "JOKER")).toHaveLength(2);
  });
});

describe("opened player restrictions", () => {
  it("does not allow opened players to create new melds", () => {
    const state = startRound(createGame({ players: seatedPlayers(2) }), { seed: 1 });
    const activeId = state.players.find((player) => player.seatIndex === state.activeSeatIndex)!.id;
    const openedState = {
      ...stateAfterDraw(state),
      players: state.players.map((player) =>
        player.id === activeId
          ? { ...player, playerPhase: "opened" as const, openedThisTurn: false }
          : player,
      ),
    };

    expect(legalActions(openedState, activeId).canOpen).toBe(false);
  });
});
