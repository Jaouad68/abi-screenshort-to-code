"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useLangue } from "@/lib/client/langue";
import { usePrefs } from "@/lib/client/prefs";

const ICONES = {
  recherche: <><circle cx="10.5" cy="10.5" r="6" /><path d="M15 15l5 5" /></>,
  carte: <><path d="M3 6l6-2 6 2 6-2v14l-6 2-6-2-6 2z" /><path d="M9 4v14M15 6v14" /></>,
  favoris: <path d="M12 20s-8-4.8-8-10.4A4.4 4.4 0 0112 7a4.4 4.4 0 018 2.6C20 15.2 12 20 12 20z" />,
  comparer: <path d="M5 4v16M12 4v16M19 4v16" />,
  profil: <><circle cx="12" cy="8" r="4" /><path d="M4 21c1.5-4 4.5-6 8-6s6.5 2 8 6" /></>,
};

const ONGLETS = [
  { cle: "recherche", href: "/" },
  { cle: "carte", href: "/carte" },
  { cle: "favoris", href: "/favoris" },
  { cle: "comparer", href: "/comparer" },
  { cle: "profil", href: "/profil" },
] as const;

export function TabBar() {
  const chemin = usePathname();
  const { t } = useLangue();
  const { favoris, comparaison } = usePrefs();
  const compteurs: Partial<Record<(typeof ONGLETS)[number]["cle"], number>> = { favoris: favoris.length, comparer: comparaison.length };

  return (
    <nav className="fixed inset-x-0 bottom-0 z-40 border-t border-line bg-[var(--glass)] backdrop-blur-xl pb-[max(env(safe-area-inset-bottom),8px)]">
      <ul className="mx-auto flex max-w-2xl justify-around px-2 pt-2">
        {ONGLETS.map(({ cle, href }) => {
          const actif = href === "/" ? chemin === "/" || chemin.startsWith("/programme") : chemin.startsWith(href);
          const n = compteurs[cle];
          return (
            <li key={cle}>
              <Link
                href={href}
                aria-current={actif ? "page" : undefined}
                className={`relative flex min-h-11 min-w-14 flex-col items-center gap-0.5 text-[11px] font-semibold ${actif ? "text-detroit" : "text-muted"}`}
              >
                <svg viewBox="0 0 24 24" className="h-6 w-6" fill="none" stroke="currentColor" strokeWidth="2" strokeLinejoin="round" aria-hidden>
                  {ICONES[cle]}
                </svg>
                {t.onglets[cle]}
                {n ? (
                  <span className="num absolute -top-1 end-2 min-w-4 rounded-full bg-safran px-1 text-center text-[10px] leading-4 text-surface">{n}</span>
                ) : null}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
