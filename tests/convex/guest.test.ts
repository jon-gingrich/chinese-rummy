import { describe, expect, it } from "vitest";
import { api } from "../../convex/_generated/api";
import type { Id } from "../../convex/_generated/dataModel";
import { createTestContext, withAnonymousPlayer, withSeededPlayer } from "./helpers";

describe("guest play", () => {
  it("viewer reports guest status for anonymous users", async () => {
    const t = createTestContext();
    const asGuest = await withAnonymousPlayer(t, { displayName: "Table Guest" });

    const viewer = await asGuest.query(api.users.viewer, {});
    expect(viewer).toMatchObject({
      displayName: "Table Guest",
      isGuest: true,
    });
  });

  it("lets an anonymous player join a room seat", async () => {
    const t = createTestContext();
    const asHost = await withSeededPlayer(t, {
      name: "Host",
      email: "host@example.com",
    });
    const asGuest = await withAnonymousPlayer(t, { displayName: "Visitor" });

    const roomId = await asHost.mutation(api.rooms.createRoom, {});
    const room = await asHost.query(api.rooms.getRoom, { roomId });
    const code = room!.code;

    const joinedRoomId = await asGuest.mutation(api.rooms.joinSeat, {
      code,
      seatIndex: 1,
    });

    const updated = await asGuest.query(api.rooms.getRoom, { roomId: joinedRoomId });
    expect(updated?.seats[1]).toMatchObject({
      displayName: "Visitor",
      ready: false,
    });
  });

  it("mergeGuestAccount moves seat and game membership to the signed-in user", async () => {
    const t = createTestContext();
    const asHost = await withSeededPlayer(t, {
      name: "Host",
      email: "host@example.com",
    });
    const guestClient = await withAnonymousPlayer(t, { displayName: "Visitor" });
    const guestUserId = await guestClient.run(async (ctx) => {
      const identity = await ctx.auth.getUserIdentity();
      if (!identity) {
        throw new Error("Expected guest identity");
      }
      return identity.subject.split("|")[0] as Id<"users">;
    });

    const roomId = await asHost.mutation(api.rooms.createRoom, {});
    const room = await asHost.query(api.rooms.getRoom, { roomId });
    await guestClient.mutation(api.rooms.joinSeat, {
      code: room!.code,
      seatIndex: 1,
    });
    await guestClient.mutation(api.rooms.setReady, { roomId, ready: true });
    await asHost.mutation(api.rooms.setReady, { roomId, ready: true });
    await asHost.mutation(api.rooms.startGame, { roomId });

    const asLinked = await withSeededPlayer(t, {
      name: "Linked",
      email: "linked@example.com",
    });

    await asLinked.mutation(api.users.mergeGuestAccount, { guestUserId });

    const linkedViewer = await asLinked.query(api.users.viewer, {});
    const roomAfter = await asLinked.query(api.rooms.getRoom, { roomId });
    const linkedSeat = roomAfter?.seats.find((seat) => seat?.userId === linkedViewer?.userId);
    expect(linkedSeat).toMatchObject({ displayName: "Visitor" });

    const myGames = await asLinked.query(api.games.getMyGames, {});
    expect(myGames).toHaveLength(1);
    expect(myGames[0]?.roomId).toBe(roomId);
  });
});
