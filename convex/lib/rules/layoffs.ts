import type { Card, LayOffTarget, TableMeld, WildDeclaration } from "./types";
import {
  effectiveRankForCard,
  isWildInMeld,
  validateRunStructure,
  validateSetStructure,
} from "./melds";

export type WildRelocation = {
  destinationMeldId: string;
  wildDeclaration?: WildDeclaration;
};

export type LayOffInput = {
  targetMeldId: string;
  card: Card;
  replaceWildCardId?: string;
  relocation?: WildRelocation;
};

function meldById(melds: TableMeld[], meldId: string): TableMeld | undefined {
  return melds.find((meld) => meld.id === meldId);
}

function ownerMelds(melds: TableMeld[], ownerId: string): TableMeld[] {
  return melds.filter((meld) => meld.ownerId === ownerId);
}

function setRank(meld: TableMeld): string | null {
  for (const card of meld.cards) {
    const rank = effectiveRankForCard(card, meld.wildDeclarations);
    if (typeof rank === "object") {
      return null;
    }
    return rank;
  }
  return null;
}

function tryAddToSet(meld: TableMeld, card: Card): TableMeld | null {
  const rank = setRank(meld);
  if (!rank) {
    return null;
  }
  const cardRank = effectiveRankForCard(card, []);
  if (typeof cardRank === "object" || cardRank !== rank) {
    return null;
  }
  if (isWildInMeld(card, [])) {
    return null;
  }

  const updated: TableMeld = {
    ...meld,
    cards: [...meld.cards, card],
  };
  return validateSetStructure(updated.cards, updated.wildDeclarations) ? updated : null;
}

function tryAddToRun(meld: TableMeld, card: Card): TableMeld | null {
  const atStart: TableMeld = { ...meld, cards: [card, ...meld.cards] };
  if (validateRunStructure(atStart.cards, atStart.wildDeclarations)) {
    return atStart;
  }

  const atEnd: TableMeld = { ...meld, cards: [...meld.cards, card] };
  if (validateRunStructure(atEnd.cards, atEnd.wildDeclarations)) {
    return atEnd;
  }

  return null;
}

function replaceableWilds(meld: TableMeld, card: Card): string[] {
  if (meld.kind === "set") {
    return [];
  }

  if (isWildInMeld(card, [])) {
    return [];
  }

  return meld.cards
    .filter((wildCard) => isWildInMeld(wildCard, meld.wildDeclarations))
    .filter((wildCard) => {
      const declared = effectiveRankForCard(wildCard, meld.wildDeclarations);
      if (typeof declared === "object") {
        return false;
      }
      const cardRank = effectiveRankForCard(card, []);
      if (typeof cardRank === "object" || cardRank !== declared) {
        return false;
      }
      if (meld.kind === "run") {
        const naturals = meld.cards.filter(
          (entry) => !isWildInMeld(entry, meld.wildDeclarations),
        );
        const suit = naturals[0]?.suit;
        return suit !== undefined && card.suit === suit;
      }
      return true;
    })
    .map((wildCard) => wildCard.id);
}

export function findLayOffTargets(
  melds: TableMeld[],
  hand: Card[],
  opened: boolean,
  openedThisTurn: boolean,
): LayOffTarget[] {
  if (!opened || openedThisTurn) {
    return [];
  }

  const targets: LayOffTarget[] = [];
  for (const meld of melds) {
    for (const card of hand) {
      const updated =
        meld.kind === "set" ? tryAddToSet(meld, card) : tryAddToRun(meld, card);
      if (updated) {
        targets.push({ cardId: card.id, meldId: meld.id, mode: "add" });
      }

      for (const wildCardId of replaceableWilds(meld, card)) {
        const destinations = ownerMelds(melds, meld.ownerId)
          .filter((entry) => entry.id !== meld.id)
          .map((entry) => entry.id);
        if (destinations.length > 0) {
          targets.push({
            cardId: card.id,
            meldId: meld.id,
            mode: "replaceWild",
            replaceWildCardId: wildCardId,
            relocationDestinations: destinations,
          });
        }
      }
    }
  }

  return targets;
}

function applyReplacement(
  target: TableMeld,
  card: Card,
  replaceWildCardId: string,
  relocation: WildRelocation,
  allMelds: TableMeld[],
): { melds: TableMeld[] } | { error: string } {
  const wildIndex = target.cards.findIndex((entry) => entry.id === replaceWildCardId);
  if (wildIndex === -1) {
    return { error: "Wild card not found in target meld" };
  }

  const wildCard = target.cards[wildIndex]!;
  if (!isWildInMeld(wildCard, target.wildDeclarations)) {
    return { error: "Selected card is not a wild" };
  }

  const destination = meldById(allMelds, relocation.destinationMeldId);
  if (!destination) {
    return { error: "Relocation destination not found" };
  }
  if (destination.ownerId !== target.ownerId) {
    return { error: "Wild must relocate to another meld on the same owner board" };
  }
  if (destination.id === target.id) {
    return { error: "Wild must relocate to a different meld" };
  }

  const targetCards = [...target.cards];
  targetCards[wildIndex] = card;
  const targetDeclarations = target.wildDeclarations.filter(
    (entry) => entry.cardId !== replaceWildCardId,
  );
  const updatedTarget: TableMeld = {
    ...target,
    cards: targetCards,
    wildDeclarations: targetDeclarations,
  };

  const targetValid =
    updatedTarget.kind === "set"
      ? validateSetStructure(updatedTarget.cards, updatedTarget.wildDeclarations)
      : validateRunStructure(updatedTarget.cards, updatedTarget.wildDeclarations);
  if (!targetValid) {
    return { error: "Replacement leaves target meld invalid" };
  }

  const destinationDeclarations = [...destination.wildDeclarations];
  if (relocation.wildDeclaration) {
    const existing = destinationDeclarations.findIndex(
      (entry) => entry.cardId === wildCard.id,
    );
    if (existing >= 0) {
      destinationDeclarations[existing] = relocation.wildDeclaration;
    } else {
      destinationDeclarations.push(relocation.wildDeclaration);
    }
  } else if (isWildInMeld(wildCard, target.wildDeclarations)) {
    const prior = target.wildDeclarations.find((entry) => entry.cardId === wildCard.id);
    if (prior) {
      destinationDeclarations.push(prior);
    }
  }

  const updatedDestination: TableMeld = {
    ...destination,
    cards: [...destination.cards, wildCard],
    wildDeclarations: destinationDeclarations,
  };

  const destinationValid =
    updatedDestination.kind === "set"
      ? validateSetStructure(
          updatedDestination.cards,
          updatedDestination.wildDeclarations,
          true,
        )
      : validateRunStructure(
          updatedDestination.cards,
          updatedDestination.wildDeclarations,
          true,
        );
  if (!destinationValid) {
    return { error: "Relocation leaves destination meld invalid" };
  }

  const melds = allMelds.map((meld) => {
    if (meld.id === updatedTarget.id) {
      return updatedTarget;
    }
    if (meld.id === updatedDestination.id) {
      return updatedDestination;
    }
    return meld;
  });

  return { melds };
}

export function applyLayOff(
  melds: TableMeld[],
  input: LayOffInput,
): { melds: TableMeld[] } | { error: string } {
  const target = meldById(melds, input.targetMeldId);
  if (!target) {
    return { error: "Target meld not found" };
  }

  if (input.replaceWildCardId) {
    if (target.kind === "set") {
      return { error: "Wild replacement is not allowed on sets" };
    }
    if (!input.relocation) {
      return { error: "Wild replacement requires relocation" };
    }
    return applyReplacement(
      target,
      input.card,
      input.replaceWildCardId,
      input.relocation,
      melds,
    );
  }

  const updated =
    target.kind === "set" ? tryAddToSet(target, input.card) : tryAddToRun(target, input.card);
  if (!updated) {
    return { error: "Card cannot be laid off on this meld" };
  }

  return {
    melds: melds.map((meld) => (meld.id === updated.id ? updated : meld)),
  };
}

export function validateLayOff(
  melds: TableMeld[],
  hand: Card[],
  input: LayOffInput,
  opened: boolean,
  openedThisTurn: boolean,
): string | null {
  if (!opened) {
    return "Must open before laying off";
  }
  if (openedThisTurn) {
    return "Cannot lay off on your opening turn";
  }
  if (!hand.some((card) => card.id === input.card.id)) {
    return "Card not in hand";
  }

  const result = applyLayOff(melds, input);
  if ("error" in result) {
    return result.error;
  }

  return null;
}
