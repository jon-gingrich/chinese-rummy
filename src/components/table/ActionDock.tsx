"use client";

import type { ReactNode } from "react";
import type { Card, NaturalRank } from "../../../convex/lib/rules/types";
import { formatCardLabel } from "../../lib/cards";

type ActionDockProps = {
  title: string;
  children?: ReactNode;
  actions?: ReactNode;
};

export function ActionDock({ title, children, actions }: ActionDockProps) {
  if (!children && !actions) {
    return null;
  }

  return (
    <aside className="wood-rail absolute bottom-36 right-4 z-30 w-72 rounded-xl border-2 border-[var(--wood-light)] p-4 shadow-2xl">
      <h3 className="text-sm font-bold text-[var(--accent-soft)]">{title}</h3>
      {children ? <div className="mt-3 space-y-3">{children}</div> : null}
      {actions ? <div className="mt-4 flex flex-wrap gap-2">{actions}</div> : null}
    </aside>
  );
}

type WildRankPickerProps = {
  cards: Card[];
  wildRanks: Record<string, NaturalRank>;
  /** Per-card allowed ranks. Falls back to naturalRanks when omitted for a card. */
  validRanksByCardId?: Record<string, NaturalRank[]>;
  naturalRanks: NaturalRank[];
  isJoker: (card: Card) => boolean;
  onChange: (cardId: string, rank: NaturalRank) => void;
};

export function WildRankPicker({
  cards,
  wildRanks,
  validRanksByCardId,
  naturalRanks,
  isJoker,
  onChange,
}: WildRankPickerProps) {
  return (
    <div className="space-y-2">
      {cards.map((card) => {
        const allowed = validRanksByCardId?.[card.id] ?? naturalRanks;
        const chosen = Object.hasOwn(wildRanks, card.id) ? wildRanks[card.id] : undefined;
        // Avoid an orphan <select> value when Natural 2 is no longer allowed.
        const value =
          chosen !== undefined && allowed.includes(chosen)
            ? chosen
            : card.rank === "2" && allowed.includes("2")
              ? "2"
              : "";
        return (
          <label key={card.id} className="flex items-center gap-2 text-xs">
            <span className="min-w-14 font-semibold text-[var(--cream)]">{formatCardLabel(card)}</span>
            <select
              value={value}
              onChange={(event) => onChange(card.id, event.target.value as NaturalRank)}
              className="game-input flex-1 py-1.5 text-xs"
            >
              {isJoker(card) || value === "" ? <option value="">Rank…</option> : null}
              {card.rank === "2" && allowed.includes("2") ? (
                <option value="2">Natural 2</option>
              ) : null}
              {allowed
                // Twos already expose "2" as Natural 2 above; jokers still need "2"
                // so a wild can start a low run (e.g. joker-as-2, 3, 4).
                .filter((rank) => rank !== "2" || card.rank !== "2")
                .map((rank) => (
                  <option key={rank} value={rank}>
                    {rank}
                  </option>
                ))}
            </select>
          </label>
        );
      })}
    </div>
  );
}
