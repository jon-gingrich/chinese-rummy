import { describe, expect, it } from "vitest";
import { api } from "../../convex/_generated/api";
import { createTestContext, withSeededPlayer } from "./helpers";

describe("practice.startPracticeGame", () => {
  it("creates a practice game with automated opponents", async () => {
    const t = createTestContext();
    const asPlayer = await withSeededPlayer(t, {
      name: "Practice Host",
      email: "practice@example.com",
    });

    const gameId = await asPlayer.mutation(api.practice.startPracticeGame, {
      opponentCount: 2,
    });

    const game = await t.run(async (ctx) => ctx.db.get("games", gameId));
    expect(game?.gameMode).toBe("practice");
    expect(game?.roomId).toBeUndefined();
    expect(game?.automatedPlayers).toHaveLength(2);
    expect((game?.state as { players: Array<{ id: string }> }).players).toHaveLength(3);
  });

  it("abandon removes the game from my games", async () => {
    const t = createTestContext();
    const asPlayer = await withSeededPlayer(t, {
      name: "Practice Host",
      email: "abandon@example.com",
    });

    const gameId = await asPlayer.mutation(api.practice.startPracticeGame, {
      opponentCount: 1,
    });

    let myGames = await asPlayer.query(api.games.getMyGames, {});
    expect(myGames.some((entry) => entry.gameId === gameId)).toBe(true);
    expect(myGames.find((entry) => entry.gameId === gameId)?.canArchive).toBe(true);

    await asPlayer.mutation(api.practice.abandonPracticeGame, { gameId });

    myGames = await asPlayer.query(api.games.getMyGames, {});
    expect(myGames.some((entry) => entry.gameId === gameId)).toBe(false);
  });

  it("archiveGame removes practice games from my games", async () => {
    const t = createTestContext();
    const asPlayer = await withSeededPlayer(t, {
      name: "Practice Host",
      email: "archive@example.com",
    });

    const gameId = await asPlayer.mutation(api.practice.startPracticeGame, {
      opponentCount: 1,
    });

    await asPlayer.mutation(api.games.archiveGame, { gameId });

    const myGames = await asPlayer.query(api.games.getMyGames, {});
    expect(myGames.some((entry) => entry.gameId === gameId)).toBe(false);
  });
});
