"use client";

import type { ReactNode } from "react";
import type { SeatSlot } from "../../lib/cardDisplay";
import { FELT_GRID_AREA, FELT_SEAT_Z_INDEX, FELT_SEAT_STACK_ALIGN } from "../../lib/feltLayout";

type FeltSeatStackProps = {
  slot: SeatSlot;
  children: ReactNode;
};

/** One grid cell on the felt; stacks multiple player boards when they share a seat. */
export function FeltSeatStack({ slot, children }: FeltSeatStackProps) {
  return (
    <div
      className={`flex min-h-0 min-w-0 max-h-full flex-col gap-4 overflow-x-visible overflow-y-auto p-0.5 ${FELT_SEAT_STACK_ALIGN[slot]}`}
      style={{ gridArea: FELT_GRID_AREA[slot], zIndex: FELT_SEAT_Z_INDEX[slot] }}
    >
      {children}
    </div>
  );
}

export function groupLayoutsBySlot<T extends { slot: SeatSlot }>(layouts: T[]): Map<SeatSlot, T[]> {
  const map = new Map<SeatSlot, T[]>();
  for (const layout of layouts) {
    const list = map.get(layout.slot) ?? [];
    list.push(layout);
    map.set(layout.slot, list);
  }
  return map;
}
