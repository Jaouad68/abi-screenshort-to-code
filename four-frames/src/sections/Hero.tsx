import { motion, useReducedMotion } from "motion/react";
import { Photo } from "../components/Photo";
import { PhotoStrip } from "../components/DevelopingStrip";
import { Pill } from "../components/Pill";
import { MAILTO } from "../content";

const EASE = [0.22, 1, 0.36, 1] as const;

export function Hero() {
  const reduce = useReducedMotion();
  const rise = reduce ? {} : { initial: { opacity: 0, y: 20 }, animate: { opacity: 1, y: 0 } };

  return (
    <section id="top" className="relative">
      <div className="wrap grid min-h-[clamp(540px,78vh,820px)] gap-12 pb-16 pt-10 md:grid-cols-12 md:gap-6 md:pt-14 lg:pb-20">
        <div className="flex flex-col md:col-span-8 md:justify-center lg:col-span-9">
          <p className="meta text-muted">Three restored booths. Real film. Yorkshire and the north.</p>

          <motion.h1
            {...rise}
            transition={{ duration: 1, ease: EASE }}
            className="display mt-8 text-[46px] md:mt-10 md:text-[clamp(58px,7vw,104px)] lg:text-[clamp(90px,7vw,104px)]"
          >
            <span className="block md:whitespace-nowrap">
              Four people, four
              <motion.span
                initial={reduce ? false : { scale: 1.04 }}
                animate={{ scale: 1 }}
                transition={{ duration: 1.4, ease: EASE }}
                className="my-3 block h-[84px] w-[200px] overflow-hidden rounded-full md:mx-[0.12em] md:my-0 md:inline-block md:h-[0.72em] md:w-[1.5em] md:align-[-0.04em]"
              >
                <Photo name="heroInline" alt="Two people laughing inside a curtained photo booth" />
              </motion.span>
            </span>
            <span className="block">
              <em>minutes</em>, four frames.
            </span>
          </motion.h1>

          <motion.div
            {...rise}
            transition={{ duration: 1, delay: 0.15, ease: EASE }}
            className="mt-10 md:mt-16 lg:mt-20"
          >
            <p className="max-w-[440px] text-[17px] md:text-[18px]">
              Proper chemical photo booths from the seventies, restored and driven to your wedding, party or launch.
              Black and white film, developed on the spot.
            </p>
            <Pill href={MAILTO} tone="ink" className="mt-8">
              Check your date
            </Pill>
          </motion.div>
        </div>

        <div className="flex justify-center md:col-span-4 md:items-center md:justify-end lg:col-span-3">
          <PhotoStrip
            strip={0}
            develop
            caption="Four Frames. Leeds"
            className="w-[132px] max-md:![rotate:0deg] md:mr-2 md:w-[156px] lg:mr-6 lg:w-[164px]"
          />
        </div>
      </div>
    </section>
  );
}
