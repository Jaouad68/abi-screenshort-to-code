import "server-only";
import PDFDocument from "pdfkit";
import { formaterEuros, formaterTaux } from "@/lib/calcul";
import { formaterQuantite } from "@/lib/format";

/**
 * GÉNÉRATION PDF CÔTÉ SERVEUR (Phase 7).
 *
 * `pdfkit`, bibliothèque JavaScript pure. Écarté : Puppeteer / Chromium sans
 * tête, qui suppose un binaire de 300 Mo et des dépendances système que beaucoup
 * d'hébergements sans état n'offrent pas. On ne fait pas dépendre l'envoi d'une
 * facture de la présence d'un navigateur sur le serveur.
 *
 * Conséquence assumée : ce rendu est plus SOBRE que la page imprimable des
 * Phases 4 et 5. Il porte les mentions et les montants, pas la mise en page
 * complète. Les deux coexistent ; l'artisan qui imprime utilise la page.
 *
 * Les totaux affichés sont ceux REÇUS, jamais recalculés ici : sur une pièce
 * émise, ils viennent figés de la base (§14).
 */

export type LignePdf = {
  libelle: string;
  quantiteMilli: number;
  unite: string;
  prixUnitaireCents: number;
  tauxTvaCentiemes: number;
  totalHtCents: number;
};

export type DocumentPdf = {
  type: "DEVIS" | "FACTURE";
  numero: string;
  date: Date;
  dateEcheance: Date | null;
  entreprise: {
    nom: string;
    adresse: string;
    codePostal: string;
    ville: string;
    telephone: string;
    email: string;
    siret: string;
    tvaIntracommunautaire: string;
    assuranceDecennale: string;
  };
  client: { nom: string; adresse: string; codePostal: string; ville: string };
  objet: string;
  lignes: LignePdf[];
  totalHtCents: number;
  totalTvaCents: number;
  totalTtcCents: number;
  /** Conditions rédigées par l'artisan. Plombéo n'en propose aucune (§15, §54). */
  conditions: string;
};

const formatDate = new Intl.DateTimeFormat("fr-FR", { dateStyle: "long" });

const MARGE = 50;
const NOIR = "#1c1c1c";
const GRIS = "#5b6570";

/** Produit le PDF en mémoire. Retourne les octets, prêts à joindre ou à servir. */
export function genererPdf(doc: DocumentPdf): Promise<Uint8Array> {
  return new Promise((resoudre, rejeter) => {
    const pdf = new PDFDocument({ size: "A4", margin: MARGE, info: { Title: doc.numero } });
    const morceaux: Buffer[] = [];

    pdf.on("data", (m: Buffer) => morceaux.push(m));
    pdf.on("end", () => resoudre(new Uint8Array(Buffer.concat(morceaux))));
    pdf.on("error", rejeter);

    const largeur = pdf.page.width - MARGE * 2;

    /* -- En-tête : émetteur ------------------------------------------------ */
    pdf.fillColor(NOIR).fontSize(18).text(doc.entreprise.nom, MARGE, MARGE);
    pdf.fontSize(9).fillColor(GRIS);
    for (const ligne of [
      doc.entreprise.adresse,
      [doc.entreprise.codePostal, doc.entreprise.ville].filter(Boolean).join(" "),
      doc.entreprise.telephone,
      doc.entreprise.email,
      doc.entreprise.siret ? `SIRET ${doc.entreprise.siret}` : "",
      doc.entreprise.tvaIntracommunautaire ? `TVA ${doc.entreprise.tvaIntracommunautaire}` : "",
    ].filter(Boolean)) {
      pdf.text(ligne);
    }

    /* -- Titre et destinataire --------------------------------------------- */
    pdf.moveDown(1.5);
    const hautBloc = pdf.y;

    pdf.fillColor(NOIR).fontSize(16).text(
      `${doc.type === "DEVIS" ? "Devis" : "Facture"} ${doc.numero}`,
      MARGE,
      hautBloc,
    );
    pdf.fontSize(9).fillColor(GRIS);
    pdf.text(`Date : ${formatDate.format(doc.date)}`);
    if (doc.dateEcheance) pdf.text(`Échéance : ${formatDate.format(doc.dateEcheance)}`);

    // Colonne de droite : le client.
    const colonne = MARGE + largeur / 2;
    pdf.fillColor(NOIR).fontSize(10).text("Client", colonne, hautBloc, { width: largeur / 2 });
    pdf.fontSize(9).fillColor(GRIS);
    for (const ligne of [
      doc.client.nom,
      doc.client.adresse,
      [doc.client.codePostal, doc.client.ville].filter(Boolean).join(" "),
    ].filter(Boolean)) {
      pdf.text(ligne, colonne, pdf.y, { width: largeur / 2 });
    }

    pdf.moveDown(2);
    if (doc.objet) {
      pdf.fillColor(NOIR).fontSize(10).text(`Objet : ${doc.objet}`, MARGE, pdf.y, { width: largeur });
      pdf.moveDown(1);
    }

    /* -- Lignes ------------------------------------------------------------ */
    const colonnes = [
      { titre: "Désignation", x: MARGE, largeur: 200, alignement: "left" as const },
      { titre: "Qté", x: MARGE + 205, largeur: 50, alignement: "right" as const },
      { titre: "P.U. HT", x: MARGE + 260, largeur: 65, alignement: "right" as const },
      { titre: "TVA", x: MARGE + 330, largeur: 45, alignement: "right" as const },
      { titre: "Total HT", x: MARGE + 380, largeur: 75, alignement: "right" as const },
    ];

    let y = pdf.y;
    pdf.fontSize(9).fillColor(NOIR);
    for (const c of colonnes) {
      pdf.text(c.titre, c.x, y, { width: c.largeur, align: c.alignement });
    }
    y += 14;
    pdf.moveTo(MARGE, y).lineTo(MARGE + largeur, y).strokeColor("#d8dde3").stroke();
    y += 6;

    pdf.fillColor(GRIS);
    for (const ligne of doc.lignes) {
      // Saut de page avant de déborder : une ligne coupée en deux est illisible.
      if (y > pdf.page.height - 160) {
        pdf.addPage();
        y = MARGE;
      }

      const hauteur = pdf.heightOfString(ligne.libelle, { width: colonnes[0]!.largeur });
      pdf.text(ligne.libelle, colonnes[0]!.x, y, { width: colonnes[0]!.largeur });
      pdf.text(`${formaterQuantite(ligne.quantiteMilli)} ${ligne.unite}`.trim(), colonnes[1]!.x, y, {
        width: colonnes[1]!.largeur,
        align: "right",
      });
      pdf.text(formaterEuros(ligne.prixUnitaireCents), colonnes[2]!.x, y, {
        width: colonnes[2]!.largeur,
        align: "right",
      });
      pdf.text(formaterTaux(ligne.tauxTvaCentiemes), colonnes[3]!.x, y, {
        width: colonnes[3]!.largeur,
        align: "right",
      });
      pdf.text(formaterEuros(ligne.totalHtCents), colonnes[4]!.x, y, {
        width: colonnes[4]!.largeur,
        align: "right",
      });

      y += Math.max(hauteur, 12) + 6;
    }

    /* -- Totaux ------------------------------------------------------------ */
    y += 6;
    pdf.moveTo(MARGE + largeur / 2, y).lineTo(MARGE + largeur, y).strokeColor("#d8dde3").stroke();
    y += 8;

    const totaux: [string, string, boolean][] = [
      ["Total HT", formaterEuros(doc.totalHtCents), false],
      ["TVA", formaterEuros(doc.totalTvaCents), false],
      ["Total TTC", formaterEuros(doc.totalTtcCents), true],
    ];
    for (const [libelle, valeur, gras] of totaux) {
      pdf.fontSize(gras ? 11 : 9).fillColor(gras ? NOIR : GRIS);
      pdf.text(libelle, MARGE + largeur / 2, y, { width: 120, align: "right" });
      pdf.text(valeur, MARGE + largeur / 2 + 130, y, {
        width: largeur / 2 - 130,
        align: "right",
      });
      y += gras ? 18 : 14;
    }

    /* -- Conditions et mentions ------------------------------------------- */
    if (doc.conditions.trim()) {
      y += 12;
      if (y > pdf.page.height - 120) {
        pdf.addPage();
        y = MARGE;
      }
      pdf.fontSize(9).fillColor(NOIR).text("Conditions", MARGE, y, { width: largeur });
      pdf.fontSize(8).fillColor(GRIS).text(doc.conditions, MARGE, pdf.y, { width: largeur });
    }

    if (doc.entreprise.assuranceDecennale.trim()) {
      pdf.moveDown(1);
      pdf.fontSize(8).fillColor(GRIS).text(
        `Assurance décennale : ${doc.entreprise.assuranceDecennale}`,
        MARGE,
        pdf.y,
        { width: largeur },
      );
    }

    pdf.end();
  });
}
