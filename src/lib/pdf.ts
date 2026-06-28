import PDFDocument from "pdfkit";
import {
  TYPE_EQUIPEMENT_LABEL,
  FREQUENCE_LABEL,
  STATUT_NC_LABEL,
  formatDate,
  formatDateTime,
} from "./labels";

export type DossierData = {
  etablissement: { nom: string; adresse: string | null; siret: string | null };
  periode: { from: Date; to: Date };
  genereLe: Date;
  generePar: string;
  releves: {
    createdAt: Date;
    valeur: number;
    conforme: boolean;
    equipement: { nom: string; type: string; tempMin: number; tempMax: number };
    utilisateur: { nom: string };
  }[];
  validations: {
    createdAt: Date;
    tache: { libelle: string; zone: string; frequence: string };
    utilisateur: { nom: string };
  }[];
  receptions: {
    createdAt: Date;
    fournisseur: string;
    produit: string;
    temperature: number | null;
    numeroLot: string | null;
    conforme: boolean;
    utilisateur: { nom: string };
  }[];
  produits: {
    dateOuverture: Date;
    nom: string;
    dlcSecondaire: Date;
    statut: string;
    utilisateur: { nom: string };
  }[];
  nonConformites: {
    createdAt: Date;
    resolvedAt: Date | null;
    type: string;
    description: string;
    actionCorrective: string | null;
    responsable: string | null;
    statut: string;
    utilisateur: { nom: string };
  }[];
};

const BRAND = "#1f6c56";
const GRAY = "#64748b";
const LIGHT = "#e2e8f0";
const RED = "#dc2626";

export function buildDossierPdf(data: DossierData): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ size: "A4", margin: 40, bufferPages: true });
    const chunks: Buffer[] = [];
    doc.on("data", (c) => chunks.push(c as Buffer));
    doc.on("end", () => resolve(Buffer.concat(chunks)));
    doc.on("error", reject);

    try {
      renderHeader(doc, data);
      renderSyntheses(doc, data);
      renderReleves(doc, data);
      renderNettoyage(doc, data);
      renderReceptions(doc, data);
      renderTracabilite(doc, data);
      renderNonConformites(doc, data);
      renderFooters(doc);
      doc.end();
    } catch (e) {
      reject(e);
    }
  });
}

function renderHeader(doc: PDFKit.PDFDocument, data: DossierData) {
  doc.rect(40, 40, 515, 70).fill(BRAND);
  doc
    .fill("#ffffff")
    .fontSize(20)
    .font("Helvetica-Bold")
    .text("Dossier de conformité sanitaire", 55, 55);
  doc
    .fontSize(10)
    .font("Helvetica")
    .text("Plan de maîtrise sanitaire — autocontrôles HACCP", 55, 82);

  doc.fill("#0f172a").fontSize(14).font("Helvetica-Bold").text(data.etablissement.nom, 40, 125);
  doc.fill(GRAY).fontSize(9).font("Helvetica");
  const lignes: string[] = [];
  if (data.etablissement.adresse) lignes.push(data.etablissement.adresse);
  if (data.etablissement.siret) lignes.push("SIRET : " + data.etablissement.siret);
  if (lignes.length) doc.text(lignes.join("  ·  "), 40, 143);

  doc
    .fill("#0f172a")
    .fontSize(10)
    .font("Helvetica-Bold")
    .text(
      `Période : du ${formatDate(data.periode.from)} au ${formatDate(data.periode.to)}`,
      40,
      160
    );
  doc
    .fill(GRAY)
    .fontSize(8)
    .font("Helvetica")
    .text(
      `Document généré le ${formatDateTime(data.genereLe)} par ${data.generePar}. ` +
        `Enregistrements horodatés côté serveur et non modifiables (intégrité préservée).`,
      40,
      175,
      { width: 515 }
    );
  doc.moveTo(40, 195).lineTo(555, 195).stroke(LIGHT);
  doc.y = 205;
}

function renderSyntheses(doc: PDFKit.PDFDocument, data: DossierData) {
  const relNC = data.releves.filter((r) => !r.conforme).length;
  const recNC = data.receptions.filter((r) => !r.conforme).length;
  const ncOuv = data.nonConformites.filter((n) => n.statut === "OUVERT").length;
  sectionTitle(doc, "Synthèse de la période");
  const lines = [
    `Relevés de température : ${data.releves.length} (dont ${relNC} hors plage)`,
    `Validations de nettoyage : ${data.validations.length}`,
    `Contrôles à réception : ${data.receptions.length} (dont ${recNC} non conformes)`,
    `Produits tracés (DLC secondaire) : ${data.produits.length}`,
    `Non-conformités : ${data.nonConformites.length} (dont ${ncOuv} encore ouvertes)`,
  ];
  doc.fontSize(9.5).font("Helvetica").fill("#0f172a");
  lines.forEach((l) => doc.text("•  " + l, 48, doc.y, { width: 500 }).moveDown(0.3));
  doc.moveDown(0.5);
}

function sectionTitle(doc: PDFKit.PDFDocument, title: string) {
  ensureSpace(doc, 40);
  doc.moveDown(0.4);
  doc
    .fill(BRAND)
    .fontSize(12)
    .font("Helvetica-Bold")
    .text(title, 40, doc.y);
  doc.moveTo(40, doc.y + 2).lineTo(555, doc.y + 2).stroke(BRAND);
  doc.moveDown(0.6);
}

function ensureSpace(doc: PDFKit.PDFDocument, needed: number) {
  if (doc.y + needed > 780) doc.addPage();
}

// Table générique : colonnes avec largeurs fixes.
function table(
  doc: PDFKit.PDFDocument,
  cols: { header: string; width: number }[],
  rows: { values: string[]; danger?: boolean }[],
  emptyLabel: string
) {
  const startX = 40;
  const drawHeader = () => {
    let x = startX;
    doc.fontSize(8).font("Helvetica-Bold").fill("#ffffff");
    doc.rect(startX, doc.y, 515, 16).fill(GRAY);
    const hy = doc.y + 4;
    doc.fill("#ffffff");
    cols.forEach((c) => {
      doc.text(c.header, x + 3, hy, { width: c.width - 6 });
      x += c.width;
    });
    doc.y += 16;
  };

  if (rows.length === 0) {
    doc.fontSize(9).font("Helvetica-Oblique").fill(GRAY).text(emptyLabel, 48, doc.y).moveDown(0.5);
    return;
  }

  ensureSpace(doc, 40);
  drawHeader();

  rows.forEach((row, i) => {
    // hauteur de ligne calculée sur la cellule la plus haute
    let maxH = 12;
    doc.fontSize(8).font("Helvetica");
    row.values.forEach((v, ci) => {
      const h = doc.heightOfString(v || "—", { width: cols[ci].width - 6 });
      if (h + 6 > maxH) maxH = h + 6;
    });

    if (doc.y + maxH > 790) {
      doc.addPage();
      drawHeader();
    }

    if (i % 2 === 0) doc.rect(startX, doc.y, 515, maxH).fill("#f8fafc");
    let x = startX;
    const ty = doc.y + 3;
    doc.font("Helvetica").fontSize(8).fill(row.danger ? RED : "#0f172a");
    row.values.forEach((v, ci) => {
      doc.text(v || "—", x + 3, ty, { width: cols[ci].width - 6 });
      x += cols[ci].width;
    });
    doc.y += maxH;
  });
  doc.moveDown(0.5);
}

function renderReleves(doc: PDFKit.PDFDocument, data: DossierData) {
  sectionTitle(doc, "1. Relevés de température");
  table(
    doc,
    [
      { header: "Date / heure", width: 95 },
      { header: "Équipement", width: 130 },
      { header: "Type", width: 90 },
      { header: "Cible", width: 60 },
      { header: "Relevé", width: 50 },
      { header: "Par", width: 90 },
    ],
    data.releves.map((r) => ({
      danger: !r.conforme,
      values: [
        formatDateTime(r.createdAt),
        r.equipement.nom,
        TYPE_EQUIPEMENT_LABEL[r.equipement.type] ?? r.equipement.type,
        `${r.equipement.tempMin}/${r.equipement.tempMax}°`,
        `${r.valeur}°${r.conforme ? "" : "  ✕"}`,
        r.utilisateur.nom,
      ],
    })),
    "Aucun relevé sur la période."
  );
}

function renderNettoyage(doc: PDFKit.PDFDocument, data: DossierData) {
  sectionTitle(doc, "2. Plan de nettoyage / désinfection");
  table(
    doc,
    [
      { header: "Date / heure", width: 100 },
      { header: "Tâche", width: 180 },
      { header: "Zone", width: 80 },
      { header: "Fréquence", width: 65 },
      { header: "Par", width: 90 },
    ],
    data.validations.map((v) => ({
      values: [
        formatDateTime(v.createdAt),
        v.tache.libelle,
        v.tache.zone,
        FREQUENCE_LABEL[v.tache.frequence] ?? v.tache.frequence,
        v.utilisateur.nom,
      ],
    })),
    "Aucune validation de nettoyage sur la période."
  );
}

function renderReceptions(doc: PDFKit.PDFDocument, data: DossierData) {
  sectionTitle(doc, "3. Contrôles à réception");
  table(
    doc,
    [
      { header: "Date / heure", width: 95 },
      { header: "Fournisseur", width: 90 },
      { header: "Produit", width: 110 },
      { header: "T°", width: 40 },
      { header: "Lot", width: 70 },
      { header: "Conf.", width: 40 },
      { header: "Par", width: 70 },
    ],
    data.receptions.map((r) => ({
      danger: !r.conforme,
      values: [
        formatDateTime(r.createdAt),
        r.fournisseur,
        r.produit,
        r.temperature !== null ? `${r.temperature}°` : "—",
        r.numeroLot ?? "—",
        r.conforme ? "OK" : "NON",
        r.utilisateur.nom,
      ],
    })),
    "Aucune réception sur la période."
  );
}

function renderTracabilite(doc: PDFKit.PDFDocument, data: DossierData) {
  sectionTitle(doc, "4. Traçabilité / DLC secondaires");
  table(
    doc,
    [
      { header: "Ouverture", width: 100 },
      { header: "Produit", width: 180 },
      { header: "DLC secondaire", width: 90 },
      { header: "Statut", width: 65 },
      { header: "Par", width: 80 },
    ],
    data.produits.map((p) => ({
      values: [
        formatDateTime(p.dateOuverture),
        p.nom,
        formatDate(p.dlcSecondaire),
        p.statut,
        p.utilisateur.nom,
      ],
    })),
    "Aucun produit tracé sur la période."
  );
}

function renderNonConformites(doc: PDFKit.PDFDocument, data: DossierData) {
  sectionTitle(doc, "5. Non-conformités & actions correctives");
  table(
    doc,
    [
      { header: "Date", width: 75 },
      { header: "Type", width: 95 },
      { header: "Description", width: 130 },
      { header: "Action corrective", width: 130 },
      { header: "Statut", width: 80 },
    ],
    data.nonConformites.map((n) => ({
      danger: n.statut === "OUVERT",
      values: [
        formatDate(n.createdAt),
        n.type,
        n.description,
        n.actionCorrective ?? "—",
        `${STATUT_NC_LABEL[n.statut] ?? n.statut}${n.responsable ? `\n(${n.responsable})` : ""}`,
      ],
    })),
    "Aucune non-conformité sur la période."
  );
}

function renderFooters(doc: PDFKit.PDFDocument) {
  const range = doc.bufferedPageRange();
  for (let i = range.start; i < range.start + range.count; i++) {
    doc.switchToPage(i);
    doc
      .fontSize(7.5)
      .font("Helvetica")
      .fill(GRAY)
      .text(
        "Resto Pilot HACCP — outil d'aide à la conformité. La responsabilité réglementaire reste celle de l'exploitant.",
        40,
        802,
        { width: 430, lineBreak: false }
      );
    doc.text(`Page ${i + 1} / ${range.count}`, 470, 802, { width: 85, align: "right" });
  }
}
