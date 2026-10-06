"use client";

import Link from "next/link";
import { BadgeAide, BadgeFoncier, Titre } from "@/components/ui";
import { useCatalogue } from "@/lib/client/catalogue";
import { useLangue } from "@/lib/client/langue";
import { majPrefs, usePrefs } from "@/lib/client/prefs";
import { evaluerLot, type LotEvalue } from "@/lib/filtres";
import type { Programme } from "@/lib/domain";
import { formatMad, formatNombre, trimestre } from "@/lib/format";

type Colonne = LotEvalue & { programme: Programme };

export default function Page() {
  const { t, langue } = useLangue();
  const { catalogue, aujourdHui } = useCatalogue();
  const { comparaison, profil } = usePrefs();

  const colonnes: Colonne[] = comparaison.flatMap((id) => {
    const lot = catalogue.lots.find((l) => l.id === id);
    const programme = lot && catalogue.programmes.find((p) => p.id === lot.programmeId);
    return lot && programme ? [{ ...evaluerLot(lot, programme, profil, catalogue, aujourdHui), programme }] : [];
  });

  if (colonnes.length === 0) {
    return (
      <div className="grid gap-4">
        <Titre>{t.comparer.titre}</Titre>
        <p className="rounded-2xl bg-surface-2 p-4 text-muted">{t.comparer.vide}</p>
      </div>
    );
  }

  const minNet = Math.min(...colonnes.map((c) => c.aide.prixNet));
  const minM2 = Math.min(...colonnes.map((c) => c.prixM2));
  const maxSurface = Math.max(...colonnes.map((c) => c.lot.surface));
  const rangVue = { aucune: 0, partielle: 1, degagee: 2 };
  const maxVue = Math.max(...colonnes.map((c) => rangVue[c.lot.vueMer]));
  const meilleur = (ok: boolean) => (ok && colonnes.length > 1 ? "font-bold text-ok" : "");
  const plusCher = colonnes.filter((c) => c.aide.prixNet > minNet).sort((a, b) => b.aide.prixNet - a.aide.prixNet)[0];

  const lignes: { libelle: string; cellule: (c: Colonne) => React.ReactNode }[] = [
    { libelle: t.comparer.lignes.prixNet, cellule: (c) => <span className={meilleur(c.aide.prixNet === minNet)}>{formatMad(c.aide.prixNet, langue)}</span> },
    { libelle: t.comparer.lignes.surface, cellule: (c) => <span className={meilleur(c.lot.surface === maxSurface)}>{c.lot.surface} m²</span> },
    { libelle: t.comparer.lignes.prixM2, cellule: (c) => <span className={meilleur(c.prixM2 === minM2)}>{formatNombre(c.prixM2, langue)}</span> },
    { libelle: t.comparer.lignes.foncier, cellule: (c) => <BadgeFoncier programme={c.programme} /> },
    { libelle: t.comparer.lignes.aide, cellule: (c) => <BadgeAide aide={c.aide} /> },
    { libelle: t.comparer.lignes.vue, cellule: (c) => <span className={meilleur(rangVue[c.lot.vueMer] === maxVue && maxVue > 0)}>{t.vue[c.lot.vueMer]}</span> },
    { libelle: t.comparer.lignes.etage, cellule: (c) => t.fiche.etage(c.lot.etage) },
    {
      libelle: t.comparer.lignes.livraison,
      cellule: (c) => (c.programme.livre ? <span className={meilleur(true)}>{t.fiche.livre}</span> : c.programme.livraisonPrevue ? trimestre(c.programme.livraisonPrevue, langue) : "?"),
    },
  ];

  return (
    <div className="grid gap-4">
      <Titre>{t.comparer.titre}</Titre>
      <div className="-mx-4 overflow-x-auto px-4">
        <table className="num w-full min-w-[520px] border-separate border-spacing-0 text-[14px]">
          <thead>
            <tr>
              <th className="w-24" />
              {colonnes.map((c) => (
                <th key={c.lot.id} className="px-2 pb-3 text-start align-top">
                  <Link href={`/programme/${c.programme.id}`} className="font-display text-[16px] font-bold leading-tight text-detroit">
                    {c.programme.nom}
                  </Link>
                  <p className="text-[12.5px] font-normal text-muted">{c.programme.quartier} · {t.fiche.chambres(c.lot.chambres)}</p>
                  <button
                    type="button"
                    onClick={() => majPrefs((p) => ({ ...p, comparaison: p.comparaison.filter((x) => x !== c.lot.id) }))}
                    className="mt-1 min-h-8 text-[12.5px] font-semibold text-risk"
                  >
                    {t.comparer.retirer}
                  </button>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {lignes.map((l) => (
              <tr key={l.libelle}>
                <th scope="row" className="border-t border-line py-2.5 pe-2 text-start align-top text-[12.5px] font-semibold text-muted">
                  {l.libelle}
                </th>
                {colonnes.map((c) => (
                  <td key={c.lot.id} className="border-t border-line px-2 py-2.5 align-top">
                    {l.cellule(c)}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {plusCher ? (
        <p className="num rounded-2xl bg-surface-2 p-3.5 text-[14.5px]">{t.comparer.surcout(plusCher.programme.nom, formatMad(plusCher.aide.prixNet - minNet, langue))}</p>
      ) : null}
    </div>
  );
}
