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
  referentId: string | null;
}

export interface AdminReport extends Report {
  deviceId: string;
}

export interface Referent {
  id: string;
  uai: string;
  label: string;
  createdAt: string;
  revokedAt: string | null;
}

export interface PushSubscriptionRecord {
  endpoint: string;
  p256dh: string;
  auth: string;
  uais: string[];
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

  createReferent(r: { uai: string; label: string; codeHash: string }): Promise<Referent>;
  listReferents(): Promise<Referent[]>;
  revokeReferent(id: string): Promise<void>;
  findReferentByCodeHash(codeHash: string): Promise<Referent | null>;
  getReferent(id: string): Promise<Referent | null>;

  upsertSubscription(s: PushSubscriptionRecord): Promise<void>;
  deleteSubscription(endpoint: string): Promise<void>;
  listSubscriptionsFor(uai: string): Promise<PushSubscriptionRecord[]>;
  countSubscriptions(): Promise<number>;

  /** Dernier statut ayant fait l'objet d'une notification push (évite les doublons). */
  getNotified(uai: string, date: string): Promise<Status | null>;
  setNotified(uai: string, date: string, status: Status): Promise<void>;
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
  referent_id: string | null;
  created_at: string;
}

interface OverrideRow {
  uai: string;
  day: string;
  status: Status;
  note: string | null;
  updated_at: string;
}

interface ReferentRow {
  id: string;
  uai: string;
  label: string;
  created_at: string;
  revoked_at: string | null;
}

const REPORT_COLS = "id, uai, day, status, device_id, referent_id, created_at";

const toReport = (r: ReportRow): AdminReport => ({
  id: r.id,
  uai: r.uai,
  date: r.day,
  status: r.status,
  createdAt: r.created_at,
  referent: Boolean(r.referent_id),
  deviceId: r.device_id,
});

const toOverride = (o: OverrideRow): Override => ({
  uai: o.uai,
  date: o.day,
  status: o.status,
  note: o.note,
  updatedAt: o.updated_at,
});

const toReferent = (r: ReferentRow): Referent => ({
  id: r.id,
  uai: r.uai,
  label: r.label,
  createdAt: r.created_at,
  revokedAt: r.revoked_at,
});

function supabaseStore(db: SupabaseClient): Store {
  const check = <T>(res: { data: T; error: { message: string } | null }): T => {
    if (res.error) throw new Error(`Supabase : ${res.error.message}`);
    return res.data;
  };

  return {
    mode: "supabase",

    async listReports(from, to) {
      const rows = check(await db.from("reports").select(REPORT_COLS).gte("day", from).lte("day", to).limit(20000)) as ReportRow[];
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
            referent_id: r.referentId,
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
        await db.from("reports").select(REPORT_COLS).order("created_at", { ascending: false }).limit(limit),
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

    async createReferent(r) {
      const rows = check(
        await db.from("referents").insert({ uai: r.uai, label: r.label, code_hash: r.codeHash }).select("id, uai, label, created_at, revoked_at"),
      ) as ReferentRow[];
      return toReferent(rows[0]);
    },

    async listReferents() {
      const rows = check(
        await db.from("referents").select("id, uai, label, created_at, revoked_at").order("created_at", { ascending: false }),
      ) as ReferentRow[];
      return rows.map(toReferent);
    },

    async revokeReferent(id) {
      check(await db.from("referents").update({ revoked_at: new Date().toISOString() }).eq("id", id));
    },

    async findReferentByCodeHash(codeHash) {
      const rows = check(
        await db.from("referents").select("id, uai, label, created_at, revoked_at").eq("code_hash", codeHash).limit(1),
      ) as ReferentRow[];
      return rows[0] ? toReferent(rows[0]) : null;
    },

    async getReferent(id) {
      const rows = check(await db.from("referents").select("id, uai, label, created_at, revoked_at").eq("id", id).limit(1)) as ReferentRow[];
      return rows[0] ? toReferent(rows[0]) : null;
    },

    async upsertSubscription(s) {
      check(
        await db
          .from("push_subscriptions")
          .upsert({ endpoint: s.endpoint, p256dh: s.p256dh, auth: s.auth, uais: s.uais, updated_at: new Date().toISOString() }, { onConflict: "endpoint" }),
      );
    },

    async deleteSubscription(endpoint) {
      check(await db.from("push_subscriptions").delete().eq("endpoint", endpoint));
    },

    async listSubscriptionsFor(uai) {
      const rows = check(await db.from("push_subscriptions").select("endpoint, p256dh, auth, uais").contains("uais", [uai])) as PushSubscriptionRecord[];
      return rows;
    },

    async countSubscriptions() {
      const res = await db.from("push_subscriptions").select("endpoint", { count: "exact", head: true });
      if (res.error) throw new Error(`Supabase : ${res.error.message}`);
      return res.count ?? 0;
    },

    async getNotified(uai, date) {
      const rows = check(await db.from("notified").select("status").eq("uai", uai).eq("day", date).limit(1)) as { status: Status }[];
      return rows[0]?.status ?? null;
    },

    async setNotified(uai, date, status) {
      check(await db.from("notified").upsert({ uai, day: date, status, updated_at: new Date().toISOString() }, { onConflict: "uai,day" }));
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
  const referents: (Referent & { codeHash: string })[] = [];
  const subscriptions = new Map<string, PushSubscriptionRecord>();
  const notified = new Map<string, Status>();
  const strip = ({ codeHash: _omit, ...r }: Referent & { codeHash: string }): Referent => {
    void _omit;
    return r;
  };

  return {
    mode: "demo",

    async listReports(from, to) {
      return reports
        .filter((r) => r.date >= from && r.date <= to)
        .map(({ id, uai, date, status, createdAt, referent }) => ({ id, uai, date, status, createdAt, referent }));
    },

    async listOverrides(from, to) {
      return [...overrides.values()].filter((o) => o.date >= from && o.date <= to);
    },

    async upsertReport({ referentId, ...r }) {
      const i = reports.findIndex((x) => x.uai === r.uai && x.date === r.date && x.deviceId === r.deviceId);
      if (i >= 0) reports.splice(i, 1);
      reports.push({ ...r, referent: Boolean(referentId), id: crypto.randomUUID(), createdAt: new Date().toISOString() });
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

    async createReferent({ uai, label, codeHash }) {
      const r = { id: crypto.randomUUID(), uai, label, codeHash, createdAt: new Date().toISOString(), revokedAt: null };
      referents.unshift(r);
      return strip(r);
    },

    async listReferents() {
      return referents.map(strip);
    },

    async revokeReferent(id) {
      const r = referents.find((x) => x.id === id);
      if (r) r.revokedAt = new Date().toISOString();
    },

    async findReferentByCodeHash(codeHash) {
      const r = referents.find((x) => x.codeHash === codeHash);
      return r ? strip(r) : null;
    },

    async getReferent(id) {
      const r = referents.find((x) => x.id === id);
      return r ? strip(r) : null;
    },

    async upsertSubscription(s) {
      subscriptions.set(s.endpoint, s);
    },

    async deleteSubscription(endpoint) {
      subscriptions.delete(endpoint);
    },

    async listSubscriptionsFor(uai) {
      return [...subscriptions.values()].filter((s) => s.uais.includes(uai));
    },

    async countSubscriptions() {
      return subscriptions.size;
    },

    async getNotified(uai, date) {
      return notified.get(`${uai}|${date}`) ?? null;
    },

    async setNotified(uai, date, status) {
      notified.set(`${uai}|${date}`, status);
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
