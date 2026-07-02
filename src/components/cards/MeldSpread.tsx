"use client";

import type { Card, NaturalRank, TableMeld } from "../../../convex/lib/rules/types";
import { scaledCardDimensions, type CardSize } from "../../lib/cardDisplay";
import { useCardScale } from "../../contexts/PlayerPreferencesContext";
import { meldOverlapPx } from "../../lib/feltLayout";
import { PlayingCard } from "./PlayingCard";

type MeldSpreadProps = {
  meld:
    | TableMeld
    | {
        kind: "set" | "run";
        cards: Card[];
        wildDeclarations?: Array<{ cardId: string; asRank: NaturalRank }>;
      };
  size?: CardSize;
  highlighted?: boolean;
  onClick?: () => void;
  compact?: boolean;
};

export function MeldSpread({
  meld,
  size = "sm",
  highlighted = false,
  onClick,
  compact = true,
}: MeldSpreadProps) {
  const cardScale = useCardScale();
  const { width: cardWidth, height: cardHeight } = scaledCardDimensions(size, cardScale);
  const overlap = meldOverlapPx(cardWidth, meld.kind, compact);
  const wildDeclarations = "wildDeclarations" in meld ? meld.wildDeclarations : [];
  const spreadWidth = cardWidth + (meld.cards.length - 1) * (cardWidth - overlap);

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
        highlighted ? "ring-2 ring-[var(--accent)] ring-offset-2 ring-offset-[var(--felt)]" : ""
      }`}
      style={{ width: spreadWidth, height: cardHeight }}
    >
      {meld.cards.map((card, index) => (
        <div
          key={card.id}
          className="absolute top-0"
          style={{ left: index * (cardWidth - overlap), zIndex: index }}
        >
          <PlayingCard
            card={card}
            size={size}
            wildDeclarations={wildDeclarations}
            displayOnly
          />
        </div>
      ))}
      {onClick && highlighted ? (
        <span className="absolute -top-6 left-1/2 z-10 -translate-x-1/2 whitespace-nowrap rounded-full bg-[var(--accent)] px-2 py-0.5 text-[10px] font-bold text-[#2c1810]">
          Lay off here
        </span>
      ) : null}
    </div>
  );
}
