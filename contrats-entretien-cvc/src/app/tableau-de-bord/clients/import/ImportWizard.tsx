"use client";

import { useMemo, useRef, useState, useTransition } from "react";
import Link from "next/link";
import { parseClientsCsv, modeleCsv, type LigneImport } from "@/lib/import";
import { verifierDoublons, importerClients, type DoublonTrouve, type ResultatImport } from "./actions";
import { btnPrimaire, btnSecondaire, carte } from "@/lib/ui";

export function ImportWizard() {
  const [lignes, setLignes] = useState<LigneImport[] | null>(null);
  const [entetesInconnues, setEntetesInconnues] = useState<string[]>([]);
  const [doublons, setDoublons] = useState<Record<number, DoublonTrouve>>({});
  const [selection, setSelection] = useState<Record<number, boolean>>({});
  const [resultat, setResultat] = useState<ResultatImport | null>(null);
  const [erreurFichier, setErreurFichier] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const inputRef = useRef<HTMLInputElement>(null);

  const nbSelectionnees = useMemo(
    () => Object.values(selection).filter(Boolean).length,
    [selection],
  );

  function telechargerModele() {
    const blob = new Blob([modeleCsv()], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "modele-import-clients.csv";
    a.click();
    URL.revokeObjectURL(url);
  }

  function onFichier(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setErreurFichier(null);
    setResultat(null);

    const reader = new FileReader();
    reader.onload = () => {
      const texte = String(reader.result ?? "");
      const { lignes: parsees, entetesInconnues } = parseClientsCsv(texte);
      if (parsees.length === 0) {
        setErreurFichier("Aucune ligne exploitable trouvée dans ce fichier.");
        setLignes(null);
        return;
      }
      setLignes(parsees);
      setEntetesInconnues(entetesInconnues);
      const initiale: Record<number, boolean> = {};
      parsees.forEach((l) => {
        initiale[l.index] = l.erreurs.length === 0;
      });
      setSelection(initiale);

      startTransition(async () => {
        const res = await verifierDoublons(
          parsees.map((l) => ({
            index: l.index,
            nom: l.valeurs.nom ?? "",
            email: l.valeurs.email ?? "",
            telephone: l.valeurs.telephone ?? "",
          })),
        );
        setDoublons(res);
        // Désélectionne par défaut les doublons probables : l'utilisateur décide.
        setSelection((prev) => {
          const next = { ...prev };
          for (const [idx, d] of Object.entries(res)) {
            if (d) next[Number(idx)] = false;
          }
          return next;
        });
      });
    };
    reader.readAsText(file, "utf-8");
  }

  function toutBasculer(valeur: boolean) {
    if (!lignes) return;
    const next: Record<number, boolean> = {};
    lignes.forEach((l) => {
      next[l.index] = valeur && l.erreurs.length === 0;
    });
    setSelection(next);
  }

  function confirmerImport() {
    if (!lignes) return;
    const aEnvoyer = lignes
      .filter((l) => selection[l.index] && l.erreurs.length === 0)
      .map((l) => ({
        nom: l.valeurs.nom ?? "",
        adresse: l.valeurs.adresse ?? "",
        codePostal: l.valeurs.codePostal ?? "",
        ville: l.valeurs.ville ?? "",
        telephone: l.valeurs.telephone ?? "",
        email: l.valeurs.email ?? "",
        notes: l.valeurs.notes ?? "",
        equipementType: l.valeurs.equipementType ?? "",
        equipementMarque: l.valeurs.equipementMarque ?? "",
        equipementModele: l.valeurs.equipementModele ?? "",
        equipementNumeroSerie: l.valeurs.equipementNumeroSerie ?? "",
        equipementLocalisation: l.valeurs.equipementLocalisation ?? "",
        contratType: l.valeurs.contratType ?? "",
        contratPeriodicite: l.valeurs.contratPeriodicite ?? "",
        contratMontant: l.valeurs.contratMontant ?? "",
        contratDateDebut: l.valeurs.contratDateDebut ?? "",
        contratDateEcheance: l.valeurs.contratDateEcheance ?? "",
      }));

    startTransition(async () => {
      const res = await importerClients(aEnvoyer);
      setResultat(res);
      setLignes(null);
    });
  }

  return (
    <div className="flex flex-col gap-6">
      <section className={carte}>
        <h2 className="font-bold text-ink mb-2">1. Choisir un fichier CSV</h2>
        <p className="text-sm text-muted mb-4">
          Colonnes reconnues : Nom (obligatoire), Adresse, Code postal, Ville,
          Téléphone, Email, Notes, et en option Équipement / Marque / Modèle /
          N° série / Type de contrat / Périodicité / Montant / Date de début /
          Date d&apos;échéance. L&apos;ordre des colonnes n&apos;a pas
          d&apos;importance.
        </p>
        <div className="flex flex-wrap items-center gap-3">
          <input
            ref={inputRef}
            type="file"
            accept=".csv,text/csv"
            onChange={onFichier}
            className="text-sm"
          />
          <button type="button" onClick={telechargerModele} className={btnSecondaire}>
            Télécharger un exemple
          </button>
        </div>
        {erreurFichier && <p className="text-danger text-sm mt-3">{erreurFichier}</p>}
        {entetesInconnues.length > 0 && (
          <p className="text-xs text-muted mt-3">
            Colonnes non reconnues, ignorées : {entetesInconnues.join(", ")}
          </p>
        )}
      </section>

      {lignes && (
        <section className={carte}>
          <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
            <h2 className="font-bold text-ink">
              2. Aperçu — {lignes.length} ligne(s), {nbSelectionnees} sélectionnée(s)
            </h2>
            <div className="flex gap-2">
              <button type="button" onClick={() => toutBasculer(true)} className={btnSecondaire}>
                Tout cocher
              </button>
              <button type="button" onClick={() => toutBasculer(false)} className={btnSecondaire}>
                Tout décocher
              </button>
            </div>
          </div>

          <div className="overflow-x-auto -mx-5 sm:mx-0">
            <table className="w-full text-sm min-w-[720px]">
              <thead>
                <tr className="text-left text-muted border-b border-line">
                  <th className="py-2 px-2"></th>
                  <th className="py-2 px-2">Client</th>
                  <th className="py-2 px-2">Contact</th>
                  <th className="py-2 px-2">Équipement</th>
                  <th className="py-2 px-2">Contrat</th>
                  <th className="py-2 px-2">Statut</th>
                </tr>
              </thead>
              <tbody>
                {lignes.map((l) => {
                  const doublon = doublons[l.index];
                  return (
                    <tr key={l.index} className="border-b border-line/60 align-top">
                      <td className="py-2 px-2">
                        <input
                          type="checkbox"
                          checked={!!selection[l.index]}
                          disabled={l.erreurs.length > 0}
                          onChange={(e) =>
                            setSelection((prev) => ({ ...prev, [l.index]: e.target.checked }))
                          }
                        />
                      </td>
                      <td className="py-2 px-2">
                        <p className="font-semibold text-ink">{l.valeurs.nom || "—"}</p>
                        <p className="text-xs text-muted">
                          {[l.valeurs.ville].filter(Boolean).join(" ")}
                        </p>
                      </td>
                      <td className="py-2 px-2 text-xs">
                        <p>{l.valeurs.telephone || "—"}</p>
                        <p>{l.valeurs.email || "—"}</p>
                      </td>
                      <td className="py-2 px-2 text-xs">{l.valeurs.equipementType || "—"}</td>
                      <td className="py-2 px-2 text-xs">
                        {l.valeurs.contratDateEcheance ? (
                          <>
                            <p>{l.valeurs.contratType || "Entretien"}</p>
                            <p className="text-muted">Échéance {l.valeurs.contratDateEcheance}</p>
                          </>
                        ) : (
                          "—"
                        )}
                      </td>
                      <td className="py-2 px-2 text-xs">
                        {l.erreurs.length > 0 ? (
                          <span className="text-danger font-semibold">{l.erreurs.join(" ")}</span>
                        ) : doublon ? (
                          <span className="text-accent-d font-semibold">
                            Doublon probable : {doublon.nom}
                          </span>
                        ) : (
                          <span className="text-ok font-semibold">Nouveau</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          <div className="mt-5">
            <button
              type="button"
              onClick={confirmerImport}
              disabled={pending || nbSelectionnees === 0}
              className={btnPrimaire}
            >
              {pending ? "Import en cours…" : `Importer ${nbSelectionnees} client(s)`}
            </button>
          </div>
        </section>
      )}

      {resultat && (
        <section className={`${carte} border-ok/40`}>
          <h2 className="font-bold text-ink mb-2">Import terminé</h2>
          <ul className="text-sm text-ink-2 mb-3 list-disc list-inside">
            <li>{resultat.clientsCrees} client(s) créé(s)</li>
            <li>{resultat.equipementsCrees} équipement(s) créé(s)</li>
            <li>{resultat.contratsCrees} contrat(s) créé(s)</li>
          </ul>
          {resultat.erreurs.length > 0 && (
            <ul className="text-sm text-danger list-disc list-inside mb-3">
              {resultat.erreurs.map((e, i) => (
                <li key={i}>{e}</li>
              ))}
            </ul>
          )}
          <div className="flex gap-3">
            <Link href="/tableau-de-bord/clients" className={btnPrimaire}>
              Voir les clients
            </Link>
            <button
              type="button"
              onClick={() => {
                setResultat(null);
                if (inputRef.current) inputRef.current.value = "";
                inputRef.current?.click();
              }}
              className={btnSecondaire}
            >
              Importer un autre fichier
            </button>
          </div>
        </section>
      )}
    </div>
  );
}
