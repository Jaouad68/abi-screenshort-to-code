"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { deconnexion } from "./logout-action";

const NAV = [
  {
    href: "/tableau-de-bord",
    label: "Aperçu",
    icon: (
      <svg viewBox="0 0 24 24" fill="none">
        <rect x="3.5" y="3.5" width="7" height="7" rx="1.6" stroke="currentColor" strokeWidth="2" />
        <rect x="13.5" y="3.5" width="7" height="7" rx="1.6" stroke="currentColor" strokeWidth="2" />
        <rect x="3.5" y="13.5" width="7" height="7" rx="1.6" stroke="currentColor" strokeWidth="2" />
        <rect x="13.5" y="13.5" width="7" height="7" rx="1.6" stroke="currentColor" strokeWidth="2" />
      </svg>
    ),
  },
  {
    href: "/tableau-de-bord/vehicules",
    label: "Contrôles techniques",
    icon: (
      <svg viewBox="0 0 24 24" fill="none">
        <path
          d="M4 17L6.2 10.4C6.6 9.2 7.7 8.4 9 8.4H15C16.3 8.4 17.4 9.2 17.8 10.4L20 17"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <circle cx="7.5" cy="17.2" r="1.8" stroke="currentColor" strokeWidth="2" />
        <circle cx="16.5" cy="17.2" r="1.8" stroke="currentColor" strokeWidth="2" />
        <path d="M4 17H20" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
      </svg>
    ),
  },
  {
    href: "/tableau-de-bord/devis",
    label: "Devis",
    icon: (
      <svg viewBox="0 0 24 24" fill="none">
        <path d="M6 3H15L19 7V21H6V3Z" stroke="currentColor" strokeWidth="2" strokeLinejoin="round" />
        <path d="M9 12H15M9 16H15" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
      </svg>
    ),
  },
  {
    href: "/tableau-de-bord/parametres",
    label: "Paramètres",
    icon: (
      <svg viewBox="0 0 24 24" fill="none">
        <circle cx="12" cy="12" r="3" stroke="currentColor" strokeWidth="2" />
        <path
          d="M19 12C19 12.4 19 12.8 18.9 13.2L21 14.8L19.5 17.4L17 16.6C16.4 17.1 15.7 17.5 15 17.8L14.6 20.4H11.4L11 17.8C10.3 17.5 9.6 17.1 9 16.6L6.5 17.4L5 14.8L7.1 13.2C7 12.8 7 12.4 7 12C7 11.6 7 11.2 7.1 10.8L5 9.2L6.5 6.6L9 7.4C9.6 6.9 10.3 6.5 11 6.2L11.4 3.6H14.6L15 6.2C15.7 6.5 16.4 6.9 17 7.4L19.5 6.6L21 9.2L18.9 10.8C19 11.2 19 11.6 19 12Z"
          stroke="currentColor"
          strokeWidth="1.7"
          strokeLinejoin="round"
        />
      </svg>
    ),
  },
];

export function Shell({
  nomGarage,
  email,
  children,
}: {
  nomGarage: string;
  email: string;
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const initiales = nomGarage
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((mot) => mot[0]?.toUpperCase())
    .join("") || "AR";
  const current = NAV.slice().reverse().find((item) => pathname.startsWith(item.href) && (item.href !== "/tableau-de-bord" || pathname === item.href));

  return (
    <div className="max-w-[1360px] mx-auto px-5 py-6">
      <div className="grid grid-cols-1 md:grid-cols-[220px_1fr] gap-4.5 items-start">
        <aside className="bg-surface border border-border rounded-lg p-3.5 flex md:flex-col flex-row flex-wrap items-center md:items-stretch gap-4 md:gap-5 md:sticky md:top-6">
          <div className="flex items-center gap-2.5 px-1.5">
            <span className="w-8 h-8 rounded-full grid place-items-center text-[0.68rem] font-bold text-lime-ink bg-lime flex-none">
              {initiales}
            </span>
            <div className="min-w-0">
              <div className="text-sm font-bold truncate max-w-[130px]">{nomGarage}</div>
              <div className="text-[0.68rem] text-text-faint truncate max-w-[130px]">{email}</div>
            </div>
          </div>

          <nav className="flex md:flex-col flex-row flex-wrap gap-1 flex-1">
            {NAV.map((item) => {
              const active = current?.href === item.href;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`flex items-center gap-2.5 px-2.5 py-2 rounded-[9px] text-sm font-semibold transition ${
                    active ? "bg-lime text-lime-ink" : "text-text-dim hover:bg-surface-2 hover:text-text"
                  }`}
                >
                  <span className="w-4 h-4 [&>svg]:w-4 [&>svg]:h-4">{item.icon}</span>
                  {item.label}
                </Link>
              );
            })}
          </nav>

          <form action={deconnexion} className="md:mt-auto">
            <button
              type="submit"
              className="flex items-center gap-2.5 px-2.5 py-2 rounded-[9px] text-sm font-semibold text-text-faint hover:bg-surface-2 hover:text-coral transition w-full"
            >
              <svg viewBox="0 0 24 24" fill="none" className="w-4 h-4">
                <path
                  d="M15 8V6C15 4.9 14.1 4 13 4H6C4.9 4 4 4.9 4 6V18C4 19.1 4.9 20 6 20H13C14.1 20 15 19.1 15 18V16"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
                <path d="M9 12H21M21 12L17.5 8.5M21 12L17.5 15.5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
              Déconnexion
            </button>
          </form>
        </aside>

        <div className="flex flex-col gap-4.5 min-w-0">
          <div className="flex items-center justify-between gap-3 flex-wrap">
            <div className="flex items-center gap-2 text-sm text-text-faint font-semibold">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
                <path d="M4 11L12 4L20 11V20H4V11Z" stroke="currentColor" strokeWidth="2" strokeLinejoin="round" />
              </svg>
              Tableau de bord / <span className="text-text font-bold">{current?.label ?? ""}</span>
            </div>
          </div>

          {children}
        </div>
      </div>
    </div>
  );
}
