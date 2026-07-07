"use client";

import Link from "next/link";
import type { ReactNode } from "react";
import { TableHudMenu } from "./TableHudMenu";

type TablePlayer = {
  id: string;
  displayName: string;
  handSize: number;
  playerPhase: "notOpened" | "opened";
  isActive: boolean;
  isDealer: boolean;
  isHost: boolean;
  cumulativeScore: number;
  contractRound: number;
  contract: string;
};

type TableHudProps = {
  roundNumber: number;
  contract: string;
  turnMessage: string;
  isMyTurn: boolean;
  players: TablePlayer[];
  onStandingsClick?: () => void;
  standingsDisabled?: boolean;
  onRulesClick: () => void;
  onHowToPlayClick: () => void;
  settingsHref?: string;
  onArchive?: () => void;
  backHref?: string;
  headerLabel?: string;
  headerExtra?: ReactNode;
};

export function TableHud({
  roundNumber,
  contract,
  turnMessage,
  isMyTurn,
  players,
  onStandingsClick,
  standingsDisabled = false,
  onRulesClick,
  onHowToPlayClick,
  settingsHref,
  onArchive,
  backHref,
  headerLabel,
  headerExtra,
}: TableHudProps) {
  const sortedByScore = [...players].sort((a, b) => a.cumulativeScore - b.cumulativeScore);
  const leader = sortedByScore[0];
  const canOpenStandings = onStandingsClick !== undefined && !standingsDisabled;

  const standingsChipClass =
    "rounded-lg bg-black/20 px-2 py-0.5 text-xs transition-colors hover:bg-black/35 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-[var(--accent-soft)] disabled:cursor-not-allowed disabled:opacity-50";

  return (
    <header className="wood-rail z-20 flex shrink-0 items-center justify-between gap-2 border-b-2 border-[var(--wood-dark)] px-2 py-1 md:gap-3 md:px-3">
      <div className="flex min-w-0 items-center gap-2">
        {backHref ? (
          <Link
            href={backHref}
            className="shrink-0 rounded px-2 py-1 text-xs font-semibold text-[var(--muted)] hover:bg-black/20 hover:text-[var(--cream)]"
          >
            ← Home
          </Link>
        ) : null}
        <div className="min-w-0">
          {headerLabel ? (
            <p className="truncate text-[10px] font-bold uppercase tracking-widest text-[var(--muted)] md:text-xs">
              {headerLabel}
            </p>
          ) : null}
          <p className="text-[10px] font-bold uppercase tracking-widest text-[var(--accent-soft)] md:text-xs">
            Round {roundNumber}
          </p>
          <p className="truncate text-xs font-semibold text-[var(--cream)] md:text-sm">{contract}</p>
        </div>
      </div>

      <div
        className={`max-w-md flex-1 rounded-full px-3 py-1 text-center text-xs font-semibold md:px-4 md:py-1.5 md:text-sm ${
          isMyTurn
            ? "turn-pulse bg-[var(--accent)] text-[#2c1810]"
            : "bg-black/25 text-[var(--muted)]"
        }`}
      >
        {turnMessage}
      </div>

      <div className="flex shrink-0 items-center gap-2">
        {onStandingsClick ? (
          <>
            <button
              type="button"
              disabled={!canOpenStandings}
              onClick={onStandingsClick}
              className={`lg:hidden ${standingsChipClass}`}
              aria-label="View standings"
            >
              {leader ? (
                <>
                  <span aria-hidden="true">👑 </span>
                  <span className="font-bold text-[var(--cream)]">
                    {leader.displayName.split(" ")[0]}
                  </span>
                  {leader.isHost ? (
                    <span className="ml-0.5" title="Host" aria-hidden="true">
                      🏠
                    </span>
                  ) : null}
                  <span className="ml-1 text-[var(--accent-soft)]">{leader.cumulativeScore}</span>
                </>
              ) : (
                <span className="font-bold text-[var(--cream)]">Scores</span>
              )}
            </button>
            <button
              type="button"
              disabled={!canOpenStandings}
              onClick={onStandingsClick}
              className={`hidden items-center gap-1.5 lg:flex ${standingsChipClass}`}
              aria-label="View standings"
            >
              {sortedByScore.map((player, index) => (
                <span key={player.id} title={player.displayName}>
                  <span className="font-bold text-[var(--cream)]">{player.displayName.split(" ")[0]}</span>
                  {player.isHost ? (
                    <span className="ml-0.5" title="Host" aria-hidden="true">
                      🏠
                    </span>
                  ) : null}
                  <span className="ml-1 text-[var(--accent-soft)]">{player.cumulativeScore}</span>
                  {index === 0 ? <span className="ml-0.5">👑</span> : null}
                </span>
              ))}
            </button>
          </>
        ) : null}
        {headerExtra}
        <TableHudMenu
          onRulesClick={onRulesClick}
          onHowToPlayClick={onHowToPlayClick}
          settingsHref={settingsHref}
        />
        {onArchive ? (
          <button type="button" onClick={onArchive} className="game-btn-secondary px-2.5 py-1.5 text-xs">
            Archive
          </button>
        ) : null}
      </div>
    </header>
  );
}
