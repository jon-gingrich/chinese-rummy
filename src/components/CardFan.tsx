"use client";

import type { Card } from "../../convex/lib/rules/types";
import {
  fanRotation,
  fanTranslateY,
  formatCardLabel,
  sortHand,
  suitColorClass,
  type HandSortMode,
} from "../lib/cards";

type CardFanProps = {
  cards: Card[];
  selectedIds?: string[];
  selectedId?: string | null;
  onToggle: (cardId: string) => void;
  disabled?: boolean;
  sortMode: HandSortMode;
  onSortModeChange: (mode: HandSortMode) => void;
  showSortControls?: boolean;
};

export function CardFan({
  cards,
  selectedIds,
  selectedId,
  onToggle,
  disabled = false,
  sortMode,
  onSortModeChange,
  showSortControls = true,
}: CardFanProps) {
  const sortedCards = sortHand(cards, sortMode);
  const selectedSet = new Set(selectedIds ?? (selectedId ? [selectedId] : []));

  return (
    <div className="space-y-4">
      {showSortControls ? (
        <div className="flex flex-wrap gap-2 text-sm">
          <span className="self-center text-[var(--muted)]">Sort by</span>
          <button
            type="button"
            onClick={() => onSortModeChange("suit")}
            className={`rounded-full px-3 py-1 ${
              sortMode === "suit"
                ? "bg-[var(--accent)] text-black"
                : "border border-white/10"
            }`}
          >
            Suit
          </button>
          <button
            type="button"
            onClick={() => onSortModeChange("rank")}
            className={`rounded-full px-3 py-1 ${
              sortMode === "rank"
                ? "bg-[var(--accent)] text-black"
                : "border border-white/10"
            }`}
          >
            Rank
          </button>
        </div>
      ) : null}

      <div className="overflow-x-auto pb-2">
        <div
          className="mx-auto flex min-h-28 items-end justify-center px-2"
          style={{ minWidth: `${Math.max(sortedCards.length * 44, 220)}px` }}
        >
          {sortedCards.map((card, index) => {
            const selected = selectedSet.has(card.id);
            const rotation = fanRotation(index, sortedCards.length);
            const translateY = fanTranslateY(index, sortedCards.length);

            return (
              <button
                key={card.id}
                type="button"
                disabled={disabled}
                onClick={() => onToggle(card.id)}
                aria-pressed={selected}
                className={`relative -mx-1 h-24 w-14 shrink-0 rounded-xl border px-1 py-2 text-xs font-semibold shadow-lg transition ${
                  selected
                    ? "border-[var(--accent)] bg-[var(--accent)]/25 ring-2 ring-[var(--accent)]/40"
                    : "border-white/15 bg-[#f8f4ea] text-slate-900"
                } ${suitColorClass(card.suit)} disabled:cursor-default disabled:opacity-60`}
                style={{
                  transform: `rotate(${rotation}deg) translateY(${translateY}px)`,
                  transformOrigin: "bottom center",
                  zIndex: selected ? sortedCards.length + 1 : index + 1,
                }}
              >
                <span className="block leading-tight">{formatCardLabel(card)}</span>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
