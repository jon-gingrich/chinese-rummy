"use client";

import type { ReactNode } from "react";

export function ScreenSizeGate({ children }: { children: ReactNode }) {
  return (
    <>
      <div className="flex min-h-screen items-center justify-center p-8 md:hidden">
        <div className="game-panel max-w-sm p-8 text-center">
          <p className="text-4xl">🃏</p>
          <h1 className="mt-4 text-xl font-extrabold text-[var(--accent-soft)]">Bigger screen needed</h1>
          <p className="mt-3 text-sm leading-relaxed text-[var(--muted)]">
            Chinese Rummy plays best on iPad or desktop. Rotate a tablet to landscape or switch to a
            larger device to join the table.
          </p>
        </div>
      </div>
      <div className="hidden md:block">{children}</div>
    </>
  );
}
