"use client";

import { useCallback, useEffect, useState } from "react";
import { getLycee, LYCEES } from "@/data/lycees";
import { IconBadge, IconBell, IconNews } from "@/components/icons";

type Notify = (msg: string, tone?: "success" | "error") => void;

interface Referent {
  id: string;
  uai: string;
  label: string;
  createdAt: string;
  revokedAt: string | null;
}

/** Création et révocation des codes référents. */
export function ReferentsSection({ notify, onUnauthorized }: { notify: Notify; onUnauthorized: () => void }) {
  const [referents, setReferents] = useState<Referent[]>([]);
  const [uai, setUai] = useState(LYCEES[0].uai);
  const [label, setLabel] = useState("");
  const [created, setCreated] = useState<{ code: string; uai: string; label: string } | null>(null);

  const load = useCallback(async () => {
    const res = await fetch("/api/admin/referents");
    if (res.status === 401) return onUnauthorized();
    // Tableau vide si la table n'existe pas encore (supabase/v2.sql non exécuté).
    setReferents(((await res.json().catch(() => ({}))) as { referents?: Referent[] }).referents ?? []);
  }, [onUnauthorized]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void load();
  }, [load]);

  const create = async (e: React.FormEvent) => {
    e.preventDefault();
    const res = await fetch("/api/admin/referents", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ uai, label }),
    });
    const json = (await res.json().catch(() => ({}))) as { error?: string; code?: string; referent?: Referent };
    if (!res.ok || !json.code || !json.referent) return notify(json.error ?? "Erreur", "error");
    setCreated({ code: json.code, uai: json.referent.uai, label: json.referent.label });
    setLabel("");
    void load();
  };

  const revoke = async (id: string) => {
    const res = await fetch(`/api/admin/referents?id=${id}`, { method: "DELETE" });
    if (!res.ok) return notify("Erreur", "error");
    notify("Référent désactivé");
    void load();
  };

  const active = referents.filter((r) => !r.revokedAt);

  return (
    <section>
      <h2 className="mb-2 flex items-center gap-2 px-1 font-display text-[22px] font-bold">
        <IconBadge width={22} height={22} className="text-accent" /> Référents vérifiés
      </h2>
      <form onSubmit={create} className="space-y-3 rounded-[22px] bg-card p-4 shadow-card">
        <select value={uai} onChange={(e) => setUai(e.target.value)} className="w-full rounded-xl bg-fill px-3 py-2.5 text-[16px] outline-none">
          {LYCEES.map((l) => (
            <option key={l.uai} value={l.uai}>
              {l.commune} · {l.nom}
            </option>
          ))}
        </select>
        <input
          value={label}
          onChange={(e) => setLabel(e.target.value)}
          maxLength={60}
          placeholder="Rôle, ex. « Déléguée CVL » ou « Parent élu »"
          className="w-full rounded-xl bg-fill px-3 py-2.5 text-[16px] outline-none"
        />
        <button disabled={label.trim().length < 2} className="pressable w-full rounded-xl bg-accent py-3 font-semibold text-white disabled:opacity-40">
          Créer un code d&apos;accès
        </button>
      </form>

      {created && (
        <div className="mt-3 animate-pop rounded-[22px] border-2 border-accent bg-card p-4 shadow-card">
          <div className="text-[13px] font-semibold uppercase tracking-wide text-accent">Code à transmettre</div>
          <div className="mt-1 select-all font-mono text-[30px] font-bold tracking-[0.15em]">{created.code}</div>
          <p className="mt-1 text-[13px] leading-snug text-label-2">
            {created.label} · {getLycee(created.uai)?.nom}. Ce code ne sera plus affiché : transmets-le maintenant. Le référent
            l&apos;active sur la page <b>/referent</b>.
          </p>
          <button
            onClick={() => {
              void navigator.clipboard?.writeText(created.code);
              notify("Code copié");
            }}
            className="pressable mt-2 rounded-full bg-fill px-4 py-2 text-[14px] font-semibold"
          >
            Copier
          </button>
        </div>
      )}

      {active.length > 0 && (
        <ul className="mt-3 overflow-hidden rounded-[22px] bg-card shadow-card">
          {active.map((r) => (
            <li key={r.id} className="flex items-center gap-3 border-b border-separator px-4 py-3 last:border-0">
              <div className="min-w-0 flex-1">
                <div className="truncate font-semibold">{r.label}</div>
                <div className="truncate text-[13px] text-label-2">{getLycee(r.uai)?.nom ?? r.uai}</div>
              </div>
              <button onClick={() => revoke(r.id)} className="pressable rounded-full bg-fill px-3 py-1.5 text-[13px] font-semibold text-bloque">
                Désactiver
              </button>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

/** État des notifications push et génération des clés VAPID. */
export function PushSection({ notify, onUnauthorized }: { notify: Notify; onUnauthorized: () => void }) {
  const [status, setStatus] = useState<{ configured: boolean; subscriptions: number } | null>(null);
  const [keys, setKeys] = useState<{ publicKey: string; privateKey: string } | null>(null);

  useEffect(() => {
    void fetch("/api/admin/push").then(async (res) => {
      if (res.status === 401) return onUnauthorized();
      setStatus((await res.json()) as { configured: boolean; subscriptions: number });
    });
  }, [onUnauthorized]);

  const generate = async () => {
    const res = await fetch("/api/admin/push", { method: "POST" });
    if (!res.ok) return notify("Erreur", "error");
    setKeys((await res.json()) as { publicKey: string; privateKey: string });
  };

  const copy = (v: string) => {
    void navigator.clipboard?.writeText(v);
    notify("Copié");
  };

  return (
    <section>
      <h2 className="mb-2 flex items-center gap-2 px-1 font-display text-[22px] font-bold">
        <IconBell width={22} height={22} className="text-accent" /> Notifications
      </h2>
      <div className="rounded-[22px] bg-card p-4 shadow-card">
        {status === null ? (
          <p className="text-label-2">Chargement…</p>
        ) : status.configured ? (
          <p className="text-[15px]">
            <span className="font-semibold text-normal">● Actives</span> · {status.subscriptions} appareil
            {status.subscriptions > 1 ? "s" : ""} abonné{status.subscriptions > 1 ? "s" : ""}
          </p>
        ) : (
          <>
            <p className="text-[15px] leading-snug">
              <span className="font-semibold text-perturbe">● Non configurées.</span> Génère une paire de clés, puis ajoute-les
              dans Vercel (Settings → Environment Variables) et redéploie.
            </p>
            {!keys ? (
              <button onClick={generate} className="pressable mt-3 rounded-xl bg-accent px-4 py-2.5 font-semibold text-white">
                Générer les clés
              </button>
            ) : (
              <div className="mt-3 space-y-2">
                {[
                  ["NEXT_PUBLIC_VAPID_PUBLIC_KEY", keys.publicKey],
                  ["VAPID_PRIVATE_KEY", keys.privateKey],
                ].map(([name, value]) => (
                  <div key={name} className="rounded-xl bg-fill p-3">
                    <div className="font-mono text-[12px] font-semibold text-label-2">{name}</div>
                    <div className="mt-1 break-all font-mono text-[13px]">{value}</div>
                    <button onClick={() => copy(value)} className="mt-1.5 text-[13px] font-semibold text-accent">
                      Copier
                    </button>
                  </div>
                ))}
                <p className="text-[12px] leading-snug text-label-3">
                  Ces clés ne sont enregistrées nulle part : copie-les maintenant. La clé privée doit rester secrète.
                </p>
              </div>
            )}
          </>
        )}
      </div>
    </section>
  );
}

interface Mention {
  id: string;
  uai: string;
  title: string;
  url: string;
  source: string;
  publishedAt: string;
  hidden: boolean;
}

/** Veille presse : articles détectés, à valider (statut vérifié) ou à masquer. */
export function NewsSection({ day, notify, onUnauthorized }: { day: string; notify: Notify; onUnauthorized: () => void }) {
  const [mentions, setMentions] = useState<Mention[] | null>(null);
  const [ready, setReady] = useState(true);
  const [scanning, setScanning] = useState(false);

  const load = useCallback(async () => {
    const res = await fetch("/api/admin/news");
    if (res.status === 401) return onUnauthorized();
    const json = (await res.json().catch(() => ({}))) as { mentions?: Mention[]; ready?: boolean };
    setMentions(json.mentions ?? []);
    setReady(json.ready !== false);
  }, [onUnauthorized]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void load();
  }, [load]);

  const scan = async () => {
    setScanning(true);
    const res = await fetch("/api/admin/news", { method: "POST" });
    setScanning(false);
    const json = (await res.json().catch(() => ({}))) as { error?: string; articles?: number; mentions?: number; errors?: string[] };
    if (!res.ok) return notify(json.error ?? "Veille impossible", "error");
    notify(`${json.articles ?? 0} article(s) récent(s), ${json.mentions ?? 0} lié(s) à un lycée${json.errors?.length ? " (sources en erreur)" : ""}`);
    void load();
  };

  const setHidden = async (id: string, hidden: boolean) => {
    const res = await fetch("/api/admin/news", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, hidden }),
    });
    if (!res.ok) return notify("Erreur", "error");
    void load();
  };

  const publish = async (uai: string, status: "bloque" | "perturbe", source: string) => {
    const res = await fetch("/api/admin/overrides", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ uai, date: day, status, note: `Selon ${source}` }),
    });
    if (!res.ok) return notify("Erreur", "error");
    notify("Statut vérifié publié");
  };

  return (
    <section>
      <div className="mb-2 flex items-center justify-between px-1">
        <h2 className="flex items-center gap-2 font-display text-[22px] font-bold">
          <IconNews width={22} height={22} className="text-accent" /> Veille presse
        </h2>
        <button onClick={scan} disabled={scanning || !ready} className="pressable rounded-full bg-fill px-3 py-1.5 text-[13px] font-semibold disabled:opacity-40">
          {scanning ? "Recherche…" : "Lancer maintenant"}
        </button>
      </div>
      {!ready ? (
        <p className="rounded-[22px] bg-card p-4 text-[14px] text-label-2 shadow-card">
          Exécute <b>supabase/v3.sql</b> dans Supabase pour activer la veille presse.
        </p>
      ) : mentions === null ? (
        <p className="px-1 text-label-2">Chargement…</p>
      ) : mentions.length === 0 ? (
        <p className="rounded-[22px] bg-card p-4 text-[14px] text-label-2 shadow-card">
          Aucun article sur un lycée précis ces 3 derniers jours. La veille tourne automatiquement toutes les 15 minutes.
        </p>
      ) : (
        <ul className="overflow-hidden rounded-[22px] bg-card shadow-card">
          {mentions.map((m) => (
            <li key={m.id} className={`border-b border-separator px-4 py-3 last:border-0 ${m.hidden ? "opacity-45" : ""}`}>
              <div className="text-[13px] font-semibold text-accent">{getLycee(m.uai)?.nom ?? m.uai}</div>
              <a href={m.url} target="_blank" rel="noreferrer" className="mt-0.5 block text-[15px] font-semibold leading-snug">
                {m.title}
              </a>
              <div className="mt-0.5 text-[12px] text-label-2">
                {m.source} · {new Date(m.publishedAt).toLocaleString("fr-FR", { dateStyle: "short", timeStyle: "short" })}
              </div>
              <div className="mt-2 flex flex-wrap gap-1.5">
                {!m.hidden && (
                  <>
                    <button onClick={() => publish(m.uai, "bloque", m.source)} className="pressable rounded-full bg-[color-mix(in_srgb,var(--bloque)_15%,transparent)] px-3 py-1.5 text-[13px] font-semibold text-bloque">
                      Publier « Bloqué »
                    </button>
                    <button onClick={() => publish(m.uai, "perturbe", m.source)} className="pressable rounded-full bg-[color-mix(in_srgb,var(--perturbe)_18%,transparent)] px-3 py-1.5 text-[13px] font-semibold text-perturbe">
                      Publier « Perturbé »
                    </button>
                  </>
                )}
                <button onClick={() => setHidden(m.id, !m.hidden)} className="pressable rounded-full bg-fill px-3 py-1.5 text-[13px] font-semibold">
                  {m.hidden ? "Réafficher" : "Masquer (hors sujet)"}
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}
      <p className="mt-2 px-2 text-[12px] leading-snug text-label-3">
        Les boutons « Publier » s&apos;appliquent au jour sélectionné ({day}). Vérifie toujours l&apos;article avant de publier.
      </p>
    </section>
  );
}
