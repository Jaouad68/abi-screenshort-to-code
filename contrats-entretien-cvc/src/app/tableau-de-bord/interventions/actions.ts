"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { requireRole, requireUser } from "@/lib/auth";
import { peutGererActivite } from "@/lib/permissions";
import { CHECKLIST_ENTRETIEN_DEFAUT } from "@/lib/defaults";

const MAX_PHOTOS = 12;
// ~2.5 Mo en base64 (photo déjà compressée côté client avant envoi).
const MAX_PHOTO_LENGTH = 2_500_000;

/** Vérifie que l'utilisateur connecté peut agir sur cette intervention :
 * dirigeant/administratif (toute l'entreprise), ou le technicien qui y est
 * affecté. Renvoie l'intervention si l'accès est autorisé, sinon `null`. */
async function accesIntervention(interventionId: string) {
  const { user, company } = await requireUser();
  const intervention = await prisma.intervention.findFirst({
    where: { id: interventionId, companyId: company.id },
  });
  if (!intervention) return null;
  const autorise = peutGererActivite(user.role) || intervention.technicienId === user.id;
  return autorise ? { intervention, user, company } : null;
}

function revalider(id: string) {
  revalidatePath(`/tableau-de-bord/interventions/${id}`);
  revalidatePath("/tableau-de-bord/interventions");
  revalidatePath("/tableau-de-bord");
}

// --- Création / planification (dirigeant, administratif) ---------------

const schemaCreation = z.object({
  clientId: z.string().trim().min(1, "Sélectionnez un client."),
  equipementId: z.string().trim(),
  contratId: z.string().trim(),
  titre: z.string().trim().min(1, "Le titre est obligatoire."),
  datePrevue: z.string().trim().min(1, "La date est obligatoire."),
  technicienId: z.string().trim(),
});

export type InterventionFormState = { ok?: boolean; error?: string };

export async function creerIntervention(
  _prev: InterventionFormState,
  formData: FormData,
): Promise<InterventionFormState> {
  const { company } = await requireRole(["DIRIGEANT", "ADMINISTRATIF"]);

  const parsed = schemaCreation.safeParse({
    clientId: formData.get("clientId"),
    equipementId: formData.get("equipementId"),
    contratId: formData.get("contratId"),
    titre: formData.get("titre"),
    datePrevue: formData.get("datePrevue"),
    technicienId: formData.get("technicienId"),
  });
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Formulaire invalide." };

  const client = await prisma.client.findFirst({ where: { id: parsed.data.clientId, companyId: company.id } });
  if (!client) return { error: "Client introuvable." };

  const datePrevue = new Date(parsed.data.datePrevue);
  if (Number.isNaN(datePrevue.getTime())) return { error: "Date invalide." };

  const intervention = await prisma.intervention.create({
    data: {
      companyId: company.id,
      clientId: parsed.data.clientId,
      equipementId: parsed.data.equipementId || null,
      contratId: parsed.data.contratId || null,
      titre: parsed.data.titre,
      datePrevue,
      technicienId: parsed.data.technicienId || null,
      checklist: {
        create: CHECKLIST_ENTRETIEN_DEFAUT.map((libelle, ordre) => ({ libelle, ordre })),
      },
    },
  });

  revalider(intervention.id);
  redirect(`/tableau-de-bord/interventions/${intervention.id}`);
}

const schemaPlanification = z.object({
  titre: z.string().trim().min(1, "Le titre est obligatoire."),
  datePrevue: z.string().trim().min(1, "La date est obligatoire."),
  technicienId: z.string().trim(),
});

export async function modifierPlanification(
  id: string,
  _prev: InterventionFormState,
  formData: FormData,
): Promise<InterventionFormState> {
  const { company } = await requireRole(["DIRIGEANT", "ADMINISTRATIF"]);
  const parsed = schemaPlanification.safeParse({
    titre: formData.get("titre"),
    datePrevue: formData.get("datePrevue"),
    technicienId: formData.get("technicienId"),
  });
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Formulaire invalide." };

  const datePrevue = new Date(parsed.data.datePrevue);
  if (Number.isNaN(datePrevue.getTime())) return { error: "Date invalide." };

  const res = await prisma.intervention.updateMany({
    where: { id, companyId: company.id },
    data: { titre: parsed.data.titre, datePrevue, technicienId: parsed.data.technicienId || null },
  });
  if (res.count === 0) return { error: "Intervention introuvable." };

  revalider(id);
  return { ok: true };
}

export async function supprimerIntervention(id: string) {
  const { company } = await requireRole(["DIRIGEANT", "ADMINISTRATIF"]);
  await prisma.intervention.deleteMany({ where: { id, companyId: company.id } });
  revalidatePath("/tableau-de-bord/interventions");
  redirect("/tableau-de-bord/interventions");
}

// --- Suivi terrain (dirigeant/administratif, ou le technicien affecté) --

export async function changerStatutIntervention(
  id: string,
  statut: "PLANIFIEE" | "EN_COURS" | "TERMINEE" | "ANNULEE",
) {
  const ctx = await accesIntervention(id);
  if (!ctx) return;
  await prisma.intervention.update({
    where: { id },
    data: { statut, termineeLe: statut === "TERMINEE" ? new Date() : null },
  });
  revalider(id);
}

export async function enregistrerCommentaires(id: string, commentaires: string) {
  const ctx = await accesIntervention(id);
  if (!ctx) return;
  await prisma.intervention.update({ where: { id }, data: { commentaires: commentaires.slice(0, 5000) } });
  revalider(id);
}

export async function basculerChecklistItem(itemId: string, fait: boolean) {
  const item = await prisma.interventionChecklistItem.findUnique({ where: { id: itemId } });
  if (!item) return;
  const ctx = await accesIntervention(item.interventionId);
  if (!ctx) return;
  await prisma.interventionChecklistItem.update({ where: { id: itemId }, data: { fait } });
  revalider(item.interventionId);
}

export async function ajouterLigneChecklist(interventionId: string, libelle: string) {
  const ctx = await accesIntervention(interventionId);
  if (!ctx || !libelle.trim()) return;
  const dernier = await prisma.interventionChecklistItem.count({ where: { interventionId } });
  await prisma.interventionChecklistItem.create({
    data: { interventionId, libelle: libelle.trim(), ordre: dernier },
  });
  revalider(interventionId);
}

export async function supprimerLigneChecklist(itemId: string) {
  const item = await prisma.interventionChecklistItem.findUnique({ where: { id: itemId } });
  if (!item) return;
  const ctx = await accesIntervention(item.interventionId);
  if (!ctx) return;
  await prisma.interventionChecklistItem.delete({ where: { id: itemId } });
  revalider(item.interventionId);
}

export type PhotoActionResult = { ok?: boolean; error?: string };

export async function ajouterPhoto(interventionId: string, dataUrl: string, legende: string): Promise<PhotoActionResult> {
  const ctx = await accesIntervention(interventionId);
  if (!ctx) return { error: "Accès refusé." };
  if (!dataUrl.startsWith("data:image/")) return { error: "Format d'image invalide." };
  if (dataUrl.length > MAX_PHOTO_LENGTH) return { error: "Photo trop volumineuse." };

  const nb = await prisma.interventionPhoto.count({ where: { interventionId } });
  if (nb >= MAX_PHOTOS) return { error: `Maximum ${MAX_PHOTOS} photos par intervention.` };

  await prisma.interventionPhoto.create({ data: { interventionId, dataUrl, legende: legende.slice(0, 200) } });
  revalider(interventionId);
  return { ok: true };
}

export async function supprimerPhoto(photoId: string) {
  const photo = await prisma.interventionPhoto.findUnique({ where: { id: photoId } });
  if (!photo) return;
  const ctx = await accesIntervention(photo.interventionId);
  if (!ctx) return;
  await prisma.interventionPhoto.delete({ where: { id: photoId } });
  revalider(photo.interventionId);
}
