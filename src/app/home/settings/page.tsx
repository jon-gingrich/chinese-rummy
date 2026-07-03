"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
import { AppShell } from "@/components/AppShell";
import { useGuestAuth } from "@/hooks/useGuestAuth";
import { usePlayerPreferences } from "@/contexts/PlayerPreferencesContext";
import type { DisplayScale } from "@/lib/playerPreferences";

function SettingsToggle({
  label,
  description,
  checked,
  disabled,
  onChange,
}: {
  label: string;
  description: string;
  checked: boolean;
  disabled?: boolean;
  onChange: (checked: boolean) => void;
}) {
  return (
    <label className="flex cursor-pointer items-start justify-between gap-4 rounded-xl bg-black/20 px-4 py-3">
      <span>
        <span className="block font-semibold text-[var(--cream)]">{label}</span>
        <span className="mt-0.5 block text-sm text-[var(--muted)]">{description}</span>
      </span>
      <input
        type="checkbox"
        checked={checked}
        disabled={disabled}
        onChange={(event) => onChange(event.target.checked)}
        className="mt-1 h-5 w-5 shrink-0 accent-[var(--accent)]"
      />
    </label>
  );
}

function ScalePicker({
  label,
  description,
  value,
  disabled,
  onChange,
}: {
  label: string;
  description: string;
  value: DisplayScale;
  disabled?: boolean;
  onChange: (value: DisplayScale) => void;
}) {
  const options: Array<{ value: DisplayScale; label: string }> = [
    { value: "small", label: "Small" },
    { value: "medium", label: "Medium" },
    { value: "large", label: "Large" },
  ];

  return (
    <div className="rounded-xl bg-black/20 px-4 py-3">
      <p className="font-semibold text-[var(--cream)]">{label}</p>
      <p className="mt-0.5 text-sm text-[var(--muted)]">{description}</p>
      <div className="mt-3 flex flex-wrap gap-2">
        {options.map((option) => (
          <button
            key={option.value}
            type="button"
            disabled={disabled}
            onClick={() => onChange(option.value)}
            className={`rounded-full px-3 py-1 text-sm font-semibold ${
              value === option.value
                ? "bg-[var(--accent)] text-[#2c1810]"
                : "border border-[var(--card-border)] text-[var(--muted)]"
            }`}
          >
            {option.label}
          </button>
        ))}
      </div>
    </div>
  );
}

function resolveReturnPath(returnTo: string | null): string {
  if (returnTo && returnTo.startsWith("/") && !returnTo.startsWith("//")) {
    return returnTo;
  }
  return "/home";
}

export default function SettingsPage() {
  const searchParams = useSearchParams();
  const returnTo = resolveReturnPath(searchParams.get("returnTo"));
  const returningToGame = returnTo.startsWith("/room/");
  const { viewer, isLoading: authLoading } = useGuestAuth();
  const { preferences, updatePreferences } = usePlayerPreferences();
  const [draft, setDraft] = useState(preferences);
  const [status, setStatus] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setDraft(preferences);
  }, [preferences]);

  async function savePreferences() {
    setSaving(true);
    setStatus(null);
    try {
      await updatePreferences(draft);
      setStatus("Settings saved.");
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "Could not save settings");
    } finally {
      setSaving(false);
    }
  }

  const dirty =
    draft.confirmBeforeDiscard !== preferences.confirmBeforeDiscard ||
    draft.confirmBeforeOpening !== preferences.confirmBeforeOpening ||
    draft.cardScale !== preferences.cardScale ||
    draft.uiScale !== preferences.uiScale;

  if (authLoading || !viewer) {
    return (
      <AppShell backHref={returnTo} title="Settings">
        <p className="text-[var(--muted)]">Loading settings…</p>
      </AppShell>
    );
  }

  return (
    <AppShell
      backHref={returnTo}
      title="Player settings"
      subtitle="Saved to your account and applied across devices when signed in."
    >
      <div className="space-y-6">
        <section className="game-panel space-y-3 p-6">
          <div>
            <h2 className="text-lg font-bold text-[var(--accent-soft)]">Confirmation dialogs</h2>
            <p className="mt-1 text-sm text-[var(--muted)]">
              Turn off prompts you already trust yourself on.
            </p>
          </div>
          <SettingsToggle
            label="Confirm before discarding"
            description="Ask before ending your turn with a discard."
            checked={draft.confirmBeforeDiscard}
            disabled={saving}
            onChange={(confirmBeforeDiscard) =>
              setDraft((current) => ({ ...current, confirmBeforeDiscard }))
            }
          />
          <SettingsToggle
            label="Confirm before opening"
            description="Ask before laying down your full contract."
            checked={draft.confirmBeforeOpening}
            disabled={saving}
            onChange={(confirmBeforeOpening) =>
              setDraft((current) => ({ ...current, confirmBeforeOpening }))
            }
          />
        </section>

        <section className="game-panel space-y-3 p-6">
          <div>
            <h2 className="text-lg font-bold text-[var(--accent-soft)]">Display</h2>
            <p className="mt-1 text-sm text-[var(--muted)]">
              Adjust card and text size for your screen and eyesight.
            </p>
          </div>
          <ScalePicker
            label="Card size"
            description="Scales your hand, table melds, and draw piles."
            value={draft.cardScale}
            disabled={saving}
            onChange={(cardScale) => setDraft((current) => ({ ...current, cardScale }))}
          />
          <ScalePicker
            label="Text size"
            description="Scales buttons, labels, and other interface text."
            value={draft.uiScale}
            disabled={saving}
            onChange={(uiScale) => setDraft((current) => ({ ...current, uiScale }))}
          />
        </section>

        <div className="flex flex-wrap items-center gap-3">
          <button
            type="button"
            disabled={saving || !dirty}
            onClick={() => void savePreferences()}
            className="game-btn-primary"
          >
            {saving ? "Saving…" : "Save settings"}
          </button>
          {dirty ? (
            <button
              type="button"
              disabled={saving}
              onClick={() => setDraft(preferences)}
              className="game-btn-secondary"
            >
              Reset changes
            </button>
          ) : null}
          <Link href={returnTo} className="game-btn-secondary">
            {returningToGame ? "Back to game" : "Back to home"}
          </Link>
        </div>
        {status ? <p className="text-sm text-[var(--muted)]">{status}</p> : null}
      </div>
    </AppShell>
  );
}
