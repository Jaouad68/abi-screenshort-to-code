"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { getLycee, normalize } from "@/data/lycees";
import { useMounted, useNow } from "@/lib/client/hooks";
import { longDate, timeAgo, todayParis } from "@/lib/dates";
import type { PressArticle } from "@/lib/server/news";
import { Segmented } from "@/components/day-picker";
import { IconChevronRight, IconClose, IconNews, IconSearch, IconShield } from "@/components/icons";

type Scope = "95" | "all";

const REFRESH_MS = 120_000;

/** Arrêtés nominatifs publiés par les départements voisins (semaine du 1er octobre 2026). */
const ARRETES: { label: string; url: string }[] = [
  { label: "Yvelines (78)", url: "https://www.yvelines.gouv.fr/contenu/telechargement/37976/242014/file/Arr%C3%AAt%C3%A9%20interdiction%20rassemlement%20devant%20certains%20lyc%C3%A9e%2005-10-2026V2.pdf" },
  { label: "Hauts-de-Seine (92)", url: "https://www.hauts-de-seine.gouv.fr/contenu/telechargement/29553/202991/file/2026%2010%2001%20RAA%20Cabinet%20Arr%C3%AAt%C3%A9%20pr%C3%A9fectoral%20868%20interdisant%20les%20regroupements%20aux%20abords%20de%20certains%20%C3%A9tablissements%20scolaires.pdf" },
  { label: "Seine-Saint-Denis (93)", url: "https://www.seine-saint-denis.gouv.fr/contenu/telechargement/30825/246034/file/recueil-93-2026-10-02-recueil-des-actes-administratifs.pdf" },
  { label: "Val-de-Marne (94)", url: "https://www.val-de-marne.gouv.fr/contenu/telechargement/26812/204945/file/RAA%20n%C2%B0160%20du%202%20octobre%202026.pdf" },
  { label: "Oise (60)", url: "https://www.oise.gouv.fr/contenu/telechargement/96002/689321/file/261004%20AP%20manifestation%20lyc%C3%A9es-sign%C3%A9YBP.pdf" },
  { label: "Paris (75)", url: "https://www.prefecturedepolice.interieur.gouv.fr/sites/default/files/Documents/2026_01252_02102026.pdf" },
];

const dayKey = new Intl.DateTimeFormat("fr-CA", { timeZone: "Europe/Paris" });
const timeFmt = new Intl.DateTimeFormat("fr-FR", { hour: "2-digit", minute: "2-digit", timeZone: "Europe/Paris" });

export function PresseView() {
  const [articles, setArticles] = useState<PressArticle[] | null>(null);
  const [error, setError] = useState(false);
  const [scope, setScope] = useState<Scope>("95");
  const [query, setQuery] = useState("");
  const mounted = useMounted();
  const now = useNow();

  const load = useCallback(async () => {
    try {
      const res = await fetch("/api/press", { cache: "no-store" });
      if (!res.ok) throw new Error();
      setArticles(((await res.json()) as { articles: PressArticle[] }).articles);
      setError(false);
    } catch {
      setError(true);
    }
  }, []);

  useEffect(() => {
    // Premier chargement : la veille se lance en arrière-plan, on recharge peu après si la liste est vide.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void load();
    const retry = setTimeout(() => void load(), 12_000);
    const t = setInterval(() => document.visibilityState === "visible" && void load(), REFRESH_MS);
    const onVisible = () => document.visibilityState === "visible" && void load();
    document.addEventListener("visibilitychange", onVisible);
    return () => {
      clearTimeout(retry);
      clearInterval(t);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, [load]);

  const q = normalize(query.trim());
  const filtered = useMemo(
    () => (articles ?? []).filter((a) => (scope === "all" || a.valDoise) && (!q || normalize(`${a.title} ${a.source}`).includes(q))),
    [articles, scope, q],
  );

  const groups = useMemo(() => {
    const m = new Map<string, PressArticle[]>();
    for (const a of filtered) {
      const k = dayKey.format(new Date(a.publishedAt));
      m.set(k, [...(m.get(k) ?? []), a]);
    }
    return [...m.entries()];
  }, [filtered]);

  // Lycées cités dans la semaine, du plus cité au moins cité.
  const cited = useMemo(() => {
    const count = new Map<string, number>();
    for (const a of articles ?? []) for (const u of a.uais) count.set(u, (count.get(u) ?? 0) + 1);
    return [...count.entries()].sort((a, b) => b[1] - a[1]);
  }, [articles]);

  const today = todayParis();
  const dayLabel = (k: string) => (k === today ? "Aujourd'hui" : longDate(k));

  return (
    <main className="mx-auto w-full max-w-2xl px-4 pb-32 pt-safe">
      <header className="pt-5">
        <span className="text-[13px] font-semibold uppercase tracking-wide text-label-2">Revue de presse · 7 jours</span>
        <h1 className="mt-1 font-display text-[34px] font-bold leading-tight tracking-tight">Presse</h1>
        <p className="text-[15px] text-label-2">Les articles sur la mobilisation lycéenne, mis à jour automatiquement.</p>
      </header>

      <section className="mt-5 space-y-2.5">
        <Segmented<Scope>
          value={scope}
          onChange={setScope}
          options={[
            { value: "95", label: "Val-d'Oise" },
            { value: "all", label: "Toute la France" },
          ]}
        />
        <label className="flex items-center gap-2 rounded-xl bg-fill px-3 py-2 text-label-2">
          <IconSearch width={17} height={17} />
          <input
            id="presse-q"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Rechercher un lycée, une ville, un média…"
            className="w-full bg-transparent text-[16px] text-label outline-none placeholder:text-label-2"
            type="search"
          />
          {query && (
            <button onClick={() => setQuery("")} aria-label="Effacer" className="rounded-full bg-label-3 p-0.5 text-bg">
              <IconClose width={12} height={12} strokeWidth={3} />
            </button>
          )}
        </label>
      </section>

      {cited.length > 0 && (
        <section className="mt-6">
          <h2 className="mb-2 px-1 font-display text-[20px] font-bold tracking-tight">Lycées cités</h2>
          <div className="no-scrollbar -mx-4 flex gap-2 overflow-x-auto px-4 pb-1">
            {cited.map(([uai, n]) => {
              const l = getLycee(uai);
              if (!l) return null;
              return (
                <Link key={uai} href={`/lycee/${uai}`} className="pressable shrink-0 rounded-2xl bg-card px-3.5 py-2.5 shadow-card">
                  <div className="text-[12px] font-semibold uppercase tracking-wide text-label-2">{l.commune}</div>
                  <div className="text-[15px] font-semibold">{l.nom.replace(/^Lycée (professionnel )?/, "")}</div>
                  <div className="text-[12px] text-accent">
                    {n} article{n > 1 ? "s" : ""}
                  </div>
                </Link>
              );
            })}
          </div>
        </section>
      )}

      <section className="mt-6 space-y-5" aria-live="polite">
        {articles === null && !error && (
          <div className="space-y-2">
            {[0, 1, 2].map((i) => (
              <div key={i} className="h-20 animate-pulse rounded-[22px] bg-card shadow-card" />
            ))}
          </div>
        )}
        {error && articles === null && (
          <p className="rounded-[22px] bg-card p-4 text-[15px] text-label-2 shadow-card">
            Impossible de charger la revue de presse. Vérifie ta connexion, la page réessaiera toute seule.
          </p>
        )}
        {articles && filtered.length === 0 && (
          <div className="rounded-[22px] bg-card p-6 text-center shadow-card">
            <IconNews width={32} height={32} className="mx-auto text-label-3" />
            <p className="mt-2 font-semibold">{q ? "Aucun article trouvé" : "Pas encore d'article"}</p>
            <p className="text-[14px] text-label-2">
              {q
                ? "Essaie un autre mot, ou affiche toute la France."
                : "La veille cherche de nouveaux articles en continu. Reviens dans quelques minutes."}
            </p>
          </div>
        )}
        {groups.map(([day, list]) => (
          <div key={day}>
            <h2 className="mb-1.5 px-4 text-[13px] font-semibold uppercase tracking-wide text-label-2">{dayLabel(day)}</h2>
            <ul className="overflow-hidden rounded-[22px] bg-card shadow-card">
              {list.map((a) => (
                <li key={a.id} className="border-b border-separator last:border-0">
                  <a href={a.url} target="_blank" rel="noreferrer" className="flex items-center gap-3 px-4 py-3 active:bg-fill">
                    <div className="min-w-0 flex-1">
                      <div className="text-[16px] font-semibold leading-snug">{a.title}</div>
                      <div className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 text-[13px] text-label-2">
                        <span className="tabular-nums">{timeFmt.format(new Date(a.publishedAt))}</span>
                        <span>{a.source}</span>
                        {mounted && day === today && <span>· {timeAgo(a.publishedAt, now)}</span>}
                        {a.uais.map((u) => (
                          <span key={u} className="rounded-md bg-[color-mix(in_srgb,var(--accent)_14%,transparent)] px-1.5 py-0.5 text-[12px] font-semibold text-accent">
                            {getLycee(u)?.nom.replace(/^Lycée (professionnel )?/, "")}
                          </span>
                        ))}
                      </div>
                    </div>
                    <IconChevronRight width={16} height={16} className="shrink-0 text-label-3" />
                  </a>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </section>

      <section className="mt-8">
        <details className="group rounded-[22px] bg-card shadow-card">
          <summary className="flex cursor-pointer list-none items-center gap-3 px-4 py-3.5">
            <span className="flex h-8 w-8 items-center justify-center rounded-[9px] bg-accent text-white">
              <IconShield width={18} height={18} />
            </span>
            <span className="flex-1 font-semibold">Arrêtés préfectoraux</span>
            <IconChevronRight width={16} height={16} className="text-label-3 transition-transform group-open:rotate-90" />
          </summary>
          <div className="space-y-3 border-t border-separator px-4 py-3.5 text-[14px] leading-snug text-label-2">
            <p>
              Depuis le 1er octobre, les préfets interdisent les rassemblements aux abords des lycées fermés. D&apos;après les
              extraits publiés par la presse, l&apos;arrêté du Val-d&apos;Oise vise une catégorie d&apos;établissements et ne liste
              pas les lycées un par un, contrairement à plusieurs départements voisins.
            </p>
            <div className="flex flex-wrap gap-1.5">
              {ARRETES.map((a) => (
                <a key={a.label} href={a.url} target="_blank" rel="noreferrer" className="rounded-full bg-fill px-3 py-1.5 text-[13px] font-semibold text-accent">
                  {a.label}
                </a>
              ))}
            </div>
            <p className="text-[12px] text-label-3">
              Pour le 95 : recueil des actes administratifs sur val-doise.gouv.fr et le compte X @Prefet95.
            </p>
          </div>
        </details>
      </section>

      <p className="mt-6 px-4 text-center text-[12px] leading-relaxed text-label-3">
        Titres et liens issus de Google Actualités. Les articles appartiennent à leurs médias ; certains sont réservés aux abonnés.
      </p>
    </main>
  );
}
