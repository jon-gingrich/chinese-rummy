"use client";

import { useMutation, useQuery } from "convex/react";
import { useEffect, useMemo, useState } from "react";
import { api } from "../../convex/_generated/api";
import type { Id } from "../../convex/_generated/dataModel";
import { isJoker } from "../../convex/lib/rules/melds";
import type { TableMeld } from "../../convex/lib/rules/types";
import { formatCardLabel, sortHand, type HandSortMode } from "../lib/cards";
import { CardFan } from "./CardFan";
import { ConfirmDialog } from "./ConfirmDialog";
import { RulesReference } from "./RulesReference";
import { ActionDock, WildRankPicker } from "./table/ActionDock";
import { FeltSurface } from "./table/FeltSurface";
import { layoutPlayers, PlayerBoard } from "./table/PlayerBoard";
import { RoundSummaryOverlay } from "./table/RoundSummaryOverlay";
import { StockDiscard } from "./table/StockDiscard";
import { TableHud } from "./table/TableHud";
import { MeldSpread } from "./cards/MeldSpread";
import { useLayOffFlow } from "../hooks/useLayOffFlow";
import { useOpeningFlow } from "../hooks/useOpeningFlow";
import { usePlayerPreferences } from "../contexts/PlayerPreferencesContext";

export function GameTable({ roomId }: { roomId: Id<"rooms"> }) {
  const { preferences } = usePlayerPreferences();
  const viewer = useQuery(api.users.viewer);
  const table = useQuery(api.games.getGame, { roomId });
  const hand = useQuery(api.games.getMyHand, { roomId });
  const legalActions = useQuery(api.games.getLegalActions, { roomId });
  const draw = useMutation(api.games.draw);
  const discard = useMutation(api.games.discard);
  const continueRound = useMutation(api.games.continueRound);
  const [selectedCardId, setSelectedCardId] = useState<string | null>(null);
  const [handSortMode, setHandSortMode] = useState<HandSortMode>("suit");
  const [showDiscardConfirm, setShowDiscardConfirm] = useState(false);
  const [showRules, setShowRules] = useState(false);
  const [status, setStatus] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [handMode, setHandMode] = useState<"discard" | "opening">("discard");

  const myPlayer = table?.players.find((player) => player.id === viewer?.userId);
  const mySeatIndex = myPlayer?.seatIndex ?? 0;
  const isMyTurn = myPlayer?.isActive ?? false;
  const canOpen =
    isMyTurn &&
    table?.turnPhase === "discard" &&
    myPlayer?.playerPhase === "notOpened" &&
    legalActions?.canOpen;
  const isOpeningHandMode = canOpen && handMode === "opening";
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

  const sortedHand = useMemo(
    () => (hand ? sortHand(hand, handSortMode) : []),
    [hand, handSortMode],
  );

  const opening = useOpeningFlow({
    roomId,
    roundNumber: myPlayer?.contractRound ?? 1,
    hand: sortedHand,
    onStatus: setStatus,
  });

  const layOff = useLayOffFlow({
    roomId,
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
      return `Waiting for ${active?.displayName ?? "next player"}…`;
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
        ? "Discard selected card (or open your contract)"
        : "Select a card to discard (or open your contract)";
    }
    if (canLayOff) {
      return selectedCardId
        ? "Tap a highlighted meld to lay off"
        : "Select a card to lay off";
    }
    return selectedCardId ? "Discard selected card" : "Select a card to discard";
  }, [table, isMyTurn, canOpen, isOpeningHandMode, canLayOff, selectedCardId, opening.nextRequirement, opening.progressLabel]);

  async function handleDraw(source: "stock" | "discard") {
    setBusy(true);
    setStatus(null);
    try {
      const result = await draw({ roomId, source });
      if (result.error) {
        setStatus(result.error);
      } else {
        setSelectedCardId(null);
      }
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "Draw failed");
    } finally {
      setBusy(false);
    }
  }

  async function handleContinueRound() {
    setBusy(true);
    setStatus(null);
    try {
      const result = await continueRound({ roomId });
      if (result.error) {
        setStatus(result.error);
      }
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "Could not continue");
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
      const result = await discard({ roomId, card: selectedCard });
      if (result.error) {
        setStatus(result.error);
      } else {
        setSelectedCardId(null);
        setShowDiscardConfirm(false);
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
    if (!isMyTurn || table?.turnPhase !== "discard" || busy) {
      return;
    }
    if (isOpeningHandMode) {
      opening.toggleCard(cardId);
      setStatus(null);
      return;
    }
    setSelectedCardId((current) => (current === cardId ? null : cardId));
    setStatus(null);
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

      <TableHud
        roundNumber={table.roundNumber}
        contract={table.contract}
        turnMessage={turnMessage}
        isMyTurn={isMyTurn && table.phase === "playing"}
        players={table.players}
        onRulesClick={() => setShowRules(true)}
        settingsHref={`/home/settings?returnTo=${encodeURIComponent(`/room/${roomId}`)}`}
      />

      <div className="wood-rail relative m-1 flex min-h-0 flex-1 flex-col rounded-xl p-1 shadow-2xl">
        <div className="relative min-h-0 flex-1 overflow-hidden rounded-lg">
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
                onMeldClick={canLayOff && selectedCardId ? layOff.selectMeld : undefined}
                onPendingMeldClick={
                  isOpeningHandMode && player.id === viewer?.userId
                    ? (index) => opening.removePendingMeldsFrom(index)
                    : undefined
                }
                isMe={player.id === viewer?.userId}
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
        <div className="wood-rail shrink-0 overflow-visible border-t-2 border-[var(--wood-dark)] px-2 pb-2 pt-1">
          <div className="mb-1 flex flex-wrap items-center justify-between gap-x-3 gap-y-1">
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
            sortMode={handSortMode}
            onSortModeChange={setHandSortMode}
            showSortControls={false}
            size="lg"
          />
          {status ? <p className="mt-0.5 text-xs font-semibold text-[var(--danger)]">{status}</p> : null}
        </div>
      ) : null}
    </div>
  );
}
