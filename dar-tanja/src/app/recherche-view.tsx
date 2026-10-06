"use client";

import { useDeferredValue, useMemo, useState } from "react";
import { CarteProgramme } from "@/components/carte-programme";
import { BandeauDemo, IndicateurDirect, Interrupteur, Titre } from "@/components/ui";
import { useCatalogue } from "@/lib/client/catalogue";
import { useLangue } from "@/lib/client/langue";
import { majPrefs, usePrefs } from "@/lib/client/prefs";
import type { VueMer } from "@/lib/domain";
import { CRITERES_DEFAUT, horsPlafond, quartiersDisponibles, rechercher, type Criteres, type Tri } from "@/lib/filtres";
import { formatMad } from "@/lib/format";

const PRIX_MAX = [null, 500_000, 550_000, 600_000, 650_000, 700_000, 800_000, 1_000_000] as const;
const LIVRAISONS = [null, "livre", "2027-06-30", "2027-12-31", "2028-12-31"] as const;

function Puce({ actif, onClick, children }: { actif: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      type="button"
      aria-pressed={actif}
      onClick={onClick}
      className={`min-h-9 shrink-0 whitespace-nowrap rounded-full border-[1.5px] px-3 text-[13.5px] font-semibold ${
        actif ? "border-detroit bg-detroit text-on-detroit" : "border-line bg-surface text-ink"
      }`}
    >
      {children}
    </button>
  );
}

function Groupe({ titre, children }: { titre: string; children: React.ReactNode }) {
  return (
    <fieldset className="grid gap-2">
      <legend className="mb-2 text-[13px] font-semibold uppercase tracking-wider text-muted">{titre}</legend>
      <div className="flex flex-wrap gap-2">{children}</div>
    </fieldset>
  );
}

export function RechercheView() {
  const { t, langue } = useLangue();
  const { catalogue, aujourdHui } = useCatalogue();
  const { criteres, profil } = usePrefs();
  const [panneau, setPanneau] = useState(false);
  // Garde la saisie fluide : le filtrage suit avec un temps de retard imperceptible.
  const criteresDiffere = useDeferredValue(criteres);

  const maj = (patch: Partial<Criteres>) => majPrefs((p) => ({ ...p, criteres: { ...p.criteres, ...patch } }));
  const resultats = useMemo(() => rechercher(catalogue, criteresDiffere, profil, aujourdHui), [catalogue, criteresDiffere, profil, aujourdHui]);
  const auDessus = useMemo(() => horsPlafond(catalogue, criteresDiffere, profil, aujourdHui), [catalogue, criteresDiffere, profil, aujourdHui]);
  const quartiers = useMemo(() => quartiersDisponibles(catalogue), [catalogue]);
  const moinsCher = resultats[0]?.meilleur.aide.prixNet;

  const nbFiltres =
    (criteres.prixNetMax !== null ? 1 : 0) +
    (criteres.chambresMin > 0 ? 1 : 0) +
    (criteres.surfaceMin > 0 ? 1 : 0) +
    criteres.quartiers.length +
    (criteres.vueMerMin !== "aucune" ? 1 : 0) +
    (criteres.ascenseur ? 1 : 0) +
    (criteres.parking ? 1 : 0) +
    (criteres.livraisonAvant ? 1 : 0);

  const valeurLivraison = criteres.livraisonAvant === aujourdHui ? "livre" : criteres.livraisonAvant;

  return (
    <div className="grid gap-4">
      <header className="grid gap-1">
        <p className="font-display text-[15px] font-semibold text-detroit">{t.appNom}</p>
        <Titre>{t.recherche.titre}</Titre>
      </header>
      <BandeauDemo />

      <div className="flex gap-2">
        <label className="flex min-h-12 min-w-0 flex-1 items-center gap-2 rounded-2xl border border-line bg-surface px-3.5">
          <svg viewBox="0 0 16 16" className="h-4 w-4 shrink-0 text-muted" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
            <circle cx="7" cy="7" r="4.5" />
            <path d="M10.5 10.5L14 14" />
          </svg>
          <input
            id="recherche-texte"
            type="search"
            value={criteres.texte}
            onChange={(e) => maj({ texte: e.target.value })}
            placeholder={t.recherche.placeholder}
            aria-label={t.recherche.placeholder}
            className="w-0 min-w-0 flex-1 bg-transparent text-[16px] outline-none placeholder:text-muted"
          />
        </label>
        <button
          type="button"
          onClick={() => setPanneau((v) => !v)}
          aria-expanded={panneau}
          className="relative min-h-12 rounded-2xl bg-detroit-soft px-4 font-semibold text-detroit"
        >
          {t.recherche.filtres}
          {nbFiltres > 0 ? (
            <span className="num absolute -top-1.5 -end-1.5 grid h-5 min-w-5 place-items-center rounded-full bg-detroit px-1 text-[11px] text-on-detroit">
              {nbFiltres}
            </span>
          ) : null}
        </button>
      </div>

      <div className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-1 [scrollbar-width:none]">
        <Puce actif={criteres.foncierSur} onClick={() => maj({ foncierSur: !criteres.foncierSur })}>
          {t.filtres.foncier} {criteres.foncierSur ? "✓" : ""}
        </Puce>
        <Puce actif={criteres.aideEligible} onClick={() => maj({ aideEligible: !criteres.aideEligible })}>
          {t.filtres.aide} {criteres.aideEligible ? "✓" : ""}
        </Puce>
        <Puce actif={criteres.vueMerMin !== "aucune"} onClick={() => maj({ vueMerMin: criteres.vueMerMin === "aucune" ? "partielle" : "aucune" })}>
          {t.filtres.vueMer}
        </Puce>
        <Puce actif={criteres.ascenseur} onClick={() => maj({ ascenseur: !criteres.ascenseur })}>
          {t.filtres.ascenseur}
        </Puce>
        <Puce actif={criteres.parking} onClick={() => maj({ parking: !criteres.parking })}>
          {t.filtres.parking}
        </Puce>
      </div>

      {panneau ? (
        <div className="carte-ombre grid gap-5 rounded-2xl border border-line bg-surface p-4">
          <div className="grid gap-1">
            <p className="text-[13px] font-semibold uppercase tracking-wider text-muted">{t.filtres.securite}</p>
            <Interrupteur id="f-foncier" actif={criteres.foncierSur} onChange={(v) => maj({ foncierSur: v })}>
              {t.filtres.foncier}
            </Interrupteur>
            <Interrupteur id="f-aide" actif={criteres.aideEligible} onChange={(v) => maj({ aideEligible: v })}>
              {t.filtres.aide}
            </Interrupteur>
            {!criteres.foncierSur || !criteres.aideEligible ? <p className="text-[13px] font-semibold text-warn">{t.filtres.securiteAide}</p> : null}
          </div>
          <Groupe titre={t.filtres.prixNetMax}>
            {PRIX_MAX.map((p) => (
              <Puce key={String(p)} actif={criteres.prixNetMax === p} onClick={() => maj({ prixNetMax: p })}>
                {p === null ? t.filtres.sansLimite : formatMad(p, langue)}
              </Puce>
            ))}
          </Groupe>
          <Groupe titre={t.filtres.chambres}>
            {[0, 1, 2, 3].map((n) => (
              <Puce key={n} actif={criteres.chambresMin === n} onClick={() => maj({ chambresMin: n })}>
                {n === 0 ? t.filtres.tous : `${n}+`}
              </Puce>
            ))}
          </Groupe>
          <Groupe titre={t.filtres.surface}>
            {[0, 70, 80, 90, 100].map((n) => (
              <Puce key={n} actif={criteres.surfaceMin === n} onClick={() => maj({ surfaceMin: n })}>
                {n === 0 ? t.filtres.tous : `${n} m²`}
              </Puce>
            ))}
          </Groupe>
          <Groupe titre={t.filtres.vueMer}>
            {(["aucune", "partielle", "degagee"] as VueMer[]).map((v) => (
              <Puce key={v} actif={criteres.vueMerMin === v} onClick={() => maj({ vueMerMin: v })}>
                {t.vueFiltre[v]}
              </Puce>
            ))}
          </Groupe>
          <Groupe titre={t.filtres.quartiers}>
            <Puce actif={criteres.quartiers.length === 0} onClick={() => maj({ quartiers: [] })}>
              {t.filtres.tous}
            </Puce>
            {quartiers.map((q) => (
              <Puce
                key={q}
                actif={criteres.quartiers.includes(q)}
                onClick={() =>
                  maj({ quartiers: criteres.quartiers.includes(q) ? criteres.quartiers.filter((x) => x !== q) : [...criteres.quartiers, q] })
                }
              >
                {q}
              </Puce>
            ))}
          </Groupe>
          <Groupe titre={t.filtres.livraison}>
            {LIVRAISONS.map((l) => (
              <Puce key={String(l)} actif={valeurLivraison === l} onClick={() => maj({ livraisonAvant: l === "livre" ? aujourdHui : l })}>
                {l === null ? t.filtres.livraisonToutes : l === "livre" ? t.filtres.livreSeulement : l.slice(0, 4) + (l.endsWith("06-30") ? " S1" : "")}
              </Puce>
            ))}
          </Groupe>
          <Groupe titre={t.filtres.tri}>
            {(Object.keys(t.tri) as Tri[]).map((tri) => (
              <Puce key={tri} actif={criteres.tri === tri} onClick={() => maj({ tri })}>
                {t.tri[tri]}
              </Puce>
            ))}
          </Groupe>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => maj({ ...CRITERES_DEFAUT, texte: criteres.texte })}
              className="min-h-12 rounded-xl bg-detroit-soft px-4 font-semibold text-detroit"
            >
              {t.recherche.reinitialiser}
            </button>
            <button type="button" onClick={() => setPanneau(false)} className="min-h-12 flex-1 rounded-xl bg-detroit px-4 font-semibold text-on-detroit">
              {t.recherche.voir(resultats.length)}
            </button>
          </div>
        </div>
      ) : null}

      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="num font-semibold">{t.recherche.resultats(resultats.length)}</p>
        <IndicateurDirect />
      </div>

      {resultats.length === 0 ? <p className="rounded-2xl bg-surface-2 p-4 text-[15px] text-muted">{t.recherche.aucun}</p> : null}
      <div className="grid gap-3.5">
        {resultats.map((r) => (
          <CarteProgramme key={r.programme.id} resultat={r} />
        ))}
      </div>

      {auDessus.length > 0 ? (
        <section className="mt-4 grid gap-3">
          <div>
            <h2 className="font-display text-[22px] font-bold">{t.recherche.horsPlafondTitre}</h2>
            <p className="text-[14.5px] text-muted">{t.recherche.horsPlafondTexte}</p>
          </div>
          {auDessus.map((r) => (
            <CarteProgramme
              key={r.programme.id}
              resultat={r}
              note={
                moinsCher !== undefined ? (
                  <p className="num rounded-xl bg-surface-2 p-2.5 text-[13px] text-muted">
                    {t.recherche.surcout(formatMad(r.meilleur.aide.prixNet - moinsCher, langue))}
                  </p>
                ) : null
              }
            />
          ))}
        </section>
      ) : null}
    </div>
  );
}
