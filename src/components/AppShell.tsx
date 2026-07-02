import type { ReactNode } from "react";
import Link from "next/link";

type AppShellProps = {
  children: ReactNode;
  backHref?: string;
  backLabel?: string;
  title?: string;
  subtitle?: string;
  wide?: boolean;
  fullBleed?: boolean;
};

export function AppShell({
  children,
  backHref,
  backLabel = "← Back",
  title,
  subtitle,
  wide = false,
  fullBleed = false,
}: AppShellProps) {
  return (
    <div
      className={`min-h-screen ${fullBleed ? "" : wide ? "px-6 py-8 lg:px-10" : "px-6 py-10"} ${
        fullBleed ? "" : wide ? "mx-auto max-w-5xl" : "mx-auto max-w-2xl"
      }`}
    >
      {!fullBleed && (backHref || title) ? (
        <header className="mb-8 space-y-2">
          {backHref ? (
            <Link href={backHref} className="text-sm font-semibold text-[var(--muted)] hover:text-[var(--cream)]">
              {backLabel}
            </Link>
          ) : null}
          {title ? <h1 className="text-3xl font-extrabold text-[var(--cream)]">{title}</h1> : null}
          {subtitle ? <p className="text-sm text-[var(--muted)]">{subtitle}</p> : null}
        </header>
      ) : null}
      {children}
    </div>
  );
}
