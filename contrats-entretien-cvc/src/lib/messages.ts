import { formatDate } from "@/lib/date";
import { formatCents } from "@/lib/money";

/**
 * Prépare des BROUILLONS de messages de relance de renouvellement — jamais
 * envoyés automatiquement. Aucun service d'envoi (email/SMS) n'est branché
 * dans cette V1 : l'utilisateur copie le texte, ou ouvre son client mail via
 * un lien "mailto:" pré-rempli. Voir README pour brancher un vrai fournisseur
 * (Brevo, Resend, Twilio...).
 */

export type ContexteMessage = {
  entrepriseNom: string;
  clientNom: string;
  equipementLibelle?: string;
  contratType: string;
  dateEcheance: Date;
  montantCents: number;
};

export function genererMessageEmail(ctx: ContexteMessage): { objet: string; corps: string } {
  const equipement = ctx.equipementLibelle ? ` (${ctx.equipementLibelle})` : "";
  const objet = `Renouvellement de votre contrat d'entretien — ${ctx.entrepriseNom}`;
  const corps = `Bonjour${ctx.clientNom ? " " + ctx.clientNom : ""},

Votre contrat "${ctx.contratType}"${equipement} arrive à échéance le ${formatDate(
    ctx.dateEcheance,
  )}.

Montant du contrat : ${formatCents(ctx.montantCents)}.

Nous vous proposons de le renouveler dès maintenant afin de continuer à bénéficier
d'un entretien régulier de votre équipement, gage de sécurité et de performance,
et de rester en conformité avec vos obligations réglementaires.

N'hésitez pas à nous contacter pour toute question ou pour convenir d'une date
d'intervention.

Cordialement,
${ctx.entrepriseNom}`;
  return { objet, corps };
}

export function genererMessageSms(ctx: ContexteMessage): string {
  return `${ctx.entrepriseNom} : votre contrat d'entretien "${ctx.contratType}" arrive à échéance le ${formatDate(
    ctx.dateEcheance,
  )}. Contactez-nous pour le renouveler.`;
}

/** Construit un lien mailto: pré-rempli (ouvre le client mail par défaut de
 * l'utilisateur — aucun envoi côté serveur). */
export function lienMailto(destinataire: string, objet: string, corps: string): string {
  const params = new URLSearchParams({ subject: objet, body: corps });
  const to = encodeURIComponent(destinataire || "");
  return `mailto:${to}?${params.toString()}`;
}
