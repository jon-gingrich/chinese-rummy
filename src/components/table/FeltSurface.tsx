"use client";

import type { ReactNode } from "react";

type FeltSurfaceProps = {
  center: ReactNode;
  children: ReactNode;
};

/**
 * Three-band grid: opponent boards on the edges, stock/discard in a dedicated center well.
 * Prevents meld spreads from overlapping the draw piles.
 */
export function FeltSurface({ center, children }: FeltSurfaceProps) {
  return (
    <div
      className="felt-surface grid h-full min-h-0 w-full gap-1.5 p-2 md:gap-2 md:p-2.5"
      style={{
        gridTemplateColumns: "minmax(0, 1fr) minmax(16rem, max-content) minmax(0, 1fr)",
        gridTemplateRows: "minmax(min-content, 1fr) auto minmax(min-content, 1fr)",
        gridTemplateAreas: `
          "felt-top-left felt-top felt-top-right"
          "felt-left     felt-center felt-right"
          "felt-bottom   felt-bottom felt-bottom"
        `,
      }}
    >
      {children}
      <div
        className={`z-10 flex items-center justify-center overflow-visible px-1 py-1 ${
          center ? "" : "pointer-events-none opacity-0"
        }`}
        style={{ gridArea: "felt-center" }}
      >
        {center}
      </div>
    </div>
  );
}
