"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import clsx from "clsx";

type Item = { href: string; label: string; icon: string };

const ITEMS: Item[] = [
  { href: "/app", label: "Aujourd'hui", icon: "🏠" },
  { href: "/app/temperatures", label: "Températures", icon: "🌡️" },
  { href: "/app/nettoyage", label: "Nettoyage", icon: "🧽" },
  { href: "/app/receptions", label: "Réception", icon: "📦" },
  { href: "/app/tracabilite", label: "Traçabilité", icon: "🏷️" },
  { href: "/app/non-conformites", label: "Anomalies", icon: "⚠️" },
];

const GERANT_ITEMS: Item[] = [
  { href: "/app/export", label: "Export PDF", icon: "📄" },
  { href: "/app/parametres", label: "Réglages", icon: "⚙️" },
];

function isActive(pathname: string, href: string) {
  if (href === "/app") return pathname === "/app";
  return pathname === href || pathname.startsWith(href + "/");
}

export function DesktopNav({ role }: { role: string }) {
  const pathname = usePathname();
  const items = role === "GERANT" ? [...ITEMS, ...GERANT_ITEMS] : ITEMS;
  return (
    <nav className="space-y-1">
      {items.map((it) => (
        <Link
          key={it.href}
          href={it.href}
          className={clsx(
            "flex items-center gap-3 rounded-xl px-4 py-3 text-sm font-medium transition",
            isActive(pathname, it.href)
              ? "bg-brand-600 text-white shadow-sm"
              : "text-slate-600 hover:bg-slate-100"
          )}
        >
          <span className="text-lg">{it.icon}</span>
          {it.label}
        </Link>
      ))}
    </nav>
  );
}

export function MobileNav({ role }: { role: string }) {
  const pathname = usePathname();
  // Sur mobile, on garde les 5 actions principales + accès "Plus" pour le gérant.
  const items =
    role === "GERANT"
      ? [...ITEMS.slice(0, 5), { href: "/app/export", label: "Export", icon: "📄" }]
      : ITEMS.slice(0, 5);
  return (
    <nav className="fixed inset-x-0 bottom-0 z-40 border-t border-slate-200 bg-white/95 backdrop-blur lg:hidden">
      <div className="mx-auto grid max-w-lg grid-cols-6">
        {items.map((it) => (
          <Link
            key={it.href}
            href={it.href}
            className={clsx(
              "flex flex-col items-center gap-0.5 py-2 text-[10px] font-medium",
              isActive(pathname, it.href) ? "text-brand-700" : "text-slate-500"
            )}
          >
            <span className="text-xl leading-none">{it.icon}</span>
            {it.label}
          </Link>
        ))}
      </div>
    </nav>
  );
}
