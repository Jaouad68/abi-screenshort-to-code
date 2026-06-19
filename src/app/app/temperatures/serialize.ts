import type { ReleveView } from "./ReleveItem";

// Type minimal attendu depuis Prisma (relations incluses).
type ReleveWithRelations = {
  id: string;
  valeur: number;
  conforme: boolean;
  createdAt: Date;
  saisiAt: Date | null;
  horsLigne: boolean;
  equipement: { nom: string; type: string };
  utilisateur: { nom: string };
  correction:
    | {
        valeur: number;
        conforme: boolean;
        createdAt: Date;
        motifCorrection: string | null;
        utilisateur: { nom: string };
      }
    | null;
};

export function toReleveView(r: ReleveWithRelations): ReleveView {
  return {
    id: r.id,
    valeur: r.valeur,
    conforme: r.conforme,
    createdAt: r.createdAt.toISOString(),
    saisiAt: r.saisiAt ? r.saisiAt.toISOString() : null,
    horsLigne: r.horsLigne,
    equipementNom: r.equipement.nom,
    equipementType: r.equipement.type,
    utilisateurNom: r.utilisateur.nom,
    correction: r.correction
      ? {
          valeur: r.correction.valeur,
          conforme: r.correction.conforme,
          createdAt: r.correction.createdAt.toISOString(),
          utilisateurNom: r.correction.utilisateur.nom,
          motif: r.correction.motifCorrection,
        }
      : null,
  };
}
