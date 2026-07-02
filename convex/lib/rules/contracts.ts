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
