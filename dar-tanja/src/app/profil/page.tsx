"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { Section, Titre } from "@/components/ui";
import { evaluerProfil } from "@/lib/aide";
import { useCatalogue } from "@/lib/client/catalogue";
import { choisirLangue, useLangue } from "@/lib/client/langue";
import { majPrefs, usePrefs } from "@/lib/client/prefs";
import { joursEntre } from "@/lib/foncier";
import { PROFIL_VIDE, type Devise, type ProfilAcheteur } from "@/lib/domain";
import { formatDate, formatMad, type Langue } from "@/lib/format";

const QUESTIONS: (keyof ProfilAcheteur)[] = ["mre", "possedeBienAuMaroc", "aideDejaPercue", "heritageEnCours"];
/** Au-delà de 6 mois, le barème doit être revérifié sur le portail officiel. */
const BAREME_ANCIEN_JOURS = 180;

function Choix<T extends string>({ valeur, options, onChange }: { valeur: T; options: [T, string][]; onChange: (v: T) => void }) {
  return (
    <div className="flex rounded-xl bg-surface-2 p-1">
      {options.map(([v, libelle]) => (
        <button
          key={v}
          type="button"
          aria-pressed={valeur === v}
          onClick={() => onChange(v)}
          className={`min-h-10 flex-1 rounded-lg px-3 text-[15px] font-semibold ${valeur === v ? "bg-surface text-detroit shadow" : "text-muted"}`}
        >
          {libelle}
        </button>
      ))}
    </div>
  );
}

export default function Page() {
  const { t, langue } = useLangue();
  const router = useRouter();
  const { catalogue, aujourdHui } = useCatalogue();
  const { profil, devise } = usePrefs();
  const statut = evaluerProfil(profil);
  const { regle } = catalogue;
  const baremeAncien = joursEntre(regle.verifieLe, aujourdHui) > BAREME_ANCIEN_JOURS;
  const tranches = [...regle.tranches].sort((a, b) => a.prixMax - b.prixMax);

  const repondre = (q: keyof ProfilAcheteur, v: boolean) => majPrefs((p) => ({ ...p, profil: { ...p.profil, [q]: v } }));

  return (
    <div className="grid gap-4">
      <Titre>{t.profil.titre}</Titre>

      <Section titre={t.profil.eligibilite}>
        <div className="flex gap-1" aria-hidden>
          {QUESTIONS.map((q) => (
            <i key={q} className={`h-1 flex-1 rounded ${profil[q] === null ? "bg-surface-2" : "bg-detroit"}`} />
          ))}
        </div>
        <ol className="grid gap-4">
          {QUESTIONS.map((q) => (
            <li key={q} className="grid gap-2">
              <p className="text-[15.5px] font-semibold">{t.profil.questions[q]}</p>
              <div className="flex gap-2">
                {[true, false].map((v) => (
                  <button
                    key={String(v)}
                    type="button"
                    aria-pressed={profil[q] === v}
                    onClick={() => repondre(q, v)}
                    className={`min-h-11 flex-1 rounded-xl border-[1.5px] font-semibold ${
                      profil[q] === v ? "border-detroit bg-detroit text-on-detroit" : "border-line bg-surface"
                    }`}
                  >
                    {v ? t.profil.oui : t.profil.non}
                  </button>
                ))}
              </div>
            </li>
          ))}
        </ol>

        <div
          className={`mt-2 grid gap-1 rounded-2xl p-4 text-center ${
            statut === "eligible" ? "bg-safran-soft text-safran" : statut === "a_verifier" ? "bg-warn-soft text-warn" : "bg-risk-soft text-risk"
          }`}
          role="status"
        >
          <p className="text-[12px] font-semibold uppercase tracking-wider">{t.profil.resultat}</p>
          <p className="font-display text-[24px] font-bold">{t.aide.statut[statut]}</p>
          {statut !== "non_eligible" ? (
            <ul className="num grid gap-0.5 text-[14px] text-ink">
              {tranches.map((tr) => (
                <li key={tr.prixMax}>{t.profil.montant(formatMad(tr.aide, langue), formatMad(tr.prixMax, langue))}</li>
              ))}
            </ul>
          ) : null}
        </div>
        <p className="text-[13px] text-muted">
          {t.profil.bareme(formatDate(regle.verifieLe, langue))}. {t.profil.decision}
        </p>
        {baremeAncien ? <p className="text-[13px] font-semibold text-warn">{t.profil.baremeAncien}</p> : null}
        <div className="flex flex-wrap gap-3">
          <a href={regle.lienOfficiel} target="_blank" rel="noreferrer" className="min-h-11 content-center font-semibold text-detroit">
            {t.profil.portail} ↗
          </a>
          <button type="button" onClick={() => majPrefs((p) => ({ ...p, profil: PROFIL_VIDE }))} className="min-h-11 font-semibold text-muted">
            {t.profil.effacer}
          </button>
        </div>
      </Section>

      <Section titre={t.profil.langue}>
        <Choix<Langue>
          valeur={langue}
          options={[["fr", "Français"], ["ar", "العربية"]]}
          onChange={(l) => {
            choisirLangue(l);
            router.refresh();
          }}
        />
      </Section>

      <Section titre={t.profil.devise}>
        <Choix<Devise>
          valeur={devise}
          options={[["EUR", "€ EUR"], ["USD", "$ USD"], ["CAD", "$ CAD"]]}
          onChange={(d) => majPrefs((p) => ({ ...p, devise: d }))}
        />
      </Section>

      <Link href="/guide" className="carte-ombre flex min-h-14 items-center justify-between rounded-2xl border border-line bg-surface px-4 font-semibold text-detroit">
        {t.profil.guide}
        <span className="rtl:rotate-180" aria-hidden>›</span>
      </Link>
    </div>
  );
}
