"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/auth";
import { parseDateFlexible, parsePeriodicite } from "@/lib/import";
import { prochaineReference } from "@/lib/reference";

export type DoublonTrouve = { id: string; nom: string } | null;

/** Vérifie, pour chaque ligne du fichier, si un client très proche existe
 * déjà dans l'entreprise (même e-mail, ou même nom + téléphone). Ne modifie
 * rien : sert uniquement à construire l'aperçu avant import. */
export async function verifierDoublons(
  lignes: { index: number; nom: string; email: string; telephone: string }[],
): Promise<Record<number, DoublonTrouve>> {
  const { company } = await requireRole(["DIRIGEANT", "ADMINISTRATIF"]);

  const existants = await prisma.client.findMany({
    where: { companyId: company.id },
    select: { id: true, nom: true, email: true, telephone: true },
  });

  const parEmail = new Map(
    existants.filter((c) => c.email.trim()).map((c) => [c.email.trim().toLowerCase(), c]),
  );
  const parNomTel = new Map(
    existants
      .filter((c) => c.telephone.replace(/\D/g, ""))
      .map((c) => [`${c.nom.trim().toLowerCase()}|${c.telephone.replace(/\D/g, "")}`, c]),
  );

  const resultat: Record<number, DoublonTrouve> = {};
  for (const ligne of lignes) {
    const email = ligne.email.trim().toLowerCase();
    const tel = ligne.telephone.replace(/\D/g, "");
    const nomTel = `${ligne.nom.trim().toLowerCase()}|${tel}`;
    const trouve = (email && parEmail.get(email)) || (tel && parNomTel.get(nomTel)) || null;
    resultat[ligne.index] = trouve ? { id: trouve.id, nom: trouve.nom } : null;
  }
  return resultat;
}

export type LigneAImporter = {
  nom: string;
  adresse: string;
  codePostal: string;
  ville: string;
  telephone: string;
  email: string;
  notes: string;
  equipementType: string;
  equipementMarque: string;
  equipementModele: string;
  equipementNumeroSerie: string;
  equipementLocalisation: string;
  contratType: string;
  contratPeriodicite: string;
  contratMontant: string;
  contratDateDebut: string;
  contratDateEcheance: string;
};

export type ResultatImport = {
  clientsCrees: number;
  equipementsCrees: number;
  contratsCrees: number;
  erreurs: string[];
};

/** Importe les lignes retenues par l'utilisateur dans l'assistant d'import.
 * Chaque ligne peut créer un client seul, ou un client + son équipement +
 * son contrat en une fois si les colonnes correspondantes sont renseignées. */
export async function importerClients(lignes: LigneAImporter[]): Promise<ResultatImport> {
  const { company } = await requireRole(["DIRIGEANT", "ADMINISTRATIF"]);

  const resultat: ResultatImport = { clientsCrees: 0, equipementsCrees: 0, contratsCrees: 0, erreurs: [] };
  let contratsDejaCrees = 0;

  for (const ligne of lignes) {
    const nom = ligne.nom.trim();
    if (!nom) {
      resultat.erreurs.push("Ligne ignorée : nom manquant.");
      continue;
    }

    try {
      const client = await prisma.client.create({
        data: {
          companyId: company.id,
          nom,
          adresse: ligne.adresse.trim(),
          codePostal: ligne.codePostal.trim(),
          ville: ligne.ville.trim(),
          telephone: ligne.telephone.trim(),
          email: ligne.email.trim(),
          notes: ligne.notes.trim(),
          importeLe: new Date(),
        },
      });
      resultat.clientsCrees++;

      let equipementId: string | undefined;
      const aEquipement = ligne.equipementType || ligne.equipementMarque || ligne.equipementModele;
      if (aEquipement) {
        const equipement = await prisma.equipement.create({
          data: {
            companyId: company.id,
            clientId: client.id,
            type: ligne.equipementType.trim(),
            marque: ligne.equipementMarque.trim(),
            modele: ligne.equipementModele.trim(),
            numeroSerie: ligne.equipementNumeroSerie.trim(),
            localisation: ligne.equipementLocalisation.trim(),
          },
        });
        equipementId = equipement.id;
        resultat.equipementsCrees++;
      }

      if (ligne.contratDateEcheance) {
        const dateEcheance = parseDateFlexible(ligne.contratDateEcheance);
        if (!dateEcheance) {
          resultat.erreurs.push(`${nom} : date d'échéance illisible, contrat non créé.`);
        } else {
          const dateDebut = ligne.contratDateDebut ? parseDateFlexible(ligne.contratDateDebut) : new Date();
          const montant = ligne.contratMontant ? Math.round(Number(ligne.contratMontant.replace(",", ".")) * 100) : 0;
          const reference = await prochaineReference(company.id, contratsDejaCrees);
          await prisma.contrat.create({
            data: {
              companyId: company.id,
              reference,
              clientId: client.id,
              equipementId,
              type: ligne.contratType.trim() || "Entretien annuel",
              periodicite: parsePeriodicite(ligne.contratPeriodicite),
              montantCents: Number.isFinite(montant) ? montant : 0,
              dateDebut: dateDebut ?? new Date(),
              dateEcheance,
            },
          });
          contratsDejaCrees++;
          resultat.contratsCrees++;
        }
      }
    } catch {
      resultat.erreurs.push(`${nom} : erreur lors de l'import, ligne ignorée.`);
    }
  }

  revalidatePath("/tableau-de-bord/clients");
  revalidatePath("/tableau-de-bord/contrats");
  revalidatePath("/tableau-de-bord/renouvellements");
  return resultat;
}
