"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { BoutonFavori } from "@/components/carte-programme";
import { BadgeAide, BadgeConfiance, BadgeFoncier, BlocPrix, Section, Visuel } from "@/components/ui";
import { useCatalogue } from "@/lib/client/catalogue";
import { useLangue } from "@/lib/client/langue";
import { basculer, MAX_COMPARAISON, majPrefs, usePrefs } from "@/lib/client/prefs";
import { evaluerLot } from "@/lib/filtres";
import { estFoncierSur, joursAvantReverification } from "@/lib/foncier";
import { estimerFrais } from "@/lib/frais";
import { formatDate, formatDevise, formatMad, trimestre } from "@/lib/format";

function Ligne({ libelle, children }: { libelle: string; children: React.ReactNode }) {
  return (
    <div className="flex min-h-8 items-center justify-between gap-3 text-[14.5px]">
      <span className="text-muted">{libelle}</span>
      <span className="text-end">{children}</span>
    </div>
  );
}

export function FicheView({ id }: { id: string }) {
  const { t, langue } = useLangue();
  const { catalogue, aujourdHui } = useCatalogue();
  const { profil, comparaison, devise } = usePrefs();
  const programme = catalogue.programmes.find((p) => p.id === id);
  const promoteur = catalogue.promoteurs.find((p) => p.id === programme?.promoteurId);
  const lots = useMemo(
    () =>
      programme
        ? catalogue.lots
            .filter((l) => l.programmeId === programme.id && l.disponible)
            .map((l) => evaluerLot(l, programme, profil, catalogue, aujourdHui))
            .sort((a, b) => a.aide.prixNet - b.aide.prixNet)
        : [],
    [catalogue, programme, profil, aujourdHui],
  );
  const [choisi, setChoisi] = useState<string | null>(null);

  if (!programme) {
    return (
      <div className="grid gap-4 pt-6">
        <p className="text-muted">{t.nonTrouve}</p>
        <Link href="/" className="font-semibold text-detroit">‹ {t.fiche.retour}</Link>
      </div>
    );
  }

  const lot = lots.find((l) => l.lot.id === choisi) ?? lots[0];
  const frais = lot ? estimerFrais(lot.lot.prixTtc) : null;
  const sur = estFoncierSur(programme, aujourdHui);
  const jours = joursAvantReverification(programme, aujourdHui);
  const message = encodeURIComponent(`Bonjour, je suis intéressé par le programme ${programme.nom} (${programme.quartier}, Tanger) vu sur Dar Tanja.`);

  return (
    <div className="grid gap-4">
      <div className="flex items-center justify-between">
        <Link href="/" className="flex min-h-11 items-center font-semibold text-detroit">
          <span className="rtl:rotate-180" aria-hidden>‹</span>&nbsp;{t.fiche.retour}
        </Link>
      </div>

      <Visuel programme={programme} className="h-52 rounded-3xl">
        <BoutonFavori id={programme.id} className="absolute end-3 top-3" />
        <div className="absolute bottom-3 start-3 flex flex-wrap gap-1.5">
          <BadgeFoncier programme={programme} />
          {lot ? <BadgeAide aide={lot.aide} /> : null}
        </div>
        {programme.exemple ? (
          <span className="absolute start-3 top-3 rounded-md bg-black/45 px-1.5 py-0.5 text-[11px] font-semibold uppercase tracking-wider text-white">{t.exemple}</span>
        ) : null}
      </Visuel>

      <header>
        <h1 className="font-display text-[28px] font-bold leading-tight">{programme.nom}</h1>
        <p className="text-[14.5px] text-muted">
          {programme.quartier} · {programme.adresse} ·{" "}
          {programme.livre ? t.fiche.livre : `${t.fiche.chantier(programme.avancementChantier)} · ${programme.livraisonPrevue ? t.fiche.livraison(trimestre(programme.livraisonPrevue, langue)) : ""}`}
        </p>
      </header>

      <div className="flex gap-2">
        {promoteur?.whatsapp ? (
          <a
            href={`https://wa.me/${promoteur.whatsapp.replace(/\D/g, "")}?text=${message}`}
            target="_blank"
            rel="noreferrer"
            className="flex min-h-12 flex-1 items-center justify-center rounded-xl bg-detroit font-semibold text-on-detroit"
          >
            {t.fiche.whatsapp}
          </a>
        ) : (
          <span className="flex min-h-12 flex-1 items-center justify-center rounded-xl bg-surface-2 text-[14px] font-semibold text-muted">
            {t.fiche.whatsappAbsent}
          </span>
        )}
        <Link href="/comparer" className="flex min-h-12 items-center rounded-xl bg-detroit-soft px-4 font-semibold text-detroit">
          {t.onglets.comparer}
          {comparaison.length ? ` (${comparaison.length})` : ""}
        </Link>
      </div>

      {!sur ? <p className="rounded-2xl bg-risk-soft p-3.5 text-[14.5px] font-semibold text-risk">{t.fiche.nonVerifieAlerte}</p> : null}

      <Section titre={t.fiche.securite}>
        <Ligne libelle={t.fiche.titreFoncier}>
          <BadgeFoncier programme={programme} />
        </Ligne>
        {programme.numeroTf ? <Ligne libelle={t.fiche.numeroTf}><span className="num">{programme.numeroTf}</span></Ligne> : null}
        {programme.conservationFonciere ? <Ligne libelle={t.fiche.conservation}>{programme.conservationFonciere}</Ligne> : null}
        <Ligne libelle={t.fiche.autorisation}>
          <BadgeConfiance confiance={programme.autorisationConstruire} />
        </Ligne>
        <Ligne libelle={t.fiche.garantie}>
          <BadgeConfiance confiance={programme.garantieAchevement} />
        </Ligne>
        {programme.dateVerificationTf && programme.sourceTf ? (
          <p className="text-[12.5px] text-muted">
            {t.fiche.verifieLe(formatDate(programme.dateVerificationTf, langue), programme.sourceTf)}
            {jours !== null ? ` · ${t.fiche.expire(jours)}` : ""}
          </p>
        ) : null}
      </Section>

      {lot && frais ? (
        <Section titre={t.fiche.votrePrix}>
          <BlocPrix prixTtc={lot.lot.prixTtc} aide={lot.aide} />
          {lot.aide.raisons.length > 0 ? (
            <ul className="grid gap-1 text-[13px] text-warn">
              {lot.aide.raisons.map((r) => (
                <li key={r}>• {t.aide.raisons[r]}</li>
              ))}
            </ul>
          ) : null}
          <div className="num grid gap-1 border-t border-line pt-2 text-[13.5px]">
            <div className="flex justify-between gap-3 text-muted">
              <span>{t.prix.frais}</span>
              <span>≈ {formatMad(frais.total, langue)}</span>
            </div>
            <div className="flex justify-between gap-3 font-semibold">
              <span>{t.prix.total}</span>
              <span>
                {formatMad(lot.aide.prixNet + frais.total, langue)} · ≈ {formatDevise(lot.aide.prixNet + frais.total, devise, catalogue.taux, langue)}
              </span>
            </div>
            <p className="text-[12px] text-muted">
              {t.prix.taux(devise, catalogue.taux[devise].toFixed(2), formatDate(catalogue.taux.date, langue))}
            </p>
          </div>
        </Section>
      ) : null}

      <Section titre={t.fiche.appartements}>
        <ul className="grid gap-2">
          {lots.map((e) => {
            const actif = e.lot.id === lot?.lot.id;
            const compare = comparaison.includes(e.lot.id);
            const plein = !compare && comparaison.length >= MAX_COMPARAISON;
            return (
              <li key={e.lot.id} className={`grid gap-2 rounded-xl border-[1.5px] p-3 ${actif ? "border-detroit bg-detroit-soft/40" : "border-line"}`}>
                <button type="button" onClick={() => setChoisi(e.lot.id)} aria-pressed={actif} className="grid gap-1 text-start">
                  <span className="flex flex-wrap items-baseline justify-between gap-2">
                    <span className="font-semibold">
                      {e.lot.surface} m² · {t.fiche.chambres(e.lot.chambres)} · {t.fiche.etage(e.lot.etage)}
                    </span>
                    <span className="num font-display text-[17px] font-bold">{formatMad(e.aide.prixNet, langue)}</span>
                  </span>
                  <span className="text-[13px] text-muted">
                    {t.vue[e.lot.vueMer]}
                    {e.lot.ascenseur ? ` · ${t.filtres.ascenseur}` : ""}
                    {e.lot.parking ? ` · ${t.filtres.parking}` : ""} · <span className="num">{formatMad(e.prixM2, langue)}{t.prix.m2}</span>
                  </span>
                </button>
                <div className="flex items-center justify-between gap-2">
                  <BadgeAide aide={e.aide} />
                  <button
                    type="button"
                    disabled={plein}
                    aria-pressed={compare}
                    onClick={() => majPrefs((p) => ({ ...p, comparaison: basculer(p.comparaison, e.lot.id) }))}
                    className={`min-h-9 rounded-full px-3 text-[13px] font-semibold disabled:opacity-40 ${compare ? "bg-detroit text-on-detroit" : "bg-detroit-soft text-detroit"}`}
                    title={plein ? t.comparer.max : undefined}
                  >
                    {compare ? `${t.fiche.compare} ✓` : `+ ${t.fiche.comparer}`}
                  </button>
                </div>
              </li>
            );
          })}
        </ul>
      </Section>

      {promoteur ? (
        <Section titre={t.fiche.promoteur}>
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="font-display text-[18px] font-bold">{promoteur.nom}</p>
              <p className="text-[13px] text-muted">
                {[
                  promoteur.anneeCreation ? t.fiche.fondeEn(promoteur.anneeCreation) : null,
                  t.fiche.livres(promoteur.projetsLivres),
                  promoteur.tfRemisATemps !== null ? t.fiche.tfATemps(promoteur.tfRemisATemps) : null,
                ]
                  .filter(Boolean)
                  .join(" · ")}
              </p>
            </div>
            <div className="text-end">
              <p className="text-[11px] font-semibold uppercase tracking-wider text-muted">{t.fiche.score}</p>
              {promoteur.scoreFiabilite !== null ? (
                <p className={`num font-display text-[24px] font-bold ${promoteur.scoreFiabilite >= 8 ? "text-ok" : promoteur.scoreFiabilite >= 6.5 ? "text-warn" : "text-risk"}`}>
                  {promoteur.scoreFiabilite.toLocaleString(langue === "ar" ? "ar-MA" : "fr-FR")}
                  <span className="text-[13px] text-muted">/10</span>
                </p>
              ) : (
                <p className="text-[13px] text-muted">{t.fiche.nonNote}</p>
              )}
            </div>
          </div>
        </Section>
      ) : null}

      {programme.description ? (
        <Section titre={t.fiche.description}>
          <p className="text-[15px]">{programme.description}</p>
        </Section>
      ) : null}

      <Section titre={t.fiche.checklist}>
        <ul className="grid gap-1.5 text-[14.5px]">
          {t.guide.checklist.map((d) => (
            <li key={d} className="flex gap-2">
              <span className="text-detroit" aria-hidden>□</span>
              {d}
            </li>
          ))}
        </ul>
        <Link href="/guide" className="text-[14px] font-semibold text-detroit">{t.profil.guide} ›</Link>
      </Section>

    </div>
  );
}
