import type { Fenetre } from "@/lib/horaires";

/** Time step between candidate slots, in minutes. */
export const SLOT_STEP_MIN = 15;

/** An already-occupied interval on the target day, expressed as "HH:MM" strings. */
export type Occupe = { debut: string; fin: string };

export type SlotsForParams = {
  /** That day's opening windows, e.g. [["09:00","12:00"],["14:00","19:00"]]. */
  fenetres: Fenetre[];
  dureeMin: number;
  bufferMin: number;
  /** Intervals already taken by other appointments that day (buffer included in `fin`). */
  occupes: Occupe[];
  step?: number;
};

function toMinutes(time: string): number {
  const [h, m] = time.split(":").map(Number);
  return h * 60 + m;
}

function toTime(minutes: number): string {
  const h = Math.floor(minutes / 60)
    .toString()
    .padStart(2, "0");
  const m = (minutes % 60).toString().padStart(2, "0");
  return `${h}:${m}`;
}

/**
 * Computes the bookable start times for a service on a single day.
 *
 * A candidate slot `c` is offered when:
 * - `c + (dureeMin + bufferMin) <= finFenetre` for the window it belongs to
 *   (a slot is never split across two windows, e.g. across a lunch break), and
 * - it does not overlap any already-occupied interval:
 *   `c < occupe.fin && c + total > occupe.debut` is false for every occupied interval.
 */
export function slotsFor({
  fenetres,
  dureeMin,
  bufferMin,
  occupes,
  step = SLOT_STEP_MIN,
}: SlotsForParams): string[] {
  const total = dureeMin + bufferMin;
  const occupesMin = occupes.map((o) => ({
    debut: toMinutes(o.debut),
    fin: toMinutes(o.fin),
  }));

  const slots: string[] = [];

  for (const [debutStr, finStr] of fenetres) {
    const debutFenetre = toMinutes(debutStr);
    const finFenetre = toMinutes(finStr);

    for (let c = debutFenetre; c + total <= finFenetre; c += step) {
      const chevauche = occupesMin.some((o) => c < o.fin && c + total > o.debut);
      if (!chevauche) slots.push(toTime(c));
    }
  }

  return slots;
}
