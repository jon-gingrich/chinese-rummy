"use client";

import type { ReactNode } from "react";
import type { Card } from "../../../convex/lib/rules/types";
import { scaledCardDimensions } from "../../lib/cardDisplay";
import { useCardScale } from "../../contexts/PlayerPreferencesContext";
import { PlayingCard } from "../cards/PlayingCard";

type StockDiscardProps = {
  stockCount: number;
  topDiscard: Card | null;
  canDrawStock: boolean;
  canDrawDiscard: boolean;
  isMyTurn: boolean;
  turnPhase: "draw" | "discard" | "rummyWindow";
  busy: boolean;
  onDrawStock: () => void;
  onDrawDiscard: () => void;
};

const PILE_SIZE = "xl" as const;

function PileLabel({ children }: { children: ReactNode }) {
  return (
    <span className="mt-1 text-[10px] font-semibold tracking-wide text-white/55">{children}</span>
  );
}

export function StockDiscard({
  stockCount,
  topDiscard,
  canDrawStock,
  canDrawDiscard,
  isMyTurn,
  turnPhase,
  busy,
  onDrawStock,
  onDrawDiscard,
}: StockDiscardProps) {
  const cardScale = useCardScale();
  const drawPhase =
    isMyTurn && (turnPhase === "draw" || turnPhase === "rummyWindow");
  const pileDims = scaledCardDimensions(PILE_SIZE, cardScale);

  return (
    <div className="flex items-start justify-center gap-5 md:gap-7">
      <div className="flex flex-col items-center">
        <div className="relative">
          <PlayingCard
            card={{ id: "stock", suit: "spades", rank: "A", deckIndex: 0 }}
            faceDown
            size={PILE_SIZE}
            highlighted={drawPhase && canDrawStock}
            disabled={!drawPhase || busy || !canDrawStock}
            onClick={onDrawStock}
          />
          {stockCount > 1 ? (
            <span
              className="pointer-events-none absolute -right-0.5 -top-0.5 rounded-full border border-white/20 bg-black/55 px-1.5 py-px text-[9px] font-bold text-[var(--cream)]"
              aria-hidden
            >
              {stockCount}
            </span>
          ) : null}
        </div>
        <PileLabel>Stock</PileLabel>
      </div>

      <div className="flex flex-col items-center">
        {topDiscard ? (
          <PlayingCard
            card={topDiscard}
            size={PILE_SIZE}
            highlighted={drawPhase && canDrawDiscard}
            disabled={!drawPhase || busy || !canDrawDiscard}
            onClick={onDrawDiscard}
          />
        ) : (
          <div
            className="flex items-center justify-center rounded-lg border border-dashed border-white/15 text-[10px] text-white/40"
            style={{ width: pileDims.width, height: pileDims.height }}
          >
            Empty
          </div>
        )}
        <PileLabel>Discard</PileLabel>
      </div>
    </div>
  );
}
