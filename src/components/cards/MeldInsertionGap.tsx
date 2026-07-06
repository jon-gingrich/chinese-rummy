"use client";

import { useDroppable } from "@dnd-kit/core";
import type { InsertionGap } from "../../../convex/lib/rules/layoffs";
import { meldGapDropId } from "../../lib/cardDrag";

const GAP_WIDTH_PX = 28;

type MeldInsertionGapProps = {
  meldId: string;
  gap: InsertionGap;
  leftPx: number;
  heightPx: number;
  active: boolean;
};

export function MeldInsertionGap({
  meldId,
  gap,
  leftPx,
  heightPx,
  active,
}: MeldInsertionGapProps) {
  const { isOver, setNodeRef } = useDroppable({
    id: meldGapDropId(meldId, gap),
  });

  const highlighted = active || isOver;

  return (
    <div
      ref={setNodeRef}
      className="absolute top-0 z-20 flex items-center justify-center"
      style={{
        left: leftPx,
        width: GAP_WIDTH_PX,
        height: heightPx,
      }}
      aria-hidden
    >
      <div
        className={`h-[88%] w-1 rounded-full transition-all duration-150 ${
          highlighted
            ? "bg-[var(--accent)] shadow-[0_0_10px_var(--accent)]"
            : "bg-[var(--accent)]/25"
        }`}
      />
      {highlighted ? (
        <>
          <div
            className="absolute top-[6%] h-2 w-2 rounded-full bg-[var(--accent)]"
            style={{ left: -3 }}
          />
          <div
            className="absolute top-[6%] h-2 w-2 rounded-full bg-[var(--accent)]"
            style={{ right: -3 }}
          />
        </>
      ) : null}
    </div>
  );
}

export function gapLeftPx(
  insertIndex: number,
  cardWidth: number,
  overlap: number,
): number {
  const step = cardWidth - overlap;
  return insertIndex * step + (cardWidth - GAP_WIDTH_PX) / 2;
}

export function spreadWidthWithGaps(
  cardCount: number,
  cardWidth: number,
  overlap: number,
): number {
  if (cardCount === 0) {
    return cardWidth + GAP_WIDTH_PX;
  }
  const base = cardWidth + (cardCount - 1) * (cardWidth - overlap);
  return base + GAP_WIDTH_PX / 2;
}
