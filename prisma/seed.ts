/**
 * Jeu de démonstration : un établissement type avec gérant, employé,
 * équipements, tâches de nettoyage et quelques relevés sur 30 jours.
 * Permet de générer un PDF de conformité réaliste immédiatement.
 *
 *   npm run db:seed        (ajoute/idempotent sur les comptes démo)
 *   npm run db:reset       (réinitialise la base puis seed)
 *
 * Comptes démo :
 *   gerant@demo.fr  / Demo1234   (Gérant)
 *   employe@demo.fr / Demo1234   (Employé)
 */
import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  const existing = await prisma.utilisateur.findUnique({
    where: { email: "gerant@demo.fr" },
  });
  if (existing) {
    console.log("Jeu de démonstration déjà présent — rien à faire.");
    return;
  }

  const passwordHash = await bcrypt.hash("Demo1234", 10);

  const etab = await prisma.etablissement.create({
    data: {
      nom: "Le Bistrot du Marché",
      adresse: "12 place de la République, 75011 Paris",
      siret: "812 345 678 00012",
      utilisateurs: {
        create: [
          { nom: "Camille Gérant", email: "gerant@demo.fr", passwordHash, role: "GERANT" },
          { nom: "Sofia Employée", email: "employe@demo.fr", passwordHash, role: "EMPLOYE" },
        ],
      },
      rappels: {
        create: [
          { libelle: "Relevés du matin", heure: "09:00" },
          { libelle: "Relevés du soir", heure: "18:00" },
        ],
      },
    },
    include: { utilisateurs: true },
  });

  const gerant = etab.utilisateurs.find((u) => u.role === "GERANT")!;
  const employe = etab.utilisateurs.find((u) => u.role === "EMPLOYE")!;

  const equipements = await Promise.all(
    [
      { nom: "Frigo cuisine 1", type: "FRIGO_POSITIF", tempMin: 0, tempMax: 4 },
      { nom: "Congélateur réserve", type: "CONGELATEUR", tempMin: -25, tempMax: -18 },
      { nom: "Vitrine desserts", type: "VITRINE", tempMin: 0, tempMax: 4 },
      { nom: "Bain-marie service", type: "MAINTIEN_CHAUD", tempMin: 63, tempMax: 90 },
    ].map((e) => prisma.equipement.create({ data: { ...e, etablissementId: etab.id } }))
  );

  await Promise.all(
    [
      { libelle: "Nettoyage plan de travail", zone: "Cuisine", frequence: "QUOTIDIENNE" },
      { libelle: "Désinfection poignées & interrupteurs", zone: "Cuisine", frequence: "QUOTIDIENNE" },
      { libelle: "Nettoyage chambre froide", zone: "Réserve", frequence: "HEBDOMADAIRE" },
      { libelle: "Détartrage lave-vaisselle", zone: "Plonge", frequence: "MENSUELLE" },
    ].map((t) => prisma.tacheNettoyage.create({ data: { ...t, etablissementId: etab.id } }))
  );

  // Historique de relevés sur 30 jours (matin + soir) pour un PDF réaliste.
  const now = Date.now();
  const day = 24 * 60 * 60 * 1000;
  for (let d = 30; d >= 0; d--) {
    for (const eq of equipements) {
      for (const h of [9, 18]) {
        const base = (eq.tempMin + eq.tempMax) / 2;
        // léger bruit, et un écart occasionnel hors plage
        const noise = (Math.random() - 0.5) * (eq.tempMax - eq.tempMin) * 0.5;
        let valeur = Math.round((base + noise) * 10) / 10;
        if (d === 7 && eq.type === "FRIGO_POSITIF" && h === 18) valeur = eq.tempMax + 3; // incident
        const conforme = valeur >= eq.tempMin && valeur <= eq.tempMax;
        const ts = new Date(now - d * day);
        ts.setHours(h, Math.floor(Math.random() * 30), 0, 0);
        await prisma.releveTemperature.create({
          data: {
            valeur,
            conforme,
            equipementId: eq.id,
            utilisateurId: h === 9 ? employe.id : gerant.id,
            createdAt: ts,
          },
        });
      }
    }
  }

  console.log("✅ Jeu de démonstration créé.");
  console.log("   Gérant  : gerant@demo.fr  / Demo1234");
  console.log("   Employé : employe@demo.fr / Demo1234");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
