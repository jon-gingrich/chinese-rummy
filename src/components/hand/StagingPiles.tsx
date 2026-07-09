"use client";

import { useDroppable } from "@dnd-kit/core";
import type { Card } from "../../../convex/lib/rules/types";
import { stagingPileDropId } from "../../lib/cardDrag";
import { TABLE_CARD_SIZE } from "../../lib/feltLayout";
import { DraggableHandCard } from "../cards/DraggableHandCard";
import type { StagingPileView } from "../../hooks/useHandStaging";

type StagingPilesProps = {
  piles: StagingPileView[];
  activePileIndex: number;
  selectedIds: string[];
  onSelectPile: (index: number) => void;
  onToggleCard: (cardId: string) => void;
  onUnstage: (index: number) => void;
  onStageSelected: () => void;
  canStage: boolean;
  cardDisabled?: boolean;
  dragEnabled?: boolean;
};

function StagingPileDropZone({
  pile,
  active,
  selectedIds,
  onSelectPile,
  onToggleCard,
  onUnstage,
  cardDisabled,
  dragEnabled,
}: {
  pile: StagingPileView;
  active: boolean;
  selectedIds: string[];
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
  const selectedSet = new Set(selectedIds);

  return (
    <div
      ref={setNodeRef}
      className={`min-w-[7.5rem] flex-1 rounded-lg border px-2 py-1.5 transition-colors ${
        active
          ? "border-[var(--accent)] bg-[var(--accent)]/10"
          : "border-[var(--card-border)] bg-black/20"
      } ${isOver ? "ring-2 ring-[var(--accent)]" : ""}`}
    >
      <div className="mb-1 flex items-center justify-between gap-1">
        <button
          type="button"
          onClick={() => onSelectPile(pile.index)}
          className={`text-left text-[10px] font-bold uppercase tracking-wide ${
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
            className="text-[10px] font-semibold text-[var(--muted)] underline-offset-2 hover:underline"
          >
            Unstage
          </button>
        ) : null}
      </div>
      {pile.cards.length === 0 ? (
        <p className="py-3 text-center text-[10px] text-[var(--muted)]">Drop cards here</p>
      ) : (
        <div className="flex flex-wrap gap-1">
          {pile.cards.map((card: Card) => (
            <DraggableHandCard
              key={card.id}
              card={card}
              size={TABLE_CARD_SIZE}
              selected={selectedSet.has(card.id)}
              disabled={cardDisabled}
              dragEnabled={dragEnabled}
              onClick={() => onToggleCard(card.id)}
            />
          ))}
        </div>
      )}
    </div>
  );
}

export function StagingPiles({
  piles,
  activePileIndex,
  selectedIds,
  onSelectPile,
  onToggleCard,
  onUnstage,
  onStageSelected,
  canStage,
  cardDisabled = false,
  dragEnabled = false,
}: StagingPilesProps) {
  if (piles.length === 0) {
    return null;
  }

  return (
    <div className="space-y-1.5">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-[10px] font-bold uppercase tracking-wide text-[var(--muted)]">
          Staging
        </p>
        <button
          type="button"
          disabled={!canStage}
          onClick={onStageSelected}
          className="game-btn-secondary px-2.5 py-0.5 text-[10px] disabled:opacity-40"
        >
          Stage
        </button>
      </div>
      <div className="flex flex-wrap gap-2">
        {piles.map((pile) => (
          <StagingPileDropZone
            key={pile.index}
            pile={pile}
            active={pile.index === activePileIndex}
            selectedIds={selectedIds}
            onSelectPile={onSelectPile}
            onToggleCard={onToggleCard}
            onUnstage={onUnstage}
            cardDisabled={cardDisabled}
            dragEnabled={dragEnabled}
          />
        ))}
      </div>
    </div>
  );
}
