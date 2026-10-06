"use client";

import type { ResultatAide } from "@/lib/aide";
import { useCatalogue } from "@/lib/client/catalogue";
import { useLangue } from "@/lib/client/langue";
import { usePrefs } from "@/lib/client/prefs";
import type { Confiance, Programme } from "@/lib/domain";
import { niveauFoncier, type NiveauFoncier } from "@/lib/foncier";
import { formatDevise, formatMad } from "@/lib/format";

const COULEURS_NIVEAU: Record<NiveauFoncier, string> = {
  sur: "bg-ok-soft text-ok",
  declare: "bg-warn-soft text-warn",
  en_cours: "bg-warn-soft text-warn",
  risque: "bg-risk-soft text-risk",
};

const COULEURS_CONFIANCE: Record<Confiance, string> = {
  verifie: "bg-ok-soft text-ok",
  declaratif: "bg-warn-soft text-warn",
  inconnu: "bg-unk-soft text-unk",
};

function Coche() {
  return (
    <svg viewBox="0 0 16 16" className="h-3.5 w-3.5 shrink-0" fill="none" stroke="currentColor" strokeWidth="2.2" aria-hidden>
      <path d="M3 8.5l3 3 7-7" />
    </svg>
  );
}

function Alerte() {
  return (
    <svg viewBox="0 0 16 16" className="h-3.5 w-3.5 shrink-0" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
      <path d="M8 2l6.5 11.5h-13z" />
      <path d="M8 6.5v3M8 11.5v.5" />
    </svg>
  );
}

export function Badge({ className, children }: { className: string; children: React.ReactNode }) {
  return (
    <span className={`inline-flex items-center gap-1 whitespace-nowrap rounded-lg px-2 py-1 text-[12.5px] font-semibold leading-none ${className}`}>
      {children}
    </span>
  );
}

export function BadgeFoncier({ programme }: { programme: Programme }) {
  const { t } = useLangue();
  const { aujourdHui } = useCatalogue();
  const niveau = niveauFoncier(programme, aujourdHui);
  return (
    <Badge className={COULEURS_NIVEAU[niveau]}>
      {niveau === "sur" ? <Coche /> : <Alerte />}
      {niveau === "risque" ? t.statutTf.non_communique : `${t.statutTf[programme.statutTf]} · ${t.niveauFoncier[niveau]}`}
    </Badge>
  );
}

export function BadgeConfiance({ confiance }: { confiance: Confiance }) {
  const { t } = useLangue();
  return (
    <Badge className={COULEURS_CONFIANCE[confiance]}>
      {confiance === "verifie" ? <Coche /> : null}
      {t.confiance[confiance]}
    </Badge>
  );
}

export function BadgeAide({ aide }: { aide: ResultatAide }) {
  const { t, langue } = useLangue();
  if (aide.statut === "non_eligible") {
    return <Badge className="bg-surface-2 text-muted">{aide.raisons.includes("hors_plafond") ? t.aide.horsPlafond : t.aide.nonEligible}</Badge>;
  }
  return (
    <Badge className={aide.statut === "eligible" ? "bg-safran-soft text-safran" : "bg-warn-soft text-warn"}>
      {aide.statut === "eligible" ? t.aide.badge(formatMad(aide.montant, langue)) : t.aide.aVerifier}
    </Badge>
  );
}

/** Prix TTC, aide estimée et prix net, avec l'équivalent dans la devise choisie. */
export function BlocPrix({ prixTtc, aide, compact = false }: { prixTtc: number; aide: ResultatAide; compact?: boolean }) {
  const { t, langue } = useLangue();
  const { catalogue } = useCatalogue();
  const { devise } = usePrefs();
  return (
    <div className="num grid gap-1">
      {!compact || aide.montant > 0 ? (
        <div className="flex justify-between gap-3 text-[13.5px] text-muted">
          <span>{t.prix.ttc}</span>
          <span>{formatMad(prixTtc, langue)}</span>
        </div>
      ) : null}
      {aide.montant > 0 && !compact ? (
        <div className="flex justify-between gap-3 text-[13.5px] font-semibold text-safran">
          <span>{t.prix.aide}</span>
          <span>− {formatMad(aide.montant, langue)}</span>
        </div>
      ) : null}
      <div className={`flex items-baseline justify-between gap-3 ${!compact || aide.montant > 0 ? "mt-0.5 border-t border-line pt-1.5" : ""}`}>
        <strong className="font-display text-[21px] leading-tight">{formatMad(aide.prixNet, langue)}</strong>
        <span className="text-[13px] text-muted">≈ {formatDevise(aide.prixNet, devise, catalogue.taux, langue)}</span>
      </div>
    </div>
  );
}

/** Visuel d'un programme : photo si disponible, sinon motif zellige. */
export function Visuel({ programme, className = "", children }: { programme: Programme; className?: string; children?: React.ReactNode }) {
  const photo = programme.photos[0];
  return (
    <div
      className={`zellige relative overflow-hidden bg-cover bg-center ${className}`}
      style={photo ? { backgroundImage: `linear-gradient(180deg, transparent 50%, rgba(0,0,0,.35)), url(${JSON.stringify(photo)})` } : undefined}
    >
      {children}
    </div>
  );
}

export function IndicateurDirect() {
  const { t, langue } = useLangue();
  const { direct, erreur, rafraichi } = useCatalogue();
  const heure = new Intl.DateTimeFormat(langue === "ar" ? "ar-MA" : "fr-FR", { hour: "2-digit", minute: "2-digit" }).format(rafraichi);
  const enLigne = direct === "direct" && !erreur;
  return (
    <span className="flex items-center gap-1.5 text-[12.5px] text-muted" role="status">
      <i
        className={`inline-block h-[7px] w-[7px] rounded-full ${enLigne ? "pulse bg-ok shadow-[0_0_0_3px_var(--ok-soft)]" : direct === "connexion" ? "bg-warn" : "bg-risk"}`}
        aria-hidden
      />
      {erreur ? t.erreur : `${enLigne ? t.live.live : direct === "connexion" ? t.live.connexion : t.live.hors} · ${t.live.maj(heure)}`}
    </span>
  );
}

export function BandeauDemo() {
  const { t } = useLangue();
  const { catalogue } = useCatalogue();
  if (catalogue.mode !== "demo") return null;
  return <p className="rounded-xl bg-warn-soft px-3 py-2 text-[13px] font-semibold text-warn">{t.exempleBandeau}</p>;
}

export function Interrupteur({ id, actif, onChange, children }: { id: string; actif: boolean; onChange: (v: boolean) => void; children: React.ReactNode }) {
  return (
    <label htmlFor={id} className="flex min-h-11 cursor-pointer items-center justify-between gap-3">
      <span>{children}</span>
      <input id={id} type="checkbox" role="switch" checked={actif} onChange={(e) => onChange(e.target.checked)} className="peer sr-only" />
      <span
        aria-hidden
        className={`relative h-[31px] w-[51px] shrink-0 rounded-full transition-colors peer-focus-visible:outline-3 peer-focus-visible:outline-safran ${actif ? "bg-detroit" : "bg-surface-2"}`}
      >
        <span className={`absolute top-[2px] h-[27px] w-[27px] rounded-full bg-white shadow transition-[inset-inline-start] ${actif ? "start-[22px]" : "start-[2px]"}`} />
      </span>
    </label>
  );
}

export function Titre({ children }: { children: React.ReactNode }) {
  return <h1 className="font-display text-[30px] font-bold leading-tight tracking-tight">{children}</h1>;
}

export function Section({ titre, children, className = "" }: { titre?: string; children: React.ReactNode; className?: string }) {
  return (
    <section className={`carte-ombre grid gap-2.5 rounded-2xl border border-line bg-surface p-4 ${className}`}>
      {titre ? <h2 className="text-[13px] font-semibold uppercase tracking-wider text-muted">{titre}</h2> : null}
      {children}
    </section>
  );
}
