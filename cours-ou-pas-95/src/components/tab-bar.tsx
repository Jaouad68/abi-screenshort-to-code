"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { IconInfo, IconList } from "./icons";

const TABS = [
  { href: "/", label: "Lycées", Icon: IconList },
  { href: "/a-propos", label: "À propos", Icon: IconInfo },
];

/** Barre d'onglets flottante en verre dépoli. */
export function TabBar() {
  const path = usePathname();
  if (path.startsWith("/admin") || path.startsWith("/lycee/")) return null;
  return (
    <nav className="pointer-events-none fixed inset-x-0 bottom-0 z-40 flex justify-center pb-safe">
      <div className="glass pointer-events-auto mb-1 flex gap-1 rounded-full p-1.5 shadow-float">
        {TABS.map(({ href, label, Icon }) => {
          const active = href === "/" ? path === "/" : path.startsWith(href);
          return (
            <Link
              key={href}
              href={href}
              className={`pressable flex items-center gap-2 rounded-full px-5 py-2.5 text-[14px] font-semibold transition-colors ${
                active ? "bg-label text-bg" : "text-label-2"
              }`}
            >
              <Icon width={18} height={18} strokeWidth={2.3} />
              {label}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
