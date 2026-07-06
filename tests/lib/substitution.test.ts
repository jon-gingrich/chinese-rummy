import { describe, expect, it } from "vitest";
import { createGame, startRound } from "../../convex/lib/rules";
import { replacePlayerIdInGameState } from "../../convex/lib/substitution";

describe("replacePlayerIdInGameState", () => {
  it("rewrites player ids, meld ownership, and rummy metadata", () => {
    const humanId = "user_human";
    const autoId = "auto:substitute";
    const state = startRound(
      createGame({
        players: [
          { id: humanId, seatIndex: 0 },
          { id: "user_other", seatIndex: 1 },
        ],
      }),
    );

    const withMeld = {
      ...state,
      melds: [
        {
          id: `${humanId}-meld-0`,
          ownerId: humanId,
          kind: "set" as const,
          cards: state.players[0]!.hand.slice(0, 3),
          wildDeclarations: [],
        },
      ],
      rummyPenaltyCounts: { [humanId]: 2 },
      rummyWindow: {
        discarderId: humanId,
        discardedCard: state.players[0]!.hand[0]!,
        wouldGoOut: false,
      },
    };

    const next = replacePlayerIdInGameState(withMeld, humanId, autoId);

    expect(next.players[0]?.id).toBe(autoId);
    expect(next.melds[0]?.ownerId).toBe(autoId);
    expect(next.melds[0]?.id).toContain(autoId);
    expect(next.rummyPenaltyCounts[autoId]).toBe(2);
    expect(next.rummyPenaltyCounts[humanId]).toBeUndefined();
    expect(next.rummyWindow?.discarderId).toBe(autoId);
  });
});
