import { describe, expect, it } from "vitest";
import {
  buildPodium,
  standingsOrder,
  winnerAnnouncement,
} from "../../src/lib/celebrationRanking";

describe("celebrationRanking", () => {
  it("builds olympic podium places by ascending score", () => {
    const podium = buildPodium([
      { id: "a", displayName: "Ada", cumulativeScore: 40 },
      { id: "b", displayName: "Bea", cumulativeScore: 10 },
      { id: "c", displayName: "Cal", cumulativeScore: 25 },
      { id: "d", displayName: "Dee", cumulativeScore: 55 },
    ]);

    expect(podium.map((entry) => entry.place)).toEqual([1, 2, 3]);
    expect(podium[0]!.players[0]!.id).toBe("b");
    expect(podium[1]!.players[0]!.id).toBe("c");
    expect(podium[2]!.players[0]!.id).toBe("a");
  });

  it("shares first place on ties and skips the next place", () => {
    const podium = buildPodium([
      { id: "a", displayName: "Ada", cumulativeScore: 10 },
      { id: "b", displayName: "Bea", cumulativeScore: 10 },
      { id: "c", displayName: "Cal", cumulativeScore: 30 },
    ]);

    expect(podium).toHaveLength(2);
    expect(podium[0]!.place).toBe(1);
    expect(podium[0]!.players.map((player) => player.id).sort()).toEqual(["a", "b"]);
    expect(podium[1]!.place).toBe(3);
    expect(podium[1]!.players[0]!.id).toBe("c");
  });

  it("orders standings and announces winners", () => {
    const players = [
      { id: "a", displayName: "Ada", cumulativeScore: 40 },
      { id: "b", displayName: "Bea", cumulativeScore: 10 },
    ];
    expect(standingsOrder(players).map((player) => player.id)).toEqual(["b", "a"]);
    expect(winnerAnnouncement(players, ["b"])).toBe("Bea wins!");
    expect(winnerAnnouncement(players, ["a", "b"])).toBe("Ada and Bea win!");
  });
});
