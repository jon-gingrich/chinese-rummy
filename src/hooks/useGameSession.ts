"use client";

import { useMutation, useQuery } from "convex/react";
import { api } from "../../convex/_generated/api";
import type { Id } from "../../convex/_generated/dataModel";

export type GameSession =
  | { mode: "multiplayer"; roomId: Id<"rooms"> }
  | { mode: "practice"; gameId: Id<"games"> };

export function useGameSession(session: GameSession) {
  const practiceTable = useQuery(
    api.practice.getGame,
    session.mode === "practice" ? { gameId: session.gameId } : "skip",
  );
  const roomTable = useQuery(
    api.games.getGame,
    session.mode === "multiplayer" ? { roomId: session.roomId } : "skip",
  );

  const practiceHand = useQuery(
    api.practice.getMyHand,
    session.mode === "practice" ? { gameId: session.gameId } : "skip",
  );
  const roomHand = useQuery(
    api.games.getMyHand,
    session.mode === "multiplayer" ? { roomId: session.roomId } : "skip",
  );

  const practiceLegal = useQuery(
    api.practice.getLegalActions,
    session.mode === "practice" ? { gameId: session.gameId } : "skip",
  );
  const roomLegal = useQuery(
    api.games.getLegalActions,
    session.mode === "multiplayer" ? { roomId: session.roomId } : "skip",
  );

  const practiceDraw = useMutation(api.practice.draw);
  const roomDraw = useMutation(api.games.draw);
  const practiceDiscard = useMutation(api.practice.discard);
  const roomDiscard = useMutation(api.games.discard);
  const practiceOpen = useMutation(api.practice.open);
  const roomOpen = useMutation(api.games.open);
  const practiceCallRummy = useMutation(api.practice.callRummy);
  const roomCallRummy = useMutation(api.games.callRummy);
  const practiceTakeBackDiscard = useMutation(api.practice.takeBackDiscard);
  const roomTakeBackDiscard = useMutation(api.games.takeBackDiscard);
  const practiceLayOff = useMutation(api.practice.layOff);
  const roomLayOff = useMutation(api.games.layOff);
  const practiceContinueRound = useMutation(api.practice.continueRound);
  const roomContinueRound = useMutation(api.games.continueRound);
  const abandonPractice = useMutation(api.practice.abandonPracticeGame);
  const substituteAutomatedPlayer = useMutation(api.rooms.substituteAutomatedPlayer);

  const table = session.mode === "practice" ? practiceTable : roomTable;
  const hand = session.mode === "practice" ? practiceHand : roomHand;
  const legalActions = session.mode === "practice" ? practiceLegal : roomLegal;

  return {
    table,
    hand,
    legalActions,
    async draw(source: "stock" | "discard") {
      if (session.mode === "practice") {
        return await practiceDraw({ gameId: session.gameId, source });
      }
      return await roomDraw({ roomId: session.roomId, source });
    },
    async discard(card: Parameters<typeof practiceDiscard>[0]["card"]) {
      if (session.mode === "practice") {
        return await practiceDiscard({ gameId: session.gameId, card });
      }
      return await roomDiscard({ roomId: session.roomId, card });
    },
    async open(melds: Parameters<typeof practiceOpen>[0]["melds"]) {
      if (session.mode === "practice") {
        return await practiceOpen({ gameId: session.gameId, melds });
      }
      return await roomOpen({ roomId: session.roomId, melds });
    },
    async callRummy() {
      if (session.mode === "practice") {
        return await practiceCallRummy({ gameId: session.gameId });
      }
      return await roomCallRummy({ roomId: session.roomId });
    },
    async takeBackDiscard() {
      if (session.mode === "practice") {
        return await practiceTakeBackDiscard({ gameId: session.gameId });
      }
      return await roomTakeBackDiscard({ roomId: session.roomId });
    },
    async layOff(args: Omit<Parameters<typeof practiceLayOff>[0], "gameId">) {
      if (session.mode === "practice") {
        return await practiceLayOff({ gameId: session.gameId, ...args });
      }
      return await roomLayOff({ roomId: session.roomId, ...args });
    },
    async continueRound() {
      if (session.mode === "practice") {
        return await practiceContinueRound({ gameId: session.gameId });
      }
      return await roomContinueRound({ roomId: session.roomId });
    },
    async abandonPractice() {
      if (session.mode !== "practice") {
        throw new Error("Only practice games can be abandoned");
      }
      await abandonPractice({ gameId: session.gameId });
    },
    async substituteAutomated(seatIndex: number) {
      if (session.mode !== "multiplayer") {
        throw new Error("Substitution is only available in multiplayer games");
      }
      await substituteAutomatedPlayer({ roomId: session.roomId, seatIndex });
    },
    settingsReturnTo:
      session.mode === "practice"
        ? `/practice/${session.gameId}`
        : `/room/${session.roomId}`,
    session,
  };
}
