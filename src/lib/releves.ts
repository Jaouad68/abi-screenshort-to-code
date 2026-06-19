import { prisma } from "./prisma";
import { isConforme } from "./haccp";

export type CreateReleveInput = {
  userId: string;
  etablissementId: string;
  equipementId: string;
  valeur: number;
  commentaire?: string | null;
  /** Heure de saisie déclarée (mode hors-ligne). Optionnel. */
  saisiAt?: Date | null;
  horsLigne?: boolean;
};

export type CreateReleveResult =
  | { ok: false; reason: "EQUIPEMENT_INTROUVABLE" }
  | {
      ok: true;
      conforme: boolean;
      equipement: { nom: string; tempMin: number; tempMax: number };
      releveId: string;
    };

/**
 * Cœur de l'enregistrement d'un relevé (partagé par le server action et l'API
 * JSON utilisée par la file d'attente hors-ligne). Calcule la conformité côté
 * serveur et ouvre automatiquement une non-conformité tracée si hors plage.
 */
export async function createReleve(input: CreateReleveInput): Promise<CreateReleveResult> {
  const equipement = await prisma.equipement.findFirst({
    where: { id: input.equipementId, etablissementId: input.etablissementId },
  });
  if (!equipement) return { ok: false, reason: "EQUIPEMENT_INTROUVABLE" };

  const conforme = isConforme(input.valeur, equipement.tempMin, equipement.tempMax);

  const releve = await prisma.releveTemperature.create({
    data: {
      valeur: input.valeur,
      conforme,
      commentaire: input.commentaire || null,
      equipementId: equipement.id,
      utilisateurId: input.userId,
      saisiAt: input.saisiAt ?? null,
      horsLigne: input.horsLigne ?? false,
    },
  });

  if (!conforme) {
    await prisma.nonConformite.create({
      data: {
        type: "Température hors plage",
        description: `${equipement.nom} : ${input.valeur} °C relevé (plage cible ${equipement.tempMin} à ${equipement.tempMax} °C).`,
        etablissementId: input.etablissementId,
        utilisateurId: input.userId,
        releveId: releve.id,
      },
    });
  }

  return {
    ok: true,
    conforme,
    equipement: { nom: equipement.nom, tempMin: equipement.tempMin, tempMax: equipement.tempMax },
    releveId: releve.id,
  };
}
