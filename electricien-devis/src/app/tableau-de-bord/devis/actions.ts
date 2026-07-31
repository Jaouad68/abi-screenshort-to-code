"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import type { DevisStatut } from "@/generated/prisma/client";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/auth";
import { genererNumeroDevis, genererNumeroFacture } from "@/lib/numero";
import { calculerTotaux } from "@/lib/calcul";
import { TRANSITIONS } from "@/lib/statut";
import { envoyerEmail } from "@/lib/email";
import { devisEnHtml } from "@/lib/devis-email";

/* ------------------------------------------------------------------ */
/*  Création : crée un brouillon puis ouvre l'éditeur                  */
/* ------------------------------------------------------------------ */

export async function creerDevis(formData: FormData) {
  const { user, company } = await requireUser();

  const clientId = String(formData.get("clientId") ?? "");
  const objet = String(formData.get("objet") ?? "").trim();

  const client = await prisma.client.findFirst({
    where: { id: clientId, userId: user.id },
  });
  if (!client) redirect("/tableau-de-bord/devis/nouveau?erreur=client");

  const annee = new Date().getFullYear();
  const numero = await genererNumeroDevis(user.id, company.prefixeDevis, annee);

  const devis = await prisma.devis.create({
    data: {
      userId: user.id,
      clientId: client.id,
      numero,
      objet,
      dureeValidite: company.dureeValidite,
      conditions: "Règlement à réception de facture.",
    },
  });

  revalidatePath("/tableau-de-bord/devis");
  redirect(`/tableau-de-bord/devis/${devis.id}`);
}

/* ------------------------------------------------------------------ */
/*  Enregistrement des lignes + méta, avec recalcul des totaux         */
/* ------------------------------------------------------------------ */

const ligneSchema = z.object({
  libelle: z.string().trim().min(1),
  description: z.string().trim(),
  quantiteMilli: z.number().int().min(0),
  unite: z.string().trim().min(1),
  prixUnitaireCents: z.number().int(),
  tauxTva: z.number().int().min(0).max(20),
});

const payloadSchema = z.object({
  objet: z.string().trim(),
  dateDevis: z.string().trim(),
  dureeValidite: z.number().int().min(1).max(365),
  acomptePct: z.number().int().min(0).max(100),
  notes: z.string().trim(),
  conditions: z.string().trim(),
  lignes: z.array(ligneSchema),
});

export type LignePayload = z.infer<typeof ligneSchema>;
export type DevisPayload = z.infer<typeof payloadSchema>;

export type EnregistrerResult = { ok?: boolean; error?: string };

export async function enregistrerDevis(
  id: string,
  payload: DevisPayload,
): Promise<EnregistrerResult> {
  const { user } = await requireUser();

  const devis = await prisma.devis.findFirst({ where: { id, userId: user.id } });
  if (!devis) return { error: "Devis introuvable." };

  const parsed = payloadSchema.safeParse(payload);
  if (!parsed.success) return { error: "Données du devis invalides." };
  const data = parsed.data;

  const totaux = calculerTotaux(data.lignes);
  const dateDevis = new Date(data.dateDevis);

  await prisma.$transaction([
    prisma.devisLigne.deleteMany({ where: { devisId: id } }),
    prisma.devis.update({
      where: { id },
      data: {
        objet: data.objet,
        dateDevis: isNaN(dateDevis.getTime()) ? devis.dateDevis : dateDevis,
        dureeValidite: data.dureeValidite,
        acomptePct: data.acomptePct,
        notes: data.notes,
        conditions: data.conditions,
        totalHtCents: totaux.totalHtCents,
        totalTvaCents: totaux.totalTvaCents,
        totalTtcCents: totaux.totalTtcCents,
        lignes: {
          create: data.lignes.map((l, i) => ({
            libelle: l.libelle,
            description: l.description,
            quantiteMilli: l.quantiteMilli,
            unite: l.unite,
            prixUnitaireCents: l.prixUnitaireCents,
            tauxTva: l.tauxTva,
            ordre: i,
          })),
        },
      },
    }),
  ]);

  revalidatePath(`/tableau-de-bord/devis/${id}`);
  revalidatePath("/tableau-de-bord/devis");
  revalidatePath("/tableau-de-bord");
  return { ok: true };
}

/* ------------------------------------------------------------------ */
/*  Changement de statut (avec garde-fou des transitions)              */
/* ------------------------------------------------------------------ */

export async function changerStatut(id: string, statut: DevisStatut) {
  const { user } = await requireUser();

  const devis = await prisma.devis.findFirst({ where: { id, userId: user.id } });
  if (!devis) return;

  if (!TRANSITIONS[devis.statut].includes(statut)) return;

  await prisma.devis.update({ where: { id }, data: { statut } });
  revalidatePath(`/tableau-de-bord/devis/${id}`);
  revalidatePath("/tableau-de-bord/devis");
  revalidatePath("/tableau-de-bord");
}

/* ------------------------------------------------------------------ */
/*  Duplication                                                        */
/* ------------------------------------------------------------------ */

export async function dupliquerDevis(id: string) {
  const { user, company } = await requireUser();

  const source = await prisma.devis.findFirst({
    where: { id, userId: user.id },
    include: { lignes: { orderBy: { ordre: "asc" } } },
  });
  if (!source) return;

  const annee = new Date().getFullYear();
  const numero = await genererNumeroDevis(user.id, company.prefixeDevis, annee);

  const copie = await prisma.devis.create({
    data: {
      userId: user.id,
      clientId: source.clientId,
      numero,
      statut: "BROUILLON",
      objet: source.objet ? `${source.objet} (copie)` : "",
      dureeValidite: source.dureeValidite,
      notes: source.notes,
      conditions: source.conditions,
      totalHtCents: source.totalHtCents,
      totalTvaCents: source.totalTvaCents,
      totalTtcCents: source.totalTtcCents,
      lignes: {
        create: source.lignes.map((l) => ({
          libelle: l.libelle,
          description: l.description,
          quantiteMilli: l.quantiteMilli,
          unite: l.unite,
          prixUnitaireCents: l.prixUnitaireCents,
          tauxTva: l.tauxTva,
          ordre: l.ordre,
        })),
      },
    },
  });

  revalidatePath("/tableau-de-bord/devis");
  redirect(`/tableau-de-bord/devis/${copie.id}`);
}

/* ------------------------------------------------------------------ */
/*  Suppression                                                        */
/* ------------------------------------------------------------------ */

export async function supprimerDevis(id: string) {
  const { user } = await requireUser();
  await prisma.devis.deleteMany({ where: { id, userId: user.id } });
  revalidatePath("/tableau-de-bord/devis");
  revalidatePath("/tableau-de-bord");
  redirect("/tableau-de-bord/devis");
}

/* ------------------------------------------------------------------ */
/*  Envoi du devis par email                                           */
/* ------------------------------------------------------------------ */

export async function envoyerParEmail(id: string) {
  const { user, company } = await requireUser();

  const devis = await prisma.devis.findFirst({
    where: { id, userId: user.id },
    include: { client: true, lignes: { orderBy: { ordre: "asc" } } },
  });
  if (!devis) redirect("/tableau-de-bord/devis");

  if (!devis.client.email) {
    redirect(`/tableau-de-bord/devis/${id}?email=sans-adresse`);
  }

  const resultat = await envoyerEmail({
    to: devis.client.email,
    sujet: `Devis ${devis.numero} — ${company.nom}`,
    html: devisEnHtml(company, devis.client, devis),
  });

  if (!resultat.ok) {
    redirect(`/tableau-de-bord/devis/${id}?email=erreur`);
  }

  // Un devis envoyé passe automatiquement au statut « Envoyé ».
  if (devis.statut === "BROUILLON") {
    await prisma.devis.update({ where: { id }, data: { statut: "ENVOYE" } });
  }

  revalidatePath(`/tableau-de-bord/devis/${id}`);
  revalidatePath("/tableau-de-bord/devis");
  revalidatePath("/tableau-de-bord");
  redirect(`/tableau-de-bord/devis/${id}?email=${resultat.simule ? "simule" : "ok"}`);
}

/* ------------------------------------------------------------------ */
/*  Conversion en facture                                              */
/* ------------------------------------------------------------------ */

export async function convertirEnFacture(id: string) {
  const { user, company } = await requireUser();

  const devis = await prisma.devis.findFirst({
    where: { id, userId: user.id },
    include: { lignes: { orderBy: { ordre: "asc" } } },
  });
  if (!devis) redirect("/tableau-de-bord/devis");

  // La facturation part d'un devis accepté.
  if (devis.statut !== "ACCEPTE") {
    redirect(`/tableau-de-bord/devis/${id}?facture=statut`);
  }

  const annee = new Date().getFullYear();
  const numero = await genererNumeroFacture(user.id, company.prefixeFacture, annee);

  const facture = await prisma.facture.create({
    data: {
      userId: user.id,
      clientId: devis.clientId,
      devisId: devis.id,
      numero,
      objet: devis.objet,
      notes: devis.notes,
      conditions: devis.conditions,
      acomptePct: devis.acomptePct,
      totalHtCents: devis.totalHtCents,
      totalTvaCents: devis.totalTvaCents,
      totalTtcCents: devis.totalTtcCents,
      lignes: {
        create: devis.lignes.map((l) => ({
          libelle: l.libelle,
          description: l.description,
          quantiteMilli: l.quantiteMilli,
          unite: l.unite,
          prixUnitaireCents: l.prixUnitaireCents,
          tauxTva: l.tauxTva,
          ordre: l.ordre,
        })),
      },
    },
  });

  // Le devis passe au statut « Facturé ».
  await prisma.devis.update({ where: { id }, data: { statut: "FACTURE" } });

  revalidatePath("/tableau-de-bord/factures");
  revalidatePath(`/tableau-de-bord/devis/${id}`);
  revalidatePath("/tableau-de-bord");
  redirect(`/tableau-de-bord/factures/${facture.id}`);
}
