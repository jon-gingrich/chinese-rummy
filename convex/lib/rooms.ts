import type { Id } from "../_generated/dataModel";

export const SEAT_COUNT = 5;
export const MIN_PLAYERS = 2;

export type HumanSeat = {
  kind?: "human";
  userId: Id<"users">;
  ready: boolean;
};

export type AutomatedSeat = {
  kind: "automated";
  id: string;
  displayName: string;
  ready: boolean;
};

export type Seat = HumanSeat | AutomatedSeat | null;

export type RoomStatus = "lobby" | "playing" | "finished";

export function isHumanSeat(seat: NonNullable<Seat>): seat is HumanSeat {
  return "userId" in seat;
}

export function isAutomatedSeat(seat: NonNullable<Seat>): seat is AutomatedSeat {
  return seat.kind === "automated";
}

export function emptySeats(): Seat[] {
  return Array.from({ length: SEAT_COUNT }, () => null);
}

export function countSeated(seats: Seat[]): number {
  return seats.filter((seat) => seat !== null).length;
}

export function allSeatedReady(seats: Seat[]): boolean {
  const seated = seats.filter((seat): seat is NonNullable<Seat> => seat !== null);
  return seated.length > 0 && seated.every((seat) => seat.ready);
}

export function canStartGame(seats: Seat[]): boolean {
  return countSeated(seats) >= MIN_PLAYERS && allSeatedReady(seats);
}

export function findPlayerSeat(seats: Seat[], userId: Id<"users">): number | null {
  const index = seats.findIndex(
    (seat) => seat !== null && isHumanSeat(seat) && seat.userId === userId,
  );
  return index === -1 ? null : index;
}

export function isSeatOpen(seats: Seat[], seatIndex: number): boolean {
  return seatIndex >= 0 && seatIndex < SEAT_COUNT && seats[seatIndex] === null;
}

export function isAutomatedSeatAt(seats: Seat[], seatIndex: number): boolean {
  const seat = seats[seatIndex];
  return seat !== null && seat !== undefined && isAutomatedSeat(seat);
}

export function automatedDisplayNamesInUse(seats: Seat[]): Set<string> {
  const names = new Set<string>();
  for (const seat of seats) {
    if (seat && isAutomatedSeat(seat)) {
      names.add(seat.displayName);
    }
  }
  return names;
}
