import { EMAIL, PHONE, TEL } from "../content";

const links = [
  { href: "#booths", label: "The booths" },
  { href: "#prices", label: "Prices" },
  { href: "#recently", label: "Weddings" },
  { href: "https://www.instagram.com/", label: "Instagram" },
];

export function Footer() {
  return (
    <footer className="mt-2 overflow-hidden bg-ink text-paper md:mt-4">
      <div className="wrap grid gap-10 pb-10 pt-20 md:grid-cols-12 md:gap-6 md:pt-24">
        <p className="max-w-[320px] text-[17px] md:col-span-4">Based in Leeds, travelling across Yorkshire and the north</p>
        <div className="flex flex-col gap-2 md:col-span-4">
          <a href={`mailto:${EMAIL}`} className="hover:underline">{EMAIL}</a>
          <a href={TEL} className="hover:underline">{PHONE}</a>
        </div>
        <ul className="meta flex flex-wrap gap-x-6 gap-y-2 md:col-span-4 md:justify-end">
          {links.map((l) => (
            <li key={l.label}>
              <a href={l.href} className="hover:text-accent" {...(l.href.startsWith("http") ? { target: "_blank", rel: "noreferrer" } : {})}>
                {l.label}
              </a>
            </li>
          ))}
        </ul>
      </div>
      <svg aria-hidden viewBox="0 0 1000 150" className="block w-full select-none" preserveAspectRatio="xMidYMin slice">
        <text
          x="500"
          y="176"
          textAnchor="middle"
          textLength="992"
          lengthAdjust="spacingAndGlyphs"
          className="display"
          style={{ fontSize: 214 }}
          fill="currentColor"
        >
          FOUR FRAMES
        </text>
      </svg>
    </footer>
  );
}
