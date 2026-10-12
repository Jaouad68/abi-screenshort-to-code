/**
 * JEU DE DÉMONSTRATION — DÉVELOPPEMENT UNIQUEMENT (§77).
 *
 * Ce script remplit une base VIDE avec l'activité plausible d'un plombier sur
 * quelques semaines, pour qu'on puisse voir des devis, des factures, du stock et
 * une marge sans passer une demi-heure à saisir.
 *
 * ────────────────────────────────────────────────────────────────────────────
 * TROIS GARDE-FOUS, parce qu'un jeu de démonstration lâché dans une base réelle
 * est une catastrophe silencieuse :
 *
 *  1. il REFUSE de s'exécuter si `NODE_ENV` vaut `production` ;
 *  2. il REFUSE si la base contient la moindre entreprise qui ne soit pas la
 *     démonstration — c'est ce qui protège une base de production dont la
 *     variable d'environnement aurait été oubliée ;
 *  3. tout ce qu'il crée porte un nom et des adresses e-mail explicitement
 *     factices (`@demo.plombeo.test`), pour qu'aucune donnée de démonstration ne
 *     puisse être confondue avec une vraie.
 *
 * ────────────────────────────────────────────────────────────────────────────
 * CE QUE CE SCRIPT NE FAIT PAS, ET POURQUOI :
 *
 *  - il n'invente AUCUNE règle fiscale. Toutes les lignes sont au taux de TVA
 *    par défaut (20 %). Les taux réduits dépendent de la nature des travaux, du
 *    logement et de son ancienneté **[À VÉRIFIER — SOURCE OFFICIELLE]** : les
 *    appliquer ici reviendrait à souffler une réponse fausse ;
 *  - il ne remplit ni le numéro de TVA intracommunautaire ni l'assurance
 *    décennale avec des mentions vraisemblables. Ces champs portent un texte qui
 *    dit qu'il faut les remplacer, et ce texte s'imprimera tel quel sur un
 *    devis. C'est voulu : une mention légale plausible mais fausse est pire
 *    qu'une mention manifestement à compléter ;
 *  - il ne crée AUCUNE notification. Elles sont produites par le moteur
 *    d'automatisation, et les fabriquer à la main donnerait à croire qu'un
 *    balayage a eu lieu ;
 *  - il ne crée AUCUN consentement RGPD. Un consentement est un fait juridique
 *    daté ; en inventer serait déplacé, même en démonstration ;
 *  - il ne verse aucun document : les fichiers vivent sur le disque, pas en
 *    base, et une entrée sans fichier serait une pièce jointe cassée.
 *
 * Usage : `npm run demo`
 */

import { prisma } from "../src/lib/prisma";
import { calculerTotaux, type Ligne } from "../src/lib/calcul";
import {
  attribuerNumeroDevis,
  attribuerNumeroFacture,
  calculerEmpreinte,
} from "../src/lib/numerotation";
import { hacherMotDePasse } from "../src/lib/auth";

const NOM_ORGANISATION = "Démo — Dupuis Plomberie";
const DOMAINE_DEMO = "demo.plombeo.test";
const MOT_DE_PASSE = "demo-plombeo-2026";

/* -------------------------------------------------------------------------- */
/* Garde-fous                                                                 */
/* -------------------------------------------------------------------------- */

async function verifierQueCEstBienUnBacASable(): Promise<void> {
  if (process.env["NODE_ENV"] === "production") {
    console.error(
      "REFUS : NODE_ENV vaut « production ».\n" +
        "Ce script ne pose que des données fictives ; elles n'ont rien à faire " +
        "dans une base de production.",
    );
    process.exit(1);
  }

  const autres = await prisma.organization.findMany({
    where: { nom: { not: NOM_ORGANISATION } },
    select: { nom: true },
    take: 5,
  });

  if (autres.length > 0) {
    console.error(
      `REFUS : cette base contient déjà des entreprises qui ne sont pas la ` +
        `démonstration (${autres.map((o) => `« ${o.nom} »`).join(", ")}).\n` +
        "Le jeu de démonstration ne s'installe que sur une base vide ou ne " +
        "contenant que lui : mieux vaut refuser que risquer d'écraser du réel.",
    );
    process.exit(1);
  }
}

/* -------------------------------------------------------------------------- */
/* Utilitaires de dates — tout est relatif à aujourd'hui                      */
/* -------------------------------------------------------------------------- */

const MAINTENANT = new Date();

function jours(decalage: number, heure = 9, minute = 0): Date {
  const d = new Date(MAINTENANT);
  d.setDate(d.getDate() + decalage);
  d.setHours(heure, minute, 0, 0);
  return d;
}

function mois(decalage: number): Date {
  const d = new Date(MAINTENANT);
  d.setMonth(d.getMonth() + decalage);
  d.setHours(9, 0, 0, 0);
  return d;
}

/* -------------------------------------------------------------------------- */

async function principal(): Promise<void> {
  await verifierQueCEstBienUnBacASable();

  // Idempotence : on repart d'une démonstration propre. La cascade emporte tout
  // ce qui dépend de l'organisation.
  await prisma.organization.deleteMany({ where: { nom: NOM_ORGANISATION } });
  await prisma.user.deleteMany({ where: { email: { endsWith: `@${DOMAINE_DEMO}` } } });

  const motDePasse = await hacherMotDePasse(MOT_DE_PASSE);

  /* ---------------------------------------------------------------------- */
  /* Entreprise et équipe                                                   */
  /* ---------------------------------------------------------------------- */

  const org = await prisma.organization.create({
    data: {
      nom: NOM_ORGANISATION,
      formeJuridique: "SARL",
      // Identifiants manifestement factices : aucun risque de désigner une
      // entreprise réelle.
      siret: "00000000000000",
      adresse: "12 rue des Artisans",
      codePostal: "69003",
      ville: "Lyon",
      telephone: "04 00 00 00 00",
      email: `contact@${DOMAINE_DEMO}`,
      tvaIntracommunautaire: "[DÉMONSTRATION — remplacer par votre numéro réel]",
      assuranceDecennale: "[DÉMONSTRATION — remplacer par votre assurance réelle]",
      // Coût horaire de revient : une SAISIE de l'artisan, pas un calcul. 45 €.
      coutHoraireCents: 4500,
    },
  });

  const patron = await prisma.user.create({
    data: {
      email: `patron@${DOMAINE_DEMO}`,
      passwordHash: motDePasse,
      nomComplet: "Antoine Dupuis",
    },
  });
  await prisma.membership.create({
    data: { userId: patron.id, organizationId: org.id, role: "PROPRIETAIRE" },
  });

  const technicien = await prisma.user.create({
    data: {
      email: `technicien@${DOMAINE_DEMO}`,
      passwordHash: motDePasse,
      nomComplet: "Sofiane Haddad",
    },
  });
  await prisma.membership.create({
    data: { userId: technicien.id, organizationId: org.id, role: "TECHNICIEN" },
  });

  // Abonnement : porte un ÉTAT, rien n'encaisse (§76).
  const plan = await prisma.plan.upsert({
    where: { code: "demo-artisan" },
    update: {},
    create: {
      code: "demo-artisan",
      libelle: "Formule Artisan (démonstration)",
      prixMensuelCents: 0,
      maxUtilisateurs: 5,
    },
  });
  await prisma.subscription.create({
    data: { organizationId: org.id, planId: plan.id, etat: "ESSAI" },
  });

  /* ---------------------------------------------------------------------- */
  /* Catalogue                                                              */
  /* ---------------------------------------------------------------------- */

  // Le forfait de pose est créé sans être réutilisé plus bas : il garnit le
  // catalogue, que l'on doit pouvoir parcourir.
  const [deplacement, rechercheFuite, entretien, debouchage] = await Promise.all([
      prisma.service.create({
        data: {
          organizationId: org.id,
          libelle: "Déplacement et diagnostic",
          unite: "u",
          prixUnitaireCents: 6500,
          dureeMin: 30,
        },
      }),
      prisma.service.create({
        data: {
          organizationId: org.id,
          libelle: "Main-d'œuvre plomberie",
          unite: "h",
          prixUnitaireCents: 5800,
          dureeMin: 60,
        },
      }),
      prisma.service.create({
        data: {
          organizationId: org.id,
          libelle: "Entretien annuel chaudière gaz",
          unite: "u",
          prixUnitaireCents: 13500,
          dureeMin: 90,
        },
      }),
      prisma.service.create({
        data: {
          organizationId: org.id,
          libelle: "Débouchage canalisation",
          unite: "u",
          prixUnitaireCents: 18000,
          dureeMin: 120,
        },
      }),
      prisma.service.create({
        data: {
          organizationId: org.id,
          libelle: "Pose de chaudière (forfait)",
          unite: "u",
          prixUnitaireCents: 89000,
          dureeMin: 480,
        },
      }),
    ]);

  const fournisseur = await prisma.supplier.create({
    data: {
      organizationId: org.id,
      nom: "Comptoir Sanitaire du Rhône (démo)",
      contact: "Service pro",
      email: `commandes@${DOMAINE_DEMO}`,
      telephone: "04 00 00 00 01",
      ville: "Vénissieux",
      codePostal: "69200",
      numeroCompte: "CLI-0000",
    },
  });

  /* Prix d'achat renseignés : c'est ce qui rend la marge calculable. Un prix à
   * zéro signifie INCONNU, et l'application le distingue de « gratuit ». */
  const produits = await Promise.all(
    [
      {
        libelle: "Robinet thermostatique",
        reference: "ROB-TH-15",
        prixAchatCents: 1850,
        prixUnitaireCents: 3900,
        seuilAlerteMilli: 5000,
      },
      {
        libelle: "Flexible inox 50 cm",
        reference: "FLX-INOX-50",
        prixAchatCents: 420,
        prixUnitaireCents: 1200,
        seuilAlerteMilli: 10000,
      },
      {
        libelle: "Groupe de sécurité chauffe-eau",
        reference: "GRP-SEC-20",
        prixAchatCents: 2200,
        prixUnitaireCents: 5400,
        seuilAlerteMilli: 3000,
      },
      {
        libelle: "Joint fibre 20/27",
        reference: "JNT-F-2027",
        prixAchatCents: 15,
        prixUnitaireCents: 90,
        seuilAlerteMilli: 50000,
      },
    ].map((p) =>
      prisma.product.create({
        data: { ...p, organizationId: org.id, supplierId: fournisseur.id, suiviStock: true },
      }),
    ),
  );

  // Une référence SANS prix d'achat : la marge de la ligne sera « inconnue »,
  // et l'écran de rentabilité le dira au lieu de compter zéro.
  await prisma.product.create({
    data: {
      organizationId: org.id,
      supplierId: fournisseur.id,
      libelle: "Chaudière gaz à condensation 24 kW",
      reference: "CHD-COND-24",
      prixUnitaireCents: 219000,
      suiviStock: false,
    },
  });

  /* ---------------------------------------------------------------------- */
  /* Achat et stock                                                         */
  /* ---------------------------------------------------------------------- */

  const lignesAchat = [
    { produit: produits[0]!, quantiteMilli: 12000, prixUnitaireCents: 1850 },
    { produit: produits[1]!, quantiteMilli: 25000, prixUnitaireCents: 420 },
    { produit: produits[2]!, quantiteMilli: 6000, prixUnitaireCents: 2200 },
    { produit: produits[3]!, quantiteMilli: 200000, prixUnitaireCents: 15 },
  ];

  const totauxAchat = calculerTotaux(
    lignesAchat.map<Ligne>((l) => ({
      quantiteMilli: l.quantiteMilli,
      prixUnitaireCents: l.prixUnitaireCents,
      tauxTvaCentiemes: 2000,
    })),
  );

  const achat = await prisma.purchase.create({
    data: {
      organizationId: org.id,
      supplierId: fournisseur.id,
      etat: "VALIDE",
      libelle: "Réassort de fournitures courantes",
      referenceFournisseur: "BL-DEMO-4471",
      dateAchat: jours(-21),
      valideLe: jours(-21),
      totalHtCents: totauxAchat.totalHtCents,
      totalTvaCents: totauxAchat.totalTvaCents,
      totalTtcCents: totauxAchat.totalTtcCents,
      lignes: {
        create: lignesAchat.map((l, ordre) => ({
          organizationId: org.id,
          productId: l.produit.id,
          libelle: l.produit.libelle,
          ordre,
          quantiteMilli: l.quantiteMilli,
          prixUnitaireCents: l.prixUnitaireCents,
          tauxTvaCentiemes: 2000,
        })),
      },
    },
  });

  // Le stock est la SOMME des mouvements, jamais un compteur réécrit.
  for (const l of lignesAchat) {
    await prisma.stockMovement.create({
      data: {
        organizationId: org.id,
        productId: l.produit.id,
        purchaseId: achat.id,
        type: "ENTREE_ACHAT",
        quantiteMilli: l.quantiteMilli,
        prixUnitaireCents: l.prixUnitaireCents,
        motif: "Réception fournisseur",
        parEmail: patron.email,
        createdAt: jours(-21, 10),
      },
    });
  }

  /* ---------------------------------------------------------------------- */
  /* Clients, logements, équipements                                        */
  /* ---------------------------------------------------------------------- */

  const fontaine = await prisma.client.create({
    data: {
      organizationId: org.id,
      type: "PARTICULIER",
      nomAffichage: "Claire Fontaine",
      civilite: "Mme",
      prenom: "Claire",
      nom: "Fontaine",
      email: `c.fontaine@${DOMAINE_DEMO}`,
      telephone: "06 00 00 00 11",
      adresse: "8 rue Villeroy",
      codePostal: "69003",
      ville: "Lyon",
      properties: {
        create: {
          organizationId: org.id,
          libelle: "Appartement 3e étage",
          type: "APPARTEMENT",
          adresse: "8 rue Villeroy",
          codePostal: "69003",
          ville: "Lyon",
          etage: "3e",
          digicode: "A1234",
          instructionsAcces: "Interphone « Fontaine », cour intérieure à gauche.",
          anneeConstruction: 1974,
        },
      },
    },
    include: { properties: true },
  });
  const logementFontaine = fontaine.properties[0]!;

  const chaudiereFontaine = await prisma.equipment.create({
    data: {
      organizationId: org.id,
      propertyId: logementFontaine.id,
      categorie: "CHAUDIERE",
      marque: "Thermex",
      modele: "Condens 24",
      numeroSerie: "DEMO-9931",
      localisation: "Cuisine, placard technique",
      datePose: mois(-8),
      notes: "Pression à surveiller, vase d'expansion d'origine.",
    },
  });

  const ollivier = await prisma.client.create({
    data: {
      organizationId: org.id,
      type: "PARTICULIER",
      nomAffichage: "Marc Ollivier",
      civilite: "M.",
      prenom: "Marc",
      nom: "Ollivier",
      email: `m.ollivier@${DOMAINE_DEMO}`,
      telephone: "06 00 00 00 22",
      adresse: "45 cours Émile-Zola",
      codePostal: "69100",
      ville: "Villeurbanne",
      // Certains clients se gèrent au téléphone : les relancer automatiquement
      // abîmerait la relation (§84). L'exception est prévue par le modèle.
      relancesDesactivees: true,
      notes: "Préfère être appelé le matin. Ne pas relancer par e-mail.",
      properties: {
        create: {
          organizationId: org.id,
          libelle: "Maison individuelle",
          type: "MAISON",
          adresse: "45 cours Émile-Zola",
          codePostal: "69100",
          ville: "Villeurbanne",
          instructionsAcces: "Portail vert, chien tenu à l'arrière.",
          anneeConstruction: 1998,
        },
      },
    },
    include: { properties: true },
  });
  const logementOllivier = ollivier.properties[0]!;

  await prisma.equipment.create({
    data: {
      organizationId: org.id,
      propertyId: logementOllivier.id,
      categorie: "CHAUFFE_EAU",
      marque: "Aquastar",
      modele: "200 L",
      localisation: "Garage",
      datePose: mois(-40),
    },
  });

  const tilleuls = await prisma.client.create({
    data: {
      organizationId: org.id,
      type: "PROFESSIONNEL",
      nomAffichage: "SCI Les Tilleuls",
      raisonSociale: "SCI Les Tilleuls",
      siret: "00000000000000",
      contactNom: "Mme Perrin, gestionnaire",
      email: `gestion@${DOMAINE_DEMO}`,
      telephone: "04 00 00 00 33",
      adresse: "3 place Gabriel-Péri",
      codePostal: "69007",
      ville: "Lyon",
      properties: {
        create: {
          organizationId: org.id,
          libelle: "Immeuble — parties communes",
          type: "IMMEUBLE",
          adresse: "3 place Gabriel-Péri",
          codePostal: "69007",
          ville: "Lyon",
          instructionsAcces: "Clé au syndic, local technique au sous-sol.",
        },
      },
    },
    include: { properties: true },
  });
  const logementTilleuls = tilleuls.properties[0]!;

  /* ---------------------------------------------------------------------- */
  /* Demandes, rendez-vous, interventions                                   */
  /* ---------------------------------------------------------------------- */

  await prisma.lead.create({
    data: {
      organizationId: org.id,
      clientId: tilleuls.id,
      propertyId: logementTilleuls.id,
      statut: "NOUVEAU",
      urgence: "URGENT",
      description:
        "Fuite au sous-sol, écoulement continu sous le compteur général. " +
        "Le gardien a coupé l'arrivée.",
      contactNom: "Mme Perrin",
      contactTelephone: "04 00 00 00 33",
      createdAt: jours(-1, 8, 20),
    },
  });

  await prisma.lead.create({
    data: {
      organizationId: org.id,
      clientId: ollivier.id,
      propertyId: logementOllivier.id,
      statut: "QUALIFIE",
      urgence: "NORMAL",
      description: "Chauffe-eau qui ne monte plus en température le matin.",
      contactNom: "M. Ollivier",
      contactTelephone: "06 00 00 00 22",
      createdAt: jours(-4, 17, 45),
    },
  });

  // 1. Une intervention passée, terminée, avec temps passé et fournitures.
  const rdvPasse = await prisma.appointment.create({
    data: {
      organizationId: org.id,
      clientId: fontaine.id,
      propertyId: logementFontaine.id,
      statut: "TERMINE",
      titre: "Remplacement robinet thermostatique",
      debut: jours(-6, 8, 30),
      fin: jours(-6, 10, 0),
      trajetMin: 20,
    },
  });

  const interventionPassee = await prisma.intervention.create({
    data: {
      organizationId: org.id,
      appointmentId: rdvPasse.id,
      clientId: fontaine.id,
      propertyId: logementFontaine.id,
      equipmentId: chaudiereFontaine.id,
      statut: "CLOTUREE",
      probleme: "Radiateur du salon qui ne chauffe plus.",
      diagnostic: "Robinet thermostatique grippé, tête bloquée en position fermée.",
      compteRendu:
        "Remplacement du robinet thermostatique du radiateur salon. Purge du " +
        "circuit et remise en pression à 1,4 bar. Chauffe vérifiée sur place. " +
        "Signalé à la cliente que le vase d'expansion est d'origine et méritera " +
        "un contrôle au prochain entretien.",
      demarreeLe: jours(-6, 8, 35),
      termineeLe: jours(-6, 9, 50),
      clotureeLe: jours(-6, 18, 0),
      temps: {
        create: [
          { organizationId: org.id, minutes: 75, libelle: "Intervention sur place" },
          { organizationId: org.id, minutes: 20, libelle: "Trajet aller-retour" },
        ],
      },
    },
  });

  // Sortie de stock correspondante : le robinet posé chez Mme Fontaine.
  await prisma.stockMovement.create({
    data: {
      organizationId: org.id,
      productId: produits[0]!.id,
      interventionId: interventionPassee.id,
      type: "SORTIE_CHANTIER",
      quantiteMilli: -1000,
      motif: "Pose chez Claire Fontaine",
      parEmail: technicien.email,
      createdAt: jours(-6, 10),
    },
  });

  // 2. Un rendez-vous aujourd'hui, pas encore démarré : l'accueil le montre.
  await prisma.appointment.create({
    data: {
      organizationId: org.id,
      clientId: ollivier.id,
      propertyId: logementOllivier.id,
      statut: "CONFIRME",
      titre: "Diagnostic chauffe-eau",
      debut: jours(0, 14, 0),
      fin: jours(0, 15, 30),
      trajetMin: 15,
      notes: "Prévoir un groupe de sécurité en cas de remplacement.",
    },
  });

  // 3. Un rendez-vous demain : de quoi voir le déclencheur « rendez-vous demain ».
  await prisma.appointment.create({
    data: {
      organizationId: org.id,
      clientId: tilleuls.id,
      propertyId: logementTilleuls.id,
      statut: "PLANIFIE",
      titre: "Recherche de fuite — sous-sol",
      debut: jours(1, 8, 0),
      fin: jours(1, 11, 0),
      trajetMin: 25,
      urgence: "URGENT",
    },
  });

  /* ---------------------------------------------------------------------- */
  /* Devis                                                                  */
  /* ---------------------------------------------------------------------- */

  /* Numéro attribué par le compteur atomique de l'application, jamais forgé :
   * un numéro inventé casserait la continuité de la numérotation. */
  const numeroDevis = await attribuerNumeroDevis(org.id, jours(-3));

  await prisma.quote.create({
    data: {
      organizationId: org.id,
      clientId: ollivier.id,
      propertyId: logementOllivier.id,
      numero: numeroDevis,
      statut: "ENVOYE",
      objet: "Remplacement du chauffe-eau",
      dateDevis: jours(-3),
      validiteJours: 30,
      pretLe: jours(-3),
      envoyeLe: jours(-3, 11),
      conditions:
        "Devis valable 30 jours. Intervention planifiée sous 15 jours après " +
        "acceptation. Évacuation de l'ancien appareil comprise.",
      options: {
        create: [
          {
            organizationId: org.id,
            libelle: "Remplacement à l'identique",
            ordre: 0,
            lignes: {
              create: [
                {
                  organizationId: org.id,
                  ordre: 0,
                  libelle: "Chauffe-eau 200 L",
                  quantiteMilli: 1000,
                  unite: "u",
                  prixUnitaireCents: 68000,
                  tauxTvaCentiemes: 2000,
                },
                {
                  organizationId: org.id,
                  ordre: 1,
                  libelle: rechercheFuite.libelle,
                  quantiteMilli: 4000,
                  unite: "h",
                  prixUnitaireCents: rechercheFuite.prixUnitaireCents,
                  tauxTvaCentiemes: 2000,
                  origineType: "service",
                  origineId: rechercheFuite.id,
                },
                {
                  organizationId: org.id,
                  ordre: 2,
                  libelle: produits[2]!.libelle,
                  quantiteMilli: 1000,
                  unite: "u",
                  prixUnitaireCents: produits[2]!.prixUnitaireCents,
                  tauxTvaCentiemes: 2000,
                  origineType: "produit",
                  origineId: produits[2]!.id,
                },
              ],
            },
          },
          {
            organizationId: org.id,
            libelle: "Passage en chauffe-eau thermodynamique",
            ordre: 1,
            // Une remise de 5 % sur la variante haute : elle se répartit au
            // prorata des bases de TVA, jamais imputée sur un seul taux.
            remisePourMille: 50,
            lignes: {
              create: [
                {
                  organizationId: org.id,
                  ordre: 0,
                  libelle: "Chauffe-eau thermodynamique 200 L",
                  quantiteMilli: 1000,
                  unite: "u",
                  prixUnitaireCents: 189000,
                  tauxTvaCentiemes: 2000,
                },
                {
                  organizationId: org.id,
                  ordre: 1,
                  libelle: rechercheFuite.libelle,
                  quantiteMilli: 7000,
                  unite: "h",
                  prixUnitaireCents: rechercheFuite.prixUnitaireCents,
                  tauxTvaCentiemes: 2000,
                  origineType: "service",
                  origineId: rechercheFuite.id,
                },
              ],
            },
          },
        ],
      },
    },
  });

  /* ---------------------------------------------------------------------- */
  /* Factures                                                               */
  /* ---------------------------------------------------------------------- */

  async function emettreFacture(params: {
    clientId: string;
    clientNom: string;
    propertyId: string;
    objet: string;
    date: Date;
    echeanceJours: number;
    lignes: { libelle: string; quantiteMilli: number; unite: string; prixUnitaireCents: number }[];
  }) {
    const lignes = params.lignes.map((l) => ({ ...l, tauxTvaCentiemes: 2000 }));
    const totaux = calculerTotaux(lignes);
    const numero = await attribuerNumeroFacture(org.id, "FACTURE", params.date);

    const echeance = new Date(params.date);
    echeance.setDate(echeance.getDate() + params.echeanceJours);

    /* L'empreinte est calculée par la MÊME fonction que l'application. Une
     * empreinte forgée ferait signaler la facture comme altérée dès le premier
     * affichage — exactement ce que ce mécanisme sert à détecter. */
    const empreinte = calculerEmpreinte({
      numero,
      dateFacture: params.date,
      clientNom: params.clientNom,
      totalHtCents: totaux.totalHtCents,
      totalTvaCents: totaux.totalTvaCents,
      totalTtcCents: totaux.totalTtcCents,
      lignes: lignes.map((l) => ({
        libelle: l.libelle,
        quantiteMilli: l.quantiteMilli,
        prixUnitaireCents: l.prixUnitaireCents,
        tauxTvaCentiemes: l.tauxTvaCentiemes,
      })),
    });

    return prisma.invoice.create({
      data: {
        organizationId: org.id,
        clientId: params.clientId,
        propertyId: params.propertyId,
        numero,
        statut: "ENVOYEE",
        objet: params.objet,
        dateFacture: params.date,
        dateEcheance: echeance,
        emiseLe: params.date,
        envoyeeLe: params.date,
        totalHtCents: totaux.totalHtCents,
        totalTvaCents: totaux.totalTvaCents,
        totalTtcCents: totaux.totalTtcCents,
        detailTva: totaux.tvaParTaux,
        empreinte,
        lignes: {
          create: lignes.map((l, ordre) => ({ ...l, ordre, organizationId: org.id })),
        },
      },
    });
  }

  // Facture réglée : le statut PAYEE est DÉRIVÉ du paiement, pas saisi.
  const facturePayee = await emettreFacture({
    clientId: fontaine.id,
    clientNom: fontaine.nomAffichage,
    propertyId: logementFontaine.id,
    objet: "Remplacement robinet thermostatique",
    date: jours(-5),
    echeanceJours: 30,
    lignes: [
      {
        libelle: deplacement.libelle,
        quantiteMilli: 1000,
        unite: "u",
        prixUnitaireCents: deplacement.prixUnitaireCents,
      },
      {
        libelle: rechercheFuite.libelle,
        quantiteMilli: 1500,
        unite: "h",
        prixUnitaireCents: rechercheFuite.prixUnitaireCents,
      },
      {
        libelle: produits[0]!.libelle,
        quantiteMilli: 1000,
        unite: "u",
        prixUnitaireCents: produits[0]!.prixUnitaireCents,
      },
    ],
  });

  await prisma.payment.create({
    data: {
      organizationId: org.id,
      invoiceId: facturePayee.id,
      montantCents: facturePayee.totalTtcCents,
      moyen: "VIREMENT",
      datePaiement: jours(-2),
      reference: "VIR-DEMO-0007",
    },
  });
  await prisma.invoice.update({
    where: { id: facturePayee.id },
    data: { statut: "PAYEE" },
  });

  // Facture échue et impayée : de quoi voir une relance se déclencher.
  await emettreFacture({
    clientId: tilleuls.id,
    clientNom: tilleuls.nomAffichage,
    propertyId: logementTilleuls.id,
    objet: "Débouchage colonne d'évacuation",
    date: jours(-45),
    echeanceJours: 30,
    lignes: [
      {
        libelle: debouchage.libelle,
        quantiteMilli: 1000,
        unite: "u",
        prixUnitaireCents: debouchage.prixUnitaireCents,
      },
      {
        libelle: rechercheFuite.libelle,
        quantiteMilli: 2000,
        unite: "h",
        prixUnitaireCents: rechercheFuite.prixUnitaireCents,
      },
    ],
  });

  /* ---------------------------------------------------------------------- */
  /* Contrat d'entretien et garantie                                        */
  /* ---------------------------------------------------------------------- */

  await prisma.maintenanceContract.create({
    data: {
      organizationId: org.id,
      clientId: fontaine.id,
      propertyId: logementFontaine.id,
      equipmentId: chaudiereFontaine.id,
      libelle: "Entretien annuel chaudière gaz",
      statut: "ACTIF",
      periodicite: "ANNUELLE",
      debutLe: mois(-8),
      // L'échéance se calcule sur la dernière visite RÉELLE. Onze mois se sont
      // écoulés : la prochaine est donc proche, et l'écran le signale.
      derniereVisiteLe: mois(-11),
      montantTtcCents: entretien.prixUnitaireCents,
      notes: "Contrat souscrit à la pose de la chaudière.",
    },
  });

  await prisma.warranty.create({
    data: {
      organizationId: org.id,
      clientId: fontaine.id,
      propertyId: logementFontaine.id,
      equipmentId: chaudiereFontaine.id,
      libelle: "Garantie constructeur — chaudière Thermex Condens 24",
      debutLe: mois(-8),
      dureeMois: 24,
      precisions:
        "Durée relevée sur le bon de garantie du fabricant. Plombéo ne " +
        "qualifie ni la nature ni l'étendue de cette garantie.",
    },
  });

  /* ---------------------------------------------------------------------- */
  /* Automatisations — INACTIVES, comme partout ailleurs                    */
  /* ---------------------------------------------------------------------- */

  /* Aucune règle n'est activée : une relance qui part sans que l'artisan l'ait
   * décidé est une relance qu'il n'a pas relue (§84). Les règles sont posées
   * pour qu'il n'ait qu'à basculer l'interrupteur après lecture. */
  await prisma.automationRule.createMany({
    data: [
      {
        organizationId: org.id,
        declencheur: "FACTURE_ECHUE",
        action: "NOTIFIER",
        delaiJours: 7,
        libelle: "Me prévenir 7 jours après l'échéance",
      },
      {
        organizationId: org.id,
        declencheur: "DEVIS_SANS_REPONSE",
        action: "NOTIFIER",
        delaiJours: 10,
        libelle: "Devis sans réponse au bout de 10 jours",
      },
      {
        organizationId: org.id,
        declencheur: "CONTRAT_ECHEANCE",
        action: "NOTIFIER",
        delaiJours: 30,
        libelle: "Visite d'entretien due dans 30 jours",
      },
      {
        organizationId: org.id,
        declencheur: "INTERVENTION_A_CLOTURER",
        action: "NOTIFIER",
        delaiJours: 2,
        libelle: "Intervention terminée non clôturée depuis 2 jours",
      },
    ],
  });

  /* ---------------------------------------------------------------------- */

  console.log(`
Jeu de démonstration installé.

  Entreprise    ${NOM_ORGANISATION}
  Propriétaire  patron@${DOMAINE_DEMO}
  Technicien    technicien@${DOMAINE_DEMO}
  Mot de passe  ${MOT_DE_PASSE}

Contenu : 3 clients, 3 logements, 2 équipements, 6 références au catalogue,
1 achat validé et son entrée en stock, 2 demandes, 3 rendez-vous dont un
aujourd'hui, 1 intervention clôturée, 1 devis à deux variantes, 2 factures
(une réglée, une échue), 1 contrat d'entretien, 1 garantie et 4 règles
d'automatisation — toutes INACTIVES, à activer après relecture.

Connectez-vous avec le compte technicien pour constater qu'un rôle limité
ne voit ni les devis ni les factures.

Toutes ces données sont FICTIVES. Les mentions légales de l'entreprise
portent un texte qui demande à être remplacé, et il s'imprimera tel quel.
`);
}

principal()
  .catch((erreur) => {
    console.error(erreur);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
