"use client";

import type { Card } from "../../../convex/lib/rules/types";
import { PlayingCard } from "../cards/PlayingCard";

type DrawCardFlyOverlayProps = {
  source: "stock" | "discard";
  card: Card | null;
};

const STOCK_PLACEHOLDER: Card = {
  id: "draw-fly-stock",
  suit: "spades",
  rank: "A",
  deckIndex: 0,
};

export function DrawCardFlyOverlay({ source, card }: DrawCardFlyOverlayProps) {
  const displayCard = source === "discard" && card ? card : STOCK_PLACEHOLDER;
  const faceDown = source === "stock";

  return (
    <div className="pointer-events-none fixed inset-0 z-[60] overflow-hidden" aria-hidden>
      <div
        className={`card-draw-fly absolute top-[42%] ${
          source === "discard" ? "card-draw-fly--discard" : "card-draw-fly--stock"
        }`}
      >
        <PlayingCard card={displayCard} faceDown={faceDown} size="xl" displayOnly />
      </div>
    </div>
  );
}
