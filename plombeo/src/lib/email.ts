import "server-only";
import nodemailer from "nodemailer";

/**
 * ADAPTATEUR E-MAIL (Phase 7).
 *
 * Une seule implémentation, RÉELLE : SMTP. Et **aucune implémentation « Null »**,
 * ni mode « console » (§76).
 *
 * Un adaptateur qui avalerait un e-mail sans l'envoyer serait le pire des deux
 * mondes : l'artisan croirait son client relancé. Écrire l'e-mail dans les
 * journaux ressemble trop à un envoi réussi pour qu'on prenne le risque. Sans
 * configuration SMTP, l'envoi est REFUSÉ avec un message explicite.
 *
 * SMTP plutôt qu'un prestataire d'API : tout hébergeur en propose un, et cela
 * n'enferme Plombéo chez personne.
 */

export type ResultatEnvoi = { ok: true } | { ok: false; erreur: string };

export type PieceJointe = { nom: string; contenu: Uint8Array; type: string };

export const EMAIL_NON_CONFIGURE =
  "Aucun serveur d'envoi n'est configuré : les e-mails ne peuvent pas partir. " +
  "Renseignez SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASSWORD et EMAIL_EXPEDITEUR.";

function config() {
  const hote = process.env["SMTP_HOST"] ?? "";
  const port = Number(process.env["SMTP_PORT"] ?? "");
  const utilisateur = process.env["SMTP_USER"] ?? "";
  const motDePasse = process.env["SMTP_PASSWORD"] ?? "";
  const expediteur = process.env["EMAIL_EXPEDITEUR"] ?? "";
  return { hote, port, utilisateur, motDePasse, expediteur };
}

export function emailDisponible(): boolean {
  const c = config();
  return Boolean(c.hote && c.port && c.expediteur);
}

/**
 * Validation minimale d'une adresse.
 *
 * Volontairement permissive : la seule validation qui fasse autorité est l'envoi
 * lui-même. On écarte ici ce qui ne peut manifestement pas être une adresse,
 * pour ne pas mettre en file un message voué à l'échec.
 */
export function adressePlausible(adresse: string): boolean {
  const a = adresse.trim();
  if (a.length < 5 || a.length > 320) return false;
  if (/\s/.test(a)) return false;
  const arobases = a.split("@");
  if (arobases.length !== 2) return false;
  const [local, domaine] = arobases as [string, string];
  return local.length > 0 && domaine.includes(".") && !domaine.startsWith(".") && !domaine.endsWith(".");
}

/**
 * Envoie réellement un e-mail.
 *
 * Ne lève jamais : un échec d'envoi est une donnée métier (à afficher, à
 * rejouer), pas un incident technique à faire remonter jusqu'à l'utilisateur.
 */
export async function envoyer(message: {
  destinataire: string;
  sujet: string;
  corps: string;
  pieceJointe?: PieceJointe;
}): Promise<ResultatEnvoi> {
  if (!emailDisponible()) return { ok: false, erreur: EMAIL_NON_CONFIGURE };
  if (!adressePlausible(message.destinataire)) {
    return { ok: false, erreur: "Adresse du destinataire invalide." };
  }

  const c = config();

  try {
    const transport = nodemailer.createTransport({
      host: c.hote,
      port: c.port,
      // 465 est le port TLS implicite ; les autres passent par STARTTLS.
      secure: c.port === 465,
      ...(c.utilisateur ? { auth: { user: c.utilisateur, pass: c.motDePasse } } : {}),
    });

    await transport.sendMail({
      from: c.expediteur,
      to: message.destinataire,
      subject: message.sujet,
      text: message.corps,
      ...(message.pieceJointe
        ? {
            attachments: [
              {
                filename: message.pieceJointe.nom,
                content: Buffer.from(message.pieceJointe.contenu),
                contentType: message.pieceJointe.type,
              },
            ],
          }
        : {}),
    });

    return { ok: true };
  } catch (erreur) {
    // Le message d'erreur SMTP peut contenir l'adresse du serveur ; il reste
    // dans la file, visible de l'artisan seul, jamais renvoyé au client.
    const texte = erreur instanceof Error ? erreur.message : "Erreur d'envoi inconnue";
    return { ok: false, erreur: texte.slice(0, 500) };
  }
}
