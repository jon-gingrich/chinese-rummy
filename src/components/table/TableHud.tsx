"use client";

import Link from "next/link";

type TablePlayer = {
  id: string;
  displayName: string;
  handSize: number;
  playerPhase: "notOpened" | "opened";
  isActive: boolean;
  isDealer: boolean;
  cumulativeScore: number;
};

type TableHudProps = {
  roundNumber: number;
  contract: string;
  turnMessage: string;
  isMyTurn: boolean;
  players: TablePlayer[];
  onRulesClick: () => void;
  onHowToPlayClick: () => void;
  settingsHref?: string;
};

export function TableHud({
  roundNumber,
  contract,
  turnMessage,
  isMyTurn,
  players,
  onRulesClick,
  onHowToPlayClick,
  settingsHref,
}: TableHudProps) {
  const sortedByScore = [...players].sort((a, b) => a.cumulativeScore - b.cumulativeScore);

  return (
    <header className="wood-rail z-20 flex shrink-0 items-center justify-between gap-3 border-b-2 border-[var(--wood-dark)] px-3 py-1.5 md:px-4">
      <div className="min-w-0">
        <p className="text-xs font-bold uppercase tracking-widest text-[var(--accent-soft)]">
          Hand {roundNumber}
        </p>
        <p className="truncate text-sm font-semibold text-[var(--cream)] md:text-base">{contract}</p>
      </div>

      <div
        className={`max-w-md flex-1 rounded-full px-4 py-1.5 text-center text-sm font-semibold ${
          isMyTurn
            ? "turn-pulse bg-[var(--accent)] text-[#2c1810]"
            : "bg-black/25 text-[var(--muted)]"
        }`}
      >
        {turnMessage}
      </div>

      <div className="flex items-center gap-3">
        <div className="hidden items-center gap-2 md:flex">
          {sortedByScore.map((player, index) => (
            <div
              key={player.id}
              className="rounded-lg bg-black/20 px-2.5 py-1 text-xs"
              title={player.displayName}
            >
              <span className="font-bold text-[var(--cream)]">{player.displayName.split(" ")[0]}</span>
              <span className="ml-1.5 text-[var(--accent-soft)]">{player.cumulativeScore}</span>
              {index === 0 ? <span className="ml-1">👑</span> : null}
            </div>
          ))}
        </div>
        <button type="button" onClick={onHowToPlayClick} className="game-btn-secondary px-3 py-1.5 text-xs">
          How to play
        </button>
        <button type="button" onClick={onRulesClick} className="game-btn-secondary px-3 py-1.5 text-xs">
          Rules
        </button>
        {settingsHref ? (
          <Link href={settingsHref} className="game-btn-secondary px-3 py-1.5 text-xs">
            Settings
          </Link>
        ) : null}
      </div>
    </header>
  );
}
