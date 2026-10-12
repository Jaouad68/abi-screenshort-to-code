import "server-only";
import { prisma } from "@/lib/prisma";
import { exigerPermission } from "@/lib/dal";
import { calculerTotaux } from "@/lib/calcul";
import { totalTtc, totauxFacture } from "@/lib/facturation";
import { totauxOption } from "@/lib/devis";
import { genererPdf, type DocumentPdf, type LignePdf } from "@/lib/pdf";

/**
 * Assemblage des données d'un PDF (Phase 7).
 *
 * Comme partout, l'organisation vient de la session et l'identifiant reçu est
 * revalidé contre elle : un devis d'un autre artisan se comporte exactement
 * comme un identifiant inexistant.
 */

export type TypeDocument = "devis" | "facture";

function lignesPdf(
  lignes: readonly {
    libelle: string;
    quantiteMilli: number;
    unite: string;
    prixUnitaireCents: number;
    tauxTvaCentiemes: number;
  }[],
): LignePdf[] {
  return lignes.map((l) => ({
    libelle: l.libelle,
    quantiteMilli: l.quantiteMilli,
    unite: l.unite,
    prixUnitaireCents: l.prixUnitaireCents,
    tauxTvaCentiemes: l.tauxTvaCentiemes,
    // Un total de ligne se recalcule sans risque : c'est une projection des
    // valeurs déjà figées, pas une nouvelle décision de calcul.
    totalHtCents: calculerTotaux([l]).totalHtCents,
  }));
}

/**
 * Prépare le contenu du PDF, ou `null` si la pièce n'est pas accessible.
 *
 * Sur une facture émise, les totaux viennent FIGÉS de la base — jamais
 * recalculés (§14). Le PDF d'une facture doit montrer demain ce qu'il montrait
 * le jour de l'émission.
 */
export async function contenuPdf(type: TypeDocument, id: string): Promise<DocumentPdf | null> {
  const { organizationId } = await exigerPermission(
    type === "devis" ? "devis:lire" : "facture:lire",
  );
  return contenuPdfPourOrganisation(type, id, organizationId);
}

/**
 * Variante SANS SESSION, réservée au cron.
 *
 * ⚠️ Cette fonction ne vérifie NI session NI permission : l'organisation lui est
 * fournie. Elle n'existe que parce que le balayage tourne sans utilisateur
 * connecté, et son unique appelant légitime est la file d'e-mails, qui lit
 * `organizationId` sur le message qu'elle traite — donc sur une ligne écrite par
 * le moteur, jamais sur une donnée reçue d'un client.
 *
 * Ne jamais l'appeler depuis une route ou une Server Action : `contenuPdf` est
 * là pour ça.
 */
export async function contenuPdfPourOrganisation(
  type: TypeDocument,
  id: string,
  organizationId: string,
): Promise<DocumentPdf | null> {
  const organisation = await prisma.organization.findUnique({ where: { id: organizationId } });
  if (!organisation) return null;

  const entreprise = {
    nom: organisation.nom,
    adresse: organisation.adresse,
    codePostal: organisation.codePostal,
    ville: organisation.ville,
    telephone: organisation.telephone,
    email: organisation.email,
    siret: organisation.siret,
    tvaIntracommunautaire: organisation.tvaIntracommunautaire,
    assuranceDecennale: organisation.assuranceDecennale,
  };

  if (type === "devis") {
    const devis = await prisma.quote.findFirst({
      where: { id, organizationId },
      include: {
        client: true,
        options: { include: { lignes: { orderBy: { ordre: "asc" } } }, orderBy: { ordre: "asc" } },
      },
    });
    if (!devis) return null;

    // La PREMIÈRE variante seulement. Un devis à variantes se lit à l'écran, où
    // les propositions se comparent ; en joindre plusieurs à un e-mail
    // demanderait au client de choisir dans un PDF, ce qu'aucun format ne fait
    // bien. La variante retenue est celle que l'artisan a placée en tête.
    const option = devis.options[0];
    const lignes = option?.lignes ?? [];
    const totaux = totauxOption(option);

    return {
      type: "DEVIS",
      numero: devis.numero ?? "(brouillon)",
      date: devis.dateDevis,
      dateEcheance: new Date(
        devis.dateDevis.getTime() + devis.validiteJours * 24 * 60 * 60 * 1000,
      ),
      entreprise,
      client: {
        nom: devis.client.nomAffichage,
        adresse: devis.client.adresse,
        codePostal: devis.client.codePostal,
        ville: devis.client.ville,
      },
      objet: devis.objet,
      lignes: lignesPdf(lignes),
      totalHtCents: totaux.totalHtCents,
      totalTvaCents: totaux.totalTvaCents,
      totalTtcCents: totaux.totalTtcCents,
      conditions: devis.conditions,
    };
  }

  const facture = await prisma.invoice.findFirst({
    where: { id, organizationId },
    include: { client: true, lignes: { orderBy: { ordre: "asc" } } },
  });
  if (!facture) return null;

  const totaux = totauxFacture(facture);
  return {
    type: "FACTURE",
    numero: facture.numero ?? "(brouillon)",
    date: facture.dateFacture,
    dateEcheance: facture.dateEcheance,
    entreprise,
    client: {
      nom: facture.client.nomAffichage,
      adresse: facture.client.adresse,
      codePostal: facture.client.codePostal,
      ville: facture.client.ville,
    },
    objet: facture.objet,
    lignes: lignesPdf(facture.lignes),
    totalHtCents: totaux.totalHtCents,
    totalTvaCents: totaux.totalTvaCents,
    totalTtcCents: totalTtc(facture),
    conditions: facture.conditions,
  };
}

/** Nom de fichier proposé au téléchargement. */
export function nomFichierPdf(contenu: DocumentPdf): string {
  const base = `${contenu.type === "DEVIS" ? "devis" : "facture"}-${contenu.numero}`;
  return `${base.replace(/[^a-zA-Z0-9_-]+/g, "-")}.pdf`;
}

/** Produit le PDF d'une pièce accessible, ou `null`. */
export async function pdfDocument(
  type: TypeDocument,
  id: string,
): Promise<{ octets: Uint8Array; nom: string } | null> {
  const contenu = await contenuPdf(type, id);
  if (!contenu) return null;
  return { octets: await genererPdf(contenu), nom: nomFichierPdf(contenu) };
}
