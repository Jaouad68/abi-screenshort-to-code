"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { getLycee, LYCEES } from "@/data/lycees";
import { useNow } from "@/lib/client/hooks";
import { addDays, longDate, timeAgo, weekdayIndex } from "@/lib/dates";
import { STATUS_META, type Override, type Report, type Status } from "@/lib/status";
import { IconChevronLeft, IconShield, IconTrash } from "@/components/icons";
import { Toast } from "@/components/sheet";
import { StatusIcon, StatusPill } from "@/components/status";
import { NewsSection, PushSection, ReferentsSection } from "./admin-sections";

type AdminReport = Report & { deviceId: string };

export function AdminView({
  authed: initialAuthed,
  enabled,
  mode,
  today,
}: {
  authed: boolean;
  enabled: boolean;
  mode: "supabase" | "demo";
  today: string;
}) {
  const [authed, setAuthed] = useState(initialAuthed);
  const [toast, setToast] = useState<{ msg: string; tone: "success" | "error" } | null>(null);
  const closeToast = useCallback(() => setToast(null), []);

  return (
    <main className="mx-auto w-full max-w-3xl px-4 pb-20 pt-safe">
      <div className="flex items-center justify-between pt-3">
        <Link href="/" className="pressable -ml-2 flex items-center gap-0.5 rounded-full px-2 py-1.5 text-[17px] font-medium text-accent">
          <IconChevronLeft width={22} height={22} strokeWidth={2.5} />
          Lycées
        </Link>
        {authed && (
          <button
            onClick={async () => {
              await fetch("/api/admin/logout", { method: "POST" });
              setAuthed(false);
            }}
            className="text-[15px] font-medium text-accent"
          >
            Se déconnecter
          </button>
        )}
      </div>
      <h1 className="mt-2 flex items-center gap-2 font-display text-[34px] font-bold tracking-tight">
        <IconShield width={30} height={30} className="text-accent" /> Modération
      </h1>
      {mode === "demo" && (
        <p className="mt-2 rounded-2xl bg-[color-mix(in_srgb,var(--perturbe)_18%,transparent)] px-4 py-3 text-[14px]">
          <b>Mode démo :</b> Supabase n&apos;est pas configuré, les données sont gardées en mémoire et perdues au redémarrage.
        </p>
      )}

      {!enabled ? (
        <p className="mt-6 text-label-2">L&apos;espace admin est désactivé : définis la variable ADMIN_PASSWORD.</p>
      ) : authed ? (
        <Dashboard today={today} notify={(msg, tone = "success") => setToast({ msg, tone })} onUnauthorized={() => setAuthed(false)} />
      ) : (
        <Login onSuccess={() => setAuthed(true)} />
      )}

      <Toast message={toast?.msg ?? null} tone={toast?.tone} onDone={closeToast} />
    </main>
  );
}

function Login({ onSuccess }: { onSuccess: () => void }) {
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  return (
    <form
      className="mt-6 max-w-sm space-y-3"
      onSubmit={async (e) => {
        e.preventDefault();
        setBusy(true);
        setError(null);
        const res = await fetch("/api/admin/login", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ password }),
        });
        setBusy(false);
        if (res.ok) onSuccess();
        else setError(((await res.json().catch(() => ({}))) as { error?: string }).error ?? "Erreur");
      }}
    >
      <input
        type="password"
        autoComplete="current-password"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        placeholder="Mot de passe administrateur"
        className="w-full rounded-xl bg-card px-4 py-3 text-[16px] shadow-card outline-none focus:ring-2 focus:ring-accent"
      />
      {error && <p className="text-[14px] text-bloque">{error}</p>}
      <button disabled={busy || !password} className="pressable w-full rounded-xl bg-accent py-3 font-semibold text-white disabled:opacity-50">
        {busy ? "Connexion…" : "Se connecter"}
      </button>
    </form>
  );
}

function Dashboard({
  today,
  notify,
  onUnauthorized,
}: {
  today: string;
  notify: (msg: string, tone?: "success" | "error") => void;
  onUnauthorized: () => void;
}) {
  const [reports, setReports] = useState<AdminReport[] | null>(null);
  const [overrides, setOverrides] = useState<Override[]>([]);
  const now = useNow();

  const load = useCallback(async () => {
    const [r, o] = await Promise.all([fetch("/api/admin/reports"), fetch("/api/admin/overrides")]);
    if (r.status === 401 || o.status === 401) return onUnauthorized();
    setReports(((await r.json()) as { reports: AdminReport[] }).reports);
    setOverrides(((await o.json()) as { overrides: Override[] }).overrides);
  }, [onUnauthorized]);

  useEffect(() => {
    // Chargement initial puis rafraîchissement régulier de la file de modération.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void load();
    const t = setInterval(load, 15_000);
    return () => clearInterval(t);
  }, [load]);

  const call = async (url: string, init: RequestInit, ok: string) => {
    const res = await fetch(url, init);
    if (res.status === 401) return onUnauthorized();
    if (!res.ok) return notify(((await res.json().catch(() => ({}))) as { error?: string }).error ?? "Erreur", "error");
    notify(ok);
    void load();
  };

  // Formulaire de décision officielle
  const [uai, setUai] = useState(LYCEES[0].uai);
  const [date, setDate] = useState(weekdayIndex(today) === 6 ? addDays(today, 1) : today);
  const [status, setStatus] = useState<Status>("bloque");
  const [note, setNote] = useState("");

  return (
    <div className="mt-6 space-y-8">
      <section>
        <h2 className="mb-2 px-1 font-display text-[22px] font-bold">Publier un statut vérifié</h2>
        <form
          className="space-y-3 rounded-[22px] bg-card p-4 shadow-card"
          onSubmit={(e) => {
            e.preventDefault();
            void call(
              "/api/admin/overrides",
              { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ uai, date, status, note }) },
              "Statut vérifié publié",
            );
            setNote("");
          }}
        >
          <select value={uai} onChange={(e) => setUai(e.target.value)} className="w-full rounded-xl bg-fill px-3 py-2.5 text-[16px] outline-none">
            {LYCEES.map((l) => (
              <option key={l.uai} value={l.uai}>
                {l.commune} · {l.nom}
              </option>
            ))}
          </select>
          <div className="grid grid-cols-2 gap-3">
            <input
              type="date"
              value={date}
              min={addDays(today, -1)}
              onChange={(e) => setDate(e.target.value)}
              className="w-full rounded-xl bg-fill px-3 py-2.5 text-[16px] outline-none"
            />
            <select
              value={status}
              onChange={(e) => setStatus(e.target.value as Status)}
              className="w-full rounded-xl bg-fill px-3 py-2.5 text-[16px] outline-none"
            >
              {(["normal", "perturbe", "bloque"] as const).map((s) => (
                <option key={s} value={s}>
                  {STATUS_META[s].label}
                </option>
              ))}
            </select>
          </div>
          <input
            value={note}
            onChange={(e) => setNote(e.target.value)}
            maxLength={280}
            placeholder="Note visible par tous (facultatif), ex. « Confirmé par la vie scolaire »"
            className="w-full rounded-xl bg-fill px-3 py-2.5 text-[16px] outline-none"
          />
          <button className="pressable w-full rounded-xl bg-accent py-3 font-semibold text-white">Publier</button>
        </form>

        {overrides.length > 0 && (
          <ul className="mt-3 overflow-hidden rounded-[22px] bg-card shadow-card">
            {overrides.map((o) => (
              <li key={`${o.uai}|${o.date}`} className="flex items-center gap-3 border-b border-separator px-4 py-3 last:border-0">
                <StatusIcon status={o.status} size={30} />
                <div className="min-w-0 flex-1">
                  <div className="truncate font-semibold">{getLycee(o.uai)?.nom ?? o.uai}</div>
                  <div className="truncate text-[13px] text-label-2">
                    {longDate(o.date)}
                    {o.note ? ` · ${o.note}` : ""}
                  </div>
                </div>
                <button
                  aria-label="Retirer le statut vérifié"
                  onClick={() =>
                    call(`/api/admin/overrides?uai=${o.uai}&date=${o.date}`, { method: "DELETE" }, "Statut vérifié retiré")
                  }
                  className="pressable rounded-full p-2 text-bloque"
                >
                  <IconTrash width={18} height={18} />
                </button>
              </li>
            ))}
          </ul>
        )}
      </section>

      <NewsSection day={date} notify={notify} onUnauthorized={onUnauthorized} />
      <ReferentsSection notify={notify} onUnauthorized={onUnauthorized} />
      <PushSection notify={notify} onUnauthorized={onUnauthorized} />

      <section>
        <h2 className="mb-2 px-1 font-display text-[22px] font-bold">Derniers signalements</h2>
        {reports === null ? (
          <p className="px-1 text-label-2">Chargement…</p>
        ) : reports.length === 0 ? (
          <p className="px-1 text-label-2">Aucun signalement pour l&apos;instant.</p>
        ) : (
          <ul className="overflow-hidden rounded-[22px] bg-card shadow-card">
            {reports.map((r) => (
              <li key={r.id} className="flex items-center gap-3 border-b border-separator px-4 py-3 last:border-0">
                <div className="min-w-0 flex-1">
                  <div className="truncate font-semibold">{getLycee(r.uai)?.nom ?? r.uai}</div>
                  <div className="truncate text-[13px] text-label-2">
                    {r.referent ? "Référent · " : ""}Pour {longDate(r.date).toLowerCase()} · {timeAgo(r.createdAt, now)} · appareil{" "}
                    {r.deviceId.slice(0, 6)}
                  </div>
                </div>
                <StatusPill status={r.status} />
                <button
                  aria-label="Supprimer le signalement"
                  onClick={() => call(`/api/admin/reports?id=${r.id}`, { method: "DELETE" }, "Signalement supprimé")}
                  className="pressable rounded-full p-2 text-bloque"
                >
                  <IconTrash width={18} height={18} />
                </button>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
