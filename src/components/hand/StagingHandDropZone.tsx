"use client";

import { useDroppable } from "@dnd-kit/core";
import type { ReactNode } from "react";
import { STAGING_HAND_DROP_ID } from "../../lib/cardDrag";

export function StagingHandDropZone({ children }: { children: ReactNode }) {
  const { setNodeRef, isOver } = useDroppable({
    id: STAGING_HAND_DROP_ID,
  });

  return (
    <div
      ref={setNodeRef}
      className={`rounded-lg transition-colors ${isOver ? "ring-2 ring-[var(--accent)]/60" : ""}`}
    >
      {children}
    </div>
  );
}
