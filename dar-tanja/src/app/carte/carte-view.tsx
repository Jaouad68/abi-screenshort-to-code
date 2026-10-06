"use client";

import "leaflet/dist/leaflet.css";
import type { CircleMarker, Map as CarteLeaflet } from "leaflet";
import { useEffect, useMemo, useRef, useState } from "react";
import { IndicateurDirect, Titre } from "@/components/ui";
import { useCatalogue } from "@/lib/client/catalogue";
import { useLangue } from "@/lib/client/langue";
import { usePrefs } from "@/lib/client/prefs";
import { CRITERES_DEFAUT, rechercher } from "@/lib/filtres";
import { niveauFoncier, type NiveauFoncier } from "@/lib/foncier";
import { formatMad } from "@/lib/format";

const COULEURS: Record<"clair" | "sombre", Record<NiveauFoncier, string>> = {
  clair: { sur: "#1b7444", declare: "#965600", en_cours: "#965600", risque: "#b42318" },
  sombre: { sur: "#5dcb8c", declare: "#f0b25a", en_cours: "#f0b25a", risque: "#f3887d" },
};

const echapper = (s: string) => s.replace(/[&<>"']/g, (c) => `&#${c.charCodeAt(0)};`);

/** Centre de Tanger, utilisé si aucun programme n'est affiché. */
const TANGER: [number, number] = [35.7673, -5.8339];

export function CarteView() {
  const { t, langue } = useLangue();
  const { catalogue, aujourdHui } = useCatalogue();
  const { criteres, profil } = usePrefs();
  const [tout, setTout] = useState(false);

  const resultats = useMemo(
    () => rechercher(catalogue, tout ? { ...CRITERES_DEFAUT, foncierSur: false, aideEligible: false } : criteres, profil, aujourdHui),
    [catalogue, criteres, profil, aujourdHui, tout],
  );

  const conteneur = useRef<HTMLDivElement>(null);
  const carteRef = useRef<CarteLeaflet | null>(null);
  const marqueurs = useRef<CircleMarker[]>([]);
  const [prete, setPrete] = useState(false);

  useEffect(() => {
    let annule = false;
    void import("leaflet").then((L) => {
      if (annule || !conteneur.current || carteRef.current) return;
      const sombre = window.matchMedia("(prefers-color-scheme: dark)").matches;
      const carte = L.map(conteneur.current, { zoomControl: false }).setView(TANGER, 12);
      L.tileLayer(`https://{s}.basemaps.cartocdn.com/${sombre ? "dark_all" : "light_all"}/{z}/{x}/{y}{r}.png`, {
        maxZoom: 19,
        subdomains: "abcd",
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> &copy; <a href="https://carto.com/">CARTO</a>',
      }).addTo(carte);
      L.control.zoom({ position: "bottomright" }).addTo(carte);
      carteRef.current = carte;
      setPrete(true);
    });
    return () => {
      annule = true;
      carteRef.current?.remove();
      carteRef.current = null;
    };
  }, []);

  useEffect(() => {
    const carte = carteRef.current;
    if (!prete || !carte) return;
    let annule = false;
    void import("leaflet").then((L) => {
      if (annule) return;
      for (const m of marqueurs.current) m.remove();
      marqueurs.current = [];
      const palette = COULEURS[window.matchMedia("(prefers-color-scheme: dark)").matches ? "sombre" : "clair"];
      for (const r of resultats) {
        const p = r.programme;
        const niveau = niveauFoncier(p, aujourdHui);
        const m = L.circleMarker([p.lat, p.lng], { radius: 10, weight: 3, color: "#ffffff", fillOpacity: 1, fillColor: palette[niveau] })
          .bindPopup(
            `<strong style="font-size:15px">${echapper(p.nom)}</strong><br>${echapper(p.quartier)} · ${echapper(t.statutTf[p.statutTf])}<br>` +
              `<b>${echapper(formatMad(r.meilleur.aide.prixNet, langue))}</b><br><a href="/programme/${encodeURIComponent(p.id)}">${echapper(t.fiche.description)} ›</a>`,
          )
          .addTo(carte);
        marqueurs.current.push(m);
      }
      if (resultats.length > 0) {
        carte.fitBounds(L.latLngBounds(resultats.map((r) => [r.programme.lat, r.programme.lng] as [number, number])), { padding: [40, 40], maxZoom: 14 });
      }
    });
    return () => {
      annule = true;
    };
  }, [prete, resultats, aujourdHui, langue, t]);

  return (
    <div className="grid gap-3">
      <Titre>{t.onglets.carte}</Titre>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="num font-semibold">{t.recherche.resultats(resultats.length)}</p>
        <IndicateurDirect />
      </div>
      <div className="flex rounded-xl bg-surface-2 p-1">
        {[false, true].map((v) => (
          <button
            key={String(v)}
            type="button"
            aria-pressed={tout === v}
            onClick={() => setTout(v)}
            className={`min-h-10 flex-1 rounded-lg text-[14.5px] font-semibold ${tout === v ? "bg-surface text-detroit shadow" : "text-muted"}`}
          >
            {v ? t.filtres.tous : t.recherche.titre}
          </button>
        ))}
      </div>
      <div ref={conteneur} className="h-[60vh] min-h-80 overflow-hidden rounded-3xl border border-line" />
      <ul className="flex flex-wrap gap-x-4 gap-y-1 text-[13px] text-muted">
        <li className="flex items-center gap-1.5"><i className="h-3 w-3 rounded-full bg-ok" />{t.statutTf.tf_mere} / {t.statutTf.tf_individuel} · {t.niveauFoncier.sur}</li>
        <li className="flex items-center gap-1.5"><i className="h-3 w-3 rounded-full bg-warn" />{t.niveauFoncier.declare} / {t.niveauFoncier.en_cours}</li>
        <li className="flex items-center gap-1.5"><i className="h-3 w-3 rounded-full bg-risk" />{t.niveauFoncier.risque}</li>
      </ul>
    </div>
  );
}
