"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { voiesLabel, type Lycee } from "@/data/lycees";
import { dayOf, useFavorites, useMounted, useMyVotes, useNow, useWeek } from "@/lib/client/hooks";
import { addDays, currentWeekStart, dayMonth, longDate, mondayOf, relativeDayLabel, timeAgo, weekDays } from "@/lib/dates";
import { STATUS_META, STATUSES, type Status } from "@/lib/status";
import { DayPicker } from "@/components/day-picker";
import { IconBadge, IconChevronLeft, IconChevronRight, IconMap, IconMegaphone, IconShare, IconStar } from "@/components/icons";
import { NewsCard } from "@/components/news-card";
import { NotifyCard } from "@/components/notify-card";
import { StoryButton } from "@/components/story-button";
import { LiveIndicator } from "@/components/live";
import { Sheet, Toast } from "@/components/sheet";
import { ConfidenceBadge, STATUS_COLOR, StatusIcon } from "@/components/status";

export function LyceeView({
  lycee,
  today,
  initialDay,
  referentLabel,
}: {
  lycee: Lycee;
  today: string;
  initialDay: string;
  /** Libellé du référent connecté, s'il est référent de ce lycée. */
  referentLabel: string | null;
}) {
  const [day, setDay] = useState(initialDay);
  const weekStart = mondayOf(day);
  const days = useMemo(() => weekDays(weekStart), [weekStart]);
  const { data, error, live, refresh } = useWeek(weekStart);
  const { isFav, toggle } = useFavorites();
  const { voteFor, record } = useMyVotes();
  const mounted = useMounted();
  const now = useNow();

  const [sheetOpen, setSheetOpen] = useState(false);
  const [sending, setSending] = useState<Status | null>(null);
  const [toast, setToast] = useState<{ msg: string; tone: "success" | "error" } | null>(null);
  const [scrolled, setScrolled] = useState(false);

  const current = dayOf(data, lycee.uai, day);
  const s = current.status;
  const color = STATUS_COLOR[s];
  const myVote = mounted ? voteFor(lycee.uai, day) : undefined;
  const fav = mounted && isFav(lycee.uai);
  const isPast = day < addDays(today, -1);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 120);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => {
    const url = new URL(window.location.href);
    url.searchParams.set("jour", day);
    window.history.replaceState(null, "", url);
  }, [day]);

  const send = async (status: Status) => {
    setSending(status);
    try {
      const res = await fetch("/api/reports", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ uai: lycee.uai, date: day, status }),
      });
      const json = (await res.json().catch(() => ({}))) as { error?: string; referent?: boolean };
      if (!res.ok) throw new Error(json.error ?? "Envoi impossible.");
      record(lycee.uai, day, status);
      setSheetOpen(false);
      setToast({ msg: json.referent ? "Statut vérifié publié ✓" : "Merci ! Signalement pris en compte", tone: "success" });
      void refresh();
      navigator.vibrate?.(12);
    } catch (e) {
      setToast({ msg: (e as Error).message, tone: "error" });
    } finally {
      setSending(null);
    }
  };

  const share = async () => {
    const text = `${lycee.nom} (${lycee.commune}) · ${relativeDayLabel(day, today)} : ${STATUS_META[s].label}`;
    const url = window.location.href;
    try {
      if (navigator.share) await navigator.share({ title: "Cours ou Pas ?", text, url });
      else {
        await navigator.clipboard.writeText(`${text}\n${url}`);
        setToast({ msg: "Lien copié", tone: "success" });
      }
    } catch {}
  };

  const closeToast = useCallback(() => setToast(null), []);

  return (
    <div className="min-h-dvh pb-16">
      {/* Barre de navigation */}
      <nav className={`fixed inset-x-0 top-0 z-40 pt-safe transition-colors duration-300 ${scrolled ? "glass shadow-[0_0.5px_0_var(--separator)]" : ""}`}>
        <div className="mx-auto flex h-12 max-w-2xl items-center justify-between px-2">
          <Link href={`/?jour=${day}`} className="pressable flex items-center gap-0.5 rounded-full px-2 py-1.5 text-[17px] font-medium text-accent">
            <IconChevronLeft width={22} height={22} strokeWidth={2.5} />
            Lycées
          </Link>
          <span
            className={`absolute left-1/2 max-w-[45%] -translate-x-1/2 truncate text-[16px] font-semibold transition-opacity duration-300 ${
              scrolled ? "opacity-100" : "opacity-0"
            }`}
          >
            {lycee.nom}
          </span>
          <div className="flex gap-1">
            <button
              onClick={() => toggle(lycee.uai)}
              aria-label={fav ? "Retirer des favoris" : "Ajouter aux favoris"}
              aria-pressed={fav}
              className="pressable rounded-full p-2 text-accent"
            >
              <IconStar filled={fav} width={22} height={22} className={fav ? "text-[#ffcc00]" : ""} />
            </button>
            <button onClick={share} aria-label="Partager" className="pressable rounded-full p-2 text-accent">
              <IconShare width={22} height={22} />
            </button>
          </div>
        </div>
      </nav>

      <main className="mx-auto max-w-2xl px-4 pt-safe">
        {/* Titre */}
        <header className="pt-16 animate-fade-up">
          <div className="flex items-center justify-between">
            <span className="text-[13px] font-semibold uppercase tracking-wide text-label-2">{lycee.commune}</span>
            <LiveIndicator state={error ? "offline" : live} />
          </div>
          <h1 className="mt-1 font-display text-[30px] font-bold leading-[1.1] tracking-tight">{lycee.nom}</h1>
          <p className="mt-1 text-[15px] text-label-2">
            {lycee.secteur} · {voiesLabel(lycee)}
          </p>
          {referentLabel && (
            <p className="mt-2 inline-flex items-center gap-1.5 rounded-full bg-[color-mix(in_srgb,var(--accent)_14%,transparent)] px-3 py-1 text-[13px] font-semibold text-accent">
              <IconBadge width={15} height={15} strokeWidth={2.2} />
              Tu es référent vérifié · {referentLabel}
            </p>
          )}
        </header>

        {/* Statut du jour */}
        <section
          key={`${day}-${s}`}
          className="relative mt-5 animate-pop overflow-hidden rounded-[28px] p-5 text-white shadow-float"
          style={{
            background: `radial-gradient(120% 90% at 100% 0%, color-mix(in srgb, ${color} 55%, white) 0%, transparent 55%), linear-gradient(160deg, ${color}, color-mix(in srgb, ${color} 65%, black))`,
          }}
          aria-live="polite"
        >
          <div aria-hidden className="absolute -right-8 -bottom-10 opacity-15">
            <StatusIcon status={s} size={190} />
          </div>
          <div className="relative">
            <div className="flex items-center justify-between gap-2">
              <span className="text-[15px] font-semibold opacity-90">{relativeDayLabel(day, today)}</span>
              {current.confidence && <ConfidenceBadge confidence={current.confidence} onDark />}
            </div>
            <div className="mt-6 flex items-center gap-3">
              <span className="rounded-full bg-white/25 p-1 backdrop-blur">
                <StatusIcon status={s} size={44} />
              </span>
              <div className="font-display text-[38px] font-extrabold leading-none tracking-tight">{STATUS_META[s].label}</div>
            </div>
            <p className="mt-3 text-[15px] leading-snug opacity-90">{current.note ?? STATUS_META[s].description}</p>
            <div className="mt-4 flex flex-wrap items-center gap-x-3 gap-y-1 border-t border-white/20 pt-3 text-[13px] font-medium opacity-90">
              <span>
                {current.count} signalement{current.count > 1 ? "s" : ""}
              </span>
              {current.updatedAt && <span>· Mis à jour {mounted ? timeAgo(current.updatedAt, now) : ""}</span>}
              {relativeDayLabel(day, today) !== longDate(day) && <span>· {longDate(day)}</span>}
            </div>
          </div>
        </section>

        {/* Semaine */}
        <section className="mt-6">
          <h2 className="mb-2 px-1 font-display text-[20px] font-bold tracking-tight">Semaine du {dayMonth(weekStart)}</h2>
          <DayPicker days={days} value={day} today={today} onChange={setDay} statusFor={(d) => dayOf(data, lycee.uai, d).status} />
          <div className="mt-2 flex justify-between px-1">
            <button
              onClick={() => setDay(addDays(weekStart, -7))}
              disabled={weekStart <= currentWeekStart(today)}
              className="text-[14px] font-medium text-accent disabled:opacity-0"
            >
              ‹ Semaine précédente
            </button>
            <button
              onClick={() => setDay(addDays(weekStart, 7))}
              disabled={weekStart >= addDays(currentWeekStart(today), 7)}
              className="text-[14px] font-medium text-accent disabled:opacity-0"
            >
              Semaine suivante ›
            </button>
          </div>
        </section>

        {/* Répartition */}
        {current.count > 0 && (
          <section className="mt-5 rounded-[22px] bg-card p-4 shadow-card">
            <h2 className="text-[15px] font-semibold">Ce que disent les signalements</h2>
            <div className="mt-3 flex h-3 overflow-hidden rounded-full bg-fill">
              {STATUSES.map((st) => (
                <div
                  key={st}
                  className="h-full transition-[width] duration-700 ease-spring"
                  style={{ width: `${current.shares[st]}%`, background: STATUS_COLOR[st] }}
                />
              ))}
            </div>
            <ul className="mt-3 grid grid-cols-3 gap-2 text-[13px]">
              {(["bloque", "perturbe", "normal"] as const).map((st) => (
                <li key={st} className="rounded-xl bg-fill px-2.5 py-2">
                  <div className="flex items-center gap-1.5 text-label-2">
                    <span className="h-2 w-2 rounded-full" style={{ background: STATUS_COLOR[st] }} />
                    {STATUS_META[st].short}
                  </div>
                  <div className="mt-0.5 font-display text-[20px] font-bold tabular-nums">{current.shares[st]}%</div>
                </li>
              ))}
            </ul>
            <p className="mt-3 text-[12px] leading-snug text-label-3">
              Les signalements récents comptent davantage que les anciens.
            </p>
          </section>
        )}

        {/* Appel à l'action */}
        <section className="mt-5">
          {myVote && (
            <div className="mb-2.5 flex items-center gap-2 rounded-2xl bg-card px-4 py-3 text-[14px] shadow-card">
              <StatusIcon status={myVote} size={22} />
              <span className="text-label-2">Ton signalement :</span>
              <span className="font-semibold">{STATUS_META[myVote].label}</span>
            </div>
          )}
          <button
            onClick={() => setSheetOpen(true)}
            disabled={isPast}
            className="pressable flex w-full items-center justify-center gap-2 rounded-2xl bg-accent py-4 text-[17px] font-semibold text-white shadow-[0_10px_30px_-10px_var(--accent)] disabled:opacity-40"
          >
            <IconMegaphone width={20} height={20} />
            {myVote ? "Modifier mon signalement" : "Signaler la situation"}
          </button>
          <StoryButton
            uai={lycee.uai}
            day={day}
            version={`${s}-${current.count}-${current.confidence ?? ""}`}
            text={`${lycee.nom} (${lycee.commune}) · ${relativeDayLabel(day, today)} : ${STATUS_META[s].label}`}
            onToast={(msg, tone = "success") => setToast({ msg, tone })}
          />
          <p className="mt-2 px-2 text-center text-[12px] text-label-2">
            {referentLabel ? "Tes signalements sont marqués « Référent »" : "Anonyme · Un signalement par appareil et par jour"}
          </p>
        </section>

        <NewsCard mentions={data?.news?.[lycee.uai] ?? []} now={now} />

        <NotifyCard uai={lycee.uai} onToast={(msg, tone = "success") => setToast({ msg, tone })} />

        {/* Infos */}
        <section className="mt-6">
          <h2 className="mb-1.5 px-4 text-[13px] font-semibold uppercase tracking-wide text-label-2">Informations</h2>
          <ul className="overflow-hidden rounded-[22px] bg-card text-[16px] shadow-card">
            <InfoRow label="Ville" value={lycee.commune} />
            <InfoRow label="Secteur" value={lycee.secteur} />
            <InfoRow label="Voies" value={voiesLabel(lycee)} />
            <InfoRow label="Code UAI" value={lycee.uai} mono />
            <li>
              <a
                href={`https://maps.apple.com/?daddr=${lycee.lat},${lycee.lng}&q=${encodeURIComponent(lycee.nom)}`}
                target="_blank"
                rel="noreferrer"
                className="flex items-center gap-3 px-4 py-3 text-accent active:bg-fill"
              >
                <IconMap width={20} height={20} />
                <span className="flex-1 font-medium">Itinéraire</span>
                <IconChevronRight width={16} height={16} className="text-label-3" />
              </a>
            </li>
          </ul>
          <p className="mt-4 px-4 text-[12px] leading-relaxed text-label-3">
            Ces informations sont fournies par les utilisateurs et ne remplacent pas les communications officielles de
            l&apos;établissement ou du rectorat de Versailles.
          </p>
        </section>
      </main>

      {/* Feuille de signalement */}
      <Sheet open={sheetOpen} onClose={() => setSheetOpen(false)} title="Quelle est la situation ?">
        <p className="-mt-1 mb-3 px-2 text-[15px] text-label-2">
          {lycee.nom} · <span className="font-semibold text-label">{relativeDayLabel(day, today)}</span>
        </p>
        {referentLabel && (
          <p className="mb-3 flex items-center gap-1.5 rounded-xl bg-[color-mix(in_srgb,var(--accent)_12%,transparent)] px-3 py-2 text-[13px] font-medium text-accent">
            <IconBadge width={15} height={15} strokeWidth={2.2} />
            En tant que référent, ton signalement fixe le statut du jour.
          </p>
        )}
        <div className="space-y-2">
          {(["normal", "perturbe", "bloque"] as const).map((st) => (
            <button
              key={st}
              onClick={() => send(st)}
              disabled={sending !== null}
              className="pressable flex w-full items-center gap-3 rounded-2xl bg-fill p-3.5 text-left disabled:opacity-60"
              style={myVote === st ? { boxShadow: `inset 0 0 0 2px ${STATUS_COLOR[st]}` } : undefined}
            >
              <StatusIcon status={st} size={42} />
              <span className="flex-1">
                <span className="block text-[17px] font-semibold">{STATUS_META[st].label}</span>
                <span className="block text-[13px] leading-snug text-label-2">{STATUS_META[st].description}</span>
              </span>
              {sending === st && <span className="h-5 w-5 animate-spin rounded-full border-2 border-label-3 border-t-accent" />}
            </button>
          ))}
        </div>
        <p className="mt-3 px-2 text-center text-[12px] leading-snug text-label-3">
          Signale uniquement ce que tu sais. Les faux signalements sont supprimés par la modération.
        </p>
      </Sheet>

      <Toast message={toast?.msg ?? null} tone={toast?.tone} onDone={closeToast} />
    </div>
  );
}

function InfoRow({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
  return (
    <li className="relative flex items-center justify-between gap-4 px-4 py-3">
      <span>{label}</span>
      <span className={`truncate text-label-2 ${mono ? "font-mono text-[14px]" : ""}`}>{value}</span>
      <span className="absolute right-0 bottom-0 left-4 h-px bg-separator" />
    </li>
  );
}
