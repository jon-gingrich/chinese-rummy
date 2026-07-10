"use client";

import type { ReactNode } from "react";
import type { Card } from "../../../convex/lib/rules/types";
import { scaledCardDimensions, type CardSize } from "../../lib/cardDisplay";
import { TABLE_CARD_SIZE } from "../../lib/feltLayout";
import { useCardScale } from "../../contexts/PlayerPreferencesContext";
import { PlayingCard } from "../cards/PlayingCard";

type StockDiscardProps = {
  stockCount: number;
  topDiscard: Card | null;
  canDrawStock: boolean;
  canDrawDiscard: boolean;
  isMyTurn: boolean;
  turnPhase: "draw" | "discard" | "rummyWindow" | "reshuffle";
  busy: boolean;
  drawingSource?: "stock" | "discard" | null;
  cardSize?: CardSize;
  onDrawStock: () => void;
  onDrawDiscard: () => void;
};
const FLYING_CARD_DELAYS_MS = [0, 120, 240, 360, 480];

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
  drawingSource = null,
  cardSize = TABLE_CARD_SIZE,
  onDrawStock,
  onDrawDiscard,
}: StockDiscardProps) {
  const cardScale = useCardScale();
  const isReshuffling = turnPhase === "reshuffle";
  const drawPhase =
    isMyTurn && (turnPhase === "draw" || turnPhase === "rummyWindow");
  const pileDims = scaledCardDimensions(cardSize, cardScale);

  return (
    <div className="relative flex items-start justify-center gap-3 md:gap-7">
      {isReshuffling ? (
        <div
          className="reshuffle-label-pulse pointer-events-none absolute -top-7 left-1/2 z-20 -translate-x-1/2 whitespace-nowrap rounded-full border border-[var(--gold)]/35 bg-black/60 px-3 py-1 text-[11px] font-semibold tracking-wide text-[var(--gold)]"
          aria-live="polite"
        >
          Shuffling deck…
        </div>
      ) : null}

      <div className="flex flex-col items-center">
        <div
          className={`relative ${isReshuffling ? "stock-shuffle" : ""} ${
            drawingSource === "stock" ? "pile-draw-pickup" : ""
          }`}
        >
          <PlayingCard
            card={{ id: "stock", suit: "spades", rank: "A", deckIndex: 0 }}
            faceDown
            size={cardSize}
            highlighted={drawPhase && canDrawStock}
            disabled={isReshuffling || !drawPhase || busy || !canDrawStock}
            onClick={onDrawStock}
          />
          {stockCount > 1 && !isReshuffling ? (
            <span
              className="pointer-events-none absolute -right-0.5 -top-0.5 rounded-full border border-white/20 bg-black/55 px-1.5 py-px text-[9px] font-bold text-[var(--cream)]"
              aria-hidden
            >
              {stockCount}
            </span>
          ) : null}
          {isReshuffling && stockCount > 0 ? (
            <span
              className="pointer-events-none absolute -right-0.5 -top-0.5 rounded-full border border-[var(--gold)]/40 bg-black/70 px-1.5 py-px text-[9px] font-bold text-[var(--gold)]"
              aria-hidden
            >
              {stockCount}
            </span>
          ) : null}
        </div>
        <PileLabel>Stock</PileLabel>
      </div>

      <div className="relative flex flex-col items-center">
        {isReshuffling ? (
          <div
            className="pointer-events-none absolute inset-0 z-10"
            style={{ width: pileDims.width, height: pileDims.height }}
            aria-hidden
          >
            {FLYING_CARD_DELAYS_MS.map((delayMs, index) => (
              <div
                key={delayMs}
                className="card-fly-to-stock absolute right-0 top-0"
                style={{ animationDelay: `${delayMs}ms` }}
              >
                <PlayingCard
                  card={{
                    id: `reshuffle-fly-${index}`,
                    suit: "spades",
                    rank: "A",
                    deckIndex: 0,
                  }}
                  faceDown
                  size={cardSize}
                  disabled
                />
              </div>
            ))}
          </div>
        ) : null}

        {topDiscard ? (
          <div className={drawingSource === "discard" ? "pile-draw-pickup" : ""}>
            <PlayingCard
              card={topDiscard}
              size={cardSize}
              highlighted={drawPhase && canDrawDiscard}
              disabled={isReshuffling || !drawPhase || busy || !canDrawDiscard}
              onClick={onDrawDiscard}
            />
          </div>
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
