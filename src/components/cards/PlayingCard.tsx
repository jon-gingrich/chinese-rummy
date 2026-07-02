"use client";

import { useId } from "react";
import type { Card, NaturalRank } from "../../../convex/lib/rules/types";
import {
  isPlayedAsWild,
  isRedSuit,
  isWildCard,
  scaledCardDimensions,
  suitSymbol,
  type CardSize,
  wildAsRank,
} from "../../lib/cardDisplay";
import { useCardScale } from "../../contexts/PlayerPreferencesContext";

type PlayingCardProps = {
  card: Card;
  size?: CardSize;
  selected?: boolean;
  highlighted?: boolean;
  disabled?: boolean;
  /** Table melds and previews — solid face, not a faded disabled button. */
  displayOnly?: boolean;
  faceDown?: boolean;
  wildDeclarations?: Array<{ cardId: string; asRank: NaturalRank }>;
  onClick?: () => void;
  className?: string;
  style?: React.CSSProperties;
};

function CenterArt({
  suit,
  rank,
  asRank,
  playedWild,
}: {
  suit: Card["suit"];
  rank: Card["rank"];
  asRank: NaturalRank | null;
  playedWild: boolean;
}) {
  const red = isRedSuit(suit);
  const color = red ? "#c0392b" : "#2c3e50";

  if (rank === "JOKER" || playedWild) {
    return (
      <text x="28" y="52" textAnchor="middle" fontSize="20" fontWeight="800" fill="#7b2cbf">
        {asRank ?? "★"}
      </text>
    );
  }

  if (["J", "Q", "K"].includes(rank)) {
    return (
      <text x="28" y="54" textAnchor="middle" fontSize="22" fontWeight="800" fill={color}>
        {rank}
      </text>
    );
  }

  const pipCount = rank === "A" ? 1 : rank === "10" ? 10 : Number(rank);
  const positions: Array<[number, number]> =
    pipCount === 1
      ? [[28, 50]]
      : pipCount === 2
        ? [
            [28, 38],
            [28, 62],
          ]
        : pipCount === 3
          ? [
              [28, 34],
              [28, 50],
              [28, 66],
            ]
          : (
              [
                [20, 38],
                [36, 38],
                [28, 50],
                [20, 62],
                [36, 62],
              ] as Array<[number, number]>
            ).slice(0, pipCount);

  return (
    <>
      {positions.map(([x, y], index) => (
        <text key={index} x={x} y={y} textAnchor="middle" fontSize="14" fill={color}>
          {suitSymbol(suit)}
        </text>
      ))}
    </>
  );
}

function CardFace({
  card,
  asRank,
  playedWild,
  faceDown,
  patternId,
}: {
  card: Card;
  asRank: NaturalRank | null;
  playedWild: boolean;
  faceDown: boolean;
  patternId: string;
}) {
  const rankColor = isRedSuit(card.suit) ? "#c0392b" : "#2c3e50";
  const displayRank = card.rank === "JOKER" ? "★" : playedWild && asRank ? asRank : card.rank;
  const cornerSuit = card.rank === "JOKER" ? "★" : suitSymbol(card.suit);

  if (faceDown) {
    return (
      <svg viewBox="0 0 56 78" className="h-full w-full" aria-hidden>
        <rect width="56" height="78" rx="6" fill="#1e4d6b" />
        <rect x="4" y="4" width="48" height="70" rx="4" fill="#2a6a8f" stroke="#4a90b8" strokeWidth="1" />
        <pattern id={patternId} patternUnits="userSpaceOnUse" width="8" height="8">
          <circle cx="4" cy="4" r="1.5" fill="#4a90b8" opacity="0.5" />
        </pattern>
        <rect x="8" y="8" width="40" height="62" rx="3" fill={`url(#${patternId})`} />
      </svg>
    );
  }

  return (
    <>
      <svg viewBox="0 0 56 78" className="h-full w-full" aria-hidden>
        <rect width="56" height="78" rx="4" fill="#fffef8" />
        <text x="8" y="16" fontSize="13" fontWeight="800" fill={rankColor}>
          {displayRank}
        </text>
        <text x="8" y="28" fontSize="11" fontWeight="700" fill={rankColor}>
          {cornerSuit}
        </text>
        <CenterArt suit={card.suit} rank={card.rank} asRank={asRank} playedWild={playedWild} />
        <text
          x="48"
          y="72"
          fontSize="13"
          fontWeight="800"
          fill={rankColor}
          textAnchor="end"
          transform="rotate(180 48 72)"
        >
          {displayRank}
        </text>
        <text
          x="48"
          y="60"
          fontSize="11"
          fontWeight="700"
          fill={rankColor}
          textAnchor="end"
          transform="rotate(180 48 60)"
        >
          {cornerSuit}
        </text>
      </svg>
      {playedWild && asRank ? (
        <span
          className="absolute bottom-[3%] left-1/2 -translate-x-1/2 rounded bg-amber-500 px-[6%] font-bold text-amber-950"
          style={{ fontSize: "11%" }}
        >
          as {asRank}
        </span>
      ) : null}
    </>
  );
}

export function PlayingCard({
  card,
  size = "md",
  selected = false,
  highlighted = false,
  disabled = false,
  displayOnly = false,
  faceDown = false,
  wildDeclarations = [],
  onClick,
  className = "",
  style,
}: PlayingCardProps) {
  const patternId = useId();
  const cardScale = useCardScale();
  const { width, height } = scaledCardDimensions(size, cardScale);
  const asRank = wildAsRank(card, wildDeclarations);
  const playedWild = isPlayedAsWild(card, wildDeclarations);
  const interactive = Boolean(onClick) && !disabled && !displayOnly;

  const shellClasses = `relative shrink-0 overflow-visible rounded-lg border-2 bg-[#fffef8] shadow-md transition ${className} ${
    selected
      ? "-translate-y-2 border-[var(--accent)] ring-2 ring-[var(--accent)]/50"
      : highlighted
        ? "border-[var(--accent-soft)] ring-2 ring-[var(--accent)]/40"
        : playedWild || isWildCard(card)
          ? "border-amber-400"
          : "border-[#d4cfc4]"
  } ${interactive ? "cursor-pointer hover:-translate-y-1 hover:shadow-lg" : ""} ${
    disabled && !displayOnly ? "opacity-60" : ""
  }`;

  const shellStyle = { width, height, ...style };

  const face = (
    <CardFace
      card={card}
      asRank={asRank}
      playedWild={playedWild}
      faceDown={faceDown}
      patternId={patternId}
    />
  );

  if (displayOnly) {
    return (
      <div className={shellClasses} style={shellStyle} aria-hidden>
        {face}
      </div>
    );
  }

  return (
    <button
      type="button"
      disabled={!interactive}
      onClick={onClick}
      aria-pressed={selected}
      className={shellClasses}
      style={shellStyle}
    >
      {face}
    </button>
  );
}
