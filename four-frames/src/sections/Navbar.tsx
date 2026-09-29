import { Pill } from "../components/Pill";
import { MAILTO } from "../content";

const links = [
  { href: "#booths", label: "The booths" },
  { href: "#included", label: "What you get" },
  { href: "#prices", label: "Prices" },
  { href: "#enquire", label: "Enquire" },
];

export function Navbar() {
  return (
    <header className="sticky top-0 z-40 border-b hairline bg-paper">
      <nav className="wrap flex h-[74px] items-center justify-between gap-6" aria-label="Main">
        <a href="#top" className="display text-[22px] tracking-[-0.01em] sm:text-[26px]" aria-label="Four Frames, home">
          FOUR FRAMES
        </a>
        <div className="flex items-center gap-8">
          <ul className="hidden items-center gap-7 text-[15px] font-medium lg:flex">
            {links.map((l) => (
              <li key={l.href}>
                <a href={l.href} className="underline-offset-4 hover:underline">
                  {l.label}
                </a>
              </li>
            ))}
          </ul>
          <Pill href={MAILTO}>Check your date</Pill>
        </div>
      </nav>
    </header>
  );
}
