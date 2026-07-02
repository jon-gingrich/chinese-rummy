export type MeldKind = "set" | "run";

export type ContractRequirement = {
  kind: MeldKind;
  size: number;
};

export const CONTRACT_SCHEDULE: Record<number, ContractRequirement[]> = {
  1: [
    { kind: "set", size: 3 },
    { kind: "set", size: 3 },
  ],
  2: [
    { kind: "run", size: 3 },
    { kind: "run", size: 3 },
  ],
  3: [
    { kind: "set", size: 3 },
    { kind: "run", size: 4 },
  ],
  4: [
    { kind: "set", size: 4 },
    { kind: "set", size: 4 },
  ],
  5: [
    { kind: "run", size: 4 },
    { kind: "run", size: 4 },
  ],
  6: [
    { kind: "set", size: 4 },
    { kind: "run", size: 5 },
  ],
  7: [
    { kind: "set", size: 5 },
    { kind: "set", size: 5 },
  ],
  8: [
    { kind: "run", size: 5 },
    { kind: "run", size: 5 },
  ],
  9: [
    { kind: "set", size: 3 },
    { kind: "run", size: 7 },
  ],
  10: [
    { kind: "set", size: 3 },
    { kind: "set", size: 3 },
    { kind: "run", size: 7 },
  ],
};

export function getContractForRound(roundNumber: number): ContractRequirement[] {
  const contract = CONTRACT_SCHEDULE[roundNumber];
  if (!contract) {
    throw new Error(`No contract for round ${roundNumber}`);
  }
  return contract;
}

function requirementLabel(requirement: ContractRequirement): string {
  const noun = requirement.kind === "set" ? "set" : "run";
  return `${noun} of ${requirement.size}`;
}

export function formatContract(roundNumber: number): string {
  return getContractForRound(roundNumber).map(requirementLabel).join(", ");
}

import type { PlayerState } from "./types";
import { TOTAL_ROUNDS } from "./scoring";

/** Legacy games store only a table-wide round number; treat that as each player's contract. */
export function effectiveContractRound(player: PlayerState, gameRoundNumber: number): number {
  return player.contractRound ?? gameRoundNumber;
}

export function projectedContractRound(
  player: PlayerState,
  gameRoundNumber: number,
): number {
  const round = effectiveContractRound(player, gameRoundNumber);
  return player.playerPhase === "opened" ? round + 1 : round;
}

export function allContractsFulfilled(
  players: PlayerState[],
  gameRoundNumber: number,
): boolean {
  return players.every(
    (player) => projectedContractRound(player, gameRoundNumber) > TOTAL_ROUNDS,
  );
}

export function advanceContractRound(
  player: PlayerState,
  gameRoundNumber: number,
): number {
  const current = effectiveContractRound(player, gameRoundNumber);
  if (gameRoundNumber === 0) {
    return current;
  }
  return player.playerPhase === "opened" ? current + 1 : current;
}

export function matchesContract(
  submitted: Array<{ kind: MeldKind; cards: unknown[] }>,
  roundNumber: number,
): boolean {
  const required = getContractForRound(roundNumber);
  if (submitted.length !== required.length) {
    return false;
  }

  const remaining = [...required];
  for (const meld of submitted) {
    const index = remaining.findIndex(
      (requirement) =>
        requirement.kind === meld.kind && requirement.size === meld.cards.length,
    );
    if (index === -1) {
      return false;
    }
    remaining.splice(index, 1);
  }

  return remaining.length === 0;
}
