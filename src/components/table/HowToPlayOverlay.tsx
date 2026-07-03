"use client";

import { useEffect, useState } from "react";
import { HOW_TO_PLAY_STEPS } from "../../lib/howToPlay";

type HowToPlayOverlayProps = {
  open: boolean;
  onClose: () => void;
};

export function HowToPlayOverlay({ open, onClose }: HowToPlayOverlayProps) {
  const [stepIndex, setStepIndex] = useState(0);

  useEffect(() => {
    if (!open) {
      setStepIndex(0);
    }
  }, [open]);

  useEffect(() => {
    if (!open) {
      return;
    }
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        onClose();
      }
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [onClose, open]);

  if (!open) {
    return null;
  }

  const step = HOW_TO_PLAY_STEPS[stepIndex];
  const isFirst = stepIndex === 0;
  const isLast = stepIndex === HOW_TO_PLAY_STEPS.length - 1;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-4"
      role="presentation"
      onClick={onClose}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="how-to-play-title"
        className="game-panel w-full max-w-lg p-6 shadow-2xl"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="mb-4 flex items-start justify-between gap-4">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.2em] text-[var(--accent)]">
              How to play
            </p>
            <p className="mt-1 text-xs text-[var(--muted)]">
              Step {stepIndex + 1} of {HOW_TO_PLAY_STEPS.length}
            </p>
          </div>
          <button type="button" onClick={onClose} className="game-btn-secondary px-3 py-1.5 text-xs">
            Close
          </button>
        </div>

        <h2 id="how-to-play-title" className="text-xl font-extrabold text-[var(--accent-soft)]">
          {step?.title}
        </h2>
        <p className="mt-3 text-sm leading-relaxed text-[var(--muted)]">{step?.body}</p>

        <div className="mt-5 flex justify-center gap-1.5">
          {HOW_TO_PLAY_STEPS.map((item, index) => (
            <span
              key={item.id}
              className={`h-1.5 w-6 rounded-full ${
                index === stepIndex ? "bg-[var(--accent)]" : "bg-white/15"
              }`}
              aria-hidden="true"
            />
          ))}
        </div>

        <div className="mt-6 flex justify-between gap-3">
          <button
            type="button"
            disabled={isFirst}
            onClick={() => setStepIndex((current) => Math.max(0, current - 1))}
            className="game-btn-secondary text-sm disabled:opacity-40"
          >
            Back
          </button>
          {isLast ? (
            <button type="button" onClick={onClose} className="game-btn-primary text-sm">
              Got it
            </button>
          ) : (
            <button
              type="button"
              onClick={() =>
                setStepIndex((current) => Math.min(HOW_TO_PLAY_STEPS.length - 1, current + 1))
              }
              className="game-btn-primary text-sm"
            >
              Next
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
