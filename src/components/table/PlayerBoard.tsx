"use client";

import type { OpeningMeld, TableMeld } from "../../../convex/lib/rules/types";
import type { InsertionGap } from "../../../convex/lib/rules/layoffs";
import { FELT_GRID_AREA } from "../../lib/feltLayout";
import { seatSlotForOffset, type SeatSlot } from "../../lib/cardDisplay";
import { gapsForMeld, MeldSpread } from "../cards/MeldSpread";

type BoardPlayer = {
  id: string;
  displayName: string;
  isAutomated?: boolean;
  canSubstitute?: boolean;
  handSize: number;
  playerPhase: "notOpened" | "opened";
  isActive: boolean;
  isDealer: boolean;
  seatIndex: number;
};

const SLOT_ALIGN: Record<SeatSlot, string> = {
  top: "items-center justify-start",
  bottom: "items-center justify-end",
  left: "items-start justify-center",
  right: "items-end justify-center",
  "top-left": "items-start justify-start",
  "top-right": "items-end justify-start",
};

type PlayerBoardProps = {
  player: BoardPlayer;
  slot: SeatSlot;
  melds: TableMeld[];
  pendingMelds?: OpeningMeld[];
  highlightMeldIds?: Set<string>;
  onMeldClick?: (meldId: string) => void;
  layOffGapTargets?: Array<{ meldId: string; gap: InsertionGap }>;
  activeDropGapId?: string | null;
  onPendingMeldClick?: (index: number) => void;
  isMe?: boolean;
  onSubstitute?: () => void;
  substituteBusy?: boolean;
};

export function PlayerBoard({
  player,
  slot,
  melds,
  pendingMelds = [],
  highlightMeldIds = new Set(),
  onMeldClick,
  layOffGapTargets = [],
  activeDropGapId = null,
  onPendingMeldClick,
  isMe = false,
  onSubstitute,
  substituteBusy = false,
}: PlayerBoardProps) {
  const allMelds = [
    ...melds,
    ...pendingMelds.map((meld, index) => ({
      id: `pending-${index}`,
      ownerId: player.id,
      kind: meld.kind,
      cards: meld.cards,
      wildDeclarations: meld.wildDeclarations,
    })),
  ];

  return (
    <div
      className={`flex min-h-0 min-w-0 flex-col gap-2 p-1 ${SLOT_ALIGN[slot]}`}
      style={{ gridArea: FELT_GRID_AREA[slot] }}
    >
      <div
        className={`flex shrink-0 items-center gap-2 rounded-full px-3 py-1 text-xs font-bold shadow-md ${
          player.isActive
            ? "bg-[var(--accent)] text-[#2c1810] turn-pulse"
            : "bg-black/40 text-[var(--cream)]"
        }`}
      >
        <span>{isMe ? "You" : player.displayName}</span>
        {player.isAutomated ? <span className="opacity-70">(auto)</span> : null}
        <span className="opacity-70">·</span>
        <span>{player.handSize} cards</span>
        {player.isDealer ? <span title="Dealer">🎴</span> : null}
        {player.playerPhase === "opened" ? <span className="text-[var(--success)]">✓</span> : null}
        {player.canSubstitute && onSubstitute ? (
          <button
            type="button"
            disabled={substituteBusy}
            onClick={onSubstitute}
            className="ml-1 rounded bg-black/30 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-[var(--cream)] hover:bg-black/50 disabled:opacity-50"
            title="Replace with an automated player for the rest of the game"
          >
            Substitute
          </button>
        ) : null}
      </div>

      {allMelds.length > 0 ? (
        <div
          className={`flex max-w-full flex-wrap gap-3 overflow-visible md:gap-4 ${
            slot === "bottom" || slot === "top" ? "justify-center" : ""
          }`}
        >
          {allMelds.map((meld) => {
            const isPending = meld.id.startsWith("pending-");
            const pendingIndex = isPending ? Number(meld.id.slice("pending-".length)) : -1;
            const highlighted = !isPending && highlightMeldIds.has(meld.id) && layOffGapTargets.length === 0;
            const meldGaps = isPending ? [] : gapsForMeld(meld.id, layOffGapTargets);
            const canRemovePending = isPending && onPendingMeldClick !== undefined;
            return (
              <div
                key={meld.id}
                className={
                  isPending
                    ? "rounded-lg ring-2 ring-dashed ring-[var(--accent)]/50"
                    : ""
                }
              >
                <MeldSpread
                  meld={meld}
                  meldId={meld.id}
                  size="lg"
                  highlighted={highlighted}
                  insertionGaps={meldGaps}
                  activeDropGapId={activeDropGapId}
                  onClick={
                    canRemovePending
                      ? () => onPendingMeldClick(pendingIndex)
                      : !isPending && onMeldClick
                        ? () => onMeldClick(meld.id)
                        : undefined
                  }
                />
              </div>
            );
          })}
        </div>
      ) : null}
    </div>
  );
}

export function layoutPlayers<T extends { seatIndex: number }>(
  players: T[],
  viewerSeatIndex: number,
  playerCount: number,
): Array<{ player: T; slot: SeatSlot }> {
  return players.map((player) => {
    const offset = (player.seatIndex - viewerSeatIndex + playerCount) % playerCount;
    return {
      player,
      slot: seatSlotForOffset(offset, playerCount),
    };
  });
}
