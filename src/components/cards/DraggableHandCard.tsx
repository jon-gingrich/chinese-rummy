"use client";

import { useDraggable } from "@dnd-kit/core";
import { CSS } from "@dnd-kit/utilities";
import type { Card, NaturalRank } from "../../../convex/lib/rules/types";
import { handCardDragId } from "../../lib/cardDrag";
import type { CardSize } from "../../lib/cardDisplay";
import { PlayingCard } from "./PlayingCard";

type DraggableHandCardProps = {
  card: Card;
  size?: CardSize;
  selected?: boolean;
  justDrawn?: boolean;
  disabled?: boolean;
  dragEnabled?: boolean;
  onClick?: () => void;
  className?: string;
  style?: React.CSSProperties;
};

export function DraggableHandCard({
  card,
  size = "lg",
  selected = false,
  justDrawn = false,
  disabled = false,
  dragEnabled = false,
  onClick,
  className = "",
  style,
}: DraggableHandCardProps) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: handCardDragId(card.id),
    disabled: !dragEnabled || disabled,
    data: { cardId: card.id },
  });

  const dragStyle: React.CSSProperties = {
    ...style,
    transform: transform ? CSS.Translate.toString(transform) : undefined,
    opacity: isDragging ? 0.35 : undefined,
    zIndex: isDragging ? 50 : style?.zIndex,
    touchAction: dragEnabled ? "none" : undefined,
  };

  return (
    <div
      ref={setNodeRef}
      className={className}
      style={dragStyle}
      {...(dragEnabled && !disabled ? listeners : {})}
      {...(dragEnabled && !disabled ? attributes : {})}
    >
      <PlayingCard
        card={card}
        size={size}
        selected={selected}
        justDrawn={justDrawn}
        disabled={disabled}
        dimmed={false}
        onClick={onClick}
        className={dragEnabled && !disabled ? "cursor-grab active:cursor-grabbing" : ""}
      />
    </div>
  );
}

export function HandCardDragOverlay({
  card,
  size = "lg",
  wildDeclarations = [],
}: {
  card: Card;
  size?: CardSize;
  wildDeclarations?: Array<{ cardId: string; asRank: NaturalRank }>;
}) {
  return (
    <PlayingCard
      card={card}
      size={size}
      wildDeclarations={wildDeclarations}
      className="rotate-2 shadow-2xl ring-2 ring-[var(--accent)]"
    />
  );
}
