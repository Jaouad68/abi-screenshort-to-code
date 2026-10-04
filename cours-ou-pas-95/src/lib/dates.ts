/**
 * Dates « calendrier » au format YYYY-MM-DD, toujours interprétées dans le
 * fuseau Europe/Paris. Les calculs se font en UTC sur ces chaînes pour éviter
 * les surprises liées aux changements d'heure.
 */

export const TZ = "Europe/Paris";

/** Lundi → samedi : les jours où il peut y avoir cours. */
export const SCHOOL_DAYS = 6;

const ISO_RE = /^\d{4}-\d{2}-\d{2}$/;

export function isIsoDate(s: unknown): s is string {
  if (typeof s !== "string" || !ISO_RE.test(s)) return false;
  const d = new Date(`${s}T00:00:00Z`);
  return !Number.isNaN(d.getTime()) && d.toISOString().slice(0, 10) === s;
}

/** Date du jour à Paris. */
export function todayParis(now: Date = new Date()): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: TZ, year: "numeric", month: "2-digit", day: "2-digit" }).format(now);
}

function toUtc(date: string): Date {
  return new Date(`${date}T00:00:00Z`);
}

export function addDays(date: string, n: number): string {
  const d = toUtc(date);
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
}

/** 0 = lundi … 6 = dimanche */
export function weekdayIndex(date: string): number {
  return (toUtc(date).getUTCDay() + 6) % 7;
}

export function mondayOf(date: string): string {
  return addDays(date, -weekdayIndex(date));
}

/** Les 6 jours (lundi → samedi) de la semaine qui commence le lundi donné. */
export function weekDays(monday: string): string[] {
  return Array.from({ length: SCHOOL_DAYS }, (_, i) => addDays(monday, i));
}

/**
 * Semaine « courante » à afficher : le dimanche, on bascule déjà sur la
 * semaine suivante.
 */
export function currentWeekStart(today: string = todayParis()): string {
  return weekdayIndex(today) === 6 ? addDays(today, 1) : mondayOf(today);
}

/** Jour sélectionné par défaut : aujourd'hui, ou lundi prochain le dimanche. */
export function defaultDay(today: string = todayParis()): string {
  return weekdayIndex(today) === 6 ? addDays(today, 1) : today;
}

const fmt = (opts: Intl.DateTimeFormatOptions) => new Intl.DateTimeFormat("fr-FR", { timeZone: "UTC", ...opts });
const F_SHORT_DAY = fmt({ weekday: "short" });
const F_LONG = fmt({ weekday: "long", day: "numeric", month: "long" });
const F_DAY_MONTH = fmt({ day: "numeric", month: "short" });

const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

/** « Lun. » */
export function shortWeekday(date: string): string {
  return cap(F_SHORT_DAY.format(toUtc(date)));
}

/** « 5 » */
export function dayNumber(date: string): number {
  return toUtc(date).getUTCDate();
}

/** « Lundi 5 octobre » */
export function longDate(date: string): string {
  return cap(F_LONG.format(toUtc(date)));
}

/** « 5 oct. » */
export function dayMonth(date: string): string {
  return F_DAY_MONTH.format(toUtc(date));
}

/** « Aujourd'hui », « Demain », ou « Lundi 5 octobre » */
export function relativeDayLabel(date: string, today: string = todayParis()): string {
  if (date === today) return "Aujourd'hui";
  if (date === addDays(today, 1)) return "Demain";
  if (date === addDays(today, -1)) return "Hier";
  return longDate(date);
}

/** « à l'instant », « il y a 5 min », « il y a 2 h », « hier » … */
export function timeAgo(iso: string, now: number = Date.now()): string {
  const s = Math.max(0, Math.round((now - new Date(iso).getTime()) / 1000));
  if (s < 45) return "à l'instant";
  const m = Math.round(s / 60);
  if (m < 60) return `il y a ${m} min`;
  const h = Math.round(m / 60);
  if (h < 24) return `il y a ${h} h`;
  const d = Math.round(h / 24);
  return d === 1 ? "hier" : `il y a ${d} jours`;
}
