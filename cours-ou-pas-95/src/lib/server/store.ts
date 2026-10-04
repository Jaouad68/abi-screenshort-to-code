import "server-only";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import type { Override, Report, Status } from "@/lib/status";

/**
 * Accès aux données.
 *
 * - Si SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY sont définies : Supabase
 *   (production).
 * - Sinon : mode démo en mémoire, pratique pour développer en local
 *   (les données sont perdues au redémarrage).
 */

export interface NewReport {
  uai: string;
  date: string;
  status: Status;
  deviceId: string;
  ipHash: string;
}

export interface AdminReport extends Report {
  deviceId: string;
}

export interface Store {
  mode: "supabase" | "demo";
  listReports(from: string, to: string): Promise<Report[]>;
  listOverrides(from: string, to: string): Promise<Override[]>;
  /** Un appareil = un signalement par lycée et par jour (le dernier remplace le précédent). */
  upsertReport(r: NewReport): Promise<void>;
  countRecentByIp(ipHash: string, sinceIso: string): Promise<number>;
  listRecentReports(limit: number): Promise<AdminReport[]>;
  deleteReport(id: string): Promise<{ uai: string; date: string } | null>;
  upsertOverride(o: Omit<Override, "updatedAt">): Promise<void>;
  deleteOverride(uai: string, date: string): Promise<void>;
  listAllOverrides(fromDate: string): Promise<Override[]>;
  /** Prévient les clients connectés qu'un statut a changé (temps réel). */
  notify(uai: string, date: string): Promise<void>;
}

/* ------------------------------------------------------------------------ */
/* Supabase                                                                  */
/* ------------------------------------------------------------------------ */

interface ReportRow {
  id: string;
  uai: string;
  day: string;
  status: Status;
  device_id: string;
  created_at: string;
}

interface OverrideRow {
  uai: string;
  day: string;
  status: Status;
  note: string | null;
  updated_at: string;
}

const toReport = (r: ReportRow): AdminReport => ({
  id: r.id,
  uai: r.uai,
  date: r.day,
  status: r.status,
  createdAt: r.created_at,
  deviceId: r.device_id,
});

const toOverride = (o: OverrideRow): Override => ({
  uai: o.uai,
  date: o.day,
  status: o.status,
  note: o.note,
  updatedAt: o.updated_at,
});

function supabaseStore(db: SupabaseClient): Store {
  const check = <T>(res: { data: T; error: { message: string } | null }): T => {
    if (res.error) throw new Error(`Supabase : ${res.error.message}`);
    return res.data;
  };

  return {
    mode: "supabase",

    async listReports(from, to) {
      const rows = check(
        await db.from("reports").select("id, uai, day, status, device_id, created_at").gte("day", from).lte("day", to).limit(20000),
      ) as ReportRow[];
      return rows.map((r) => {
        const { deviceId: _omit, ...rest } = toReport(r);
        void _omit;
        return rest;
      });
    },

    async listOverrides(from, to) {
      const rows = check(await db.from("overrides").select("*").gte("day", from).lte("day", to)) as OverrideRow[];
      return rows.map(toOverride);
    },

    async upsertReport(r) {
      check(
        await db.from("reports").upsert(
          {
            uai: r.uai,
            day: r.date,
            status: r.status,
            device_id: r.deviceId,
            ip_hash: r.ipHash,
            created_at: new Date().toISOString(),
          },
          { onConflict: "uai,day,device_id" },
        ),
      );
    },

    async countRecentByIp(ipHash, sinceIso) {
      const res = await db.from("reports").select("id", { count: "exact", head: true }).eq("ip_hash", ipHash).gte("created_at", sinceIso);
      if (res.error) throw new Error(`Supabase : ${res.error.message}`);
      return res.count ?? 0;
    },

    async listRecentReports(limit) {
      const rows = check(
        await db.from("reports").select("id, uai, day, status, device_id, created_at").order("created_at", { ascending: false }).limit(limit),
      ) as ReportRow[];
      return rows.map(toReport);
    },

    async deleteReport(id) {
      const rows = check(await db.from("reports").delete().eq("id", id).select("uai, day")) as { uai: string; day: string }[];
      return rows[0] ? { uai: rows[0].uai, date: rows[0].day } : null;
    },

    async upsertOverride(o) {
      check(
        await db
          .from("overrides")
          .upsert({ uai: o.uai, day: o.date, status: o.status, note: o.note, updated_at: new Date().toISOString() }, { onConflict: "uai,day" }),
      );
    },

    async deleteOverride(uai, date) {
      check(await db.from("overrides").delete().eq("uai", uai).eq("day", date));
    },

    async listAllOverrides(fromDate) {
      const rows = check(await db.from("overrides").select("*").gte("day", fromDate).order("day")) as OverrideRow[];
      return rows.map(toOverride);
    },

    async notify(uai, date) {
      // Les clients sont abonnés (Supabase Realtime) aux insertions dans cette table.
      check(await db.from("updates").insert({ uai, day: date }));
    },
  };
}

/* ------------------------------------------------------------------------ */
/* Mode démo (mémoire)                                                       */
/* ------------------------------------------------------------------------ */

interface MemReport extends AdminReport {
  ipHash: string;
}

function memoryStore(): Store {
  const reports: MemReport[] = [];
  const overrides = new Map<string, Override>();

  return {
    mode: "demo",

    async listReports(from, to) {
      return reports
        .filter((r) => r.date >= from && r.date <= to)
        .map(({ id, uai, date, status, createdAt }) => ({ id, uai, date, status, createdAt }));
    },

    async listOverrides(from, to) {
      return [...overrides.values()].filter((o) => o.date >= from && o.date <= to);
    },

    async upsertReport(r) {
      const i = reports.findIndex((x) => x.uai === r.uai && x.date === r.date && x.deviceId === r.deviceId);
      if (i >= 0) reports.splice(i, 1);
      reports.push({ ...r, id: crypto.randomUUID(), createdAt: new Date().toISOString() });
    },

    async countRecentByIp(ipHash, sinceIso) {
      return reports.filter((r) => r.ipHash === ipHash && r.createdAt >= sinceIso).length;
    },

    async listRecentReports(limit) {
      return [...reports]
        .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
        .slice(0, limit)
        .map(({ ipHash: _omit, ...r }) => {
          void _omit;
          return r;
        });
    },

    async deleteReport(id) {
      const i = reports.findIndex((r) => r.id === id);
      if (i < 0) return null;
      const [r] = reports.splice(i, 1);
      return { uai: r.uai, date: r.date };
    },

    async upsertOverride(o) {
      overrides.set(`${o.uai}|${o.date}`, { ...o, updatedAt: new Date().toISOString() });
    },

    async deleteOverride(uai, date) {
      overrides.delete(`${uai}|${date}`);
    },

    async listAllOverrides(fromDate) {
      return [...overrides.values()].filter((o) => o.date >= fromDate).sort((a, b) => a.date.localeCompare(b.date));
    },

    async notify() {
      // En mode démo, les clients rafraîchissent régulièrement (polling).
    },
  };
}

/* ------------------------------------------------------------------------ */

const globalForStore = globalThis as unknown as { __coursOuPasStore?: Store };

export function getStore(): Store {
  if (!globalForStore.__coursOuPasStore) {
    const url = process.env.SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL;
    const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
    globalForStore.__coursOuPasStore =
      url && key ? supabaseStore(createClient(url, key, { auth: { persistSession: false } })) : memoryStore();
  }
  return globalForStore.__coursOuPasStore;
}
