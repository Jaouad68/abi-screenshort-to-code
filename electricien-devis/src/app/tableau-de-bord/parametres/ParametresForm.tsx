"use client";

import { useActionState } from "react";
import type { Company } from "@/generated/prisma/client";
import { enregistrerParametres, type ParametresState } from "./actions";
import { champ, label, btnPrimaire, carte } from "@/lib/ui";

const initialState: ParametresState = {};

export function ParametresForm({ company }: { company: Company }) {
  const [state, formAction, pending] = useActionState(
    enregistrerParametres,
    initialState,
  );

  return (
    <form action={formAction} className="flex flex-col gap-6">
      <section className={carte}>
        <h2 className="font-bold text-lg mb-4">Identité de l’entreprise</h2>
        <div className="grid gap-4">
          <Field name="nom" libelle="Nom de l'entreprise" defaultValue={company.nom} required />
          <Field name="adresse" libelle="Adresse" defaultValue={company.adresse} />
          <div className="grid grid-cols-3 gap-3">
            <Field name="codePostal" libelle="Code postal" defaultValue={company.codePostal} />
            <div className="col-span-2">
              <Field name="ville" libelle="Ville" defaultValue={company.ville} />
            </div>
          </div>
          <div className="grid sm:grid-cols-2 gap-3">
            <Field name="telephone" libelle="Téléphone" defaultValue={company.telephone} inputMode="tel" />
            <Field name="email" libelle="E-mail" defaultValue={company.email} inputMode="email" />
          </div>
        </div>
      </section>

      <section className={carte}>
        <h2 className="font-bold text-lg mb-4">Mentions légales (en-tête du devis)</h2>
        <div className="grid gap-4">
          <div className="grid sm:grid-cols-2 gap-3">
            <Field name="siret" libelle="N° SIRET" defaultValue={company.siret} />
            <Field name="tvaIntra" libelle="N° TVA intracommunautaire" defaultValue={company.tvaIntra} />
          </div>
          <Field name="assurance" libelle="Assurance décennale" defaultValue={company.assurance} />
          <Field name="iban" libelle="IBAN (optionnel, pour le règlement)" defaultValue={company.iban} />
        </div>
      </section>

      <section className={carte}>
        <h2 className="font-bold text-lg mb-4">Paramètres des devis</h2>
        <div className="grid gap-4">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <Field name="prefixeDevis" libelle="Préfixe devis" defaultValue={company.prefixeDevis} required />
            <Field name="prefixeFacture" libelle="Préfixe facture" defaultValue={company.prefixeFacture} required />
            <div>
              <label className={label} htmlFor="tauxTvaDefaut">
                TVA par défaut (%)
              </label>
              <input
                id="tauxTvaDefaut"
                name="tauxTvaDefaut"
                type="number"
                min={0}
                max={20}
                step={1}
                defaultValue={company.tauxTvaDefaut}
                className={champ}
                inputMode="numeric"
              />
            </div>
            <div>
              <label className={label} htmlFor="dureeValidite">
                Validité (jours)
              </label>
              <input
                id="dureeValidite"
                name="dureeValidite"
                type="number"
                min={1}
                max={365}
                step={1}
                defaultValue={company.dureeValidite}
                className={champ}
                inputMode="numeric"
              />
            </div>
            <div>
              <label className={label} htmlFor="relanceJours">
                Relance après (jours)
              </label>
              <input
                id="relanceJours"
                name="relanceJours"
                type="number"
                min={1}
                max={90}
                step={1}
                defaultValue={company.relanceJours}
                className={champ}
                inputMode="numeric"
              />
            </div>
          </div>
          <div>
            <label className={label} htmlFor="mentionsLegales">
              Mentions légales imprimées en bas de devis
            </label>
            <textarea
              id="mentionsLegales"
              name="mentionsLegales"
              rows={4}
              defaultValue={company.mentionsLegales}
              className={champ}
            />
          </div>
        </div>
      </section>

      <div className="flex items-center gap-4 sticky bottom-20 sm:static">
        <button type="submit" disabled={pending} className={btnPrimaire}>
          {pending ? "Enregistrement…" : "Enregistrer"}
        </button>
        {state.ok && <span className="text-ok text-sm font-semibold">✓ Enregistré</span>}
        {state.error && <span className="text-danger text-sm">{state.error}</span>}
      </div>
    </form>
  );
}

function Field({
  name,
  libelle,
  defaultValue,
  required,
  inputMode,
}: {
  name: string;
  libelle: string;
  defaultValue: string;
  required?: boolean;
  inputMode?: "tel" | "email" | "text";
}) {
  return (
    <div>
      <label className={label} htmlFor={name}>
        {libelle}
      </label>
      <input
        id={name}
        name={name}
        defaultValue={defaultValue}
        required={required}
        inputMode={inputMode}
        className={champ}
      />
    </div>
  );
}
