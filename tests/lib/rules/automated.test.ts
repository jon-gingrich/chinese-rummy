import { describe, expect, it } from "vitest";
import {
  applyAction,
  createGame,
  legalActions,
  startRound,
  type Action,
  type GameState,
  type TableMeld,
} from "../../../convex/lib/rules";
import { chooseAutomatedTurnStep } from "../../../convex/lib/rules/automated";
import { findOpeningMeldsForContract } from "../../../convex/lib/rules/automatedOpening";
import { makeCard } from "../../../convex/lib/rules/melds";
import { AUTOMATED_PLAYER_ID_PREFIX } from "../../../convex/lib/automatedPlayers";

function seatedPlayers(count: number) {
  return Array.from({ length: count }, (_, index) => ({
    id:
      index === 0
        ? "human-player"
        : `${AUTOMATED_PLAYER_ID_PREFIX}bot-${index}`,
    seatIndex: index,
  }));
}

function tableMeld(
  id: string,
  ownerId: string,
  kind: "set" | "run",
  cards: ReturnType<typeof makeCard>[],
): TableMeld {
  return { id, ownerId, kind, cards, wildDeclarations: [] };
}

function runAutomatedTurnActions(state: GameState, botId: string): Action[] {
  const botSeat = state.players.find((player) => player.id === botId)!.seatIndex;
  const actions: Action[] = [];

  for (let step = 0; step < 20; step += 1) {
    if (state.activeSeatIndex !== botSeat) {
      break;
    }

    const choice = chooseAutomatedTurnStep(state, botId);
    if (choice.kind === "idle") {
      break;
    }

    actions.push(choice.action);
    const result = applyAction(state, choice.action, botId);
    if (result.error) {
      throw new Error(result.error);
    }
    state = result.state;
  }

  return actions;
}

describe("findOpeningMeldsForContract", () => {
  it("finds two sets of three for round 1", () => {
    const hand = [
      makeCard("hearts", "7"),
      makeCard("spades", "7"),
      makeCard("clubs", "7"),
      makeCard("diamonds", "8"),
      makeCard("hearts", "8"),
      makeCard("spades", "8"),
      makeCard("clubs", "9"),
    ];

    const melds = findOpeningMeldsForContract(hand, 1);
    expect(melds).not.toBeNull();
    expect(melds).toHaveLength(2);
  });
});

describe("chooseAutomatedTurnStep", () => {
  it("draws from stock on its turn", () => {
    const state = startRound(createGame({ players: seatedPlayers(2) }), { seed: 3 });
    const botId = state.players.find((player) => player.id.startsWith(AUTOMATED_PLAYER_ID_PREFIX))!.id;
    const prepared = {
      ...state,
      activeSeatIndex: state.players.find((player) => player.id === botId)!.seatIndex,
      turnPhase: "draw" as const,
    };

    const step = chooseAutomatedTurnStep(prepared, botId);
    expect(step.kind).toBe("action");
    if (step.kind === "action") {
      expect(step.action.kind).toBe("draw");
    }
  });

  it("applies a legal automated turn without error", () => {
    let state = startRound(createGame({ players: seatedPlayers(2) }), { seed: 5 });
    const botId = state.players.find((player) => player.id.startsWith(AUTOMATED_PLAYER_ID_PREFIX))!.id;
    state = {
      ...state,
      activeSeatIndex: state.players.find((player) => player.id === botId)!.seatIndex,
    };

    const step = chooseAutomatedTurnStep(state, botId);
    expect(step.kind).toBe("action");
    if (step.kind !== "action") {
      return;
    }

    const result = applyAction(state, step.action, botId);
    expect(result.error).toBeUndefined();
    expect(legalActions(result.state, botId).canDiscard || result.state.turnPhase === "discard").toBe(
      true,
    );
  });

  it("opens before laying off when going down with a contract", () => {
    const humanId = "human-player";
    const botId = `${AUTOMATED_PLAYER_ID_PREFIX}bot-1`;
    const openingCards = [
      makeCard("hearts", "7"),
      makeCard("spades", "7"),
      makeCard("clubs", "7"),
      makeCard("diamonds", "8"),
      makeCard("hearts", "8"),
      makeCard("spades", "8"),
    ];
    const layOffCard = makeCard("diamonds", "9");
    const discardCard = makeCard("clubs", "5");

    let state = startRound(createGame({ players: seatedPlayers(2) }), { seed: 1 });
    state = {
      ...state,
      activeSeatIndex: 1,
      turnPhase: "discard",
      players: state.players.map((player) => {
        if (player.id === humanId) {
          return {
            ...player,
            playerPhase: "opened" as const,
            openedThisTurn: false,
            hand: [makeCard("hearts", "K")],
          };
        }
        return {
          ...player,
          hand: [...openingCards, layOffCard, discardCard],
        };
      }),
      melds: [
        tableMeld("human-set", humanId, "set", [
          makeCard("diamonds", "9"),
          makeCard("hearts", "9"),
          makeCard("clubs", "9"),
        ]),
      ],
    };

    const actions = runAutomatedTurnActions(state, botId);
    const openIndex = actions.findIndex((action) => action.kind === "open");
    const layOffBeforeOpen = actions
      .slice(0, openIndex === -1 ? actions.length : openIndex)
      .some((action) => action.kind === "layOff");

    expect(openIndex).toBeGreaterThanOrEqual(0);
    expect(layOffBeforeOpen).toBe(false);
    expect(actions.some((action) => action.kind === "layOff")).toBe(false);
  });

  it("may lay off on a later turn after opening", () => {
    const humanId = "human-player";
    const botId = `${AUTOMATED_PLAYER_ID_PREFIX}bot-1`;

    let state = startRound(createGame({ players: seatedPlayers(2) }), { seed: 1 });
    state = {
      ...state,
      activeSeatIndex: 1,
      turnPhase: "discard",
      players: state.players.map((player) => {
        if (player.id === botId) {
          return {
            ...player,
            playerPhase: "opened" as const,
            openedThisTurn: false,
            hand: [makeCard("diamonds", "7"), makeCard("clubs", "9")],
          };
        }
        return player;
      }),
      melds: [
        tableMeld("human-set", humanId, "set", [
          makeCard("diamonds", "7"),
          makeCard("hearts", "7"),
          makeCard("clubs", "7"),
        ]),
        tableMeld("bot-set", botId, "set", [
          makeCard("spades", "8"),
          makeCard("hearts", "8"),
          makeCard("clubs", "8"),
        ]),
      ],
    };

    const step = chooseAutomatedTurnStep(state, botId);
    expect(step.kind).toBe("action");
    if (step.kind === "action") {
      expect(step.action.kind).toBe("layOff");
    }
  });
});
