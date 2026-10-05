"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { IconInfo, IconList, IconMapTab, IconNews } from "./icons";

const TABS = [
  { href: "/", label: "Lycées", Icon: IconList },
  { href: "/carte", label: "Carte", Icon: IconMapTab },
  { href: "/presse", label: "Presse", Icon: IconNews },
  { href: "/a-propos", label: "À propos", Icon: IconInfo },
];

/** Barre d'onglets flottante en verre dépoli, icône au-dessus du libellé (style iOS). */
export function TabBar() {
  const path = usePathname();
  if (path.startsWith("/admin") || path.startsWith("/lycee/")) return null;
  return (
    <nav className="pointer-events-none fixed inset-x-0 bottom-0 z-40 flex justify-center px-4 pb-safe">
      <div className="glass pointer-events-auto mb-1 flex w-full max-w-md gap-1 rounded-[26px] p-1.5 shadow-float">
        {TABS.map(({ href, label, Icon }) => {
          const active = href === "/" ? path === "/" : path.startsWith(href);
          return (
            <Link
              key={href}
              href={href}
              aria-current={active ? "page" : undefined}
              className={`pressable flex flex-1 flex-col items-center gap-0.5 rounded-[20px] py-2 text-[11px] font-semibold transition-colors ${
                active ? "bg-label text-bg" : "text-label-2"
              }`}
            >
              <Icon width={21} height={21} strokeWidth={2.2} />
              {label}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
