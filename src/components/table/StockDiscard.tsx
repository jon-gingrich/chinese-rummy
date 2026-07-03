"use client";

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

const PILE_SIZE = "md" as const;

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
    <div className="flex items-end justify-center gap-8 md:gap-12">
      <div className="flex flex-col items-center gap-1.5">
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
            <PlayingCard
              card={{ id: "stock-2", suit: "spades", rank: "A", deckIndex: 0 }}
              faceDown
              size={PILE_SIZE}
              disabled
              className="pointer-events-none absolute left-1.5 top-1.5 -z-10"
            />
          ) : null}
        </div>
        <span className="rounded-full bg-black/40 px-2 py-0.5 text-[10px] font-bold text-[var(--cream)]">
          Stock · {stockCount}
        </span>
      </div>

      <div className="flex flex-col items-center gap-1.5">
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
            className="flex items-center justify-center rounded-lg border-2 border-dashed border-white/20 text-xs text-[var(--muted)]"
            style={{ width: pileDims.width, height: pileDims.height }}
          >
            Empty
          </div>
        )}
        <span className="rounded-full bg-black/40 px-2 py-0.5 text-[10px] font-bold text-[var(--cream)]">
          Discard
        </span>
      </div>
    </div>
  );
}
