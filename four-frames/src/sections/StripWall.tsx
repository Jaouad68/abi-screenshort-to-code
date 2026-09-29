import clsx from "clsx";
import { PhotoStrip } from "../components/DevelopingStrip";

const tilts = [-3, 2, -1.5, 3, -2, 1, -2.5, 2.5, -1];
const drops = [20, 0, 36, 8, 0, 28, 4, 30, 12];

export function StripWall() {
  return (
    <section className="p-2 md:p-4" aria-label="Photo strips from one Saturday">
      <div className="overflow-hidden rounded-[var(--panel-radius)] bg-ink text-paper">
        <div className="overflow-x-auto">
          <div className="mx-auto flex w-max items-start gap-4 px-5 pb-10 pt-16 md:gap-6 md:px-12 md:pt-28 lg:gap-7">
            {tilts.map((t, i) => (
              <PhotoStrip
                key={i}
                strip={i + 1}
                tilt={t}
                develop={i === 4}
                caption={`Strip ${String(i + 1).padStart(2, "0")}`}
                className={clsx(
                  "w-[92px] shrink-0 md:w-[112px] lg:w-[116px]",
                  i !== 4 && i !== 3 && i !== 5 && "max-md:hidden",
                  (i === 0 || i === 8 || i === 7) && "md:max-lg:hidden",
                )}
                style={{ marginTop: drops[i] }}
              />
            ))}
          </div>
        </div>
        <div className="wrap pb-14 md:pb-20">
          <p className="meta mx-auto max-w-[520px] text-center text-paper/70">
            Strips from one Saturday in June. Nobody is looking at the camera in the fourth frame, they never are.
          </p>
        </div>
      </div>
    </section>
  );
}
