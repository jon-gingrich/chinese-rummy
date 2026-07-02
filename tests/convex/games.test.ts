import { describe, expect, it } from "vitest";
import { api } from "../../convex/_generated/api";
import { createTestContext, withSeededPlayer } from "./helpers";

async function startTwoPlayerGame() {
  const t = createTestContext();
  const asHost = await withSeededPlayer(t, {
    name: "Host",
    email: "host@example.com",
  });
  const asGuest = await withSeededPlayer(t, {
    name: "Guest",
    email: "guest@example.com",
  });

  const roomId = await asHost.mutation(api.rooms.createRoom, {});
  const room = await asHost.query(api.rooms.getRoom, { roomId });

  await asGuest.mutation(api.rooms.joinSeat, {
    code: room!.code,
    seatIndex: 1,
  });
  await asHost.mutation(api.rooms.setReady, { roomId, ready: true });
  await asGuest.mutation(api.rooms.setReady, { roomId, ready: true });
  await asHost.mutation(api.rooms.startGame, { roomId });

  return { t, asHost, asGuest, roomId };
}

describe("games after startGame", () => {
  it("creates a dealt game linked to the room", async () => {
    const { asHost, roomId } = await startTwoPlayerGame();

    const room = await asHost.query(api.rooms.getRoom, { roomId });
    expect(room?.status).toBe("playing");
    expect(room?.gameId).toBeDefined();

    const table = await asHost.query(api.games.getGame, { roomId });
    expect(table).not.toBeNull();
    expect(table?.roundNumber).toBe(1);
    expect(table?.players).toHaveLength(2);
    expect(table?.players.every((player) => player.handSize === 13)).toBe(true);
  });

  it("returns only the authenticated player's hand", async () => {
    const { asHost, asGuest, roomId } = await startTwoPlayerGame();

    const hostHand = await asHost.query(api.games.getMyHand, { roomId });
    const guestHand = await asGuest.query(api.games.getMyHand, { roomId });

    expect(hostHand).toHaveLength(13);
    expect(guestHand).toHaveLength(13);
    expect(hostHand?.map((card) => card.id)).not.toEqual(
      guestHand?.map((card) => card.id),
    );
  });
});

describe("games.draw and games.discard", () => {
  it("lets the active player draw then discard to pass the turn", async () => {
    const { asHost, asGuest, roomId } = await startTwoPlayerGame();

    const tableBefore = await asHost.query(api.games.getGame, { roomId });
    const activeSeat = tableBefore!.activeSeatIndex;
    const activeClient =
      tableBefore!.players.find((player) => player.seatIndex === activeSeat)
        ?.displayName === "Host"
        ? asHost
        : asGuest;

    const drawResult = await activeClient.mutation(api.games.draw, {
      roomId,
      source: "stock",
    });
    expect(drawResult.error).toBeUndefined();
    expect(drawResult.hand).toHaveLength(14);
    expect(drawResult.legalActions.canDiscard).toBe(true);

    const card = drawResult.hand[0]!;
    const discardResult = await activeClient.mutation(api.games.discard, {
      roomId,
      card,
    });
    expect(discardResult.error).toBeUndefined();
    expect(discardResult.hand).toHaveLength(13);
    expect(discardResult.table.activeSeatIndex).not.toBe(activeSeat);
    expect(discardResult.table.topDiscard?.id).toBe(card.id);
  });

  it("rejects actions from a non-active player", async () => {
    const { asHost, asGuest, roomId } = await startTwoPlayerGame();

    const table = await asHost.query(api.games.getGame, { roomId });
    const inactiveClient =
      table!.players.find((player) => player.isActive)?.displayName === "Host"
        ? asGuest
        : asHost;

    const result = await inactiveClient.mutation(api.games.draw, {
      roomId,
      source: "stock",
    });
    expect(result.error).toBe("Not your turn");
  });
});
