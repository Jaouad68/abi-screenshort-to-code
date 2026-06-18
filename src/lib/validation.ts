import { z } from "zod";

export const registerSchema = z.object({
  etablissementNom: z.string().trim().min(2, "Nom de l'établissement requis"),
  etablissementAdresse: z.string().trim().optional().or(z.literal("")),
  nom: z.string().trim().min(2, "Votre nom est requis"),
  email: z.string().trim().toLowerCase().email("Email invalide"),
  password: z.string().min(8, "Mot de passe : 8 caractères minimum"),
});

export const loginSchema = z.object({
  email: z.string().trim().toLowerCase().email("Email invalide"),
  password: z.string().min(1, "Mot de passe requis"),
});

export const equipementSchema = z
  .object({
    nom: z.string().trim().min(1, "Nom requis"),
    type: z.enum(["FRIGO_POSITIF", "CONGELATEUR", "VITRINE", "MAINTIEN_CHAUD"]),
    tempMin: z.coerce.number().finite("Température min invalide"),
    tempMax: z.coerce.number().finite("Température max invalide"),
  })
  .refine((d) => d.tempMin < d.tempMax, {
    message: "La température min doit être inférieure à la max",
    path: ["tempMax"],
  });

export const releveSchema = z.object({
  equipementId: z.string().min(1, "Équipement requis"),
  valeur: z.coerce.number().finite("Température invalide"),
  commentaire: z.string().trim().optional().or(z.literal("")),
});

export const tacheSchema = z.object({
  libelle: z.string().trim().min(1, "Libellé requis"),
  zone: z.string().trim().min(1, "Zone requise"),
  frequence: z.enum(["QUOTIDIENNE", "HEBDOMADAIRE", "MENSUELLE"]),
});

export const receptionSchema = z.object({
  fournisseur: z.string().trim().min(1, "Fournisseur requis"),
  produit: z.string().trim().min(1, "Produit requis"),
  temperature: z.union([z.coerce.number().finite(), z.literal("")]).optional(),
  numeroLot: z.string().trim().optional().or(z.literal("")),
  conforme: z.coerce.boolean(),
  photoData: z.string().optional().or(z.literal("")),
});

export const produitOuvertSchema = z.object({
  nom: z.string().trim().min(1, "Nom du produit requis"),
  dureeJours: z.coerce.number().int().min(0).max(365),
});

export const nonConformiteSchema = z.object({
  type: z.string().trim().min(1, "Type requis"),
  description: z.string().trim().min(1, "Description requise"),
  responsable: z.string().trim().optional().or(z.literal("")),
  photoData: z.string().optional().or(z.literal("")),
});

export const actionCorrectiveSchema = z.object({
  id: z.string().min(1),
  actionCorrective: z.string().trim().min(1, "Action corrective requise"),
  responsable: z.string().trim().optional().or(z.literal("")),
});

export const rappelSchema = z.object({
  libelle: z.string().trim().min(1, "Libellé requis"),
  heure: z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/, "Heure invalide (HH:MM)"),
});

export const employeSchema = z.object({
  nom: z.string().trim().min(2, "Nom requis"),
  email: z.string().trim().toLowerCase().email("Email invalide"),
  password: z.string().min(8, "Mot de passe : 8 caractères minimum"),
});
