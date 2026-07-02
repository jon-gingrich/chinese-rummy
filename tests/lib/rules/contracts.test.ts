import { describe, expect, it } from "vitest";
import {
  CONTRACT_SCHEDULE,
  formatContract,
  getContractForRound,
  matchesContract,
} from "../../../convex/lib/rules/contracts";

describe("contract schedule", () => {
  it.each([
    [1, "set of 3, set of 3"],
    [2, "run of 3, run of 3"],
    [3, "set of 3, run of 4"],
    [4, "set of 4, set of 4"],
    [5, "run of 4, run of 4"],
    [6, "set of 4, run of 5"],
    [7, "set of 5, set of 5"],
    [8, "run of 5, run of 5"],
    [9, "set of 3, run of 7"],
    [10, "set of 3, set of 3, run of 7"],
  ] as const)("round %i contract is %s", (round, expected) => {
    expect(formatContract(round)).toBe(expected);
    expect(getContractForRound(round)).toEqual(CONTRACT_SCHEDULE[round]);
  });

  it("requires exact meld counts and sizes", () => {
    expect(
      matchesContract(
        [
          { kind: "set", cards: [1, 2, 3] },
          { kind: "set", cards: [1, 2, 3] },
        ],
        1,
      ),
    ).toBe(true);

    expect(
      matchesContract([{ kind: "set", cards: [1, 2, 3, 4] }, { kind: "set", cards: [1, 2, 3] }], 1),
    ).toBe(false);

    expect(
      matchesContract([{ kind: "set", cards: [1, 2, 3] }], 1),
    ).toBe(false);
  });
});
