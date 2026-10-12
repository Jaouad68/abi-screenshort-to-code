"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { comparaisonFactice, ouvrirSession, verifierMotDePasse } from "@/lib/auth";
import { journaliser } from "@/lib/audit";
import { echecsRecents, enregistrerTentative, tentativeAutorisee } from "@/lib/securite";
import { premiereErreur, schemaConnexion } from "@/lib/validation";
import { verifierTotp } from "@/lib/mfa";
import { COOKIE_DEFI, DUREE_DEFI_MINUTES, hacherJeton, signerDefi, verifierDefi } from "@/lib/session";

/** L'e-mail est réémis après un échec (React 19 vide le formulaire), jamais le
 *  mot de passe. */
export type EtatConnexion = {
  erreur?: string;
  email?: string;
  tentative?: number;
  /** Passe à `"code"` quand le mot de passe est bon et qu'un second facteur est
   *  actif : la session n'est PAS encore ouverte à ce stade. */
  etape?: "code";
};

/**
 * Message unique pour tous les échecs d'identification.
 *
 * Distinguer « e-mail inconnu » de « mot de passe incorrect » permettrait
 * d'énumérer les comptes existants.
 */
const IDENTIFIANTS_INVALIDES = "E-mail ou mot de passe incorrect.";

export async function connecter(
  _precedent: EtatConnexion,
  donnees: FormData,
): Promise<EtatConnexion> {
  const saisie = schemaConnexion.safeParse({
    email: donnees.get("email"),
    motDePasse: donnees.get("motDePasse"),
  });
  if (!saisie.success) return { erreur: premiereErreur(saisie.error), email: String(donnees.get('email') ?? ''), tentative: (_precedent.tentative ?? 0) + 1 };

  const { email, motDePasse } = saisie.data;

  if (!tentativeAutorisee(await echecsRecents(email))) {
    await journaliser({ action: "user.login_blocked", entityType: "User", metadata: { email } });
    return {
      erreur: "Trop de tentatives de connexion. Réessayez dans quelques minutes.",
      email,
      tentative: (_precedent.tentative ?? 0) + 1,
    };
  }

  const utilisateur = await prisma.user.findUnique({
    where: { email },
    select: {
      id: true,
      passwordHash: true,
      totpActifLe: true,
      memberships: {
        select: { organizationId: true },
        orderBy: { createdAt: "asc" },
        take: 1,
      },
    },
  });

  if (!utilisateur) {
    // Comparaison factice : le temps de réponse doit être le même que pour un
    // compte existant, sans quoi la latence révélerait les e-mails enregistrés.
    await comparaisonFactice(motDePasse);
    await enregistrerTentative(email, false);
    await journaliser({ action: "user.login_failed", metadata: { email, raison: "inconnu" } });
    return { erreur: IDENTIFIANTS_INVALIDES, email: String(donnees.get('email') ?? ''), tentative: (_precedent.tentative ?? 0) + 1 };
  }

  if (!(await verifierMotDePasse(motDePasse, utilisateur.passwordHash))) {
    await enregistrerTentative(email, false);
    await journaliser({
      action: "user.login_failed",
      actorUserId: utilisateur.id,
      metadata: { email, raison: "mot_de_passe" },
    });
    return { erreur: IDENTIFIANTS_INVALIDES, email: String(donnees.get('email') ?? ''), tentative: (_precedent.tentative ?? 0) + 1 };
  }

  const membership = utilisateur.memberships[0];
  if (!membership) {
    // Compte sans organisation : anormal (l'inscription les crée ensemble).
    // On refuse plutôt que d'ouvrir une session sans contexte tenant.
    await journaliser({
      action: "user.login_failed",
      actorUserId: utilisateur.id,
      metadata: { email, raison: "sans_organisation" },
    });
    return {
      erreur: "Ce compte n'est rattaché à aucune entreprise. Contactez le support.",
      email,
      tentative: (_precedent.tentative ?? 0) + 1,
    };
  }

  await enregistrerTentative(email, true);

  /*
   * Second facteur actif : le mot de passe ne suffit plus.
   *
   * Aucune session n'est ouverte ici. On pose un DÉFI — un jeton court, dans un
   * cookie httpOnly — qui atteste du premier facteur et de rien d'autre. Ouvrir
   * la session maintenant, quitte à « exiger le code ensuite », donnerait un
   * cookie exploitable à qui ne connaît que le mot de passe : le second facteur
   * ne protégerait plus rien.
   */
  if (utilisateur.totpActifLe) {
    const defi = await signerDefi({
      userId: utilisateur.id,
      organizationId: membership.organizationId,
      email,
    });
    (await cookies()).set(COOKIE_DEFI, defi, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: DUREE_DEFI_MINUTES * 60,
    });
    return { etape: "code", email };
  }

  await ouvrirSession(utilisateur.id, membership.organizationId);
  await journaliser({
    action: "user.logged_in",
    organizationId: membership.organizationId,
    actorUserId: utilisateur.id,
  });

  redirect("/app");
}

/**
 * Deuxième étape : le code à six chiffres, ou un code de récupération.
 *
 * Le défi est relu depuis le cookie, jamais depuis le formulaire : un identifiant
 * d'utilisateur posté par le client serait falsifiable, et il suffirait alors de
 * connaître un e-mail pour se présenter au second facteur de quelqu'un d'autre.
 */
export async function verifierCode(
  precedent: EtatConnexion,
  donnees: FormData,
): Promise<EtatConnexion> {
  const suite = (precedent.tentative ?? 0) + 1;
  const jetonDefi = (await cookies()).get(COOKIE_DEFI)?.value;
  const defi = jetonDefi ? await verifierDefi(jetonDefi) : null;
  if (!defi) {
    return {
      erreur: "Cette demande a expiré. Reprenez la connexion depuis le début.",
      tentative: suite,
    };
  }

  // Le compteur d'échecs est le même qu'au mot de passe : sans cela, le second
  // facteur serait le seul écran où l'on peut essayer sans limite.
  if (!tentativeAutorisee(await echecsRecents(defi.email))) {
    await journaliser({
      action: "user.login_blocked",
      actorUserId: defi.userId,
      metadata: { email: defi.email, etape: "second_facteur" },
    });
    return { erreur: "Trop de tentatives. Réessayez dans quelques minutes.", tentative: suite };
  }

  const utilisateur = await prisma.user.findUnique({
    where: { id: defi.userId },
    select: { totpSecret: true, totpActifLe: true, codesRecuperation: true },
  });
  if (!utilisateur?.totpActifLe || !utilisateur.totpSecret) {
    // Le facteur a été désactivé entre-temps : on ne devine pas, on recommence.
    return { erreur: "Reprenez la connexion depuis le début.", tentative: suite };
  }

  const saisi = String(donnees.get("code") ?? "").trim();
  let accepte = verifierTotp(utilisateur.totpSecret, saisi);

  // Code de récupération : à USAGE UNIQUE. Il est consommé par une écriture
  // conditionnée à sa présence, pour qu'un double envoi n'en dépense qu'un.
  if (!accepte && saisi.length > 0) {
    const empreinte = hacherJeton(saisi.toUpperCase());
    if (utilisateur.codesRecuperation.includes(empreinte)) {
      const consomme = await prisma.user.updateMany({
        where: { id: defi.userId, codesRecuperation: { has: empreinte } },
        data: {
          codesRecuperation: utilisateur.codesRecuperation.filter((c) => c !== empreinte),
        },
      });
      accepte = consomme.count === 1;
    }
  }

  if (!accepte) {
    await enregistrerTentative(defi.email, false);
    await journaliser({
      action: "user.mfa_failed",
      organizationId: defi.organizationId,
      actorUserId: defi.userId,
      metadata: { email: defi.email },
    });
    return {
      erreur: "Ce code ne correspond pas. Vérifiez l'heure de votre téléphone.",
      tentative: suite,
    };
  }

  const store = await cookies();
  store.delete(COOKIE_DEFI);
  await enregistrerTentative(defi.email, true);
  await ouvrirSession(defi.userId, defi.organizationId);
  await journaliser({
    action: "user.logged_in",
    organizationId: defi.organizationId,
    actorUserId: defi.userId,
    metadata: { secondFacteur: true },
  });

  redirect("/app");
}
