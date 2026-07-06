import { isAutomatedPlayerId } from "../automatedPlayers";
import { findOpeningMeldsForContract } from "./automatedOpening";
import { applyAction, legalActions } from "./engine";
import { deadwoodValue, scoreHand } from "./scoring";
import type { Action, Card, GameState, LayOffTarget, WildDeclaration } from "./types";

export type AutomatedTurnStep =
  | { kind: "action"; action: Action }
  | { kind: "idle" };

function discardIsUseful(hand: Card[], discarded: Card): boolean {
  if (discarded.rank === "JOKER") {
    return true;
  }

  const sameRank = hand.filter((card) => card.rank === discarded.rank).length;
  if (sameRank >= 2) {
    return true;
  }

  if (discarded.suit === "joker") {
    return false;
  }

  const sameSuit = hand.filter((card) => card.suit === discarded.suit);
  return sameSuit.length >= 2;
}

function buildLayOffAction(
  state: GameState,
  playerId: string,
  target: LayOffTarget,
): Action | null {
  const player = state.players.find((entry) => entry.id === playerId);
  if (!player) {
    return null;
  }

  const card = player.hand.find((entry) => entry.id === target.cardId);
  if (!card) {
    return null;
  }

  if (target.mode === "add") {
    let wildDeclaration: WildDeclaration | undefined;
    if (target.wildRanks && target.wildRanks.length > 0) {
      wildDeclaration = { cardId: card.id, asRank: target.wildRanks[0]! };
    }

    return {
      kind: "layOff",
      targetMeldId: target.meldId,
      card,
      wildDeclaration,
    };
  }

  return {
    kind: "layOff",
    targetMeldId: target.meldId,
    card,
    replaceWildCardId: target.replaceWildCardId,
    relocation: {
      destinationMeldId: target.relocationDestinations[0]!,
    },
  };
}

function pickBestLayOff(
  state: GameState,
  playerId: string,
  targets: LayOffTarget[],
): Action | null {
  const player = state.players.find((entry) => entry.id === playerId);
  if (!player) {
    return null;
  }

  const baseline = scoreHand(player.hand);
  let bestAction: Action | null = null;
  let bestScore = baseline;

  for (const target of targets) {
    const action = buildLayOffAction(state, playerId, target);
    if (!action) {
      continue;
    }

    const result = applyAction(state, action, playerId);
    if (result.error) {
      continue;
    }

    const nextPlayer = result.state.players.find((entry) => entry.id === playerId);
    if (!nextPlayer) {
      continue;
    }

    const nextScore = scoreHand(nextPlayer.hand);
    if (nextScore < bestScore) {
      bestScore = nextScore;
      bestAction = action;
    }
  }

  return bestAction;
}

export function chooseAutomatedTurnStep(
  state: GameState,
  playerId: string,
): AutomatedTurnStep {
  if (!isAutomatedPlayerId(playerId)) {
    return { kind: "idle" };
  }

  const player = state.players.find((entry) => entry.id === playerId);
  if (!player || player.seatIndex !== state.activeSeatIndex) {
    return { kind: "idle" };
  }

  const legal = legalActions(state, playerId);

  if (state.turnPhase === "rummyWindow") {
    if (legal.canDrawFromDiscard) {
      return { kind: "action", action: { kind: "draw", source: "discard" } };
    }
    if (legal.canDrawFromStock) {
      return { kind: "action", action: { kind: "draw", source: "stock" } };
    }
    return { kind: "idle" };
  }

  if (state.turnPhase === "draw") {
    const topDiscard = state.discard[state.discard.length - 1];
    if (
      legal.canDrawFromDiscard &&
      topDiscard &&
      discardIsUseful(player.hand, topDiscard)
    ) {
      return { kind: "action", action: { kind: "draw", source: "discard" } };
    }
    if (legal.canDrawFromStock) {
      return { kind: "action", action: { kind: "draw", source: "stock" } };
    }
    if (legal.canDrawFromDiscard) {
      return { kind: "action", action: { kind: "draw", source: "discard" } };
    }
    return { kind: "idle" };
  }

  if (state.turnPhase !== "discard") {
    return { kind: "idle" };
  }

  const bestLayOff = pickBestLayOff(state, playerId, legal.layOffTargets);
  if (bestLayOff) {
    return { kind: "action", action: bestLayOff };
  }

  if (legal.canOpen && player.playerPhase === "notOpened") {
    const contractRound = player.contractRound ?? state.roundNumber;
    const melds = findOpeningMeldsForContract(player.hand, contractRound);
    if (melds) {
      const meldCardIds = new Set(melds.flatMap((meld) => meld.cards.map((card) => card.id)));
      const remaining = player.hand.filter((card) => !meldCardIds.has(card.id));
      if (remaining.length > 0) {
        return { kind: "action", action: { kind: "open", melds } };
      }
    }
  }

  if (legal.discardableCards.length === 0) {
    return { kind: "idle" };
  }

  const discardCard = legal.discardableCards.reduce((best, card) =>
    deadwoodValue(card) > deadwoodValue(best) ? card : best,
  );

  return { kind: "action", action: { kind: "discard", card: discardCard } };
}

export function activeAutomatedPlayerId(state: GameState): string | null {
  if (state.phase !== "playing" || state.roundPhase !== "active") {
    return null;
  }

  const active = state.players.find((player) => player.seatIndex === state.activeSeatIndex);
  if (!active || !isAutomatedPlayerId(active.id)) {
    return null;
  }

  if (state.turnPhase === "rummyWindow") {
    return active.id;
  }

  if (state.turnPhase === "draw" || state.turnPhase === "discard") {
    return active.id;
  }

  return null;
}
