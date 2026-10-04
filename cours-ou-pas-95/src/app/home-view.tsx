"use client";

import Link from "next/link";
import { useDeferredValue, useEffect, useMemo, useState } from "react";
import { COMMUNES, LYCEES, normalize, voiesLabel, type Lycee } from "@/data/lycees";
import { dayOf, useFavorites, useMounted, useWeek } from "@/lib/client/hooks";
import { addDays, dayMonth, longDate, mondayOf, relativeDayLabel, weekDays } from "@/lib/dates";
import { STATUS_META, type DisplayStatus } from "@/lib/status";
import { DayPicker, Segmented } from "@/components/day-picker";
import { IconChevronRight, IconClose, IconSearch, IconStar } from "@/components/icons";
import { LiveIndicator } from "@/components/live";
import { STATUS_COLOR, StatusIcon, StatusPill } from "@/components/status";

type WeekChoice = "this" | "next";

const TILE_LABEL = { bloque: "Bloqués", perturbe: "Perturbés", normal: "Normaux" } as const;

export function HomeView({ today, thisWeek, initialDay }: { today: string; thisWeek: string; initialDay: string }) {
  const [day, setDay] = useState(initialDay);
  const weekStart = mondayOf(day);
  const weekChoice: WeekChoice = weekStart === thisWeek ? "this" : "next";
  const days = useMemo(() => weekDays(weekStart), [weekStart]);

  const { data, error, live } = useWeek(weekStart);
  const { favs } = useFavorites();
  const mounted = useMounted();

  const [query, setQuery] = useState("");
  const [commune, setCommune] = useState("");
  const [statusFilter, setStatusFilter] = useState<DisplayStatus | null>(null);
  const q = normalize(useDeferredValue(query).trim());

  // Garde le jour choisi dans l'URL (partage, retour arrière).
  useEffect(() => {
    const url = new URL(window.location.href);
    if (day === initialDay && !url.searchParams.has("jour")) return;
    url.searchParams.set("jour", day);
    window.history.replaceState(null, "", url);
  }, [day, initialDay]);

  const statusOf = (l: Lycee) => dayOf(data, l.uai, day).status;

  const counts = useMemo(() => {
    const c: Record<DisplayStatus, number> = { normal: 0, perturbe: 0, bloque: 0, inconnu: 0 };
    for (const l of LYCEES) c[dayOf(data, l.uai, day).status]++;
    return c;
  }, [data, day]);

  const filtered = LYCEES.filter(
    (l) =>
      (!commune || l.commune === commune) &&
      (!statusFilter || statusOf(l) === statusFilter) &&
      (!q || normalize(`${l.nom} ${l.commune}`).includes(q)),
  );

  const groups = useMemo(() => {
    const m = new Map<string, Lycee[]>();
    for (const l of filtered) m.set(l.commune, [...(m.get(l.commune) ?? []), l]);
    return [...m.entries()];
  }, [filtered]);

  const favLycees = mounted ? LYCEES.filter((l) => favs.includes(l.uai)) : [];

  const switchWeek = (w: WeekChoice) => {
    if (w === weekChoice) return;
    setDay(w === "this" ? (today >= thisWeek ? today : thisWeek) : addDays(thisWeek, 7));
  };

  const linkFor = (l: Lycee) => `/lycee/${l.uai}?jour=${day}`;

  return (
    <main className="mx-auto w-full max-w-2xl px-4 pb-32">
      {/* En-tête */}
      <header className="pt-safe">
        <div className="flex items-center justify-between pt-5">
          <span className="text-[13px] font-semibold uppercase tracking-wide text-label-2">Val d&apos;Oise · 95</span>
          <LiveIndicator state={error ? "offline" : live} />
        </div>
        <h1 className="mt-1 font-display text-[34px] font-bold leading-tight tracking-tight">
          Cours ou Pas<span className="text-accent"> ?</span>
        </h1>
        <p className="text-[15px] text-label-2">L&apos;état des lycées face aux grèves et blocages, en temps réel.</p>
      </header>

      {/* Semaine + jour */}
      <section className="mt-5 space-y-3">
        <Segmented<WeekChoice>
          value={weekChoice}
          onChange={switchWeek}
          options={[
            { value: "this", label: "Cette semaine" },
            { value: "next", label: `Sem. du ${dayMonth(addDays(thisWeek, 7))}` },
          ]}
        />
        <DayPicker days={days} value={day} today={today} onChange={setDay} />
      </section>

      {/* Résumé du jour */}
      <section className="mt-5">
        <h2 className="mb-2 px-1 font-display text-[22px] font-bold tracking-tight">{relativeDayLabel(day, today)}</h2>
        {relativeDayLabel(day, today) !== longDate(day) && <p className="-mt-2 mb-2 px-1 text-[13px] text-label-2">{longDate(day)}</p>}
        <div className="grid grid-cols-3 gap-2.5">
          {(["bloque", "perturbe", "normal"] as const).map((s) => {
            const active = statusFilter === s;
            return (
              <button
                key={s}
                onClick={() => setStatusFilter(active ? null : s)}
                aria-pressed={active}
                className="pressable relative overflow-hidden rounded-[22px] bg-card p-3.5 text-left shadow-card"
                style={active ? { boxShadow: `inset 0 0 0 2px ${STATUS_COLOR[s]}` } : undefined}
              >
                <div
                  aria-hidden
                  className="absolute -top-6 -right-6 h-20 w-20 rounded-full opacity-25 blur-2xl"
                  style={{ background: STATUS_COLOR[s] }}
                />
                <StatusIcon status={s} size={28} />
                <div className="mt-2.5 font-display text-[28px] font-bold leading-none tabular-nums">{data ? counts[s] : "–"}</div>
                <div className="mt-1 text-[13px] font-medium text-label-2">{TILE_LABEL[s]}</div>
              </button>
            );
          })}
        </div>
        {data && counts.inconnu === LYCEES.length && (
          <p className="mt-3 px-1 text-[13px] leading-snug text-label-2">
            Aucun signalement pour ce jour. Tu es au lycée ? Ouvre sa fiche et signale la situation pour aider les autres.
          </p>
        )}
      </section>

      {/* Favoris */}
      {favLycees.length > 0 && (
        <section className="mt-7 animate-fade-up">
          <h2 className="mb-2 px-1 font-display text-[22px] font-bold tracking-tight">Mes lycées</h2>
          <div className="no-scrollbar -mx-4 flex snap-x gap-3 overflow-x-auto px-4 pb-1">
            {favLycees.map((l) => {
              const s = statusOf(l);
              return (
                <Link
                  key={l.uai}
                  href={linkFor(l)}
                  className="pressable relative w-[46%] min-w-[160px] shrink-0 snap-start overflow-hidden rounded-[22px] p-4 text-white shadow-card"
                  style={{
                    background: `linear-gradient(150deg, color-mix(in srgb, ${STATUS_COLOR[s]} 75%, white), ${STATUS_COLOR[s]} 60%, color-mix(in srgb, ${STATUS_COLOR[s]} 70%, black))`,
                  }}
                >
                  <IconStar filled width={16} height={16} className="absolute top-3.5 right-3.5 opacity-80" />
                  <div className="text-[12px] font-semibold uppercase tracking-wide opacity-80">{l.commune}</div>
                  <div className="mt-1 line-clamp-2 min-h-[2.5em] text-[16px] font-bold leading-tight">{l.nom.replace(/^Lycée (professionnel )?/, "")}</div>
                  <div className="mt-3 font-display text-[20px] font-bold">{STATUS_META[s].label}</div>
                </Link>
              );
            })}
          </div>
        </section>
      )}

      {/* Recherche */}
      <section className="sticky top-0 z-30 -mx-4 mt-7">
        <div className="glass px-4 pt-safe pb-2.5">
          <div className="pt-2" />
          <div className="flex gap-2">
            <label className="flex flex-1 items-center gap-2 rounded-xl bg-fill px-3 py-2 text-label-2">
              <IconSearch width={17} height={17} />
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Rechercher un lycée, une ville…"
                className="w-full bg-transparent text-[16px] text-label outline-none placeholder:text-label-2"
                type="search"
                enterKeyHint="search"
              />
              {query && (
                <button onClick={() => setQuery("")} aria-label="Effacer" className="rounded-full bg-label-3 p-0.5 text-bg">
                  <IconClose width={12} height={12} strokeWidth={3} />
                </button>
              )}
            </label>
            <select
              value={commune}
              onChange={(e) => setCommune(e.target.value)}
              aria-label="Filtrer par ville"
              className="max-w-[38%] appearance-none truncate rounded-xl bg-fill px-3 py-2 text-[15px] font-medium text-label outline-none"
            >
              <option value="">Toutes les villes</option>
              {COMMUNES.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </div>
          {(statusFilter || commune) && (
            <div className="mt-2 flex flex-wrap gap-1.5">
              {statusFilter && (
                <Chip onClear={() => setStatusFilter(null)}>{STATUS_META[statusFilter].label}</Chip>
              )}
              {commune && <Chip onClear={() => setCommune("")}>{commune}</Chip>}
            </div>
          )}
        </div>
      </section>

      {/* Liste */}
      <section className="mt-2 space-y-5">
        {groups.length === 0 && (
          <div className="rounded-[22px] bg-card p-8 text-center shadow-card">
            <div className="text-[40px]">🔍</div>
            <p className="mt-2 font-semibold">Aucun lycée trouvé</p>
            <p className="text-[14px] text-label-2">Essaie une autre recherche ou retire les filtres.</p>
          </div>
        )}
        {groups.map(([city, list]) => (
          <div key={city}>
            <h3 className="mb-1.5 px-4 text-[13px] font-semibold uppercase tracking-wide text-label-2">{city}</h3>
            <ul className="overflow-hidden rounded-[22px] bg-card shadow-card">
              {list.map((l, i) => {
                const s = statusOf(l);
                const isFav = mounted && favs.includes(l.uai);
                return (
                  <li key={l.uai} className="relative">
                    <Link href={linkFor(l)} className="flex items-center gap-3 py-3 pr-3 pl-4 transition-colors active:bg-fill">
                      <StatusIcon status={s} size={34} />
                      <div className="min-w-0 flex-1">
                        <div className="truncate text-[16px] font-semibold">{l.nom}</div>
                        <div className="truncate text-[13px] text-label-2">
                          {l.secteur} · {voiesLabel(l)}
                        </div>
                      </div>
                      {s !== "inconnu" && <StatusPill status={s} />}
                      <IconChevronRight width={16} height={16} className="shrink-0 text-label-3" />
                    </Link>
                    {isFav && (
                      <IconStar
                        filled
                        width={14}
                        height={14}
                        aria-label="Favori"
                        className="pointer-events-none absolute top-1.5 left-[40px] text-[#ffcc00] drop-shadow"
                      />
                    )}
                    {i < list.length - 1 && <div className="absolute right-0 bottom-0 left-[62px] h-px bg-separator" />}
                  </li>
                );
              })}
            </ul>
          </div>
        ))}
      </section>

      <p className="mt-8 px-4 text-center text-[12px] leading-relaxed text-label-3">
        {LYCEES.length} établissements · Source : Annuaire de l&apos;Éducation nationale.
        <br />
        Informations participatives, à confirmer auprès de l&apos;établissement.
      </p>
    </main>
  );
}

function Chip({ children, onClear }: { children: React.ReactNode; onClear: () => void }) {
  return (
    <button onClick={onClear} className="pressable inline-flex items-center gap-1 rounded-full bg-accent px-3 py-1 text-[13px] font-semibold text-white">
      {children}
      <IconClose width={12} height={12} strokeWidth={3} />
    </button>
  );
}
