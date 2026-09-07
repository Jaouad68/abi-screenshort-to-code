"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { Role } from "@/generated/prisma/client";

type Item = { href: string; label: string; exact?: boolean; icon: (p: IconProps) => React.ReactElement };

const ITEMS_GESTION: Item[] = [
  { href: "/tableau-de-bord", label: "Accueil", exact: true, icon: IconHome },
  { href: "/tableau-de-bord/clients", label: "Clients", icon: IconUsers },
  { href: "/tableau-de-bord/contrats", label: "Contrats", icon: IconDoc },
  { href: "/tableau-de-bord/renouvellements", label: "Renouv.", icon: IconBell },
  { href: "/tableau-de-bord/interventions", label: "Interv.", icon: IconWrench },
  { href: "/tableau-de-bord/equipe", label: "Équipe", icon: IconTeam },
];

const ITEMS_TECHNICIEN: Item[] = [
  { href: "/tableau-de-bord", label: "Accueil", exact: true, icon: IconHome },
  { href: "/tableau-de-bord/interventions", label: "Interv.", icon: IconWrench },
  { href: "/tableau-de-bord/clients", label: "Clients", icon: IconUsers },
  { href: "/tableau-de-bord/mon-compte", label: "Compte", icon: IconGear },
];

export function BottomNav({ role }: { role: Role }) {
  const pathname = usePathname();
  const items = role === "TECHNICIEN" ? ITEMS_TECHNICIEN : ITEMS_GESTION;

  return (
    <nav
      className="no-print fixed bottom-0 inset-x-0 z-20 border-t border-line bg-card/95 backdrop-blur sm:hidden"
      style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
    >
      <ul className={`grid ${items.length === 6 ? "grid-cols-6" : "grid-cols-4"}`}>
        {items.map((item) => {
          const active = item.exact ? pathname === item.href : pathname.startsWith(item.href);
          const Icon = item.icon;
          return (
            <li key={item.href}>
              <Link
                href={item.href}
                className={`flex flex-col items-center gap-1 py-2.5 text-[11px] font-medium ${
                  active ? "text-brand" : "text-muted"
                }`}
              >
                <Icon active={active} />
                {item.label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}

type IconProps = { active?: boolean };

function base(active?: boolean) {
  return {
    width: 24,
    height: 24,
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: active ? 2.2 : 1.8,
    strokeLinecap: "round" as const,
    strokeLinejoin: "round" as const,
  };
}

function IconHome({ active }: IconProps) {
  return (
    <svg {...base(active)} aria-hidden>
      <path d="M3 10.5 12 3l9 7.5" />
      <path d="M5 9.5V21h14V9.5" />
    </svg>
  );
}
function IconUsers({ active }: IconProps) {
  return (
    <svg {...base(active)} aria-hidden>
      <circle cx="9" cy="8" r="3" />
      <path d="M3 20c0-3.3 2.7-5 6-5s6 1.7 6 5M16 15c2.2.3 4 1.9 4 5" />
    </svg>
  );
}
function IconDoc({ active }: IconProps) {
  return (
    <svg {...base(active)} aria-hidden>
      <path d="M7 3h7l4 4v14H7z" />
      <path d="M14 3v4h4M9.5 12h5M9.5 15.5h5" />
    </svg>
  );
}
function IconBell({ active }: IconProps) {
  return (
    <svg {...base(active)} aria-hidden>
      <path d="M6 17h12l-1.5-2.5V10a4.5 4.5 0 0 0-9 0v4.5z" />
      <path d="M10 20a2 2 0 0 0 4 0" />
    </svg>
  );
}
function IconWrench({ active }: IconProps) {
  return (
    <svg {...base(active)} aria-hidden>
      <path d="M14.7 6.3a3.5 3.5 0 0 0-4.6 4.2L4 16.6V20h3.4l6.1-6.1a3.5 3.5 0 0 0 4.2-4.6l-2.6 2.6-2-2z" />
    </svg>
  );
}
function IconTeam({ active }: IconProps) {
  return (
    <svg {...base(active)} aria-hidden>
      <circle cx="8" cy="8" r="2.6" />
      <circle cx="16" cy="9" r="2.2" />
      <path d="M3 20c0-3 2.4-4.6 5-4.6s5 1.6 5 4.6M14 20c0-2.4 1.8-3.8 4-3.8s4 1.4 4 3.8" />
    </svg>
  );
}
function IconGear({ active }: IconProps) {
  return (
    <svg {...base(active)} aria-hidden>
      <circle cx="12" cy="12" r="3.2" />
      <path d="M12 2.5v2.3M12 19.2v2.3M4.5 4.5l1.6 1.6M17.9 17.9l1.6 1.6M2.5 12h2.3M19.2 12h2.3M4.5 19.5l1.6-1.6M17.9 6.1l1.6-1.6" />
    </svg>
  );
}
