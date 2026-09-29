import { useRef, type CSSProperties } from "react";
import clsx from "clsx";
import { motion, useInView, useReducedMotion } from "motion/react";
import { strips } from "../photos";
import { StripFrame } from "./Scene";

const EASE = [0.22, 1, 0.36, 1] as const;

/**
 * A vertical strip of four frames. With `develop`, each frame comes up out of
 * the paper colour one after another, 400ms apart, the first time the strip
 * enters view. Without it the strip is simply a finished print.
 */
export function PhotoStrip({
  strip = 0,
  caption,
  develop = false,
  tilt = 2,
  className,
  style,
}: {
  strip?: number;
  caption?: string;
  develop?: boolean;
  tilt?: number;
  className?: string;
  style?: CSSProperties;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { once: true, amount: 0.4 });
  const reduce = useReducedMotion();
  const real = strips[strip];

  return (
    <div
      ref={ref}
      className={clsx("bg-white p-2 pb-0 [rotate:var(--tilt)]", className)}
      style={{ ...style, "--tilt": `${tilt}deg` } as CSSProperties}
    >
      <div className="flex flex-col gap-[var(--strip-gap,6px)]">
        {[0, 1, 2, 3].map((i) => (
          <div key={i} className="relative aspect-[4/5] overflow-hidden bg-[#8d8a82]">
            {real?.[i] ? (
              <img src={real[i]} alt={`Photo strip frame ${i + 1}`} className="h-full w-full object-cover" />
            ) : (
              <StripFrame strip={strip} frame={i} />
            )}
            {develop && !reduce && (
              <motion.div
                aria-hidden
                className="absolute inset-0 bg-paper"
                initial={{ opacity: 1 }}
                animate={inView ? { opacity: 0 } : { opacity: 1 }}
                transition={{ duration: 1.4, delay: i * 0.4, ease: EASE }}
              />
            )}
          </div>
        ))}
      </div>
      <p className="meta py-2.5 text-center !text-[9px] !leading-tight text-muted">{caption ?? "Four Frames"}</p>
    </div>
  );
}
