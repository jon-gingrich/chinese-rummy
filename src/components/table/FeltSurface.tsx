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
      className="felt-surface grid h-full min-h-0 w-full gap-x-1 gap-y-2 p-1.5 md:gap-x-1.5 md:gap-y-3 md:p-2"
      style={{
        gridTemplateColumns:
          "minmax(0, 1.2fr) minmax(11rem, max-content) minmax(0, 1.2fr)",
        gridTemplateRows: "minmax(min-content, 1.2fr) auto minmax(min-content, 1fr)",
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
