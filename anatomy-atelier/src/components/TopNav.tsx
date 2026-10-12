"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const tabs = [
  { href: "/", label: "Explore" },
  { href: "/systems", label: "Systems" },
  { href: "/lessons", label: "Lessons" },
  { href: "/library", label: "Library" },
  { href: "/notes", label: "Notes" },
];

export function TopNav() {
  const pathname = usePathname();

  return (
    <header className="sticky top-0 z-20 border-b border-line bg-paper/95 backdrop-blur">
      <div className="mx-auto flex h-16 max-w-[1400px] items-center gap-6 px-4 sm:px-6">
        <Link href="/" className="flex items-baseline gap-2 whitespace-nowrap">
          <span className="text-lg font-extrabold tracking-tight text-ink">Anatomy Atelier°</span>
          <span className="hidden text-xs text-muted sm:inline">Learn anatomy like an artist</span>
        </Link>

        <nav className="hidden flex-1 items-center gap-1 md:flex">
          {tabs.map((tab) => {
            const active = tab.href === "/" ? pathname === "/" : pathname.startsWith(tab.href);
            return (
              <Link
                key={tab.href}
                href={tab.href}
                className={`rounded-pill px-3.5 py-1.5 text-sm font-medium transition-colors ${
                  active ? "bg-sage text-white" : "text-ink-2 hover:bg-sage-l"
                }`}
              >
                {tab.label}
              </Link>
            );
          })}
        </nav>

        <div className="ml-auto flex items-center gap-3">
          <div className="hidden h-9 w-56 items-center rounded-pill border border-line bg-white px-3 text-sm text-muted lg:flex">
            Search organs, topics&hellip;
          </div>
          <div className="flex h-9 w-9 items-center justify-center rounded-full bg-sage-l text-sm font-semibold text-sage-d">
            AA
          </div>
        </div>
      </div>

      <nav className="flex items-center gap-1 overflow-x-auto border-t border-line px-4 py-2 md:hidden">
        {tabs.map((tab) => {
          const active = tab.href === "/" ? pathname === "/" : pathname.startsWith(tab.href);
          return (
            <Link
              key={tab.href}
              href={tab.href}
              className={`whitespace-nowrap rounded-pill px-3 py-1.5 text-sm font-medium ${
                active ? "bg-sage text-white" : "text-ink-2"
              }`}
            >
              {tab.label}
            </Link>
          );
        })}
      </nav>
    </header>
  );
}
