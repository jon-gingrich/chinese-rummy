"use client";

import {
  DndContext,
  DragOverlay,
  PointerSensor,
  pointerWithin,
  rectIntersection,
  useSensor,
  useSensors,
  type CollisionDetection,
  type DragEndEvent,
  type DragOverEvent,
  type DragStartEvent,
} from "@dnd-kit/core";
import { useQuery } from "convex/react";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { api } from "../../convex/_generated/api";
import { findLayOffGapTargets } from "../../convex/lib/rules/layoffs";
import { isJoker } from "../../convex/lib/rules/melds";
import type { Card, LayOffTarget, TableMeld } from "../../convex/lib/rules/types";
import { gapsMatch, parseHandCardDragId, parseMeldGapDropId } from "../lib/cardDrag";
import { formatCardLabel, sortHand, type HandSortMode } from "../lib/cards";
import { CardFan } from "./CardFan";
import { ConfirmDialog } from "./ConfirmDialog";
import { LayOffDropDialog } from "./LayOffDropDialog";
import { RulesReference } from "./RulesReference";
import { HandCardDragOverlay } from "./cards/DraggableHandCard";
import { HowToPlayOverlay } from "./table/HowToPlayOverlay";
import { ActionDock, WildRankPicker } from "./table/ActionDock";
import { FeltSurface } from "./table/FeltSurface";
import { layoutPlayers, PlayerBoard } from "./table/PlayerBoard";
import { RoundSummaryOverlay } from "./table/RoundSummaryOverlay";
import { StockDiscard } from "./table/StockDiscard";
import { DrawCardFlyOverlay } from "./table/DrawCardFlyOverlay";
import { TableHud } from "./table/TableHud";
import { MeldSpread } from "./cards/MeldSpread";
import { useLayOffFlow } from "../hooks/useLayOffFlow";
import { useOpeningFlow } from "../hooks/useOpeningFlow";
import { useGameSession, type GameSession } from "../hooks/useGameSession";
import { usePlayerPreferences } from "../contexts/PlayerPreferencesContext";

type GameTableProps = {
  session: GameSession;
  backHref?: string;
  headerLabel?: string;
  headerExtra?: ReactNode;
};

export function GameTable({ session, backHref, headerLabel, headerExtra }: GameTableProps) {
  const router = useRouter();
  const game = useGameSession(session);
  const { preferences, updatePreferences } = usePlayerPreferences();
  const viewer = useQuery(api.users.viewer);
  const { table, hand, legalActions } = game;
  const [selectedCardId, setSelectedCardId] = useState<string | null>(null);
  const [handSortMode, setHandSortMode] = useState<HandSortMode>("suit");
  const [showDiscardConfirm, setShowDiscardConfirm] = useState(false);
  const [showRules, setShowRules] = useState(false);
  const [showHowToPlay, setShowHowToPlay] = useState(false);
  const [howToPlayAutoShown, setHowToPlayAutoShown] = useState(false);
  const [status, setStatus] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [handMode, setHandMode] = useState<"discard" | "opening">("discard");
  const [substituteTarget, setSubstituteTarget] = useState<{
    seatIndex: number;
    displayName: string;
  } | null>(null);
  const [draggingCardId, setDraggingCardId] = useState<string | null>(null);
  const [activeDropGapId, setActiveDropGapId] = useState<string | null>(null);
  const [layOffDropDialog, setLayOffDropDialog] = useState<{
    card: Card;
    target: LayOffTarget;
  } | null>(null);
  const [drawFly, setDrawFly] = useState<{
    source: "stock" | "discard";
    card: Card | null;
  } | null>(null);
  const [justDrawnCardId, setJustDrawnCardId] = useState<string | null>(null);
  const handBeforeDrawRef = useRef<Set<string> | null>(null);
  const activeDropGapIdRef = useRef<string | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: { distance: 10 },
    }),
  );

  const myPlayer = table?.players.find((player) => player.id === viewer?.userId);
  const mySeatIndex = myPlayer?.seatIndex ?? 0;
  const isMyTurn = myPlayer?.isActive ?? false;
  const canOpen =
    isMyTurn &&
    table?.turnPhase === "discard" &&
    myPlayer?.playerPhase === "notOpened" &&
    legalActions?.canOpen;
  const isOpeningHandMode = canOpen && handMode === "opening";
  const canCallRummy = legalActions?.canCallRummy ?? false;
  const canTakeBackDiscard = legalActions?.canTakeBackDiscard ?? false;
  const isRummyWindow = table?.turnPhase === "rummyWindow";
  const canLayOff =
    isMyTurn && table?.turnPhase === "discard" && (legalActions?.canLayOff ?? false);

  useEffect(() => {
    if (!isMyTurn || table?.turnPhase === "draw") {
      setHandMode("discard");
      setSelectedCardId(null);
    }
  }, [isMyTurn, table?.turnPhase]);

  useEffect(() => {
    if (!canOpen) {
      setHandMode("discard");
    }
  }, [canOpen]);

  useEffect(() => {
    if (!handBeforeDrawRef.current || !hand) {
      return;
    }
    const newCard = hand.find((card) => !handBeforeDrawRef.current!.has(card.id));
    if (newCard) {
      setJustDrawnCardId(newCard.id);
      handBeforeDrawRef.current = null;
    }
  }, [hand]);

  useEffect(() => {
    if (!justDrawnCardId) {
      return;
    }
    const timeout = window.setTimeout(() => setJustDrawnCardId(null), 4500);
    return () => window.clearTimeout(timeout);
  }, [justDrawnCardId]);

  useEffect(() => {
    if (!drawFly) {
      return;
    }
    const timeout = window.setTimeout(() => setDrawFly(null), 700);
    return () => window.clearTimeout(timeout);
  }, [drawFly]);

  useEffect(() => {
    if (
      howToPlayAutoShown ||
      viewer === undefined ||
      viewer === null ||
      table === null ||
      table === undefined
    ) {
      return;
    }
    if (!preferences.hasSeenHowToPlay) {
      setShowHowToPlay(true);
    }
    setHowToPlayAutoShown(true);
  }, [howToPlayAutoShown, preferences.hasSeenHowToPlay, table, viewer]);

  async function handleCloseHowToPlay() {
    setShowHowToPlay(false);
    try {
      await updatePreferences({ hasSeenHowToPlay: true });
    } catch {
      setStatus("Could not save tutorial progress.");
    }
  }

  const sortedHand = useMemo(
    () => (hand ? sortHand(hand, handSortMode) : []),
    [hand, handSortMode],
  );

  const opening = useOpeningFlow({
    submitOpen: (melds) => game.open(melds),
    roundNumber: myPlayer?.contractRound ?? 1,
    hand: sortedHand,
    onStatus: setStatus,
  });

  const layOff = useLayOffFlow({
    performLayOff: (args) => game.layOff(args),
    hand: sortedHand,
    melds: table?.melds ?? [],
    selectedCardId: canLayOff ? selectedCardId : null,
    onStatus: setStatus,
    onComplete: () => setSelectedCardId(null),
  });

  const meldsByOwner = useMemo(() => {
    const map = new Map<string, TableMeld[]>();
    for (const meld of table?.melds ?? []) {
      const list = map.get(meld.ownerId) ?? [];
      list.push(meld);
      map.set(meld.ownerId, list);
    }
    return map;
  }, [table?.melds]);

  const selectedCard =
    isOpeningHandMode
      ? opening.selectedCards[0] ?? null
      : sortedHand.find((entry) => entry.id === selectedCardId) ?? null;

  const handCards = isOpeningHandMode ? opening.availableHand : sortedHand;
  const handSelectedIds = isOpeningHandMode
    ? opening.selectedIds
    : selectedCardId
      ? [selectedCardId]
      : [];

  const draggingCard = useMemo(
    () => sortedHand.find((entry) => entry.id === draggingCardId) ?? null,
    [sortedHand, draggingCardId],
  );

  const layOffGapTargets = useMemo(() => {
    if (!draggingCard || !canLayOff) {
      return [];
    }
    // canLayOff is only true when opened and not on the opening turn.
    return findLayOffGapTargets(table?.melds ?? [], draggingCard, true, false);
  }, [canLayOff, draggingCard, table?.melds]);

  const layOffCollisionDetection: CollisionDetection = (args) => {
    const pointerHits = pointerWithin(args);
    if (pointerHits.length > 0) {
      return pointerHits;
    }
    return rectIntersection(args);
  };

  const dragLayOffEnabled =
    canLayOff && !busy && !isOpeningHandMode && table?.turnPhase === "discard";

  const openingUndoButton =
    isOpeningHandMode && opening.pendingMelds.length > 0 ? (
      <button
        type="button"
        disabled={opening.busy}
        onClick={() => opening.undoLastMeld()}
        className="game-btn-secondary text-xs"
      >
        Undo meld
      </button>
    ) : null;

  const turnMessage = useMemo(() => {
    if (!table) {
      return "Loading…";
    }
    if (table.phase === "roundEnd") {
      return "Round complete";
    }
    if (table.phase === "gameEnd") {
      return "Game over";
    }
    if (!isMyTurn) {
      const active = table.players.find((player) => player.isActive);
      if (isRummyWindow && canCallRummy) {
        return "Playable discard — call rummy?";
      }
      if (isRummyWindow && canTakeBackDiscard) {
        return "Take back your discard before someone calls rummy";
      }
      return `Waiting for ${active?.displayName ?? "next player"}…`;
    }
    if (isRummyWindow && canTakeBackDiscard) {
      return "Take back your discard or wait for the next player";
    }
    if (isRummyWindow) {
      return "Rummy window — draw to continue";
    }
    if (table.turnPhase === "draw") {
      return "Your turn — draw from stock or discard";
    }
    if (isOpeningHandMode) {
      return opening.nextRequirement
        ? `Open — ${opening.progressLabel}`
        : "Open — submit your contract";
    }
    if (canOpen) {
      return selectedCardId
        ? "Discard selected card — or tap another card to build a meld"
        : "Select a card to discard — or tap several cards to build your contract";
    }
    if (canLayOff) {
      return selectedCardId
        ? "Drag to a gap between cards, or tap a highlighted meld"
        : "Drag a card onto a meld gap to lay off";
    }
    return selectedCardId ? "Discard selected card" : "Select a card to discard";
  }, [table, isMyTurn, canOpen, isOpeningHandMode, canLayOff, selectedCardId, opening.nextRequirement, opening.progressLabel, isRummyWindow, canCallRummy, canTakeBackDiscard]);

  async function handleCallRummy() {
    setBusy(true);
    setStatus(null);
    try {
      const result = await game.callRummy();
      if (result.error) {
        setStatus(result.error);
      }
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "Rummy call failed");
    } finally {
      setBusy(false);
    }
  }

  async function handleTakeBackDiscard() {
    setBusy(true);
    setStatus(null);
    try {
      const result = await game.takeBackDiscard();
      if (result.error) {
        setStatus(result.error);
      } else {
        setSelectedCardId(null);
      }
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "Take back failed");
    } finally {
      setBusy(false);
    }
  }

  async function handleDraw(source: "stock" | "discard") {
    if (busy || drawFly) {
      return;
    }

    handBeforeDrawRef.current = new Set(hand?.map((card) => card.id) ?? []);
    setDrawFly({
      source,
      card: source === "discard" ? (table?.topDiscard ?? null) : null,
    });
    setBusy(true);
    setStatus(null);
    try {
      const result = await game.draw(source);
      if (result.error) {
        setStatus(result.error);
        handBeforeDrawRef.current = null;
        setDrawFly(null);
      } else {
        setSelectedCardId(null);
      }
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "Draw failed");
      handBeforeDrawRef.current = null;
      setDrawFly(null);
    } finally {
      setBusy(false);
    }
  }

  async function handleContinueRound() {
    setBusy(true);
    setStatus(null);
    try {
      const result = await game.continueRound();
      if (result.error) {
        setStatus(result.error);
      }
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "Could not continue");
    } finally {
      setBusy(false);
    }
  }

  async function handleSubstitute() {
    if (!substituteTarget) {
      return;
    }
    setBusy(true);
    setStatus(null);
    try {
      await game.substituteAutomated(substituteTarget.seatIndex);
      setSubstituteTarget(null);
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "Could not substitute player");
    } finally {
      setBusy(false);
    }
  }

  async function requestDiscard() {
    if (!selectedCard) {
      setStatus("Select a card to discard");
      return;
    }
    if (preferences.confirmBeforeDiscard) {
      setShowDiscardConfirm(true);
      return;
    }
    await handleDiscard();
  }

  async function requestOpeningSubmit() {
    if (preferences.confirmBeforeOpening) {
      opening.setShowConfirm(true);
      return;
    }
    await opening.submitOpening();
  }

  async function handleDiscard() {
    if (!selectedCard) {
      setStatus("Select a card to discard");
      return;
    }

    setBusy(true);
    setStatus(null);
    try {
      const result = await game.discard(selectedCard);
      if (result.error) {
        setStatus(result.error);
      } else {
        setSelectedCardId(null);
        setShowDiscardConfirm(false);
        setJustDrawnCardId(null);
      }
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "Discard failed");
    } finally {
      setBusy(false);
    }
  }

  function switchToDiscardMode() {
    setHandMode("discard");
    opening.clearSelection();
    setSelectedCardId(null);
    setStatus(null);
  }

  function switchToOpeningMode() {
    setHandMode("opening");
    setSelectedCardId(null);
    setStatus(null);
  }

  function toggleHandCard(cardId: string) {
    if (justDrawnCardId && cardId !== justDrawnCardId) {
      setJustDrawnCardId(null);
    }

    if (!isMyTurn || table?.turnPhase !== "discard" || busy) {
      return;
    }

    if (isOpeningHandMode) {
      const isDeselect = opening.selectedIds.includes(cardId);
      if (isDeselect && opening.pendingMelds.length === 0) {
        const remaining = opening.selectedIds.filter((id) => id !== cardId);
        opening.clearSelection();
        setHandMode("discard");
        setSelectedCardId(remaining.length === 1 ? remaining[0]! : null);
      } else {
        opening.toggleCard(cardId);
      }
      setStatus(null);
      return;
    }

    if (canLayOff) {
      setSelectedCardId((current) => (current === cardId ? null : cardId));
      setStatus(null);
      return;
    }

    if (canOpen) {
      if (opening.pendingMelds.length > 0) {
        setHandMode("opening");
        opening.seedSelection([cardId]);
        setSelectedCardId(null);
        setStatus(null);
        return;
      }

      if (selectedCardId === cardId) {
        setSelectedCardId(null);
        setStatus(null);
        return;
      }

      if (selectedCardId) {
        setHandMode("opening");
        opening.seedSelection([selectedCardId, cardId]);
        setSelectedCardId(null);
        setStatus(null);
        return;
      }

      setSelectedCardId(cardId);
      setStatus(null);
      return;
    }

    setSelectedCardId((current) => (current === cardId ? null : cardId));
    setStatus(null);
  }

  function handleDragStart(event: DragStartEvent) {
    const cardId = parseHandCardDragId(String(event.active.id));
    if (cardId) {
      setDraggingCardId(cardId);
      setSelectedCardId(cardId);
    }
  }

  function handleDragOver(event: DragOverEvent) {
    const overId = event.over ? String(event.over.id) : null;
    activeDropGapIdRef.current = overId;
    setActiveDropGapId(overId);
  }

  function resolveLayOffGapTarget(card: Card, dropId: string) {
    const drop = parseMeldGapDropId(dropId);
    if (!drop) {
      return null;
    }

    const gapTargets = findLayOffGapTargets(table?.melds ?? [], card, true, false);

    return (
      gapTargets.find(
        (entry) => entry.meldId === drop.meldId && gapsMatch(entry.gap, drop.gap),
      ) ?? null
    );
  }

  async function handleLayOffDrop(card: Card, target: LayOffTarget) {
    if (layOff.targetNeedsFollowUp(target, card)) {
      layOff.selectTarget(target);
      setSelectedCardId(card.id);
      setLayOffDropDialog({ card, target });
      return;
    }

    await layOff.submitLayOffFor(card, target);
    setSelectedCardId(null);
  }

  function handleDragEnd(event: DragEndEvent) {
    const cardId = parseHandCardDragId(String(event.active.id));
    const overId = event.over ? String(event.over.id) : activeDropGapIdRef.current;
    setDraggingCardId(null);
    setActiveDropGapId(null);
    activeDropGapIdRef.current = null;

    if (!cardId || !overId) {
      return;
    }

    const card = sortedHand.find((entry) => entry.id === cardId);
    if (!card) {
      return;
    }

    const gapTarget = resolveLayOffGapTarget(card, overId);
    if (!gapTarget) {
      return;
    }

    void handleLayOffDrop(card, gapTarget.layOffTarget);
  }

  async function confirmLayOffDropDialog() {
    if (!layOffDropDialog) {
      return;
    }

    const { card, target } = layOffDropDialog;
    if (target.mode === "replaceWild" && !layOff.destinationMeldId) {
      setStatus("Choose where to relocate the wild");
      return;
    }

    await layOff.submitLayOffFor(card, target);
    setLayOffDropDialog(null);
    setSelectedCardId(null);
  }

  if (
    table === undefined ||
    hand === undefined ||
    legalActions === undefined ||
    legalActions === null
  ) {
    return (
      <div className="flex h-64 items-center justify-center">
        <p className="text-sm text-[var(--muted)]">Loading table…</p>
      </div>
    );
  }

  if (table === null) {
    return (
      <div className="flex h-64 items-center justify-center">
        <p className="text-sm text-[var(--muted)]">Waiting for game state…</p>
      </div>
    );
  }

  const playerLayouts = layoutPlayers(table.players, mySeatIndex, table.players.length);
  const showRoundOverlay = Boolean(table.lastRoundSummary) || table.phase === "gameEnd";
  const goerName =
    table.players.find((player) => player.id === table.lastRoundSummary?.goerPlayerId)
      ?.displayName ?? "A player";

  return (
    <div className="flex min-h-0 flex-1 flex-col rounded-2xl">
      <RulesReference open={showRules} onClose={() => setShowRules(false)} />
      <HowToPlayOverlay open={showHowToPlay} onClose={() => void handleCloseHowToPlay()} />

      <ConfirmDialog
        open={showDiscardConfirm}
        title="Discard this card?"
        message={
          selectedCard ? (
            <p>
              End your turn by discarding{" "}
              <span className="font-bold text-[var(--cream)]">{formatCardLabel(selectedCard)}</span>.
            </p>
          ) : (
            "Select a card to discard."
          )
        }
        confirmLabel="Discard"
        busy={busy}
        onCancel={() => setShowDiscardConfirm(false)}
        onConfirm={() => void handleDiscard()}
      />

      <ConfirmDialog
        open={opening.showConfirm}
        title="Submit opening melds?"
        message={
          <div className="space-y-3">
            <p>Lay down your full contract in one opening turn:</p>
            <div className="flex flex-col gap-2">
              {opening.pendingMelds.map((meld, index) => (
                <MeldSpread key={`${meld.kind}-${index}`} meld={meld} size="xs" />
              ))}
            </div>
          </div>
        }
        confirmLabel="Lay contract"
        busy={opening.busy}
        onCancel={() => opening.setShowConfirm(false)}
        onConfirm={() => void opening.submitOpening()}
      />

      <ConfirmDialog
        open={substituteTarget !== null}
        title="Substitute automated player?"
        message={
          substituteTarget ? (
            <p>
              Replace <span className="font-bold text-[var(--cream)]">{substituteTarget.displayName}</span>{" "}
              with an automated player for the rest of this game. They cannot rejoin this seat.
            </p>
          ) : (
            ""
          )
        }
        confirmLabel="Substitute"
        busy={busy}
        onCancel={() => setSubstituteTarget(null)}
        onConfirm={() => void handleSubstitute()}
      />

      <LayOffDropDialog
        open={layOffDropDialog !== null}
        card={layOffDropDialog?.card ?? null}
        target={layOffDropDialog?.target ?? null}
        melds={table?.melds ?? []}
        wildRank={layOff.wildRank}
        validWildRanks={layOff.validWildRanks}
        destinationMeldId={layOff.destinationMeldId}
        relocationDestinations={
          layOffDropDialog?.target.mode === "replaceWild"
            ? layOffDropDialog.target.relocationDestinations
            : []
        }
        naturalRanks={layOff.naturalRanks}
        busy={layOff.busy}
        onWildRankChange={layOff.setWildRank}
        onDestinationChange={layOff.setDestinationMeldId}
        onCancel={() => {
          setLayOffDropDialog(null);
          layOff.clearTarget();
        }}
        onConfirm={() => void confirmLayOffDropDialog()}
      />

      <TableHud
        roundNumber={table.roundNumber}
        contract={table.contract}
        turnMessage={turnMessage}
        isMyTurn={isMyTurn && table.phase === "playing"}
        players={table.players}
        backHref={backHref}
        headerLabel={headerLabel}
        headerExtra={headerExtra}
        onRulesClick={() => setShowRules(true)}
        onHowToPlayClick={() => setShowHowToPlay(true)}
        settingsHref={`/home/settings?returnTo=${encodeURIComponent(game.settingsReturnTo)}`}
        onArchive={
          table.viewerCanArchive
            ? () => {
                void (async () => {
                  const message =
                    session.mode === "practice"
                      ? "Archive this practice game? It will leave your game list."
                      : "Archive this game for everyone? It will leave all players' game lists.";
                  if (!window.confirm(message)) {
                    return;
                  }
                  setBusy(true);
                  try {
                    await game.archiveGame();
                    router.push("/home");
                  } catch (error) {
                    setStatus(error instanceof Error ? error.message : "Could not archive game");
                  } finally {
                    setBusy(false);
                  }
                })();
              }
            : undefined
        }
      />

      <DndContext
        sensors={sensors}
        collisionDetection={layOffCollisionDetection}
        onDragStart={handleDragStart}
        onDragOver={handleDragOver}
        onDragEnd={handleDragEnd}
      >
      <div className="wood-rail relative m-1 flex min-h-0 flex-1 flex-col rounded-xl p-1 shadow-2xl">
        <div className="relative min-h-0 flex-1 overflow-x-hidden overflow-y-visible rounded-lg">
          <FeltSurface
            center={
              table.phase === "playing" ? (
                <StockDiscard
                  stockCount={table.stockCount}
                  topDiscard={table.topDiscard}
                  canDrawStock={legalActions.canDrawFromStock}
                  canDrawDiscard={legalActions.canDrawFromDiscard}
                  isMyTurn={isMyTurn}
                  turnPhase={table.turnPhase}
                  busy={busy}
                  drawingSource={drawFly?.source ?? null}
                  onDrawStock={() => void handleDraw("stock")}
                  onDrawDiscard={() => void handleDraw("discard")}
                />
              ) : null
            }
          >
            {playerLayouts.map(({ player, slot }) => (
              <PlayerBoard
                key={player.id}
                player={player}
                slot={slot}
                melds={meldsByOwner.get(player.id) ?? []}
                pendingMelds={player.id === viewer?.userId ? opening.pendingMelds : []}
                highlightMeldIds={layOff.highlightMeldIds}
                layOffGapTargets={draggingCardId ? layOffGapTargets : []}
                activeDropGapId={activeDropGapId}
                onMeldClick={canLayOff && selectedCardId ? layOff.selectMeld : undefined}
                onPendingMeldClick={
                  isOpeningHandMode && player.id === viewer?.userId
                    ? (index) => opening.removePendingMeldsFrom(index)
                    : undefined
                }
                isMe={player.id === viewer?.userId}
                onSubstitute={
                  player.canSubstitute
                    ? () =>
                        setSubstituteTarget({
                          seatIndex: player.seatIndex,
                          displayName: player.displayName,
                        })
                    : undefined
                }
                substituteBusy={busy}
              />
            ))}
          </FeltSurface>

          <RoundSummaryOverlay
            open={showRoundOverlay}
            roundNumber={table.lastRoundSummary?.roundNumber ?? table.roundNumber}
            goerName={goerName}
            players={table.players}
            roundScores={table.lastRoundSummary?.roundScores ?? table.players.map(() => 0)}
            cumulativeScores={
              table.lastRoundSummary?.cumulativeScores ?? table.cumulativeScores
            }
            canContinue={table.canContinueRound}
            isGameEnd={table.phase === "gameEnd"}
            winnerNames={
              table.players
                .filter((player) => table.winnerPlayerIds?.includes(player.id))
                .map((player) => player.displayName)
                .join(", ") || undefined
            }
            busy={busy}
            onContinue={() => void handleContinueRound()}
          />

          {isOpeningHandMode && opening.wildCardsNeedingRank.length > 0 ? (
            <ActionDock
              title="Declare wild ranks"
              actions={
                <>
                  {openingUndoButton}
                  <button
                    type="button"
                    disabled={opening.busy || !opening.canAddMeld}
                    onClick={() => opening.addMeld()}
                    className="game-btn-secondary text-xs"
                  >
                    Add {opening.nextRequirement?.kind}
                  </button>
                </>
              }
            >
              <WildRankPicker
                cards={opening.wildCardsNeedingRank}
                wildRanks={opening.wildRanks}
                naturalRanks={opening.naturalRanks}
                isJoker={isJoker}
                onChange={(cardId, rank) =>
                  opening.setWildRanks((current) => ({ ...current, [cardId]: rank }))
                }
              />
              {opening.selectionValidationError ? (
                <p className="text-xs font-semibold text-[var(--danger)]">
                  {opening.selectionValidationError}
                </p>
              ) : null}
            </ActionDock>
          ) : null}

          {isOpeningHandMode && opening.wildCardsNeedingRank.length === 0 && opening.nextRequirement ? (
            <ActionDock
              title="Opening"
              actions={
                <>
                  {openingUndoButton}
                  <button
                    type="button"
                    disabled={opening.busy || !opening.canAddMeld}
                    onClick={() => opening.addMeld()}
                    className="game-btn-primary text-xs"
                  >
                    Add {opening.nextRequirement.kind} ({opening.selectedIds.length}/
                    {opening.nextRequirement.size})
                  </button>
                </>
              }
            >
              <p className="text-xs text-[var(--muted)]">{opening.progressLabel}</p>
              {opening.selectionValidationError ? (
                <p className="text-xs font-semibold text-[var(--danger)]">
                  {opening.selectionValidationError}
                </p>
              ) : null}
            </ActionDock>
          ) : null}

          {isOpeningHandMode && !opening.nextRequirement ? (
            <ActionDock
              title="Ready to open"
              actions={
                <>
                  {openingUndoButton}
                  <button
                    type="button"
                    disabled={opening.busy}
                    onClick={() => void requestOpeningSubmit()}
                    className="game-btn-primary text-xs"
                  >
                    Submit opening
                  </button>
                </>
              }
            >
              <p className="text-xs text-[var(--muted)]">All contract melds are built on your board.</p>
            </ActionDock>
          ) : null}

          {isRummyWindow && canCallRummy ? (
            <ActionDock
              title="Rummy!"
              actions={
                <button
                  type="button"
                  disabled={busy}
                  onClick={() => void handleCallRummy()}
                  className="game-btn-primary text-xs"
                >
                  Call rummy
                </button>
              }
            >
              <p className="text-xs text-[var(--muted)]">
                That discard fits a meld on the table.
              </p>
            </ActionDock>
          ) : null}

          {isRummyWindow && canTakeBackDiscard ? (
            <ActionDock
              title="Playable discard"
              actions={
                <button
                  type="button"
                  disabled={busy}
                  onClick={() => void handleTakeBackDiscard()}
                  className="game-btn-secondary text-xs"
                >
                  Take back
                </button>
              }
            >
              <p className="text-xs text-[var(--muted)]">
                Return the card to your hand before an opponent calls rummy.
              </p>
            </ActionDock>
          ) : null}

          {canLayOff && layOff.needsRelocationUi ? (
            <ActionDock
              title="Relocate wild"
              actions={
                <button
                  type="button"
                  disabled={layOff.busy || !layOff.destinationMeldId}
                  onClick={() => void layOff.submitLayOff()}
                  className="game-btn-primary text-xs"
                >
                  Lay off
                </button>
              }
            >
              <label className="block text-xs">
                <span className="text-[var(--muted)]">Move wild to</span>
                <select
                  value={layOff.destinationMeldId ?? ""}
                  onChange={(event) => layOff.setDestinationMeldId(event.target.value)}
                  className="game-input mt-1 py-1.5 text-xs"
                >
                  <option value="">Choose meld…</option>
                  {layOff.relocationDestinations.map((meldId) => (
                    <option key={meldId} value={meldId}>
                      Meld {meldId.slice(0, 6)}…
                    </option>
                  ))}
                </select>
              </label>
              <label className="block text-xs">
                <span className="text-[var(--muted)]">Wild represents</span>
                <select
                  value={layOff.wildRank}
                  onChange={(event) => layOff.setWildRank(event.target.value as typeof layOff.wildRank)}
                  className="game-input mt-1 py-1.5 text-xs"
                >
                  {layOff.naturalRanks.map((rank) => (
                    <option key={rank} value={rank}>
                      {rank}
                    </option>
                  ))}
                </select>
              </label>
            </ActionDock>
          ) : null}

          {canLayOff && layOff.needsWildRankUi ? (
            <ActionDock
              title="Declare wild rank"
              actions={
                <button
                  type="button"
                  disabled={layOff.busy}
                  onClick={() => void layOff.submitLayOff()}
                  className="game-btn-primary text-xs"
                >
                  Lay off
                </button>
              }
            >
              <label className="block text-xs">
                <span className="text-[var(--muted)]">Wild represents</span>
                <select
                  value={layOff.wildRank}
                  onChange={(event) => layOff.setWildRank(event.target.value as typeof layOff.wildRank)}
                  className="game-input mt-1 py-1.5 text-xs"
                >
                  {selectedCard?.rank === "2" && layOff.validWildRanks.includes("2") ? (
                    <option value="2">Natural 2</option>
                  ) : null}
                  {layOff.validWildRanks
                    .filter((rank) => rank !== "2" || selectedCard?.rank !== "2")
                    .map((rank) => (
                      <option key={rank} value={rank}>
                        {rank}
                      </option>
                    ))}
                </select>
              </label>
            </ActionDock>
          ) : null}

          {canLayOff && layOff.selectedTarget && !layOff.needsRelocationUi && !layOff.needsWildRankUi ? (
            <ActionDock
              title="Lay off"
              actions={
                <button
                  type="button"
                  disabled={layOff.busy}
                  onClick={() => void layOff.submitLayOff()}
                  className="game-btn-primary text-xs"
                >
                  Confirm lay off
                </button>
              }
            >
              <p className="text-xs text-[var(--muted)]">
                Playing {selectedCard ? formatCardLabel(selectedCard) : "card"} on selected meld.
              </p>
            </ActionDock>
          ) : null}
        </div>
      </div>

      {table.phase === "playing" ? (
        <div className="wood-rail shrink-0 overflow-visible border-t-2 border-[var(--wood-dark)] px-2 pb-1 pt-0.5">
          <div className="mb-0.5 flex flex-wrap items-center justify-between gap-x-2 gap-y-0.5">
            <div className="flex flex-wrap items-center gap-2">
              <p className="text-xs font-bold text-[var(--accent-soft)]">Your hand</p>
              <div className="flex gap-1 text-xs">
                <button
                  type="button"
                  onClick={() => setHandSortMode("suit")}
                  className={`rounded-full px-2 py-0.5 font-semibold ${
                    handSortMode === "suit"
                      ? "bg-[var(--accent)] text-[#2c1810]"
                      : "border border-[var(--card-border)] text-[var(--muted)]"
                  }`}
                >
                  Suit
                </button>
                <button
                  type="button"
                  onClick={() => setHandSortMode("rank")}
                  className={`rounded-full px-2 py-0.5 font-semibold ${
                    handSortMode === "rank"
                      ? "bg-[var(--accent)] text-[#2c1810]"
                      : "border border-[var(--card-border)] text-[var(--muted)]"
                  }`}
                >
                  Rank
                </button>
              </div>
            </div>
            <div className="flex flex-wrap gap-2">
              {isMyTurn && table.turnPhase === "discard" && !isOpeningHandMode && !canLayOff ? (
                <button
                  type="button"
                  disabled={busy || !selectedCard}
                  onClick={() => void requestDiscard()}
                  className="game-btn-primary px-3 py-1 text-xs"
                >
                  Discard
                </button>
              ) : null}
              {canOpen && handMode === "discard" ? (
                <button
                  type="button"
                  disabled={busy}
                  onClick={switchToOpeningMode}
                  className="game-btn-secondary px-3 py-1 text-xs"
                >
                  Open contract
                </button>
              ) : null}
              {isOpeningHandMode ? (
                <button
                  type="button"
                  disabled={busy}
                  onClick={switchToDiscardMode}
                  className="game-btn-secondary px-3 py-1 text-xs"
                >
                  Discard instead
                </button>
              ) : null}
              {isMyTurn && table.turnPhase === "discard" && canLayOff && !isOpeningHandMode ? (
                <button
                  type="button"
                  disabled={busy || !selectedCard}
                  onClick={() => void requestDiscard()}
                  className="game-btn-secondary px-3 py-1 text-xs"
                >
                  Discard instead
                </button>
              ) : null}
            </div>
          </div>
          <CardFan
            cards={handCards}
            selectedIds={handSelectedIds}
            onToggle={toggleHandCard}
            disabled={!isMyTurn || table.turnPhase !== "discard" || busy}
            dragEnabled={dragLayOffEnabled}
            sortMode={handSortMode}
            onSortModeChange={setHandSortMode}
            showSortControls={false}
            size="lg"
            justDrawnCardId={justDrawnCardId}
          />
          {status ? <p className="mt-0.5 text-xs font-semibold text-[var(--danger)]">{status}</p> : null}
        </div>
      ) : null}
      <DragOverlay dropAnimation={null}>
        {draggingCard ? <HandCardDragOverlay card={draggingCard} size="lg" /> : null}
      </DragOverlay>
      </DndContext>

      {drawFly ? <DrawCardFlyOverlay source={drawFly.source} card={drawFly.card} /> : null}
    </div>
  );
}
