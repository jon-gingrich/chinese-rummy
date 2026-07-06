"use client";

import { useEffect, useRef } from "react";
import type { Card, TableMeld } from "../../convex/lib/rules/types";

export type CardFlight = {
  cardId: string;
  fromPlayerId: string;
};

export function detectNewTableCards(
  previousMelds: TableMeld[],
  nextMelds: TableMeld[],
  previousDiscardId: string | undefined,
  nextDiscardId: string | undefined,
  discardPlayerId: string | undefined,
  localPlayerId: string | undefined,
  localDragCardId: string | null,
): CardFlight[] {
  const flights: CardFlight[] = [];
  const previousMeldCardOwners = new Map<string, string>();

  for (const meld of previousMelds) {
    for (const card of meld.cards) {
      previousMeldCardOwners.set(card.id, meld.ownerId);
    }
  }

  for (const meld of nextMelds) {
    for (const card of meld.cards) {
      if (previousMeldCardOwners.has(card.id)) {
        continue;
      }
      if (card.id === localDragCardId) {
        continue;
      }
      flights.push({ cardId: card.id, fromPlayerId: meld.ownerId });
    }
  }

  if (
    nextDiscardId &&
    nextDiscardId !== previousDiscardId &&
    nextDiscardId !== localDragCardId &&
    discardPlayerId &&
    discardPlayerId !== localPlayerId
  ) {
    flights.push({ cardId: nextDiscardId, fromPlayerId: discardPlayerId });
  }

  return flights;
}

export function usePendingCardFlights({
  melds,
  topDiscard,
  localPlayerId,
  localDragCardId,
}: {
  melds: TableMeld[];
  topDiscard: Card | undefined;
  localPlayerId: string | undefined;
  localDragCardId: string | null;
}) {
  const previousMeldsRef = useRef<TableMeld[]>([]);
  const previousDiscardIdRef = useRef<string | undefined>(undefined);
  const flightsRef = useRef<CardFlight[]>([]);

  useEffect(() => {
    const flights = detectNewTableCards(
      previousMeldsRef.current,
      melds,
      previousDiscardIdRef.current,
      topDiscard?.id,
      undefined,
      localPlayerId,
      localDragCardId,
    );
    flightsRef.current = flights;
    previousMeldsRef.current = melds;
    previousDiscardIdRef.current = topDiscard?.id;
  }, [melds, topDiscard?.id, localPlayerId, localDragCardId]);

  return flightsRef.current;
}
