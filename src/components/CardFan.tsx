"use client";

import type { Card } from "../../convex/lib/rules/types";
import { scaledCardDimensions } from "../lib/cardDisplay";
import { useCardScale } from "../contexts/PlayerPreferencesContext";
import {
  FAN_JUST_DRAWN_LIFT_PX,
  FAN_SELECTED_LIFT_PX,
  fanCardStep,
  fanContainerHeight,
  fanMarginExtra,
  fanRotation,
  fanTotalSpreadWidth,
  fanTranslateY,
  sortHand,
  type HandSortMode,
} from "../lib/cards";
import { DraggableHandCard } from "./cards/DraggableHandCard";

type CardFanProps = {
  cards: Card[];
  selectedIds?: string[];
  selectedId?: string | null;
  onToggle: (cardId: string) => void;
  disabled?: boolean;
  dragEnabled?: boolean;
  sortMode: HandSortMode;
  onSortModeChange: (mode: HandSortMode) => void;
  showSortControls?: boolean;
  size?: "sm" | "md" | "lg";
  justDrawnCardId?: string | null;
};

export function CardFan({
  cards,
  selectedIds,
  selectedId,
  onToggle,
  disabled = false,
  dragEnabled = false,
  sortMode,
  onSortModeChange,
  showSortControls = true,
  size = "lg",
  justDrawnCardId = null,
}: CardFanProps) {
  const cardScale = useCardScale();
  const sortedCards = sortHand(cards, sortMode);
  const selectedSet = new Set(selectedIds ?? (selectedId ? [selectedId] : []));
  const { width: cardWidth, height: cardHeight } = scaledCardDimensions(size, cardScale);
  const cardStep = fanCardStep(sortedCards.length, cardWidth);
  const selectedIndices = new Set(
    sortedCards.flatMap((entry, index) => (selectedSet.has(entry.id) ? [index] : [])),
  );
  const spreadWidth = fanTotalSpreadWidth(sortedCards.length, selectedIndices);
  const maxRotation =
    sortedCards.length <= 1
      ? 0
      : Math.min(sortedCards.length * 5, sortedCards.length > 10 ? 34 : 44) / 2;
  const bottomBuffer = Math.ceil(maxRotation * 0.75 + 4);
  const containerHeight = fanContainerHeight(sortedCards.length, cardHeight);
  const fanWidth = Math.max(
    sortedCards.length * cardStep + cardWidth + spreadWidth,
    Math.round(cardWidth * 4.5),
  );

  return (
    <div className={showSortControls ? "space-y-1" : ""}>
      {showSortControls ? (
        <div className="flex flex-wrap gap-1.5 text-xs">
          <span className="self-center text-[var(--muted)]">Sort</span>
          <button
            type="button"
            onClick={() => onSortModeChange("suit")}
            className={`rounded-full px-2.5 py-0.5 font-semibold ${
              sortMode === "suit"
                ? "bg-[var(--accent)] text-[#2c1810]"
                : "border border-[var(--card-border)] text-[var(--muted)]"
            }`}
          >
            Suit
          </button>
          <button
            type="button"
            onClick={() => onSortModeChange("rank")}
            className={`rounded-full px-2.5 py-0.5 font-semibold ${
              sortMode === "rank"
                ? "bg-[var(--accent)] text-[#2c1810]"
                : "border border-[var(--card-border)] text-[var(--muted)]"
            }`}
          >
            Rank
          </button>
        </div>
      ) : null}

      <div className="overflow-x-auto overflow-y-visible [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        <div
          className="relative mx-auto flex items-end justify-center overflow-visible"
          style={{
            width: `${fanWidth}px`,
            minHeight: `${containerHeight}px`,
            paddingBottom: `${bottomBuffer}px`,
          }}
        >
          {sortedCards.map((card, index) => {
            const selected = selectedSet.has(card.id);
            const justDrawn = card.id === justDrawnCardId;
            const rotation = fanRotation(index, sortedCards.length);
            const translateY = fanTranslateY(index, sortedCards.length);
            const extraMargin = fanMarginExtra(index, selectedIndices);
            const lift = selected
              ? FAN_SELECTED_LIFT_PX
              : justDrawn
                ? FAN_JUST_DRAWN_LIFT_PX
                : 0;

            return (
              <DraggableHandCard
                key={card.id}
                card={card}
                size={size}
                selected={selected}
                justDrawn={justDrawn}
                disabled={disabled}
                dragEnabled={dragEnabled}
                onClick={() => onToggle(card.id)}
                className={`relative transition-[margin,transform] duration-200 ease-out`}
                style={{
                  marginLeft: index === 0 ? 0 : `${cardStep - cardWidth + extraMargin}px`,
                  transform: `rotate(${rotation}deg) translateY(${translateY - lift}px)`,
                  transformOrigin: "bottom center",
                  zIndex: justDrawn ? sortedCards.length + 10 : index + 1,
                }}
              />
            );
          })}
        </div>
      </div>
    </div>
  );
}
