import { describe, expect, it } from "vitest";
import { api } from "../../convex/_generated/api";
import { makeCard } from "../../convex/lib/rules/melds";
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
    expect(table?.contract).toBe("set of 3, set of 3");
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

describe("games.open", () => {
  it("accepts a valid opening and marks the player opened", async () => {
    const { asHost, asGuest, roomId, t } = await startTwoPlayerGame();
    const tableBefore = await asHost.query(api.games.getGame, { roomId });
    const activePlayer = tableBefore!.players.find((player) => player.isActive)!;
    const activeClient = activePlayer.displayName === "Host" ? asHost : asGuest;

    await t.run(async (ctx) => {
      const room = await ctx.db.get("rooms", roomId);
      const game = await ctx.db.get("games", room!.gameId!);
      const state = structuredClone(game!.state);
      const activeIndex = state.players.findIndex(
        (player: { id: string }) => player.id === activePlayer.id,
      );
      const openingCards = [
        makeCard("hearts", "7"),
        makeCard("spades", "7"),
        makeCard("clubs", "7"),
        makeCard("diamonds", "8"),
        makeCard("hearts", "8"),
        makeCard("spades", "8"),
      ];
      state.turnPhase = "discard";
      state.players[activeIndex] = {
        ...state.players[activeIndex],
        hand: [...openingCards, makeCard("clubs", "9")],
      };
      await ctx.db.patch("games", game!._id, { state });
    });

    const result = await activeClient.mutation(api.games.open, {
      roomId,
      melds: [
        {
          kind: "set",
          cards: [
            makeCard("hearts", "7"),
            makeCard("spades", "7"),
            makeCard("clubs", "7"),
          ],
          wildDeclarations: [],
        },
        {
          kind: "set",
          cards: [
            makeCard("diamonds", "8"),
            makeCard("hearts", "8"),
            makeCard("spades", "8"),
          ],
          wildDeclarations: [],
        },
      ],
    });

    expect(result.error).toBeUndefined();
    expect(result.table.melds).toHaveLength(2);
    expect(
      result.table.players.find((player) => player.id === activePlayer.id)?.playerPhase,
    ).toBe("opened");
  });

  it("rejects partial openings", async () => {
    const { asHost, asGuest, roomId, t } = await startTwoPlayerGame();
    const tableBefore = await asHost.query(api.games.getGame, { roomId });
    const activePlayer = tableBefore!.players.find((player) => player.isActive)!;
    const activeClient = activePlayer.displayName === "Host" ? asHost : asGuest;

    await t.run(async (ctx) => {
      const room = await ctx.db.get("rooms", roomId);
      const game = await ctx.db.get("games", room!.gameId!);
      const state = structuredClone(game!.state);
      const activeIndex = state.players.findIndex(
        (player: { id: string }) => player.id === activePlayer.id,
      );
      state.turnPhase = "discard";
      state.players[activeIndex] = {
        ...state.players[activeIndex],
        hand: [
          makeCard("hearts", "7"),
          makeCard("spades", "7"),
          makeCard("clubs", "7"),
        ],
      };
      await ctx.db.patch("games", game!._id, { state });
    });

    const result = await activeClient.mutation(api.games.open, {
      roomId,
      melds: [
        {
          kind: "set",
          cards: [
            makeCard("hearts", "7"),
            makeCard("spades", "7"),
            makeCard("clubs", "7"),
          ],
          wildDeclarations: [],
        },
      ],
    });

    expect(result.error).toBe("Opening melds do not match the round contract");
  });
});

describe("games.getMyGames", () => {
  it("returns in-progress games for seated players after startGame", async () => {
    const { asHost, asGuest, roomId } = await startTwoPlayerGame();

    const hostGames = await asHost.query(api.games.getMyGames, {});
    const guestGames = await asGuest.query(api.games.getMyGames, {});

    expect(hostGames).toHaveLength(1);
    expect(guestGames).toHaveLength(1);
    expect(hostGames[0]).toMatchObject({
      roomId,
      roundNumber: 1,
      contract: "set of 3, set of 3",
      playerCount: 2,
      phase: "playing",
    });
    expect(hostGames[0]?.roomCode).toMatch(/^[A-Z0-9]{6}$/);
  });

  it("excludes finished games from the list", async () => {
    const { asHost, roomId, t } = await startTwoPlayerGame();

    await t.run(async (ctx) => {
      const room = await ctx.db.get("rooms", roomId);
      const game = await ctx.db.get("games", room!.gameId!);
      await ctx.db.patch("games", game!._id, {
        state: { ...game!.state, phase: "gameEnd" },
      });
      await ctx.db.patch("rooms", roomId, { status: "finished" });
      const participants = await ctx.db
        .query("gameParticipants")
        .withIndex("by_game", (q) => q.eq("gameId", game!._id))
        .collect();
      for (const participant of participants) {
        await ctx.db.patch("gameParticipants", participant._id, { status: "finished" });
      }
    });

    const games = await asHost.query(api.games.getMyGames, {});
    expect(games).toHaveLength(0);
  });

  it("restores table state when rejoining via room route", async () => {
    const { asHost, roomId } = await startTwoPlayerGame();

    const listed = await asHost.query(api.games.getMyGames, {});
    expect(listed).toHaveLength(1);

    const table = await asHost.query(api.games.getGame, { roomId });
    const hand = await asHost.query(api.games.getMyHand, { roomId });

    expect(table).not.toBeNull();
    expect(table?.roundNumber).toBe(listed[0]?.roundNumber);
    expect(hand).toHaveLength(13);
  });
});

describe("games.layOff", () => {
  it("lets an opened player lay off on another meld", async () => {
    const { asHost, asGuest, roomId, t } = await startTwoPlayerGame();
    const tableBefore = await asHost.query(api.games.getGame, { roomId });
    const host = tableBefore!.players.find((player) => player.displayName === "Host")!;
    const guest = tableBefore!.players.find((player) => player.displayName === "Guest")!;

    await t.run(async (ctx) => {
      const room = await ctx.db.get("rooms", roomId);
      const game = await ctx.db.get("games", room!.gameId!);
      const state = structuredClone(game!.state);
      state.turnPhase = "discard";
      state.activeSeatIndex = host.seatIndex;
      state.players = state.players.map((player: { id: string }) => {
        if (player.id === host.id) {
          return {
            ...player,
            playerPhase: "opened",
            openedThisTurn: false,
            hand: [makeCard("hearts", "7")],
          };
        }
        return { ...player, playerPhase: "opened", openedThisTurn: false, hand: [] };
      });
      state.melds = [
        {
          id: "guest-set",
          ownerId: guest.id,
          kind: "set",
          cards: [
            makeCard("diamonds", "7"),
            makeCard("clubs", "7"),
            makeCard("spades", "7"),
          ],
          wildDeclarations: [],
        },
      ];
      await ctx.db.patch("games", game!._id, { state });
    });

    const result = await asHost.mutation(api.games.layOff, {
      roomId,
      targetMeldId: "guest-set",
      card: makeCard("hearts", "7"),
    });

    expect(result.error).toBe("Must discard to go out");
    expect(result.table.melds[0]?.cards).toHaveLength(3);
    expect(result.hand).toHaveLength(1);
  });
});
