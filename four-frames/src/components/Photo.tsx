import clsx from "clsx";
import { photos, type PhotoKey } from "../photos";
import { Scene } from "./Scene";

/** A photograph from photos.ts, or its drawn stand in until one is supplied. */
export function Photo({ name, alt, className }: { name: PhotoKey; alt: string; className?: string }) {
  const src: string | null = photos[name];
  if (src) {
    return <img src={src} alt={alt} loading="lazy" className={clsx("h-full w-full object-cover", className)} />;
  }
  return <Scene name={name} className={clsx("h-full w-full", className)} />;
}
