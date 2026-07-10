"use client";

import type { ReactNode } from "react";
import { useCompactTableLayout } from "../../hooks/useTableCardSize";

type FeltSurfaceProps = {
  center: ReactNode;
  children: ReactNode;
};

/**
 * Three-band grid: opponent boards on the edges, stock/discard in a dedicated center well.
 * On compact screens the piles sit higher (top-aligned, tighter gaps) so more of the
 * board stays visible without dropping the top seat slot.
 */
export function FeltSurface({ center, children }: FeltSurfaceProps) {
  const compact = useCompactTableLayout();

  return (
    <div
      className={`grid h-full min-h-0 w-full gap-x-4 p-1.5 md:gap-x-6 md:p-2 ${
        compact ? "gap-y-1.5" : "gap-y-4 md:gap-y-5"
      }`}
      style={{
        gridTemplateColumns: "minmax(0, 1fr) minmax(0, auto) minmax(0, 1fr)",
        gridTemplateRows: "auto auto minmax(0, 1fr)",
        gridTemplateAreas: `
          "felt-top-left felt-top felt-top-right"
          "felt-left     felt-center felt-right"
          "felt-bottom   felt-bottom felt-bottom"
        `,
      }}
    >
      {children}
      <div
        className={`z-10 flex overflow-visible px-2 md:px-3 ${
          compact
            ? "items-start justify-center self-start py-0 -mt-1"
            : "items-center justify-center py-1"
        } ${center ? "" : "pointer-events-none opacity-0"}`}
        style={{ gridArea: "felt-center" }}
      >
        {center}
      </div>
    </div>
  );
}
