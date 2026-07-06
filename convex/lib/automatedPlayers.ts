export const AUTOMATED_PLAYER_ID_PREFIX = "auto:";

const AUTOMATED_DISPLAY_NAMES = [
  "Alex",
  "Sam",
  "Jordan",
  "Casey",
  "Riley",
  "Morgan",
  "Quinn",
  "Avery",
  "Drew",
  "Jamie",
];

export function isAutomatedPlayerId(playerId: string): boolean {
  return playerId.startsWith(AUTOMATED_PLAYER_ID_PREFIX);
}

export function createAutomatedPlayerId(): string {
  return `${AUTOMATED_PLAYER_ID_PREFIX}${crypto.randomUUID()}`;
}

export function pickAutomatedDisplayNames(count: number): string[] {
  const pool = [...AUTOMATED_DISPLAY_NAMES];
  for (let index = pool.length - 1; index > 0; index -= 1) {
    const swapIndex = Math.floor(Math.random() * (index + 1));
    [pool[index], pool[swapIndex]] = [pool[swapIndex]!, pool[index]!];
  }
  return pool.slice(0, count);
}

export type AutomatedPlayerProfile = {
  id: string;
  displayName: string;
};

export function createAutomatedPlayers(count: number): AutomatedPlayerProfile[] {
  const names = pickAutomatedDisplayNames(count);
  return names.map((displayName) => ({
    id: createAutomatedPlayerId(),
    displayName,
  }));
}

export function createAutomatedSeatProfile(
  usedDisplayNames: Set<string>,
): AutomatedPlayerProfile {
  const pool = [...AUTOMATED_DISPLAY_NAMES];
  for (let index = pool.length - 1; index > 0; index -= 1) {
    const swapIndex = Math.floor(Math.random() * (index + 1));
    [pool[index], pool[swapIndex]] = [pool[swapIndex]!, pool[index]!];
  }

  const displayName =
    pool.find((name) => !usedDisplayNames.has(name)) ??
    `Guest ${usedDisplayNames.size + 1}`;

  return {
    id: createAutomatedPlayerId(),
    displayName,
  };
}
