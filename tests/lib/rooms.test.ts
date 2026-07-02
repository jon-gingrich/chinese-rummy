import { describe, expect, it } from "vitest";
import type { Id } from "../../convex/_generated/dataModel";
import {
  allSeatedReady,
  canStartGame,
  countSeated,
  emptySeats,
  findPlayerSeat,
  isSeatOpen,
  SEAT_COUNT,
} from "../../convex/lib/rooms";

const userA = "userA" as Id<"users">;
const userB = "userB" as Id<"users">;
const userC = "userC" as Id<"users">;

describe("room lobby helpers", () => {
  it("starts with five empty seats", () => {
    const seats = emptySeats();
    expect(seats).toHaveLength(SEAT_COUNT);
    expect(countSeated(seats)).toBe(0);
  });

  it("counts seated players", () => {
    const seats = emptySeats();
    seats[0] = { userId: userA, ready: false };
    seats[2] = { userId: userB, ready: true };
    expect(countSeated(seats)).toBe(2);
  });

  it("requires every seated player to be ready", () => {
    const seats = emptySeats();
    seats[0] = { userId: userA, ready: true };
    seats[1] = { userId: userB, ready: false };
    expect(allSeatedReady(seats)).toBe(false);

    seats[1] = { userId: userB, ready: true };
    expect(allSeatedReady(seats)).toBe(true);
  });

  it("allows start only with at least two seated ready players", () => {
    const seats = emptySeats();
    seats[0] = { userId: userA, ready: true };
    expect(canStartGame(seats)).toBe(false);

    seats[1] = { userId: userB, ready: true };
    expect(canStartGame(seats)).toBe(true);
  });

  it("finds a player's seat index", () => {
    const seats = emptySeats();
    seats[3] = { userId: userC, ready: false };
    expect(findPlayerSeat(seats, userC)).toBe(3);
    expect(findPlayerSeat(seats, userA)).toBeNull();
  });

  it("reports whether a seat is open", () => {
    const seats = emptySeats();
    seats[1] = { userId: userA, ready: false };
    expect(isSeatOpen(seats, 0)).toBe(true);
    expect(isSeatOpen(seats, 1)).toBe(false);
    expect(isSeatOpen(seats, SEAT_COUNT)).toBe(false);
  });
});
