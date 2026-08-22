import { donneesExportClients } from "@/lib/crm";
import { exigerPermission } from "@/lib/dal";
import { journaliser } from "@/lib/audit";
import { construireCsv } from "@/lib/csv";
import { LIBELLE_TYPE_CLIENT } from "@/lib/libelles";

/**
 * Export du fichier client (§79 portabilité, et support du droit d'accès RGPD).
 *
 * Un export massif est une action sensible (§59) : il est soumis à une
 * permission dédiée et journalisé.
 *
 * Route Handler plutôt que Server Action : il faut renvoyer un fichier avec ses
 * propres en-têtes, ce qu'une Server Action ne permet pas.
 */
export async function GET() {
  const { organizationId, userId } = await exigerPermission("client:exporter");
  const clients = await donneesExportClients();

  const entetes = [
    "Type",
    "Nom",
    "Prénom",
    "Raison sociale",
    "SIRET",
    "Téléphone",
    "Téléphone secondaire",
    "E-mail",
    "Adresse",
    "Code postal",
    "Ville",
    "Nombre de logements",
    "Adresses des logements",
    "Consentement e-mail",
    "Consentement SMS",
    "Archivé",
    "Créé le",
  ];

  const consentement = (
    liste: { type: string; accorde: boolean }[],
    type: string,
  ): string => {
    const c = liste.find((x) => x.type === type);
    return c?.accorde ? "oui" : "non";
  };

  const lignes = clients.map((c) => [
    LIBELLE_TYPE_CLIENT[c.type],
    c.nom,
    c.prenom,
    c.raisonSociale,
    c.siret,
    c.telephone,
    c.telephoneSecondaire,
    c.email,
    c.adresse,
    c.codePostal,
    c.ville,
    String(c.properties.length),
    c.properties
      .map((p) => [p.libelle, p.adresse, p.codePostal, p.ville].filter(Boolean).join(" "))
      .join(" | "),
    consentement(c.consents, "EMAIL_COMMERCIAL"),
    consentement(c.consents, "SMS_COMMERCIAL"),
    c.archivedAt ? "oui" : "non",
    c.createdAt.toISOString().slice(0, 10),
  ]);

  await journaliser({
    action: "client.exported",
    organizationId,
    actorUserId: userId,
    metadata: { lignes: lignes.length },
  });

  const horodatage = new Date().toISOString().slice(0, 10);
  return new Response(construireCsv(entetes, lignes), {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="clients-plombeo-${horodatage}.csv"`,
      // Un export contient des données personnelles : il ne doit jamais être
      // mis en cache par un intermédiaire.
      "Cache-Control": "no-store, private",
    },
  });
}
