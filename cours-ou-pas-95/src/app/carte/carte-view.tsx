"use client";

import "leaflet/dist/leaflet.css";
import type { CircleMarker, Map as LeafletMap } from "leaflet";
import { useEffect, useMemo, useRef, useState } from "react";
import { LYCEES } from "@/data/lycees";
import { dayOf, useWeek } from "@/lib/client/hooks";
import { addDays, mondayOf, relativeDayLabel, weekDays } from "@/lib/dates";
import { STATUS_META, type DisplayStatus } from "@/lib/status";
import { DayPicker, Segmented } from "@/components/day-picker";
import { LiveIndicator } from "@/components/live";

const COLORS: Record<"light" | "dark", Record<DisplayStatus, string>> = {
  light: { normal: "#30c75e", perturbe: "#ff9f0a", bloque: "#ff3b30", inconnu: "#aeaeb2" },
  dark: { normal: "#32d74b", perturbe: "#ffb340", bloque: "#ff453a", inconnu: "#636366" },
};

const escapeHtml = (s: string) => s.replace(/[&<>"']/g, (c) => `&#${c.charCodeAt(0)};`);

type WeekChoice = "this" | "next";

export function CarteView({ today, thisWeek, initialDay }: { today: string; thisWeek: string; initialDay: string }) {
  const [day, setDay] = useState(initialDay);
  const weekStart = mondayOf(day);
  const days = useMemo(() => weekDays(weekStart), [weekStart]);
  const { data, error, live } = useWeek(weekStart);

  const container = useRef<HTMLDivElement>(null);
  const mapRef = useRef<LeafletMap | null>(null);
  const markers = useRef(new Map<string, CircleMarker>());
  const [ready, setReady] = useState(false);

  // Création de la carte (une seule fois, côté client).
  useEffect(() => {
    let cancelled = false;
    const markerMap = markers.current;
    void import("leaflet").then((L) => {
      if (cancelled || !container.current || mapRef.current) return;
      const dark = window.matchMedia("(prefers-color-scheme: dark)").matches;
      const map = L.map(container.current, { zoomControl: false, attributionControl: true });
      L.tileLayer(`https://{s}.basemaps.cartocdn.com/${dark ? "dark_all" : "light_all"}/{z}/{x}/{y}{r}.png`, {
        maxZoom: 19,
        subdomains: "abcd",
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> &copy; <a href="https://carto.com/">CARTO</a>',
      }).addTo(map);
      L.control.zoom({ position: "bottomright" }).addTo(map);
      map.fitBounds(L.latLngBounds(LYCEES.map((l) => [l.lat, l.lng] as [number, number])), {
        // Laisse la place au panneau flottant (en haut) et à la barre d'onglets (en bas).
        paddingTopLeft: [24, 330],
        paddingBottomRight: [24, 110],
      });

      for (const l of LYCEES) {
        const m = L.circleMarker([l.lat, l.lng], {
          radius: 9,
          weight: 2.5,
          color: "#ffffff",
          fillOpacity: 1,
          fillColor: COLORS[dark ? "dark" : "light"].inconnu,
        }).addTo(map);
        markerMap.set(l.uai, m);
      }
      mapRef.current = map;
      setReady(true);
    });
    return () => {
      cancelled = true;
      mapRef.current?.remove();
      mapRef.current = null;
      markerMap.clear();
    };
  }, []);

  // Mise à jour des couleurs et des bulles à chaque changement de jour ou de données.
  useEffect(() => {
    if (!ready) return;
    const dark = window.matchMedia("(prefers-color-scheme: dark)").matches;
    for (const l of LYCEES) {
      const m = markers.current.get(l.uai);
      if (!m) continue;
      const st = dayOf(data, l.uai, day);
      const color = COLORS[dark ? "dark" : "light"][st.status];
      m.setStyle({ fillColor: color, radius: st.status === "inconnu" ? 7 : 10 });
      if (st.status !== "inconnu") m.bringToFront();
      m.bindPopup(
        `<a class="cop-popup" href="/lycee/${l.uai}?jour=${day}">
          <span class="cop-popup-city">${escapeHtml(l.commune)}</span>
          <strong>${escapeHtml(l.nom)}</strong>
          <span class="cop-popup-status" style="color:${color}">● ${STATUS_META[st.status].label}</span>
          <span class="cop-popup-more">Voir la fiche ›</span>
        </a>`,
        { closeButton: false, offset: [0, -4] },
      );
    }
  }, [ready, data, day]);

  const counts = useMemo(() => {
    const c: Record<DisplayStatus, number> = { normal: 0, perturbe: 0, bloque: 0, inconnu: 0 };
    for (const l of LYCEES) c[dayOf(data, l.uai, day).status]++;
    return c;
  }, [data, day]);

  const weekChoice: WeekChoice = weekStart === thisWeek ? "this" : "next";

  return (
    <main className="fixed inset-0">
      <div ref={container} className="absolute inset-0 z-0 bg-bg" aria-label="Carte des lycées du Val d'Oise" />

      {/* Panneau flottant */}
      <div className="pointer-events-none absolute inset-x-0 top-0 z-10 px-3 pt-safe">
        <div className="glass pointer-events-auto mx-auto mt-3 max-w-xl space-y-2.5 rounded-[24px] p-3 shadow-float">
          <div className="flex items-center justify-between px-1">
            <div>
              <h1 className="font-display text-[22px] font-bold leading-tight tracking-tight">Carte</h1>
              <p className="text-[13px] text-label-2">{relativeDayLabel(day, today)}</p>
            </div>
            <LiveIndicator state={error ? "offline" : live} />
          </div>
          <Segmented<WeekChoice>
            value={weekChoice}
            onChange={(w) => w !== weekChoice && setDay(w === "this" ? (today >= thisWeek ? today : thisWeek) : addDays(thisWeek, 7))}
            options={[
              { value: "this", label: "Cette semaine" },
              { value: "next", label: "Semaine prochaine" },
            ]}
          />
          <DayPicker days={days} value={day} today={today} onChange={setDay} />
          <div className="flex justify-between gap-1 px-1 text-[12px] font-medium text-label-2">
            {(["bloque", "perturbe", "normal", "inconnu"] as const).map((s) => (
              <span key={s} className="flex items-center gap-1">
                <span className="h-2.5 w-2.5 rounded-full ring-2 ring-white/80" style={{ background: `var(--${s})` }} />
                {STATUS_META[s].short} <b className="tabular-nums text-label">{data ? counts[s] : "–"}</b>
              </span>
            ))}
          </div>
        </div>
      </div>
    </main>
  );
}
