"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";

type TableHudMenuProps = {
  onRulesClick: () => void;
  onHowToPlayClick: () => void;
  settingsHref?: string;
};

export function TableHudMenu({ onRulesClick, onHowToPlayClick, settingsHref }: TableHudMenuProps) {
  const [open, setOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) {
      return;
    }

    function handlePointerDown(event: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setOpen(false);
      }
    }

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setOpen(false);
      }
    }

    document.addEventListener("mousedown", handlePointerDown);
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("mousedown", handlePointerDown);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [open]);

  function closeAnd(action: () => void) {
    setOpen(false);
    action();
  }

  return (
    <div ref={menuRef} className="relative">
      <button
        type="button"
        onClick={() => setOpen((current) => !current)}
        className="game-btn-secondary flex items-center gap-1 px-3 py-1.5 text-xs"
        aria-expanded={open}
        aria-haspopup="menu"
      >
        Menu
        <span className="text-[10px] opacity-70" aria-hidden>
          ▾
        </span>
      </button>

      {open ? (
        <div
          role="menu"
          className="absolute right-0 top-full z-50 mt-1 min-w-40 overflow-hidden rounded-lg border border-[var(--wood-dark)] bg-[var(--wood)] py-1 shadow-2xl"
        >
          <button
            type="button"
            role="menuitem"
            onClick={() => closeAnd(onHowToPlayClick)}
            className="block w-full px-3 py-2 text-left text-xs font-semibold text-[var(--cream)] hover:bg-black/20"
          >
            How to play
          </button>
          <button
            type="button"
            role="menuitem"
            onClick={() => closeAnd(onRulesClick)}
            className="block w-full px-3 py-2 text-left text-xs font-semibold text-[var(--cream)] hover:bg-black/20"
          >
            Rules
          </button>
          {settingsHref ? (
            <Link
              href={settingsHref}
              role="menuitem"
              onClick={() => setOpen(false)}
              className="block px-3 py-2 text-xs font-semibold text-[var(--cream)] hover:bg-black/20"
            >
              Settings
            </Link>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
