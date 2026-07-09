"use client";

import { motion } from "motion/react";
import type { Card, NaturalRank, TableMeld } from "../../../convex/lib/rules/types";
import type { InsertionGap } from "../../../convex/lib/rules/layoffs";
import { scaledCardDimensions, type CardSize } from "../../lib/cardDisplay";
import { useCardScale } from "../../contexts/PlayerPreferencesContext";
import { meldOverlapPx } from "../../lib/feltLayout";
import { gapsMatch, meldGapDropId } from "../../lib/cardDrag";
import {
  GAP_EDGE_PAD_PX,
  gapLeftPx,
  MeldInsertionGap,
  spreadWidthWithGaps,
} from "./MeldInsertionGap";
import { PlayingCard } from "./PlayingCard";

type MeldSpreadProps = {
  meld:
    | TableMeld
    | {
        id?: string;
        kind: "set" | "run";
        cards: Card[];
        wildDeclarations?: Array<{ cardId: string; asRank: NaturalRank }>;
      };
  meldId?: string;
  size?: CardSize;
  highlighted?: boolean;
  onClick?: () => void;
  compact?: boolean;
  insertionGaps?: InsertionGap[];
  activeDropGapId?: string | null;
};

export function MeldSpread({
  meld,
  meldId: meldIdProp,
  size = "sm",
  highlighted = false,
  onClick,
  compact = true,
  insertionGaps = [],
  activeDropGapId = null,
}: MeldSpreadProps) {
  const cardScale = useCardScale();
  const { width: cardWidth, height: cardHeight } = scaledCardDimensions(size, cardScale);
  const overlap = meldOverlapPx(cardWidth, meld.kind, compact, meld.cards.length);
  const wildDeclarations = "wildDeclarations" in meld ? meld.wildDeclarations : [];
  const resolvedMeldId = meldIdProp ?? ("id" in meld ? meld.id : undefined);
  const showGaps = insertionGaps.length > 0 && resolvedMeldId !== undefined;
  const edgePadPx = showGaps ? GAP_EDGE_PAD_PX : 0;
  const spreadWidth = showGaps
    ? spreadWidthWithGaps(meld.cards.length, cardWidth, overlap)
    : cardWidth + (meld.cards.length - 1) * (cardWidth - overlap);

  return (
    <div
      role={onClick ? "button" : undefined}
      tabIndex={onClick ? 0 : undefined}
      onClick={onClick}
      onKeyDown={
        onClick
          ? (event) => {
              if (event.key === "Enter" || event.key === " ") {
                event.preventDefault();
                onClick();
              }
            }
          : undefined
      }
      className={`relative overflow-visible ${onClick ? "cursor-pointer rounded-lg" : ""} ${
        highlighted && !showGaps
          ? "ring-2 ring-[var(--accent)] ring-offset-2 ring-offset-[var(--felt)]"
          : ""
      }`}
      style={{ width: spreadWidth, height: cardHeight }}
    >
      {meld.cards.map((card, index) => (
        <motion.div
          key={card.id}
          layout
          layoutId={`table-card-${card.id}`}
          transition={{ type: "spring", stiffness: 420, damping: 32 }}
          className="absolute top-0"
          style={{ left: edgePadPx + index * (cardWidth - overlap), zIndex: index }}
        >
          <PlayingCard
            card={card}
            size={size}
            wildDeclarations={wildDeclarations}
            displayOnly
          />
        </motion.div>
      ))}

      {showGaps && resolvedMeldId
        ? insertionGaps.map((gap) => (
            <MeldInsertionGap
              key={meldGapDropId(resolvedMeldId, gap)}
              meldId={resolvedMeldId}
              gap={gap}
              leftPx={gapLeftPx(gap.insertIndex, cardWidth, overlap, edgePadPx)}
              heightPx={cardHeight}
              active={
                activeDropGapId !== null &&
                activeDropGapId === meldGapDropId(resolvedMeldId, gap)
              }
            />
          ))
        : null}

      {onClick && highlighted && !showGaps ? (
        <span className="absolute -top-6 left-1/2 z-10 -translate-x-1/2 whitespace-nowrap rounded-full bg-[var(--accent)] px-2 py-0.5 text-[10px] font-bold text-[#2c1810]">
          Lay off here
        </span>
      ) : null}
    </div>
  );
}

export function gapsForMeld(
  meldId: string,
  gapTargets: Array<{ meldId: string; gap: InsertionGap }>,
): InsertionGap[] {
  const seen: InsertionGap[] = [];
  for (const entry of gapTargets) {
    if (entry.meldId !== meldId) {
      continue;
    }
    if (!seen.some((gap) => gapsMatch(gap, entry.gap))) {
      seen.push(entry.gap);
    }
  }
  return seen;
}
