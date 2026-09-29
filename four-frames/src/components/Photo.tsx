import clsx from "clsx";
import { photos, type PhotoKey } from "../photos";
import { Scene } from "./Scene";

/** A photograph from photos.ts, or its drawn stand in until one is supplied. */
export function Photo({ name, alt, className }: { name: PhotoKey; alt: string; className?: string }) {
  const entry = photos[name] as string | { src: string; position: string } | null;
  if (entry) {
    const { src, position } = typeof entry === "string" ? { src: entry, position: undefined } : entry;
    return (
      <img
        src={src}
        alt={alt}
        loading="lazy"
        decoding="async"
        style={{ objectPosition: position }}
        className={clsx("h-full w-full object-cover", className)}
      />
    );
  }
  return <Scene name={name} className={clsx("h-full w-full", className)} />;
}
