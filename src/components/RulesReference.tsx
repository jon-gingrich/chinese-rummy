"use client";

import { useEffect } from "react";
import { RULES_SECTIONS } from "../lib/rulesReference";

type RulesReferenceProps = {
  open: boolean;
  onClose: () => void;
};

export function RulesReference({ open, onClose }: RulesReferenceProps) {
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

  return (
    <div
      className="fixed inset-0 z-40 flex justify-end bg-black/60"
      role="presentation"
      onClick={onClose}
    >
      <aside
        role="dialog"
        aria-modal="true"
        aria-labelledby="rules-reference-title"
        className="h-full w-full max-w-md overflow-y-auto border-l-2 border-[var(--card-border)] bg-[var(--card)] p-6 shadow-2xl"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="mb-6 flex items-start justify-between gap-4">
          <div>
            <p className="text-sm uppercase tracking-[0.2em] text-[var(--accent)]">Reference</p>
            <h2 id="rules-reference-title" className="text-2xl font-semibold">
              House rules
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg border border-white/10 px-3 py-2 text-sm"
          >
            Close
          </button>
        </div>

        <div className="space-y-6">
          {RULES_SECTIONS.map((section) => (
            <section key={section.id}>
              <h3 className="text-lg font-medium">{section.title}</h3>
              <p className="mt-2 whitespace-pre-line text-sm leading-relaxed text-[var(--muted)]">
                {section.body}
              </p>
            </section>
          ))}
        </div>
      </aside>
    </div>
  );
}
