/**
 * Calcul du statut d'un lycée pour un jour donné, à partir des signalements
 * participatifs et d'une éventuelle décision de modération (« officiel »).
 */

export const STATUSES = ["normal", "perturbe", "bloque"] as const;
export type Status = (typeof STATUSES)[number];
export type DisplayStatus = Status | "inconnu";

export type Confidence = "officiel" | "referent" | "confirme" | "non_confirme" | "contradictoire";

export interface Report {
  id: string;
  uai: string;
  date: string;
  status: Status;
  createdAt: string;
  /** Signalement fait par un référent vérifié du lycée. */
  referent?: boolean;
}

export interface Override {
  uai: string;
  date: string;
  status: Status;
  note: string | null;
  updatedAt: string;
}

export interface DayStatus {
  date: string;
  status: DisplayStatus;
  confidence: Confidence | null;
  /** Nombre de signalements pris en compte. */
  count: number;
  /** Répartition pondérée, en pourcentage (0 → 100). */
  shares: Record<Status, number>;
  updatedAt: string | null;
  note: string | null;
}

/** Un signalement perd la moitié de son poids toutes les 6 heures. */
export const HALF_LIFE_HOURS = 6;
/** À partir de 3 signalements concordants à 70 %, le statut est « confirmé ». */
export const CONFIRM_MIN_COUNT = 3;
export const CONFIRM_MIN_SHARE = 0.7;
/** En dessous de 60 % d'accord, les signalements sont « contradictoires ». */
export const CONTRADICTION_MAX_SHARE = 0.6;

const ZERO_SHARES: Record<Status, number> = { normal: 0, perturbe: 0, bloque: 0 };

export function isStatus(s: unknown): s is Status {
  return typeof s === "string" && (STATUSES as readonly string[]).includes(s);
}

export function emptyDay(date: string): DayStatus {
  return { date, status: "inconnu", confidence: null, count: 0, shares: { ...ZERO_SHARES }, updatedAt: null, note: null };
}

export function computeDayStatus(
  date: string,
  reports: Pick<Report, "status" | "createdAt" | "referent">[],
  override: Pick<Override, "status" | "note" | "updatedAt"> | null,
  now: number = Date.now(),
): DayStatus {
  const scores: Record<Status, number> = { ...ZERO_SHARES };
  let total = 0;
  let latest: string | null = null;

  for (const r of reports) {
    const ageHours = Math.max(0, (now - new Date(r.createdAt).getTime()) / 3_600_000);
    const w = Math.pow(0.5, ageHours / HALF_LIFE_HOURS);
    scores[r.status] += w;
    total += w;
    if (!latest || r.createdAt > latest) latest = r.createdAt;
  }

  const shares: Record<Status, number> = { ...ZERO_SHARES };
  if (total > 0) {
    for (const s of STATUSES) shares[s] = Math.round((scores[s] / total) * 100);
  }

  if (override) {
    const updatedAt = latest && latest > override.updatedAt ? latest : override.updatedAt;
    return { date, status: override.status, confidence: "officiel", count: reports.length, shares, updatedAt, note: override.note };
  }

  if (total === 0) return emptyDay(date);

  // Un référent vérifié l'emporte sur les signalements anonymes : on retient son dernier signalement.
  const lastReferent = reports
    .filter((r) => r.referent)
    .reduce<(typeof reports)[number] | null>((a, r) => (!a || r.createdAt > a.createdAt ? r : a), null);
  if (lastReferent) {
    return { date, status: lastReferent.status, confidence: "referent", count: reports.length, shares, updatedAt: latest, note: null };
  }

  // En cas d'égalité, on privilégie le statut le plus prudent (bloqué > perturbé > normal).
  const winner = [...STATUSES].reverse().reduce((best, s) => (scores[s] > scores[best] ? s : best), "bloque" as Status);
  const share = scores[winner] / total;

  let confidence: Confidence;
  if (reports.length >= CONFIRM_MIN_COUNT && share >= CONFIRM_MIN_SHARE) confidence = "confirme";
  else if (reports.length >= 2 && share < CONTRADICTION_MAX_SHARE) confidence = "contradictoire";
  else confidence = "non_confirme";

  return { date, status: winner, confidence, count: reports.length, shares, updatedAt: latest, note: null };
}

/** Calcule les statuts de toute une semaine, pour tous les lycées ayant des données. */
export function computeWeek(
  days: string[],
  reports: Report[],
  overrides: Override[],
  now: number = Date.now(),
): Record<string, DayStatus[]> {
  const reportsByKey = new Map<string, Report[]>();
  for (const r of reports) {
    const k = `${r.uai}|${r.date}`;
    const list = reportsByKey.get(k);
    if (list) list.push(r);
    else reportsByKey.set(k, [r]);
  }
  const overrideByKey = new Map(overrides.map((o) => [`${o.uai}|${o.date}`, o]));

  const uais = new Set([...reports.map((r) => r.uai), ...overrides.map((o) => o.uai)]);
  const out: Record<string, DayStatus[]> = {};
  for (const uai of uais) {
    out[uai] = days.map((d) =>
      computeDayStatus(d, reportsByKey.get(`${uai}|${d}`) ?? [], overrideByKey.get(`${uai}|${d}`) ?? null, now),
    );
  }
  return out;
}

export const STATUS_META: Record<DisplayStatus, { label: string; short: string; emoji: string; description: string }> = {
  normal: { label: "Cours normaux", short: "Cours", emoji: "✅", description: "Le lycée est ouvert, les cours ont lieu." },
  perturbe: { label: "Perturbé", short: "Perturbé", emoji: "⚠️", description: "Filtrage, retards ou cours partiellement assurés." },
  bloque: { label: "Bloqué", short: "Bloqué", emoji: "⛔", description: "Blocus ou grève : pas de cours." },
  inconnu: { label: "Pas d'info", short: "Pas d'info", emoji: "•", description: "Aucun signalement pour ce jour." },
};

export const CONFIDENCE_META: Record<Confidence, { label: string; description: string }> = {
  officiel: { label: "Vérifié", description: "Statut validé par l'équipe de modération." },
  referent: { label: "Référent", description: "Signalé par un référent vérifié du lycée (délégué, parent, personnel)." },
  confirme: { label: "Confirmé", description: "Plusieurs signalements concordants." },
  non_confirme: { label: "Non confirmé", description: "Peu de signalements pour l'instant." },
  contradictoire: { label: "Contradictoire", description: "Les signalements ne sont pas d'accord entre eux." },
};
