"use client";

import type { Card, LayOffTarget, NaturalRank, TableMeld } from "../../convex/lib/rules/types";
import { formatCardLabel } from "../lib/cards";
import { ConfirmDialog } from "./ConfirmDialog";
import { MeldSpread } from "./cards/MeldSpread";

type LayOffDropDialogProps = {
  open: boolean;
  card: Card | null;
  target: LayOffTarget | null;
  melds: TableMeld[];
  wildRank: NaturalRank;
  validWildRanks: NaturalRank[];
  destinationMeldId: string | null;
  relocationDestinations: string[];
  validRelocationRanks: NaturalRank[];
  busy: boolean;
  onWildRankChange: (rank: NaturalRank) => void;
  onDestinationChange: (meldId: string) => void;
  onCancel: () => void;
  onConfirm: () => void;
};

export function LayOffDropDialog({
  open,
  card,
  target,
  melds,
  wildRank,
  validWildRanks,
  destinationMeldId,
  relocationDestinations,
  validRelocationRanks,
  busy,
  onWildRankChange,
  onDestinationChange,
  onCancel,
  onConfirm,
}: LayOffDropDialogProps) {
  const targetMeld = target ? melds.find((meld) => meld.id === target.meldId) : undefined;
  const needsRelocation = target?.mode === "replaceWild";
  const needsWildRank =
    target?.mode === "add" &&
    (target.wildRanks?.length ?? 0) > 0 &&
    card !== null &&
    validWildRanks.length > 0;

  return (
    <ConfirmDialog
      open={open}
      title="Confirm lay off"
      message={
        card && target ? (
          <div className="space-y-4">
            <p>
              Play <span className="font-bold text-[var(--cream)]">{formatCardLabel(card)}</span>
              {target.mode === "replaceWild" ? " in place of the wild" : " on this meld"}.
            </p>
            {targetMeld ? <MeldSpread meld={targetMeld} size="xs" /> : null}

            {needsWildRank ? (
              <label className="block text-sm">
                <span className="text-[var(--muted)]">Wild represents</span>
                <select
                  value={wildRank}
                  onChange={(event) => onWildRankChange(event.target.value as NaturalRank)}
                  className="game-input mt-1 py-1.5 text-sm"
                >
                  {card.rank === "2" && validWildRanks.includes("2") ? (
                    <option value="2">Natural 2</option>
                  ) : null}
                  {validWildRanks
                    .filter((rank) => rank !== "2" || card.rank !== "2")
                    .map((rank) => (
                      <option key={rank} value={rank}>
                        {rank}
                      </option>
                    ))}
                </select>
              </label>
            ) : null}

            {needsRelocation ? (
              <>
                <label className="block text-sm">
                  <span className="text-[var(--muted)]">Move wild to</span>
                  <select
                    value={destinationMeldId ?? ""}
                    onChange={(event) => onDestinationChange(event.target.value)}
                    className="game-input mt-1 py-1.5 text-sm"
                  >
                    <option value="">Choose meld…</option>
                    {relocationDestinations.map((meldId) => {
                      const meld = melds.find((entry) => entry.id === meldId);
                      const isSameMeld = meldId === target.meldId;
                      return (
                        <option key={meldId} value={meldId}>
                          {isSameMeld
                            ? "This meld (extend)"
                            : meld
                              ? `${meld.kind} (${meld.cards.length} cards)`
                              : meldId.slice(0, 8)}
                        </option>
                      );
                    })}
                  </select>
                </label>
                <label className="block text-sm">
                  <span className="text-[var(--muted)]">Relocated wild represents</span>
                  <select
                    value={wildRank}
                    onChange={(event) => onWildRankChange(event.target.value as NaturalRank)}
                    className="game-input mt-1 py-1.5 text-sm"
                    disabled={validRelocationRanks.length === 0}
                  >
                    {validRelocationRanks.length === 0 ? (
                      <option value="">Choose destination first…</option>
                    ) : (
                      validRelocationRanks.map((rank) => (
                        <option key={rank} value={rank}>
                          {rank}
                        </option>
                      ))
                    )}
                  </select>
                </label>
              </>
            ) : null}
          </div>
        ) : (
          ""
        )
      }
        confirmLabel="Lay off"
        busy={busy || (needsRelocation && validRelocationRanks.length === 0)}
      onCancel={onCancel}
      onConfirm={onConfirm}
    />
  );
}
