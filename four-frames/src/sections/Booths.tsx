import { useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { Label } from "../components/Label";
import { Photo } from "../components/Photo";
import type { PhotoKey } from "../photos";

const booths: { name: string; line: string; meta: string; photo: PhotoKey; alt: string }[] = [
  {
    name: "Marlene",
    line: "Chrome and cream enamel, the loudest shutter of the three.",
    meta: "1972. Black and white. Fits four.",
    photo: "boothMarlene",
    alt: "Marlene, a chrome and enamel photo booth",
  },
  {
    name: "Sid",
    line: "Wood panelled, from a station in Leeds, still smells faintly of it.",
    meta: "1976. Black and white. Fits three.",
    photo: "boothSid",
    alt: "Sid, a wood panelled photo booth",
  },
  {
    name: "Dot",
    line: "Small, white, easy up stairs. The one for tight rooms.",
    meta: "1979. Black and white. Fits two.",
    photo: "boothDot",
    alt: "Dot, a small white photo booth",
  },
];

export function Booths() {
  const [active, setActive] = useState<number | null>(null);

  return (
    <section id="booths" className="section scroll-mt-[74px] bg-surface">
      <div className="wrap">
        <Label>002/ The machines</Label>
        <ul className="mt-10 border-t hairline md:mt-14" onMouseLeave={() => setActive(null)}>
          {booths.map((b, i) => (
            <li
              key={b.name}
              className="relative grid grid-cols-[auto_1fr] items-center gap-x-5 gap-y-3 border-b hairline py-7 md:grid-cols-12 md:gap-6 md:py-9"
              onMouseEnter={() => setActive(i)}
            >
              <div className="size-[72px] overflow-hidden rounded-[var(--radius)] md:hidden">
                <Photo name={b.photo} alt={b.alt} />
              </div>
              <div className="md:col-span-7">
                <div className="relative inline-block">
                  <h3 className="display text-[52px] md:text-[clamp(64px,8vw,112px)]">{b.name}.</h3>
                  <AnimatePresence>
                    {active === i && (
                      <motion.div
                        key={b.name}
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        transition={{ duration: 0.25 }}
                        className="pointer-events-none absolute left-full top-1/2 z-10 ml-6 hidden h-[180px] w-[144px] -translate-y-1/2 rotate-[-2deg] overflow-hidden rounded-[var(--radius)] md:block"
                      >
                        <Photo name={b.photo} alt={b.alt} />
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
                <p className="mt-3 hidden max-w-[420px] text-muted md:block">{b.line}</p>
              </div>
              <p className="col-span-2 text-muted md:hidden">{b.line}</p>
              <p className="meta col-span-2 md:col-span-5 md:text-right">{b.meta}</p>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
