import { describe, expect, it } from "vitest";
import {
  applyAction,
  createGame,
  legalActions,
  startRound,
  type GameState,
  type TableMeld,
} from "../../../convex/lib/rules";
import { applyLayOff, findValidRelocationRanks } from "../../../convex/lib/rules/layoffs";
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

  it("allows laying off a joker onto a set with rank declaration", () => {
    let state = startRound(createGame({ players: seatedPlayers(2) }), { seed: 1 });
    const activeId = state.players.find((player) => player.seatIndex === state.activeSeatIndex)!.id;
    const otherId = state.players.find((player) => player.id !== activeId)!.id;
    const joker = makeCard("joker", "JOKER", 0);

    state = {
      ...state,
      players: state.players.map((player) =>
        player.id === activeId
          ? {
              ...player,
              playerPhase: "opened",
              openedThisTurn: false,
              hand: [joker, makeCard("clubs", "9")],
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
        card: joker,
        wildDeclaration: { cardId: joker.id, asRank: "7" },
      },
      activeId,
    );

    expect(result.error).toBeUndefined();
    expect(result.state.melds[0]?.cards).toHaveLength(4);
    expect(result.state.melds[0]?.wildDeclarations).toContainEqual({
      cardId: joker.id,
      asRank: "7",
    });
    expect(
      result.state.players.find((player) => player.id === activeId)?.hand,
    ).toHaveLength(1);
  });

  it("inserts a second wild into a set without adjacent wilds", () => {
    const activeId = "player-0";
    const otherId = "player-1";
    const existingWild = makeCard("joker", "JOKER", 0);
    const newWild = makeCard("joker", "JOKER", 1);
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
          hand: [newWild, makeCard("clubs", "9")],
        },
        {
          id: otherId,
          seatIndex: 1,
          playerPhase: "opened",
          openedThisTurn: false,
          hand: [],
        },
      ],
      melds: [
        tableMeld(
          "queen-set",
          otherId,
          "set",
          [makeCard("hearts", "Q"), makeCard("spades", "Q"), existingWild],
          [{ cardId: existingWild.id, asRank: "Q" }],
        ),
      ],
    };

    const result = applyAction(
      state,
      {
        kind: "layOff",
        targetMeldId: "queen-set",
        card: newWild,
        wildDeclaration: { cardId: newWild.id, asRank: "Q" },
      },
      activeId,
    );

    expect(result.error).toBeUndefined();
    const meld = result.state.melds[0]!;
    expect(meld.cards).toHaveLength(4);
    expect(meld.cards.filter((card) => card.rank === "JOKER")).toHaveLength(2);
    const wildIndexes = meld.cards
      .map((card, index) => (card.rank === "JOKER" ? index : -1))
      .filter((index) => index >= 0);
    expect(Math.abs(wildIndexes[0]! - wildIndexes[1]!)).toBeGreaterThan(1);
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
          hand: [makeCard("hearts", "8"), makeCard("clubs", "9")],
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
          "run-a",
          ownerId,
          "run",
          [makeCard("hearts", "7"), joker, makeCard("hearts", "9")],
          [{ cardId: joker.id, asRank: "8" }],
        ),
        tableMeld("run-b", ownerId, "run", [
          makeCard("hearts", "3"),
          makeCard("hearts", "4"),
          makeCard("hearts", "5"),
        ]),
      ],
    };

    const withoutRelocation = applyAction(
      state,
      {
        kind: "layOff",
        targetMeldId: "run-a",
        card: makeCard("hearts", "8"),
        replaceWildCardId: joker.id,
      },
      activeId,
    );
    expect(withoutRelocation.error).toBe("Wild replacement requires relocation");

    const relocated = applyAction(
      state,
      {
        kind: "layOff",
        targetMeldId: "run-a",
        card: makeCard("hearts", "8"),
        replaceWildCardId: joker.id,
        relocation: {
          destinationMeldId: "run-b",
          wildDeclaration: { cardId: joker.id, asRank: "6" },
        },
      },
      activeId,
    );
    expect(relocated.error).toBeUndefined();
    expect(relocated.state.melds.find((meld) => meld.id === "run-a")?.cards).toEqual([
      makeCard("hearts", "7"),
      makeCard("hearts", "8"),
      makeCard("hearts", "9"),
    ]);
    expect(
      relocated.state.melds.find((meld) => meld.id === "run-b")?.cards.some(
        (card) => card.id === joker.id,
      ),
    ).toBe(true);
  });

  it("rejects wild replacement on sets", () => {
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

    const result = applyAction(
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
    expect(result.error).toBe("Wild replacement is not allowed on sets");
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
          "run-a",
          ownerId,
          "run",
          [makeCard("hearts", "8"), wildA, makeCard("hearts", "10")],
          [{ cardId: wildA.id, asRank: "9" }],
        ),
        tableMeld(
          "run-b",
          ownerId,
          "run",
          [makeCard("hearts", "6"), makeCard("hearts", "7"), wildB],
          [{ cardId: wildB.id, asRank: "8" }],
        ),
      ],
    };

    const result = applyAction(
      state,
      {
        kind: "layOff",
        targetMeldId: "run-a",
        card: makeCard("hearts", "9"),
        replaceWildCardId: wildA.id,
        relocation: {
          destinationMeldId: "run-b",
          wildDeclaration: { cardId: wildA.id, asRank: "9" },
        },
      },
      activeId,
    );

    expect(result.error).toBeUndefined();
    const destination = result.state.melds.find((meld) => meld.id === "run-b");
    expect(destination?.cards.filter((card) => card.rank === "JOKER")).toHaveLength(2);
  });

  it("allows relocating a freed wild onto the same run to extend it", () => {
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
          hand: [makeCard("diamonds", "4", 1), makeCard("clubs", "9")],
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
          "diamond-run",
          ownerId,
          "run",
          [
            makeCard("diamonds", "3"),
            joker,
            makeCard("diamonds", "5"),
            makeCard("diamonds", "6"),
            makeCard("diamonds", "7"),
            makeCard("diamonds", "8"),
            makeCard("diamonds", "9"),
          ],
          [{ cardId: joker.id, asRank: "4" }],
        ),
      ],
    };

    const result = applyAction(
      state,
      {
        kind: "layOff",
        targetMeldId: "diamond-run",
        card: makeCard("diamonds", "4", 1),
        replaceWildCardId: joker.id,
        relocation: {
          destinationMeldId: "diamond-run",
          wildDeclaration: { cardId: joker.id, asRank: "10" },
        },
      },
      activeId,
    );

    expect(result.error).toBeUndefined();
    const updated = result.state.melds.find((meld) => meld.id === "diamond-run");
    expect(updated?.cards.map((card) => card.rank)).toEqual([
      "3",
      "4",
      "5",
      "6",
      "7",
      "8",
      "9",
      "JOKER",
    ]);
    expect(updated?.wildDeclarations).toContainEqual({
      cardId: joker.id,
      asRank: "10",
    });
  });

  it("rejects same-meld relocation when the wild rank is invalid", () => {
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
          hand: [makeCard("diamonds", "4", 1), makeCard("clubs", "9")],
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
          "diamond-run",
          ownerId,
          "run",
          [
            makeCard("diamonds", "3"),
            joker,
            makeCard("diamonds", "5"),
            makeCard("diamonds", "6"),
            makeCard("diamonds", "7"),
            makeCard("diamonds", "8"),
            makeCard("diamonds", "9"),
          ],
          [{ cardId: joker.id, asRank: "4" }],
        ),
      ],
    };

    const result = applyAction(
      state,
      {
        kind: "layOff",
        targetMeldId: "diamond-run",
        card: makeCard("diamonds", "4", 1),
        replaceWildCardId: joker.id,
        relocation: {
          destinationMeldId: "diamond-run",
          wildDeclaration: { cardId: joker.id, asRank: "7" },
        },
      },
      activeId,
    );

    expect(result.error).toBe("Relocation leaves destination meld invalid");
  });

  it("defaults same-meld relocation to a valid extension rank", () => {
    const joker = makeCard("joker", "JOKER", 0);
    const fourDiamonds = makeCard("diamonds", "4", 1);
    const meld = tableMeld(
      "diamond-run",
      "player-1",
      "run",
      [
        makeCard("diamonds", "3"),
        joker,
        makeCard("diamonds", "5"),
        makeCard("diamonds", "6"),
        makeCard("diamonds", "7"),
        makeCard("diamonds", "8"),
        makeCard("diamonds", "9"),
      ],
      [{ cardId: joker.id, asRank: "4" }],
    );

    const ranks = findValidRelocationRanks(
      meld,
      fourDiamonds,
      joker.id,
      "diamond-run",
      [meld],
    );

    // Default wildRank in the UI is "7"; same-meld extension must not leave the
    // confirm button stuck on an invalid default.
    expect(ranks).not.toContain("7");
    expect(ranks.length).toBeGreaterThan(0);
    expect(ranks).toContain("10");
  });
});

describe("run meld ordering", () => {
  it("places ace after king when extending an ace-high run", () => {
    const joker = makeCard("joker", "JOKER", 0);
    const ace = makeCard("hearts", "A");
    const melds = [
      tableMeld(
        "heart-run",
        "player-1",
        "run",
        [makeCard("hearts", "J"), joker, makeCard("hearts", "K")],
        [{ cardId: joker.id, asRank: "Q" }],
      ),
    ];

    const result = applyLayOff(melds, {
      targetMeldId: "heart-run",
      card: ace,
    });

    expect("error" in result).toBe(false);
    if ("error" in result) {
      return;
    }

    const updated = result.melds.find((meld) => meld.id === "heart-run");
    expect(updated?.cards.map((card) => card.rank)).toEqual(["J", "JOKER", "K", "A"]);
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
