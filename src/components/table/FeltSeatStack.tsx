"use client";

import type { ReactNode } from "react";
import type { SeatSlot } from "../../lib/cardDisplay";
import {
  FELT_GRID_AREA,
  FELT_SEAT_INSET,
  FELT_SEAT_Z_INDEX,
  FELT_SEAT_STACK_ALIGN,
} from "../../lib/feltLayout";

type FeltSeatStackProps = {
  slot: SeatSlot;
  children: ReactNode;
};

/** One grid cell on the felt; stacks multiple player boards when they share a seat. */
export function FeltSeatStack({ slot, children }: FeltSeatStackProps) {
  return (
    <div
      className={`flex h-full min-h-0 min-w-0 flex-col gap-5 overflow-visible p-0.5 md:gap-6 ${FELT_SEAT_STACK_ALIGN[slot]} ${FELT_SEAT_INSET[slot]}`}
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
