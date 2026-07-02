import { describe, expect, it } from "vitest";
import { api } from "../../convex/_generated/api";
import { createTestContext, withSeededPlayer } from "./helpers";

async function seedHostAndGuest() {
  const t = createTestContext();
  const asHost = await withSeededPlayer(t, {
    name: "Host",
    email: "host@example.com",
  });
  const asGuest = await withSeededPlayer(t, {
    name: "Guest",
    email: "guest@example.com",
  });
  return { t, asHost, asGuest };
}

describe("rooms.createRoom", () => {
  it("creates a room with a six-character code and seats the host", async () => {
    const { asHost } = await seedHostAndGuest();

    const roomId = await asHost.mutation(api.rooms.createRoom, {});

    const room = await asHost.query(api.rooms.getRoom, { roomId });
    expect(room).not.toBeNull();
    expect(room?.code).toMatch(/^[A-Z0-9]{6}$/);
    expect(room?.hostId).toBeDefined();
    expect(room?.status).toBe("lobby");
    expect(room?.seats[0]).toMatchObject({ ready: false });
  });
});

describe("rooms.joinSeat", () => {
  it("lets a player claim an open seat by room code", async () => {
    const { asHost, asGuest } = await seedHostAndGuest();
    const roomId = await asHost.mutation(api.rooms.createRoom, {});
    const room = await asHost.query(api.rooms.getRoom, { roomId });
    const code = room!.code;

    await asGuest.mutation(api.rooms.joinSeat, { code, seatIndex: 2 });

    const updated = await asGuest.query(api.rooms.getRoom, { roomId });
    expect(updated?.seats[2]).toMatchObject({ ready: false });
  });

  it("rejects joining an occupied seat", async () => {
    const { asHost, asGuest } = await seedHostAndGuest();
    const roomId = await asHost.mutation(api.rooms.createRoom, {});
    const room = await asHost.query(api.rooms.getRoom, { roomId });

    await expect(
      asGuest.mutation(api.rooms.joinSeat, {
        code: room!.code,
        seatIndex: 0,
      }),
    ).rejects.toThrow("Seat is not available");
  });
});

describe("rooms.setReady", () => {
  it("toggles ready for the seated player", async () => {
    const { asHost } = await seedHostAndGuest();
    const roomId = await asHost.mutation(api.rooms.createRoom, {});

    await asHost.mutation(api.rooms.setReady, { roomId, ready: true });

    const room = await asHost.query(api.rooms.getRoom, { roomId });
    expect(room?.seats[0]).toMatchObject({ ready: true });
  });
});

describe("rooms.startGame", () => {
  it("lets the host start when at least two seated players are ready", async () => {
    const { asHost, asGuest } = await seedHostAndGuest();
    const roomId = await asHost.mutation(api.rooms.createRoom, {});
    const room = await asHost.query(api.rooms.getRoom, { roomId });

    await asGuest.mutation(api.rooms.joinSeat, {
      code: room!.code,
      seatIndex: 1,
    });
    await asHost.mutation(api.rooms.setReady, { roomId, ready: true });
    await asGuest.mutation(api.rooms.setReady, { roomId, ready: true });

    await asHost.mutation(api.rooms.startGame, { roomId });

    const started = await asHost.query(api.rooms.getRoom, { roomId });
    expect(started?.status).toBe("playing");
  });

  it("rejects start when not everyone seated is ready", async () => {
    const { asHost, asGuest } = await seedHostAndGuest();
    const roomId = await asHost.mutation(api.rooms.createRoom, {});
    const room = await asHost.query(api.rooms.getRoom, { roomId });

    await asGuest.mutation(api.rooms.joinSeat, {
      code: room!.code,
      seatIndex: 1,
    });
    await asHost.mutation(api.rooms.setReady, { roomId, ready: true });

    await expect(
      asHost.mutation(api.rooms.startGame, { roomId }),
    ).rejects.toThrow("Not all seated players are ready");
  });

  it("rejects start when fewer than two players are seated", async () => {
    const { asHost } = await seedHostAndGuest();
    const roomId = await asHost.mutation(api.rooms.createRoom, {});

    await asHost.mutation(api.rooms.setReady, { roomId, ready: true });

    await expect(
      asHost.mutation(api.rooms.startGame, { roomId }),
    ).rejects.toThrow("At least two players must be seated");
  });

  it("rejects start from a non-host", async () => {
    const { asHost, asGuest } = await seedHostAndGuest();
    const roomId = await asHost.mutation(api.rooms.createRoom, {});
    const room = await asHost.query(api.rooms.getRoom, { roomId });

    await asGuest.mutation(api.rooms.joinSeat, {
      code: room!.code,
      seatIndex: 1,
    });
    await asHost.mutation(api.rooms.setReady, { roomId, ready: true });
    await asGuest.mutation(api.rooms.setReady, { roomId, ready: true });

    await expect(
      asGuest.mutation(api.rooms.startGame, { roomId }),
    ).rejects.toThrow("Only the host can start the game");
  });
});

describe("rooms.getRoomByCode", () => {
  it("looks up a room by its code", async () => {
    const { asHost } = await seedHostAndGuest();
    const roomId = await asHost.mutation(api.rooms.createRoom, {});
    const created = await asHost.query(api.rooms.getRoom, { roomId });

    const found = await asHost.query(api.rooms.getRoomByCode, {
      code: created!.code,
    });
    expect(found?._id).toBe(roomId);
  });
});

describe("rooms.getRoom", () => {
  it("includes display names for seated players", async () => {
    const { asHost } = await seedHostAndGuest();
    const roomId = await asHost.mutation(api.rooms.createRoom, {});

    const room = await asHost.query(api.rooms.getRoom, { roomId });
    expect(room?.seats[0]?.displayName).toBe("Host");
  });

  it("persists after clients disconnect", async () => {
    const t = createTestContext();
    const asHost = await withSeededPlayer(t, {
      name: "Host",
      email: "host@example.com",
    });
    const roomId = await asHost.mutation(api.rooms.createRoom, {});

    const persisted = await t.query(api.rooms.getRoom, { roomId });
    expect(persisted?.code).toMatch(/^[A-Z0-9]{6}$/);
  });
});
