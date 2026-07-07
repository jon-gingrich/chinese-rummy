"use client";

type StandingsPlayer = {
  id: string;
  displayName: string;
  cumulativeScore: number;
  contractRound: number;
  contract: string;
  playerPhase: "notOpened" | "opened";
  isHost: boolean;
};

type StandingsModalProps = {
  open: boolean;
  onClose: () => void;
  players: StandingsPlayer[];
  viewerPlayerId?: string;
};

export function StandingsModal({
  open,
  onClose,
  players,
  viewerPlayerId,
}: StandingsModalProps) {
  if (!open) {
    return null;
  }

  const sorted = [...players].sort((a, b) => a.cumulativeScore - b.cumulativeScore);

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/70 p-4 sm:items-center"
      role="presentation"
      onClick={onClose}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="standings-modal-title"
        className="game-panel w-full max-w-lg p-6 shadow-2xl"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-3">
          <div>
            <h2 id="standings-modal-title" className="text-xl font-extrabold text-[var(--accent-soft)]">
              Standings
            </h2>
            <p className="mt-1 text-xs text-[var(--muted)]">
              Lowest cumulative deadwood wins. Sorted best to worst.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="shrink-0 rounded px-2 py-1 text-sm font-semibold text-[var(--muted)] hover:bg-black/20 hover:text-[var(--cream)]"
            aria-label="Close standings"
          >
            ✕
          </button>
        </div>

        <ol className="mt-5 space-y-2">
          {sorted.map((player, index) => {
            const isViewer = player.id === viewerPlayerId;
            const isLeader = index === 0;

            return (
              <li
                key={player.id}
                className={`rounded-lg px-4 py-3 text-sm ${
                  isViewer
                    ? "border border-[var(--accent)] bg-[var(--accent)]/10"
                    : "bg-black/20"
                }`}
              >
                <div className="flex items-center justify-between gap-3">
                  <div className="flex min-w-0 items-center gap-2">
                    <span className="w-5 shrink-0 text-center text-xs font-bold text-[var(--muted)]">
                      {index + 1}
                    </span>
                    <span className="truncate font-semibold text-[var(--cream)]">
                      {player.displayName}
                      {isViewer ? (
                        <span className="ml-1.5 text-[10px] font-bold uppercase tracking-wide text-[var(--accent-soft)]">
                          You
                        </span>
                      ) : null}
                    </span>
                    {isLeader ? <span aria-hidden="true" title="Lowest score">👑</span> : null}
                    {player.isHost ? (
                      <span aria-hidden="true" title="Host">
                        🏠
                      </span>
                    ) : null}
                  </div>
                  <span className="shrink-0 text-lg font-extrabold text-[var(--accent-soft)]">
                    {player.cumulativeScore}
                  </span>
                </div>
                <p className="mt-1 pl-7 text-xs text-[var(--muted)]">
                  Round {player.contractRound} · {player.contract}
                </p>
                <p className="mt-0.5 pl-7 text-xs">
                  {player.playerPhase === "opened" ? (
                    <span className="font-semibold text-[var(--success)]">✓ Opened</span>
                  ) : (
                    <span className="text-[var(--muted)]">Not opened</span>
                  )}
                </p>
              </li>
            );
          })}
        </ol>
      </div>
    </div>
  );
}
