"use client";

import { useDroppable } from "@dnd-kit/core";
import type { Card } from "../../../convex/lib/rules/types";
import { stagingPileDropId } from "../../lib/cardDrag";
import { scaledCardDimensions, type CardSize } from "../../lib/cardDisplay";
import { TABLE_CARD_SIZE } from "../../lib/feltLayout";
import {
  FAN_SELECTED_LIFT_PX,
  fanCardStep,
  fanMarginExtra,
  fanTotalSpreadWidth,
  sortHand,
  type HandSortMode,
} from "../../lib/cards";
import { useCardScale } from "../../contexts/PlayerPreferencesContext";
import { DraggableHandCard } from "../cards/DraggableHandCard";
import type { StagingPileView } from "../../hooks/useHandStaging";

type StagingPilesProps = {
  piles: StagingPileView[];
  activePileIndex: number;
  selectedIds: string[];
  sortMode: HandSortMode;
  cardSize?: CardSize;
  onSelectPile: (index: number) => void;
  onToggleCard: (cardId: string) => void;
  onUnstage: (index: number) => void;
  cardDisabled?: boolean;
  dragEnabled?: boolean;
};

function useStagingFanMetrics(
  cardCount: number,
  selectedIds: string[],
  sortMode: HandSortMode,
  cards: Card[],
  cardSize: CardSize,
) {
  const cardScale = useCardScale();
  const sortedCards = sortHand(cards, sortMode);
  const selectedSet = new Set(selectedIds);
  const { width: cardWidth, height: cardHeight } = scaledCardDimensions(cardSize, cardScale);
  // Tighter than the hand fan so staged cards stack more compactly.
  const cardStep = Math.round(fanCardStep(Math.max(cardCount, 1), cardWidth) * 0.55);
  const selectedIndices = new Set(
    sortedCards.flatMap((entry, index) => (selectedSet.has(entry.id) ? [index] : [])),
  );
  const spreadWidth = fanTotalSpreadWidth(sortedCards.length, selectedIndices);
  const fanWidth =
    cardCount <= 0 ? cardWidth : cardCount * cardStep + cardWidth + spreadWidth;

  return {
    sortedCards,
    selectedSet,
    cardWidth,
    cardHeight,
    cardStep,
    selectedIndices,
    fanWidth,
  };
}

function StagingPileFan({
  cards,
  selectedIds,
  sortMode,
  cardSize,
  onToggleCard,
  cardDisabled,
  dragEnabled,
}: {
  cards: Card[];
  selectedIds: string[];
  sortMode: HandSortMode;
  cardSize: CardSize;
  onToggleCard: (cardId: string) => void;
  cardDisabled?: boolean;
  dragEnabled?: boolean;
}) {
  const { sortedCards, selectedSet, cardWidth, cardHeight, cardStep, selectedIndices, fanWidth } =
    useStagingFanMetrics(cards.length, selectedIds, sortMode, cards, cardSize);

  return (
    <div
      className="relative flex items-end overflow-visible"
      style={{
        width: `${fanWidth}px`,
        height: `${cardHeight + FAN_SELECTED_LIFT_PX}px`,
      }}
    >
      {sortedCards.map((card, index) => {
        const selected = selectedSet.has(card.id);
        const extraMargin = fanMarginExtra(index, selectedIndices);
        const lift = selected ? FAN_SELECTED_LIFT_PX : 0;

        return (
          <DraggableHandCard
            key={card.id}
            card={card}
            size={cardSize}
            selected={selected}
            disabled={cardDisabled}
            dragEnabled={dragEnabled}
            onClick={() => onToggleCard(card.id)}
            className="relative transition-[margin,transform] duration-200 ease-out"
            style={{
              marginLeft: index === 0 ? 0 : `${cardStep - cardWidth + extraMargin}px`,
              transform: `translateY(${-lift}px)`,
              zIndex: index + 1,
            }}
          />
        );
      })}
    </div>
  );
}

function StagingPileDropZone({
  pile,
  active,
  selectedIds,
  sortMode,
  cardSize,
  onSelectPile,
  onToggleCard,
  onUnstage,
  cardDisabled,
  dragEnabled,
}: {
  pile: StagingPileView;
  active: boolean;
  selectedIds: string[];
  sortMode: HandSortMode;
  cardSize: CardSize;
  onSelectPile: (index: number) => void;
  onToggleCard: (cardId: string) => void;
  onUnstage: (index: number) => void;
  cardDisabled?: boolean;
  dragEnabled?: boolean;
}) {
  const { setNodeRef, isOver } = useDroppable({
    id: stagingPileDropId(pile.index),
    data: { stagingPileIndex: pile.index },
  });
  const { cardWidth, cardHeight, fanWidth } = useStagingFanMetrics(
    pile.cards.length,
    selectedIds,
    sortMode,
    pile.cards,
    cardSize,
  );
  const contentWidth = pile.cards.length === 0 ? cardWidth : fanWidth;

  return (
    <div
      ref={setNodeRef}
      className={`rounded-lg border px-1 pb-1 pt-0.5 transition-colors ${
        active
          ? "border-[var(--accent)] bg-[var(--accent)]/10"
          : "border-[var(--card-border)] bg-black/20"
      } ${isOver ? "ring-2 ring-[var(--accent)]" : ""}`}
      style={{ width: contentWidth + 8 }}
    >
      <div className="mb-0.5 flex items-center justify-between gap-1">
        <button
          type="button"
          onClick={() => onSelectPile(pile.index)}
          className={`min-w-0 truncate text-left text-[10px] font-bold uppercase tracking-wide ${
            active ? "text-[var(--accent)]" : "text-[var(--muted)]"
          }`}
        >
          {pile.label}
          <span className="ml-1 font-semibold normal-case tracking-normal opacity-80">
            ({pile.cards.length}/{pile.requirement.size})
          </span>
        </button>
        {pile.cards.length > 0 ? (
          <button
            type="button"
            onClick={() => onUnstage(pile.index)}
            className="shrink-0 text-[10px] font-semibold text-[var(--muted)] underline-offset-2 hover:underline"
          >
            Unstage
          </button>
        ) : null}
      </div>
      {pile.cards.length === 0 ? (
        <p
          className="flex items-center justify-center text-center text-[10px] text-[var(--muted)]"
          style={{ width: cardWidth, height: cardHeight }}
        >
          Drop here
        </p>
      ) : (
        <StagingPileFan
          cards={pile.cards}
          selectedIds={selectedIds}
          sortMode={sortMode}
          cardSize={cardSize}
          onToggleCard={onToggleCard}
          cardDisabled={cardDisabled}
          dragEnabled={dragEnabled}
        />
      )}
    </div>
  );
}

export function StagingPiles({
  piles,
  activePileIndex,
  selectedIds,
  sortMode,
  cardSize = TABLE_CARD_SIZE,
  onSelectPile,
  onToggleCard,
  onUnstage,
  cardDisabled = false,
  dragEnabled = false,
}: StagingPilesProps) {
  if (piles.length === 0) {
    return null;
  }

  return (
    <div className="flex flex-wrap items-end gap-1.5">
      {piles.map((pile) => (
        <StagingPileDropZone
          key={pile.index}
          pile={pile}
          active={pile.index === activePileIndex}
          selectedIds={selectedIds}
          sortMode={sortMode}
          cardSize={cardSize}
          onSelectPile={onSelectPile}
          onToggleCard={onToggleCard}
          onUnstage={onUnstage}
          cardDisabled={cardDisabled}
          dragEnabled={dragEnabled}
        />
      ))}
    </div>
  );
}
