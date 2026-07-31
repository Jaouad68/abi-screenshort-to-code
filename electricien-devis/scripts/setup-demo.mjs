// Applique les migrations SQL puis insère un jeu de données de démonstration,
// en se connectant via `pg` (comme l'app) au serveur PGlite local.
import { readFileSync } from "node:fs";
import { randomUUID } from "node:crypto";
import pg from "pg";
import bcrypt from "bcryptjs";

const url = process.env.DATABASE_URL;
const client = new pg.Client({ connectionString: url });
await client.connect();

// --- 1. Migrations (dans l'ordre) ---
const migrations = [
  "prisma/migrations/0_init/migration.sql",
  "prisma/migrations/1_factures_logo_acompte/migration.sql",
  "prisma/migrations/2_relances_commande/migration.sql",
];
for (const m of migrations) {
  const sql = readFileSync(m, "utf8");
  await client.query(sql);
  console.log("migration appliquée:", m);
}

// --- 2. Données de démo ---
const uid = () => randomUUID();

const userId = uid();
await client.query(
  `INSERT INTO "User" (id,email,"passwordHash") VALUES ($1,$2,$3)`,
  [userId, "demo@mellado-electricite.fr", await bcrypt.hash("demo1234", 10)],
);

await client.query(
  `INSERT INTO "Company" (id,"userId",nom,adresse,"codePostal",ville,telephone,email,siret,"tvaIntra",assurance,"prefixeDevis","prefixeFacture","tauxTvaDefaut","dureeValidite","mentionsLegales","updatedAt")
   VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,'DEV','FAC',20,30,$12,now())`,
  [
    uid(), userId,
    "MELLADO Électricité", "20 rue Comblais", "28200", "Châteaudun",
    "02 37 45 12 89", "contact@mellado-electricite.fr",
    "412 398 754 00023", "FR76412398754",
    "MAAF Pro — Police n° 78-432-991",
    "Devis valable 30 jours à compter de sa date d'émission. TVA acquittée sur les débits. Règlement à réception de facture. Assurance décennale : MAAF Pro — Police n° 78-432-991.",
  ],
);

const prestations = [
  ["Pose de prise de courant", "u", 3500, 20],
  ["Pose d'interrupteur", "u", 2800, 20],
  ["Installation tableau électrique", "u", 45000, 20],
  ["Câblage au mètre linéaire", "ml", 1200, 20],
  ["Mise aux normes NF C 15-100", "forfait", 85000, 10],
  ["Pose de luminaire", "u", 5500, 20],
  ["Installation VMC", "u", 32000, 20],
];
for (const [libelle, unite, prix, tva] of prestations) {
  await client.query(
    `INSERT INTO "Prestation" (id,"userId",libelle,unite,"prixUnitaireCents","tauxTva") VALUES ($1,$2,$3,$4,$5,$6)`,
    [uid(), userId, libelle, unite, prix, tva],
  );
}

const clientId = uid();
await client.query(
  `INSERT INTO "Client" (id,"userId",nom,adresse,"codePostal",ville,telephone,email)
   VALUES ($1,$2,$3,$4,$5,$6,$7,$8)`,
  [clientId, userId, "M. et Mme Dupont", "14 rue de la Tannerie", "28200", "Châteaudun", "06 12 34 56 78", "famille.dupont@example.fr"],
);

// Helper : calcule les totaux à partir des lignes.
function totaux(lignes) {
  let ht = 0;
  const parTaux = new Map();
  for (const l of lignes) {
    const m = Math.round((l.pu * l.qtyMilli) / 1000);
    ht += m;
    parTaux.set(l.tva, (parTaux.get(l.tva) ?? 0) + m);
  }
  let tva = 0;
  for (const [taux, base] of parTaux) tva += Math.round((base * taux) / 100);
  return { ht, tva, ttc: ht + tva };
}

async function insererDevis({ numero, statut, acompte, objet, lignes, joursAvant, numeroCommande = "", envoyeJoursAvant = null }) {
  const t = totaux(lignes);
  const id = uid();
  const date = new Date(Date.now() - joursAvant * 86400000);
  const envoyeLe = envoyeJoursAvant == null ? null : new Date(Date.now() - envoyeJoursAvant * 86400000);
  await client.query(
    `INSERT INTO "Devis" (id,"userId","clientId",numero,statut,"dateDevis","dureeValidite",objet,conditions,"acomptePct","numeroCommande","envoyeLe","totalHtCents","totalTvaCents","totalTtcCents","updatedAt")
     VALUES ($1,$2,$3,$4,$5,$6,30,$7,$8,$9,$10,$11,$12,$13,$14,now())`,
    [id, userId, clientId, numero, statut, date, objet, "Règlement à réception de facture.", acompte, numeroCommande, envoyeLe, t.ht, t.tva, t.ttc],
  );
  let ordre = 0;
  for (const l of lignes) {
    await client.query(
      `INSERT INTO "DevisLigne" (id,"devisId",libelle,"quantiteMilli",unite,"prixUnitaireCents","tauxTva",ordre)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8)`,
      [uid(), id, l.libelle, l.qtyMilli, l.unite, l.pu, l.tva, ordre++],
    );
  }
  return { id, ...t };
}

// Devis 1 — envoyé il y a 10 j (→ apparaît "à relancer"), acompte 30 %, n° commande
await insererDevis({
  numero: "DEV-2026-001",
  statut: "ENVOYE",
  acompte: 30,
  objet: "Rénovation électrique séjour et cuisine",
  joursAvant: 10,
  envoyeJoursAvant: 10,
  numeroCommande: "BC-DUPONT-2026-014",
  lignes: [
    { libelle: "Pose de prise de courant", unite: "u", pu: 3500, qtyMilli: 6000, tva: 20 },
    { libelle: "Installation tableau électrique", unite: "u", pu: 45000, qtyMilli: 1000, tva: 20 },
    { libelle: "Câblage au mètre linéaire", unite: "ml", pu: 1200, qtyMilli: 25000, tva: 20 },
    { libelle: "Pose de luminaire", unite: "u", pu: 5500, qtyMilli: 4000, tva: 20 },
  ],
});

// Devis 2 — accepté (servira de source à la facture)
const d2 = await insererDevis({
  numero: "DEV-2026-002",
  statut: "FACTURE",
  acompte: 0,
  objet: "Mise aux normes NF C 15-100 appartement",
  joursAvant: 12,
  lignes: [
    { libelle: "Mise aux normes NF C 15-100", unite: "forfait", pu: 85000, qtyMilli: 1000, tva: 10 },
    { libelle: "Pose d'interrupteur", unite: "u", pu: 2800, qtyMilli: 8000, tva: 20 },
    { libelle: "Installation VMC", unite: "u", pu: 32000, qtyMilli: 1000, tva: 20 },
  ],
});

// Facture issue du devis 2
const factureId = uid();
await client.query(
  `INSERT INTO "Facture" (id,"userId","clientId","devisId",numero,statut,objet,conditions,"acomptePct","totalHtCents","totalTvaCents","totalTtcCents","updatedAt")
   VALUES ($1,$2,$3,$4,$5,'EMISE',$6,$7,0,$8,$9,$10,now())`,
  [factureId, userId, clientId, d2.id, "FAC-2026-001", "Mise aux normes NF C 15-100 appartement", "Règlement à réception de facture.", d2.ht, d2.tva, d2.ttc],
);
const factureLignes = [
  { libelle: "Mise aux normes NF C 15-100", unite: "forfait", pu: 85000, qtyMilli: 1000, tva: 10 },
  { libelle: "Pose d'interrupteur", unite: "u", pu: 2800, qtyMilli: 8000, tva: 20 },
  { libelle: "Installation VMC", unite: "u", pu: 32000, qtyMilli: 1000, tva: 20 },
];
let fo = 0;
for (const l of factureLignes) {
  await client.query(
    `INSERT INTO "FactureLigne" (id,"factureId",libelle,"quantiteMilli",unite,"prixUnitaireCents","tauxTva",ordre)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8)`,
    [uid(), factureId, l.libelle, l.qtyMilli, l.unite, l.pu, l.tva, fo++],
  );
}

// Compteurs
await client.query(
  `INSERT INTO "CompteurDevis" (id,"userId",annee,"dernierNumero") VALUES ($1,$2,2026,2)`,
  [uid(), userId],
);
await client.query(
  `INSERT INTO "CompteurFacture" (id,"userId",annee,"dernierNumero") VALUES ($1,$2,2026,1)`,
  [uid(), userId],
);

console.log("Données de démo insérées. Connexion: demo@mellado-electricite.fr / demo1234");
await client.end();
