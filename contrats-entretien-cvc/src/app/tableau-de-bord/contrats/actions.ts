"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/auth";
import { parseInputDate } from "@/lib/date";
import { eurosToCents } from "@/lib/money";
import { prochaineReference } from "@/lib/reference";

const PERIODICITES = ["MENSUELLE", "TRIMESTRIELLE", "SEMESTRIELLE", "ANNUELLE", "BIENNALE", "AUTRE"] as const;

const schema = z.object({
  clientId: z.string().trim().min(1, "Sélectionnez un client."),
  equipementId: z.string().trim(),
  type: z.string().trim().min(1, "Le type de contrat est obligatoire."),
  periodicite: z.enum(PERIODICITES),
  montant: z.string().trim(),
  dateDebut: z.string().trim().min(1, "La date de début est obligatoire."),
  dateEcheance: z.string().trim().min(1, "La date d'échéance est obligatoire."),
  notes: z.string().trim(),
});

export type ContratFormState = {
  ok?: boolean;
  error?: string;
};

function lire(formData: FormData) {
  return schema.safeParse({
    clientId: formData.get("clientId"),
    equipementId: formData.get("equipementId"),
    type: formData.get("type"),
    periodicite: formData.get("periodicite"),
    montant: formData.get("montant"),
    dateDebut: formData.get("dateDebut"),
    dateEcheance: formData.get("dateEcheance"),
    notes: formData.get("notes"),
  });
}

export async function creerContrat(
  _prev: ContratFormState,
  formData: FormData,
): Promise<ContratFormState> {
  const { company } = await requireRole(["DIRIGEANT", "ADMINISTRATIF"]);
  const parsed = lire(formData);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Formulaire invalide." };
  }
  const { clientId, equipementId, montant, dateDebut, dateEcheance, ...reste } = parsed.data;

  const client = await prisma.client.findFirst({ where: { id: clientId, companyId: company.id } });
  if (!client) return { error: "Client introuvable." };

  const debut = parseInputDate(dateDebut);
  const echeance = parseInputDate(dateEcheance);
  if (!debut || !echeance) return { error: "Dates invalides." };

  const reference = await prochaineReference(company.id);

  const contrat = await prisma.contrat.create({
    data: {
      companyId: company.id,
      reference,
      clientId,
      equipementId: equipementId || null,
      montantCents: eurosToCents(montant || "0"),
      dateDebut: debut,
      dateEcheance: echeance,
      ...reste,
    },
  });

  revalidatePath("/tableau-de-bord/contrats");
  revalidatePath("/tableau-de-bord/renouvellements");
  revalidatePath(`/tableau-de-bord/clients/${clientId}`);
  redirect(`/tableau-de-bord/contrats/${contrat.id}`);
}

export async function modifierContrat(
  id: string,
  _prev: ContratFormState,
  formData: FormData,
): Promise<ContratFormState> {
  const { company } = await requireRole(["DIRIGEANT", "ADMINISTRATIF"]);
  const parsed = lire(formData);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Formulaire invalide." };
  }
  const { clientId, equipementId, montant, dateDebut, dateEcheance, ...reste } = parsed.data;

  const debut = parseInputDate(dateDebut);
  const echeance = parseInputDate(dateEcheance);
  if (!debut || !echeance) return { error: "Dates invalides." };

  const res = await prisma.contrat.updateMany({
    where: { id, companyId: company.id },
    data: {
      clientId,
      equipementId: equipementId || null,
      montantCents: eurosToCents(montant || "0"),
      dateDebut: debut,
      dateEcheance: echeance,
      ...reste,
    },
  });
  if (res.count === 0) return { error: "Contrat introuvable." };

  revalidatePath(`/tableau-de-bord/contrats/${id}`);
  revalidatePath("/tableau-de-bord/contrats");
  revalidatePath("/tableau-de-bord/renouvellements");
  return { ok: true };
}

export async function basculerActifContrat(id: string, actif: boolean) {
  const { company } = await requireRole(["DIRIGEANT", "ADMINISTRATIF"]);
  await prisma.contrat.updateMany({ where: { id, companyId: company.id }, data: { actif } });
  revalidatePath(`/tableau-de-bord/contrats/${id}`);
  revalidatePath("/tableau-de-bord/contrats");
  revalidatePath("/tableau-de-bord/renouvellements");
}

export async function supprimerContrat(id: string) {
  const { company } = await requireRole(["DIRIGEANT", "ADMINISTRATIF"]);
  const contrat = await prisma.contrat.findFirst({ where: { id, companyId: company.id } });
  if (!contrat) redirect("/tableau-de-bord/contrats");

  const nbInterventions = await prisma.intervention.count({ where: { contratId: id, companyId: company.id } });
  if (nbInterventions > 0) {
    redirect(`/tableau-de-bord/contrats/${id}?erreur=interventions`);
  }

  await prisma.contrat.deleteMany({ where: { id, companyId: company.id } });
  revalidatePath("/tableau-de-bord/contrats");
  redirect("/tableau-de-bord/contrats");
}
