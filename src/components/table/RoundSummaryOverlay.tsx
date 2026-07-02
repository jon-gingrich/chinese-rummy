"use client";

type RoundPlayer = {
  id: string;
  displayName: string;
};

type RoundSummaryOverlayProps = {
  open: boolean;
  roundNumber: number;
  goerName: string;
  players: RoundPlayer[];
  roundScores: number[];
  cumulativeScores: number[];
  canContinue: boolean;
  isGameEnd?: boolean;
  winnerNames?: string;
  busy?: boolean;
  onContinue: () => void;
};

export function RoundSummaryOverlay({
  open,
  roundNumber,
  goerName,
  players,
  roundScores,
  cumulativeScores,
  canContinue,
  isGameEnd = false,
  winnerNames,
  busy = false,
  onContinue,
}: RoundSummaryOverlayProps) {
  if (!open) {
    return null;
  }

  return (
    <div className="absolute inset-0 z-40 flex items-center justify-center bg-black/50 p-6">
      <div className="game-panel w-full max-w-lg p-6 shadow-2xl">
        {isGameEnd ? (
          <>
            <h2 className="text-2xl font-extrabold text-[var(--accent-soft)]">Game over!</h2>
            <p className="mt-2 text-sm text-[var(--muted)]">
              Winner{winnerNames && winnerNames.includes(",") ? "s" : ""}:{" "}
              <span className="font-bold text-[var(--cream)]">{winnerNames}</span>
            </p>
            <p className="text-xs text-[var(--muted)]">Lowest cumulative deadwood after ten rounds.</p>
          </>
        ) : (
          <>
            <h2 className="text-xl font-extrabold text-[var(--accent-soft)]">
              Round {roundNumber} complete
            </h2>
            <p className="mt-1 text-sm text-[var(--muted)]">
              <span className="font-semibold text-[var(--cream)]">{goerName}</span> went out.
            </p>
          </>
        )}

        <ul className="mt-5 space-y-2">
          {players.map((player, index) => (
            <li
              key={player.id}
              className="flex items-center justify-between rounded-lg bg-black/20 px-4 py-2.5 text-sm"
            >
              <span className="font-semibold">{player.displayName}</span>
              <span>
                <span className="text-[var(--danger)]">+{roundScores[index] ?? 0}</span>
                <span className="mx-2 text-[var(--muted)]">→</span>
                <span className="font-bold text-[var(--accent-soft)]">
                  {cumulativeScores[index] ?? 0}
                </span>
              </span>
            </li>
          ))}
        </ul>

        {canContinue && !isGameEnd ? (
          <button
            type="button"
            disabled={busy}
            onClick={onContinue}
            className="game-btn-primary mt-5 w-full"
          >
            {busy ? "Dealing…" : `Start round ${roundNumber + 1}`}
          </button>
        ) : null}
      </div>
    </div>
  );
}
