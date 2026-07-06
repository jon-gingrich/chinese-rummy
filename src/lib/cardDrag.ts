import type { InsertionGap } from "../../convex/lib/rules/layoffs";

export const HAND_CARD_DRAG_PREFIX = "hand:";
export const MELD_GAP_DROP_PREFIX = "gap:";

const ADD_MARKER = ":add:";
const REPLACE_MARKER = ":replace:";

export function handCardDragId(cardId: string): string {
  return `${HAND_CARD_DRAG_PREFIX}${cardId}`;
}

export function parseHandCardDragId(id: string): string | null {
  if (!id.startsWith(HAND_CARD_DRAG_PREFIX)) {
    return null;
  }
  return id.slice(HAND_CARD_DRAG_PREFIX.length);
}

export function meldGapDropId(meldId: string, gap: InsertionGap): string {
  if (gap.mode === "replaceWild" && gap.replaceWildCardId) {
    return `${MELD_GAP_DROP_PREFIX}${meldId}${REPLACE_MARKER}${gap.replaceWildCardId}`;
  }
  return `${MELD_GAP_DROP_PREFIX}${meldId}${ADD_MARKER}${gap.insertIndex}`;
}

export function parseMeldGapDropId(
  id: string,
): { meldId: string; gap: InsertionGap } | null {
  if (!id.startsWith(MELD_GAP_DROP_PREFIX)) {
    return null;
  }

  const body = id.slice(MELD_GAP_DROP_PREFIX.length);
  const replaceAt = body.lastIndexOf(REPLACE_MARKER);
  if (replaceAt !== -1) {
    const meldId = body.slice(0, replaceAt);
    const replaceWildCardId = body.slice(replaceAt + REPLACE_MARKER.length);
    if (!meldId || !replaceWildCardId) {
      return null;
    }
    return {
      meldId,
      gap: { insertIndex: -1, mode: "replaceWild", replaceWildCardId },
    };
  }

  const addAt = body.lastIndexOf(ADD_MARKER);
  if (addAt !== -1) {
    const meldId = body.slice(0, addAt);
    const insertIndex = Number(body.slice(addAt + ADD_MARKER.length));
    if (!meldId || !Number.isInteger(insertIndex) || insertIndex < 0) {
      return null;
    }
    return { meldId, gap: { insertIndex, mode: "add" } };
  }

  return null;
}

export function gapsMatch(left: InsertionGap, right: InsertionGap): boolean {
  if (left.mode !== right.mode) {
    return false;
  }
  if (left.mode === "replaceWild") {
    return left.replaceWildCardId === right.replaceWildCardId;
  }
  return left.insertIndex === right.insertIndex;
}
