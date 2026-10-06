"use client";

import Link from "next/link";
import { useLangue } from "@/lib/client/langue";
import { basculer, majPrefs, usePrefs } from "@/lib/client/prefs";
import type { Resultat } from "@/lib/filtres";
import { trimestre } from "@/lib/format";
import { BadgeAide, BadgeFoncier, BlocPrix, Visuel } from "./ui";

export function BoutonFavori({ id, className = "" }: { id: string; className?: string }) {
  const { t } = useLangue();
  const { favoris } = usePrefs();
  const actif = favoris.includes(id);
  return (
    <button
      type="button"
      aria-pressed={actif}
      aria-label={t.fiche.favori}
      onClick={(e) => {
        e.preventDefault();
        majPrefs((p) => ({ ...p, favoris: basculer(p.favoris, id) }));
      }}
      className={`grid h-11 w-11 place-items-center rounded-full bg-surface text-detroit shadow ${className}`}
    >
      <svg viewBox="0 0 16 16" className="h-[18px] w-[18px]" fill={actif ? "currentColor" : "none"} stroke="currentColor" strokeWidth="1.6" aria-hidden>
        <path d="M8 14s-5.5-3.3-5.5-7.2A3 3 0 018 5a3 3 0 015.5 1.8C13.5 10.7 8 14 8 14z" />
      </svg>
    </button>
  );
}

export function CarteProgramme({ resultat, note }: { resultat: Resultat; note?: React.ReactNode }) {
  const { t, langue } = useLangue();
  const { programme, meilleur, lots } = resultat;
  const { lot } = meilleur;
  return (
    <Link href={`/programme/${programme.id}`} className="carte-ombre apparition block overflow-hidden rounded-[18px] border border-line bg-surface">
      <Visuel programme={programme} className="h-32">
        <BoutonFavori id={programme.id} className="absolute end-2.5 top-2.5" />
        <div className="absolute bottom-2.5 start-2.5 flex flex-wrap gap-1.5">
          <BadgeFoncier programme={programme} />
          <BadgeAide aide={meilleur.aide} />
        </div>
        {programme.exemple ? (
          <span className="absolute start-2.5 top-2.5 rounded-md bg-black/45 px-1.5 py-0.5 text-[10.5px] font-semibold uppercase tracking-wider text-white">
            {t.exemple}
          </span>
        ) : null}
      </Visuel>
      <div className="grid gap-2 p-3.5">
        <div>
          <h3 className="font-display text-[18px] font-bold leading-snug">{programme.nom}</h3>
          <p className="text-[13.5px] text-muted">
            {programme.quartier} · {lot.surface} m² · {t.fiche.chambres(lot.chambres)} · {t.fiche.etage(lot.etage)} ·{" "}
            {programme.livre ? t.fiche.livre : programme.livraisonPrevue ? t.fiche.livraison(trimestre(programme.livraisonPrevue, langue)) : ""}
          </p>
        </div>
        {lots.length > 1 ? (
          <p className="text-[12.5px] font-semibold text-detroit">
            {t.recherche.lots(lots.length)} · {t.recherche.partirDe}
          </p>
        ) : null}
        <BlocPrix prixTtc={lot.prixTtc} aide={meilleur.aide} compact />
        {note}
      </div>
    </Link>
  );
}
