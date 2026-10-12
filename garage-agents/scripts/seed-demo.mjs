// Insère un jeu de données de démonstration dans une base déjà migrée
// (`npm run db:deploy` au préalable). Se connecte en SQL brut via `pg`,
// comme l'application, pour ne dépendre d'aucun chemin d'import généré.
import { randomUUID } from "node:crypto";
import pg from "pg";
import bcrypt from "bcryptjs";

const url = process.env.DATABASE_URL;
if (!url) {
  console.error("DATABASE_URL manquant.");
  process.exit(1);
}

const client = new pg.Client({ connectionString: url });
await client.connect();

const uid = () => randomUUID();
const joursAvant = (n) => new Date(Date.now() - n * 86_400_000);
const joursApres = (n) => new Date(Date.now() + n * 86_400_000);

const userId = uid();
await client.query(`INSERT INTO "User" (id, email, "passwordHash") VALUES ($1,$2,$3)`, [
  userId,
  "demo@atelier-radar.fr",
  await bcrypt.hash("demo1234", 10),
]);

const garageId = uid();
await client.query(
  `INSERT INTO "Garage" (id, "userId", nom, telephone, "rappelCtPaliers", "devisRelanceApresJours", "devisPaiementFractionneApresJours")
   VALUES ($1,$2,$3,$4,$5,$6,$7)`,
  [garageId, userId, "Garage Vasseur", "02 37 45 12 89", [21, 10, 3], 30, 60]
);

// --- Véhicules (agent 1) ---
const vehicules = [
  { plaque: "AB-123-CD", client: "Nadia Bencherif", tel: "0612345678", ct: joursApres(12), statut: "ENVOYE" },
  { plaque: "CV-482-EF", client: "Karim Haddad", tel: "0623456789", ct: joursApres(19), statut: "ENVOYE" },
  { plaque: "GH-921-LM", client: "Julien Perreau", tel: "0634567890", ct: joursApres(25), statut: "CONFIRME" },
  { plaque: "JK-350-PQ", client: "Sami Toré", tel: "0645678901", ct: joursApres(32), statut: "A_VENIR" },
  { plaque: "RS-777-TU", client: "Élise Marchand", tel: "0656789012", ct: joursApres(2), statut: "SANS_REPONSE" },
];

for (const v of vehicules) {
  const vehiculeId = uid();
  await client.query(
    `INSERT INTO "Vehicule" (id, "garageId", plaque, "clientNom", "clientTelephone", "ctEcheance", statut, "createdAt", "updatedAt")
     VALUES ($1,$2,$3,$4,$5,$6,$7,now(),now())`,
    [vehiculeId, garageId, v.plaque, v.client, v.tel, v.ct, v.statut]
  );
  if (v.statut !== "A_VENIR") {
    await client.query(
      `INSERT INTO "RappelCt" (id, "vehiculeId", "palierJours", "envoyeLe", canal, simule) VALUES ($1,$2,$3,$4,'sms',true)`,
      [uid(), vehiculeId, 21, joursAvant(2)]
    );
  }
}

// --- Devis (agent 2) ---
const devisList = [
  { ref: "#1042", client: "Dupont Frères", tel: "0611223344", montant: 190000, emis: joursAvant(122), statut: "EN_ATTENTE", relances: 0 },
  { ref: "#1078", client: "Nadia Bencherif", tel: "0612345678", montant: 76000, emis: joursAvant(62), statut: "RELANCE", relances: 1 },
  { ref: "#1103", client: "Karim Haddad", tel: "0623456789", montant: 245000, emis: joursAvant(38), statut: "SIGNE", relances: 1 },
  { ref: "#1129", client: "Julien Perreau", tel: "0634567890", montant: 320000, emis: joursAvant(151), statut: "EN_ATTENTE", relances: 0 },
];

for (const d of devisList) {
  const devisId = uid();
  await client.query(
    `INSERT INTO "Devis" (id, "garageId", reference, "clientNom", "clientTelephone", "montantCentimes", statut, "emisLe", "createdAt", "updatedAt")
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$8,now())`,
    [devisId, garageId, d.ref, d.client, d.tel, d.montant, d.statut, d.emis]
  );
  for (let i = 0; i < d.relances; i++) {
    await client.query(
      `INSERT INTO "RelanceDevis" (id, "devisId", "envoyeLe", canal, simule) VALUES ($1,$2,$3,'sms',true)`,
      [uid(), devisId, joursAvant(10)]
    );
  }
}

await client.end();
console.log("Démo créée : demo@atelier-radar.fr / demo1234");
