import { Label } from "../components/Label";

const rows = [
  ["An attendant all night.", "One of us stays with the booth, loads the film and fixes the jams."],
  ["Unlimited strips.", "Every group gets one. Nobody counts."],
  ["A guest book.", "A second strip goes in the book with a note beside it. This is the thing couples keep."],
  ["A props box.", "Hats, glasses and one questionable wig. Left in the van if you would rather."],
  ["Digital copies.", "Every strip scanned at 1200dpi and sent within a week."],
];

export function Included() {
  return (
    <section id="included" className="section scroll-mt-[74px]">
      <div className="wrap">
        <Label>003/ Included</Label>
        <ol className="mt-10 border-t hairline md:mt-14">
          {rows.map(([title, line], i) => (
            <li key={title} className="grid gap-3 border-b hairline py-7 md:grid-cols-12 md:items-baseline md:gap-6 md:py-9">
              <span className="meta text-muted md:col-span-1">{String(i + 1).padStart(2, "0")}</span>
              <h3 className="display text-[32px] md:col-span-6 md:text-[clamp(34px,3.6vw,48px)]">{title}</h3>
              <p className="text-[17px] md:col-span-5">{line}</p>
            </li>
          ))}
        </ol>
      </div>
    </section>
  );
}
