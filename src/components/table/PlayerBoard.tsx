"use client";

import type { OpeningMeld, TableMeld } from "../../../convex/lib/rules/types";
import { FELT_GRID_AREA } from "../../lib/feltLayout";
import { seatSlotForOffset, type SeatSlot } from "../../lib/cardDisplay";
import { MeldSpread } from "../cards/MeldSpread";

type BoardPlayer = {
  id: string;
  displayName: string;
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
  isMe?: boolean;
};

export function PlayerBoard({
  player,
  slot,
  melds,
  pendingMelds = [],
  highlightMeldIds = new Set(),
  onMeldClick,
  isMe = false,
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
        <span className="opacity-70">·</span>
        <span>{player.handSize} cards</span>
        {player.isDealer ? <span title="Dealer">🎴</span> : null}
        {player.playerPhase === "opened" ? <span className="text-[var(--success)]">✓</span> : null}
      </div>

      {allMelds.length > 0 ? (
        <div
          className={`flex max-w-full flex-wrap gap-3 overflow-visible md:gap-4 ${
            slot === "bottom" || slot === "top" ? "justify-center" : ""
          }`}
        >
          {allMelds.map((meld) => {
            const isPending = meld.id.startsWith("pending-");
            const highlighted = !isPending && highlightMeldIds.has(meld.id);
            return (
              <div key={meld.id} className={isPending ? "rounded-lg ring-2 ring-dashed ring-[var(--accent)]/50" : ""}>
                <MeldSpread
                  meld={meld}
                  size="lg"
                  highlighted={highlighted}
                  onClick={
                    !isPending && onMeldClick ? () => onMeldClick(meld.id) : undefined
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
