import clsx from "clsx";
import { motion, useReducedMotion } from "motion/react";
import { Label } from "../components/Label";
import { Photo } from "../components/Photo";
import type { PhotoKey } from "../photos";

const items: { photo: PhotoKey; caption: string; alt: string; size: string }[] = [
  { photo: "venueHepworth", caption: "Hepworth Wakefield, June", alt: "A wedding at the Hepworth Wakefield", size: "lg:col-span-5 aspect-[4/5]" },
  { photo: "venueBarn", caption: "A barn near Otley, August", alt: "A party in a barn near Otley", size: "lg:col-span-3 lg:col-start-7 lg:translate-y-28 aspect-[1/1]" },
  { photo: "venueBelgrave", caption: "Belgrave Music Hall, May", alt: "A late night at Belgrave Music Hall", size: "lg:col-span-3 lg:col-start-10 lg:translate-y-6 aspect-[3/4]" },
  { photo: "venueIlkley", caption: "A garden in Ilkley, July", alt: "A marquee in a garden in Ilkley", size: "lg:col-span-4 lg:col-start-2 lg:translate-y-10 aspect-[5/4]" },
  { photo: "venueCornExchange", caption: "Leeds Corn Exchange, December", alt: "A Christmas party at Leeds Corn Exchange", size: "lg:col-span-4 lg:col-start-6 lg:-translate-y-4 aspect-[4/5]" },
  { photo: "venueAdelphi", caption: "The Adelphi, March", alt: "A birthday at The Adelphi pub", size: "lg:col-span-2 lg:col-start-11 lg:translate-y-32 aspect-[3/4]" },
];

export function Recently() {
  const reduce = useReducedMotion();
  return (
    <section id="recently" className="section scroll-mt-[74px] bg-surface">
      <div className="wrap">
        <Label>005/ Recently</Label>
        <div className="mt-10 grid gap-x-6 gap-y-12 md:mt-14 md:grid-cols-2 lg:grid-cols-12 lg:items-start lg:gap-y-24 lg:pb-24">
          {items.map((it, i) => (
            <figure key={it.photo} className={clsx("zoom-host m-0", it.size.replace(/aspect-\S+/, ""), i % 2 === 1 && "md:max-lg:mt-16")}>
              <div className={clsx("overflow-hidden rounded-[var(--radius)]", it.size.match(/aspect-\S+/)?.[0])}>
                <motion.div
                  className="h-full w-full"
                  initial={reduce ? false : { scale: 1.03 }}
                  whileInView={{ scale: 1 }}
                  viewport={{ once: true, amount: 0.3 }}
                  transition={{ duration: 1.1, ease: [0.22, 1, 0.36, 1] }}
                >
                  <div className="zoom-img h-full w-full">
                    <Photo name={it.photo} alt={it.alt} />
                  </div>
                </motion.div>
              </div>
              <figcaption className="meta mt-3 text-muted">{it.caption}</figcaption>
            </figure>
          ))}
        </div>
      </div>
    </section>
  );
}
