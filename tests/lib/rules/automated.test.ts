import { describe, expect, it } from "vitest";
import {
  applyAction,
  createGame,
  legalActions,
  startRound,
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
});
