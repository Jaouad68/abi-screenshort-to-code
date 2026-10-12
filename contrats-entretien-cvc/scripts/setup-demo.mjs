// Applique les migrations puis (ré)installe un jeu de données de démonstration
// clairement identifié (Company.demo = true), pour explorer l'application
// sans dépendre de vraies données. Réexécutable sans risque : l'entreprise de
// démo existante est supprimée (cascade) puis recréée.
//
// Utilise `pg` directement plutôt que le client Prisma généré : ce dernier est
// généré en TypeScript (voir prisma/schema.prisma, generator "prisma-client"),
// prévu pour être importé par l'application (Next.js le transpile), pas pour
// être exécuté tel quel par un script Node autonome.
import "dotenv/config";
import { execSync } from "node:child_process";
import { randomUUID } from "node:crypto";
import pg from "pg";
import bcrypt from "bcryptjs";

const url = process.env.DATABASE_URL;
if (!url) {
  console.error("DATABASE_URL n'est pas défini (voir .env.example).");
  process.exit(1);
}

console.log("→ Application des migrations…");
execSync("npx prisma migrate deploy", { stdio: "inherit" });

const client = new pg.Client({ connectionString: url });
await client.connect();

const MOT_DE_PASSE_DEMO = "demo1234";
const uid = () => randomUUID();

// Un pixel JPEG minuscule, pour illustrer la fonctionnalité "photos" sans
// dépendre d'un vrai fichier image dans le dépôt.
const PHOTO_DEMO =
  "data:image/jpeg;base64,/9j/4AAQSkZJRgABAQAAAQABAAD/2wBDAAgGBgcGBQgHBwcJCQgKDBQNDAsLDBkSEw8UHRofHh0aHBwgJC4nICIsIxwcKDcpLDAxNDQ0Hyc5PTgyPC4zNDL/2wBDAQkJCQwLDBgNDRgyIRwhMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjL/wAARCAABAAEDASIAAhEBAxEB/8QAFQABAQAAAAAAAAAAAAAAAAAAAAj/xAAUEAEAAAAAAAAAAAAAAAAAAAAA/8QAFQEBAQAAAAAAAAAAAAAAAAAAAAX/xAAUEQEAAAAAAAAAAAAAAAAAAAAA/9oADAMBAAIRAxEAPwCdABmX/9k=";

function joursDepuisAujourdhui(n) {
  const d = new Date();
  d.setDate(d.getDate() + n);
  return d;
}

async function main() {
  const { rows: existantes } = await client.query(`SELECT id FROM "Company" WHERE demo = true`);
  for (const { id } of existantes) {
    console.log("→ Suppression de l'ancienne entreprise de démonstration…");
    await client.query(`DELETE FROM "Company" WHERE id = $1`, [id]);
  }

  console.log("→ Création de l'entreprise de démonstration…");
  const companyId = uid();
  await client.query(`INSERT INTO "Company" (id, nom, demo) VALUES ($1, $2, true)`, [
    companyId,
    "Chauffage Confort Démo",
  ]);

  async function creerUser(email, nom, role) {
    const id = uid();
    const passwordHash = await bcrypt.hash(MOT_DE_PASSE_DEMO, 10);
    await client.query(
      `INSERT INTO "User" (id, "companyId", email, "passwordHash", nom, role) VALUES ($1,$2,$3,$4,$5,$6)`,
      [id, companyId, email, passwordHash, nom, role],
    );
    return { id, email, nom };
  }

  const dirigeant = await creerUser("demo@suivicvc.fr", "Camille Dirigeant", "DIRIGEANT");
  const administratif = await creerUser("admin.demo@suivicvc.fr", "Sami Admin", "ADMINISTRATIF");
  const tech1 = await creerUser("tech1.demo@suivicvc.fr", "Lucas Martin", "TECHNICIEN");
  const tech2 = await creerUser("tech2.demo@suivicvc.fr", "Nadia Bernard", "TECHNICIEN");

  const clientsSeed = [
    { nom: "Dupont Jean", ville: "Paris", cp: "75012", tel: "0601020304", email: "jean.dupont@email.fr" },
    { nom: "Martin Sophie", ville: "Lyon", cp: "69003", tel: "0611223344", email: "sophie.martin@email.fr" },
    { nom: "Copropriété Les Tilleuls", ville: "Marseille", cp: "13008", tel: "0491020304", email: "syndic.tilleuls@email.fr" },
    { nom: "Petit Robert", ville: "Toulouse", cp: "31000", tel: "0561020304", email: "robert.petit@email.fr" },
    { nom: "Durand Marie", ville: "Nantes", cp: "44000", tel: "0240102030", email: "marie.durand@email.fr" },
    { nom: "Lefebvre Paul", ville: "Bordeaux", cp: "33000", tel: "0556102030", email: "paul.lefebvre@email.fr" },
    { nom: "Boulangerie Au Bon Pain", ville: "Lille", cp: "59000", tel: "0320102030", email: "contact@aubonpain.fr" },
    { nom: "Moreau Claire", ville: "Strasbourg", cp: "67000", tel: "0388102030", email: "claire.moreau@email.fr" },
    { nom: "Girard Thomas", ville: "Nice", cp: "06000", tel: "0493102030", email: "" },
    { nom: "Résidence Le Parc", ville: "Rennes", cp: "35000", tel: "0299102030", email: "syndic.leparc@email.fr" },
    { nom: "Simon Isabelle", ville: "Reims", cp: "51100", tel: "0326102030", email: "isabelle.simon@email.fr" },
    { nom: "Restaurant La Terrasse", ville: "Grenoble", cp: "38000", tel: "0476102030", email: "contact@laterrasse.fr" },
  ];

  const equipementsTypes = ["Chaudière gaz", "Pompe à chaleur air/eau", "Climatisation split", "Chaudière fioul"];
  const marques = ["Chappée", "Atlantic", "Daikin", "De Dietrich"];

  const clients = [];
  for (const c of clientsSeed) {
    const id = uid();
    await client.query(
      `INSERT INTO "Client" (id, "companyId", nom, adresse, "codePostal", ville, telephone, email)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8)`,
      [id, companyId, c.nom, `${1 + Math.floor(Math.random() * 90)} rue de la République`, c.cp, c.ville, c.tel, c.email],
    );
    clients.push({ id, nom: c.nom });
  }

  // Échéances réparties volontairement : en retard, 30/60/90 jours, plus tard,
  // renouvelé, perdu — pour que chaque vue de l'application ait du contenu.
  const plan = [
    { joursEcheance: -10, statut: "A_CONTACTER", type: "Entretien annuel chaudière" },
    { joursEcheance: -3, statut: "CONTACTE", type: "Entretien annuel PAC" },
    { joursEcheance: 5, statut: "A_CONTACTER", type: "Entretien annuel chaudière" },
    { joursEcheance: 18, statut: "A_CONTACTER", type: "Entretien climatisation" },
    { joursEcheance: 27, statut: "CONTACTE", type: "Entretien annuel chaudière" },
    { joursEcheance: 45, statut: "A_CONTACTER", type: "Contrat maintenance multi-équipements" },
    { joursEcheance: 55, statut: "A_CONTACTER", type: "Entretien annuel PAC" },
    { joursEcheance: 80, statut: "A_CONTACTER", type: "Entretien annuel chaudière" },
    { joursEcheance: 120, statut: "A_CONTACTER", type: "Entretien climatisation" },
    { joursEcheance: 200, statut: "RENOUVELE", type: "Entretien annuel chaudière" },
    { joursEcheance: 15, statut: "PERDU", type: "Entretien annuel chaudière" },
    { joursEcheance: 40, statut: "A_CONTACTER", type: "Dépannage prioritaire" },
  ];

  const contrats = [];
  for (let i = 0; i < clients.length; i++) {
    const cl = clients[i];
    const equipementId = uid();
    await client.query(
      `INSERT INTO "Equipement" (id, "companyId", "clientId", type, marque, modele, "numeroSerie", localisation, "dateInstallation")
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)`,
      [
        equipementId,
        companyId,
        cl.id,
        equipementsTypes[i % equipementsTypes.length],
        marques[i % marques.length],
        `Modèle ${100 + i}`,
        `SN${10000 + i}`,
        i % 2 === 0 ? "Sous-sol" : "Local technique",
        joursDepuisAujourdhui(-365 * (2 + (i % 5))),
      ],
    );

    const p = plan[i];
    const echeance = joursDepuisAujourdhui(p.joursEcheance);
    const debut = new Date(echeance);
    debut.setFullYear(debut.getFullYear() - 1);

    const contratId = uid();
    const reference = `CT-${new Date().getFullYear()}-${String(i + 1).padStart(4, "0")}`;
    await client.query(
      `INSERT INTO "Contrat" (id, "companyId", reference, "clientId", "equipementId", type, periodicite, "montantCents", "dateDebut", "dateEcheance", statut, actif, "updatedAt")
       VALUES ($1,$2,$3,$4,$5,$6,'ANNUELLE',$7,$8,$9,$10,$11, now())`,
      [
        contratId,
        companyId,
        reference,
        cl.id,
        equipementId,
        p.type,
        12000 + i * 1500,
        debut,
        echeance,
        p.statut,
        p.statut !== "PERDU",
      ],
    );
    contrats.push({ id: contratId, equipementId, clientId: cl.id, type: p.type });

    if (p.statut !== "A_CONTACTER") {
      await client.query(
        `INSERT INTO "ContratHistorique" (id, "contratId", statut, commentaire, "creeParId")
         VALUES ($1,$2,$3,$4,$5)`,
        [
          uid(),
          contratId,
          p.statut,
          p.statut === "PERDU" ? "Client parti chez un concurrent." : "Suivi de démonstration.",
          administratif.id,
        ],
      );
    }
  }

  const CHECKLIST_DEMO = [
    "Contrôle visuel de l'appareil et de son environnement",
    "Vérification de l'étanchéité (raccords, circuits)",
    "Nettoyage des filtres / échangeurs",
    "Contrôle de la combustion / des paramètres de fonctionnement",
    "Test de fonctionnement en fin d'intervention",
  ];

  async function creerIntervention(contrat, { joursPrevue, technicienId, statut, coche, commentaires, photo }) {
    const interventionId = uid();
    const datePrevue = joursDepuisAujourdhui(joursPrevue);
    await client.query(
      `INSERT INTO "Intervention" (id, "companyId", "clientId", "equipementId", "contratId", titre, "datePrevue", "technicienId", statut, commentaires, "updatedAt", "termineeLe")
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10, now(), $11)`,
      [
        interventionId,
        companyId,
        contrat.clientId,
        contrat.equipementId,
        contrat.id,
        contrat.type,
        datePrevue,
        technicienId,
        statut,
        commentaires ?? "",
        statut === "TERMINEE" ? datePrevue : null,
      ],
    );
    for (let ordre = 0; ordre < CHECKLIST_DEMO.length; ordre++) {
      await client.query(
        `INSERT INTO "InterventionChecklistItem" (id, "interventionId", libelle, fait, ordre) VALUES ($1,$2,$3,$4,$5)`,
        [uid(), interventionId, CHECKLIST_DEMO[ordre], coche, ordre],
      );
    }
    if (photo) {
      await client.query(
        `INSERT INTO "InterventionPhoto" (id, "interventionId", "dataUrl", legende) VALUES ($1,$2,$3,$4)`,
        [uid(), interventionId, PHOTO_DEMO, "Avant intervention"],
      );
    }
  }

  await creerIntervention(contrats[0], {
    joursPrevue: -20,
    technicienId: tech1.id,
    statut: "TERMINEE",
    coche: true,
    commentaires: "Entretien réalisé sans anomalie. Filtres nettoyés, combustion conforme.",
    photo: true,
  });
  await creerIntervention(contrats[1], { joursPrevue: 0, technicienId: tech2.id, statut: "EN_COURS", coche: false });
  await creerIntervention(contrats[2], { joursPrevue: 2, technicienId: tech1.id, statut: "PLANIFIEE", coche: false });
  await creerIntervention(contrats[3], { joursPrevue: 6, technicienId: tech2.id, statut: "PLANIFIEE", coche: false });
  await creerIntervention(contrats[4], { joursPrevue: -1, technicienId: null, statut: "PLANIFIEE", coche: false });

  console.log("");
  console.log("✔ Données de démonstration prêtes.");
  console.log("");
  console.log("Comptes de démonstration (mot de passe pour tous : demo1234) :");
  console.log(`  Dirigeant      : ${dirigeant.email}`);
  console.log(`  Administratif  : ${administratif.email}`);
  console.log(`  Technicien 1   : ${tech1.email}`);
  console.log(`  Technicien 2   : ${tech2.email}`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exitCode = 1;
  })
  .finally(async () => {
    await client.end();
  });
