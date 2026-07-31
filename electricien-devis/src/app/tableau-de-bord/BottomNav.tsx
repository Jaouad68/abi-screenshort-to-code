"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const ITEMS = [
  { href: "/tableau-de-bord", label: "Accueil", exact: true, icon: IconHome },
  { href: "/tableau-de-bord/devis", label: "Devis", icon: IconDoc },
  { href: "/tableau-de-bord/factures", label: "Factures", icon: IconBill },
  { href: "/tableau-de-bord/clients", label: "Clients", icon: IconUsers },
  { href: "/tableau-de-bord/prestations", label: "Tarifs", icon: IconTag },
  { href: "/tableau-de-bord/parametres", label: "Réglages", icon: IconGear },
];

export function BottomNav() {
  const pathname = usePathname();

  return (
    <nav className="no-print fixed bottom-0 inset-x-0 z-20 border-t border-line bg-card/95 backdrop-blur sm:hidden">
      <ul className="grid grid-cols-6">
        {ITEMS.map((item) => {
          const active = item.exact
            ? pathname === item.href
            : pathname.startsWith(item.href);
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
function IconDoc({ active }: IconProps) {
  return (
    <svg {...base(active)} aria-hidden>
      <path d="M7 3h7l4 4v14H7z" />
      <path d="M14 3v4h4M9.5 12h5M9.5 15.5h5" />
    </svg>
  );
}
function IconBill({ active }: IconProps) {
  return (
    <svg {...base(active)} aria-hidden>
      <path d="M6 3h12v18l-3-1.6-3 1.6-3-1.6L6 21z" />
      <path d="M9.5 8h5M9.5 12h5" />
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
function IconTag({ active }: IconProps) {
  return (
    <svg {...base(active)} aria-hidden>
      <path d="M4 4h8l8 8-8 8-8-8z" />
      <circle cx="8.5" cy="8.5" r="1.3" fill="currentColor" stroke="none" />
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
