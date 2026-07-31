"use client";

import { useMemo, useRef, useState, useTransition } from "react";
import { enregistrerDevis, type DevisPayload } from "../actions";
import { calculerTotaux, TAUX_TVA, UNITES } from "@/lib/calcul";
import { formatCents, eurosToCents, quantiteToMilli } from "@/lib/money";
import { champ, label, btnPrimaire, btnSecondaire } from "@/lib/ui";

type LigneUI = {
  key: string;
  libelle: string;
  description: string;
  quantite: string;
  unite: string;
  prix: string; // euros HT
  tauxTva: number;
};

export type PrestationCatalogue = {
  id: string;
  libelle: string;
  description: string;
  unite: string;
  prixUnitaireCents: number;
  tauxTva: number;
};

export type DevisInitial = {
  objet: string;
  dateDevis: string; // yyyy-mm-dd
  dureeValidite: number;
  notes: string;
  conditions: string;
  lignes: LigneUI[];
};

const centsToEuros = (c: number) => (c / 100).toString().replace(".", ",");

export function DevisEditor({
  devisId,
  initial,
  prestations,
}: {
  devisId: string;
  initial: DevisInitial;
  prestations: PrestationCatalogue[];
}) {
  const compteur = useRef(0);
  const nouvelleCle = () => `l${compteur.current++}`;

  const [objet, setObjet] = useState(initial.objet);
  const [dateDevis, setDateDevis] = useState(initial.dateDevis);
  const [dureeValidite, setDureeValidite] = useState(initial.dureeValidite);
  const [notes, setNotes] = useState(initial.notes);
  const [conditions, setConditions] = useState(initial.conditions);
  // Les lignes initiales portent déjà leur clé (l'id en base, fourni par la page
  // serveur). Le compteur ne sert qu'aux lignes ajoutées ensuite (event handlers).
  const [lignes, setLignes] = useState<LigneUI[]>(initial.lignes);

  const [dirty, setDirty] = useState(false);
  const [pending, startTransition] = useTransition();
  const [message, setMessage] = useState<{ ok?: boolean; error?: string }>({});

  const marquerModifie = () => {
    setDirty(true);
    setMessage({});
  };

  const majLigne = (key: string, champModif: Partial<LigneUI>) => {
    setLignes((ls) => ls.map((l) => (l.key === key ? { ...l, ...champModif } : l)));
    marquerModifie();
  };

  const supprimerLigne = (key: string) => {
    setLignes((ls) => ls.filter((l) => l.key !== key));
    marquerModifie();
  };

  const ajouterLigneLibre = () => {
    setLignes((ls) => [
      ...ls,
      { key: nouvelleCle(), libelle: "", description: "", quantite: "1", unite: "u", prix: "", tauxTva: 20 },
    ]);
    marquerModifie();
  };

  const ajouterDepuisCatalogue = (id: string) => {
    const p = prestations.find((x) => x.id === id);
    if (!p) return;
    setLignes((ls) => [
      ...ls,
      {
        key: nouvelleCle(),
        libelle: p.libelle,
        description: p.description,
        quantite: "1",
        unite: p.unite,
        prix: centsToEuros(p.prixUnitaireCents),
        tauxTva: p.tauxTva,
      },
    ]);
    marquerModifie();
  };

  // Totaux calculés en direct.
  const totaux = useMemo(
    () =>
      calculerTotaux(
        lignes.map((l) => ({
          prixUnitaireCents: eurosToCents(l.prix),
          quantiteMilli: quantiteToMilli(l.quantite),
          tauxTva: l.tauxTva,
        })),
      ),
    [lignes],
  );

  const montantLigne = (l: LigneUI) =>
    Math.round((eurosToCents(l.prix) * quantiteToMilli(l.quantite)) / 1000);

  const enregistrer = () => {
    const payload: DevisPayload = {
      objet,
      dateDevis,
      dureeValidite,
      notes,
      conditions,
      lignes: lignes
        .filter((l) => l.libelle.trim() !== "")
        .map((l) => ({
          libelle: l.libelle.trim(),
          description: l.description.trim(),
          quantiteMilli: quantiteToMilli(l.quantite),
          unite: l.unite,
          prixUnitaireCents: eurosToCents(l.prix),
          tauxTva: l.tauxTva,
        })),
    };

    startTransition(async () => {
      const res = await enregistrerDevis(devisId, payload);
      setMessage(res);
      if (res.ok) setDirty(false);
    });
  };

  return (
    <div className="grid gap-6">
      {/* Méta */}
      <section className="rounded-card border border-line bg-card p-4 sm:p-5 grid gap-4">
        <div>
          <label className={label} htmlFor="objet">
            Objet des travaux
          </label>
          <input
            id="objet"
            value={objet}
            onChange={(e) => {
              setObjet(e.target.value);
              marquerModifie();
            }}
            className={champ}
            placeholder="Rénovation électrique appartement"
          />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className={label} htmlFor="dateDevis">
              Date du devis
            </label>
            <input
              id="dateDevis"
              type="date"
              value={dateDevis}
              onChange={(e) => {
                setDateDevis(e.target.value);
                marquerModifie();
              }}
              className={champ}
            />
          </div>
          <div>
            <label className={label} htmlFor="dureeValidite">
              Validité (jours)
            </label>
            <input
              id="dureeValidite"
              type="number"
              min={1}
              max={365}
              value={dureeValidite}
              onChange={(e) => {
                setDureeValidite(Number(e.target.value));
                marquerModifie();
              }}
              className={champ}
              inputMode="numeric"
            />
          </div>
        </div>
      </section>

      {/* Lignes */}
      <section>
        <h2 className="font-bold text-lg mb-3">Prestations</h2>
        <div className="grid gap-3">
          {lignes.length === 0 && (
            <p className="text-muted italic text-sm">
              Ajoutez une prestation depuis votre catalogue ou une ligne libre.
            </p>
          )}
          {lignes.map((l, index) => (
            <div key={l.key} className="rounded-card border border-line bg-card p-3 grid gap-2">
              <div className="flex items-center justify-between gap-2">
                <span className="text-xs font-semibold text-muted">Ligne {index + 1}</span>
                <button
                  type="button"
                  onClick={() => supprimerLigne(l.key)}
                  className="text-danger text-sm font-semibold hover:underline"
                >
                  Retirer
                </button>
              </div>
              <input
                value={l.libelle}
                onChange={(e) => majLigne(l.key, { libelle: e.target.value })}
                className={champ}
                placeholder="Désignation de la prestation"
              />
              <input
                value={l.description}
                onChange={(e) => majLigne(l.key, { description: e.target.value })}
                className={`${champ} !min-h-[40px] text-sm`}
                placeholder="Détail / précision (optionnel)"
              />
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                <LabelledMini libelle="Qté">
                  <input
                    value={l.quantite}
                    onChange={(e) => majLigne(l.key, { quantite: e.target.value })}
                    className={champ}
                    inputMode="decimal"
                  />
                </LabelledMini>
                <LabelledMini libelle="Unité">
                  <select
                    value={l.unite}
                    onChange={(e) => majLigne(l.key, { unite: e.target.value })}
                    className={champ}
                  >
                    {UNITES.map((u) => (
                      <option key={u} value={u}>
                        {u}
                      </option>
                    ))}
                  </select>
                </LabelledMini>
                <LabelledMini libelle="P.U. HT (€)">
                  <input
                    value={l.prix}
                    onChange={(e) => majLigne(l.key, { prix: e.target.value })}
                    className={champ}
                    inputMode="decimal"
                  />
                </LabelledMini>
                <LabelledMini libelle="TVA">
                  <select
                    value={l.tauxTva}
                    onChange={(e) => majLigne(l.key, { tauxTva: Number(e.target.value) })}
                    className={champ}
                  >
                    {TAUX_TVA.map((t) => (
                      <option key={t} value={t}>
                        {t} %
                      </option>
                    ))}
                  </select>
                </LabelledMini>
              </div>
              <div className="text-right text-sm">
                <span className="text-muted">Total HT ligne : </span>
                <span className="font-semibold tabular-nums">
                  {formatCents(montantLigne(l))}
                </span>
              </div>
            </div>
          ))}
        </div>

        <div className="mt-3 flex flex-col sm:flex-row gap-2">
          <select
            value=""
            onChange={(e) => {
              ajouterDepuisCatalogue(e.target.value);
              e.target.value = "";
            }}
            className={`${champ} sm:max-w-xs`}
          >
            <option value="" disabled>
              + Ajouter depuis le catalogue…
            </option>
            {prestations.map((p) => (
              <option key={p.id} value={p.id}>
                {p.libelle} — {formatCents(p.prixUnitaireCents)}/{p.unite}
              </option>
            ))}
          </select>
          <button type="button" onClick={ajouterLigneLibre} className={btnSecondaire}>
            + Ligne libre
          </button>
        </div>
      </section>

      {/* Totaux */}
      <section className="rounded-card border border-line bg-card p-4 sm:p-5">
        <dl className="grid gap-1.5 text-sm">
          <div className="flex justify-between">
            <dt className="text-muted">Total HT</dt>
            <dd className="font-semibold tabular-nums">{formatCents(totaux.totalHtCents)}</dd>
          </div>
          {totaux.ventilationTva.map((v) => (
            <div key={v.taux} className="flex justify-between text-muted">
              <dt>
                TVA {v.taux} % (sur {formatCents(v.baseHtCents)})
              </dt>
              <dd className="tabular-nums">{formatCents(v.montantTvaCents)}</dd>
            </div>
          ))}
          <div className="flex justify-between border-t border-line pt-2 mt-1 text-base">
            <dt className="font-bold">Total TTC</dt>
            <dd className="font-bold tabular-nums text-brand">
              {formatCents(totaux.totalTtcCents)}
            </dd>
          </div>
        </dl>
      </section>

      {/* Conditions / notes */}
      <section className="grid gap-4">
        <div>
          <label className={label} htmlFor="conditions">
            Conditions de règlement
          </label>
          <input
            id="conditions"
            value={conditions}
            onChange={(e) => {
              setConditions(e.target.value);
              marquerModifie();
            }}
            className={champ}
          />
        </div>
        <div>
          <label className={label} htmlFor="notes">
            Notes internes (non imprimées)
          </label>
          <textarea
            id="notes"
            rows={2}
            value={notes}
            onChange={(e) => {
              setNotes(e.target.value);
              marquerModifie();
            }}
            className={champ}
          />
        </div>
      </section>

      {/* Barre d'enregistrement */}
      <div className="no-print sticky bottom-20 sm:bottom-4 z-10">
        <div className="rounded-card border border-line bg-card/95 backdrop-blur px-4 py-3 flex items-center justify-between gap-3 shadow-sm">
          <div className="text-sm">
            {message.ok && <span className="text-ok font-semibold">✓ Enregistré</span>}
            {message.error && <span className="text-danger">{message.error}</span>}
            {!message.ok && !message.error && dirty && (
              <span className="text-muted">Modifications non enregistrées</span>
            )}
          </div>
          <button
            type="button"
            onClick={enregistrer}
            disabled={pending}
            className={btnPrimaire}
          >
            {pending ? "Enregistrement…" : "Enregistrer"}
          </button>
        </div>
      </div>
    </div>
  );
}

function LabelledMini({
  libelle,
  children,
}: {
  libelle: string;
  children: React.ReactNode;
}) {
  return (
    <label className="grid gap-1">
      <span className="text-[11px] font-semibold text-muted">{libelle}</span>
      {children}
    </label>
  );
}
