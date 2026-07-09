export type CelebrationPlayer = {
  id: string;
  displayName: string;
  cumulativeScore: number;
  roundScore?: number;
};

export type PodiumPlace = 1 | 2 | 3;

export type PodiumEntry = {
  place: PodiumPlace;
  players: CelebrationPlayer[];
  score: number;
};

/**
 * Rank by ascending cumulative deadwood. Ties share a place and skip the next
 * (e.g. two 1sts → next place is 3rd). Only places 1–3 are returned.
 */
export function buildPodium(players: CelebrationPlayer[]): PodiumEntry[] {
  const sorted = [...players].sort((a, b) => {
    if (a.cumulativeScore !== b.cumulativeScore) {
      return a.cumulativeScore - b.cumulativeScore;
    }
    return a.displayName.localeCompare(b.displayName);
  });

  const entries: PodiumEntry[] = [];
  let index = 0;
  let place = 1;

  while (index < sorted.length && place <= 3) {
    const score = sorted[index]!.cumulativeScore;
    const tied: CelebrationPlayer[] = [];
    while (index < sorted.length && sorted[index]!.cumulativeScore === score) {
      tied.push(sorted[index]!);
      index += 1;
    }
    if (place <= 3) {
      entries.push({ place: place as PodiumPlace, players: tied, score });
    }
    place += tied.length;
  }

  return entries;
}

export function standingsOrder(players: CelebrationPlayer[]): CelebrationPlayer[] {
  return [...players].sort((a, b) => {
    if (a.cumulativeScore !== b.cumulativeScore) {
      return a.cumulativeScore - b.cumulativeScore;
    }
    return a.displayName.localeCompare(b.displayName);
  });
}

export function winnerAnnouncement(
  players: CelebrationPlayer[],
  winnerPlayerIds: string[] | undefined,
): string {
  const winners = players.filter((player) => winnerPlayerIds?.includes(player.id));
  if (winners.length === 0) {
    const podium = buildPodium(players);
    const first = podium.find((entry) => entry.place === 1);
    if (!first) {
      return "Game over.";
    }
    return first.players.length === 1
      ? `${first.players[0]!.displayName} wins!`
      : `${first.players.map((player) => player.displayName).join(" and ")} win!`;
  }
  if (winners.length === 1) {
    return `${winners[0]!.displayName} wins!`;
  }
  return `${winners.map((player) => player.displayName).join(" and ")} win!`;
}
