import { Badge, Carte, ListeVide } from "@/components/ui";
import { exigerSession } from "@/lib/dal";
import { abonnementCourant, listerInvitationsEnAttente, listerMembres } from "@/lib/equipe-db";
import { RANG_ROLE } from "@/lib/mfa";
import { LIBELLE_ROLE, roleAutorise } from "@/lib/permissions";
import type { Role } from "@/generated/prisma/enums";
import { revoquerInvitation } from "./actions";
import { BoutonRetrait } from "./BoutonRetrait";
import { FormulaireInvitation } from "./FormulaireInvitation";

export const metadata = { title: "Équipe — Plombéo" };

const formatDate = new Intl.DateTimeFormat("fr-FR", { dateStyle: "long" });

const LIBELLE_ETAT_ABONNEMENT: Record<string, string> = {
  ESSAI: "Période d'essai",
  ACTIF: "Actif",
  SUSPENDU: "Suspendu",
  RESILIE: "Résilié",
};

export default async function PageEquipe() {
  const contexte = await exigerSession();
  const peutInviter = roleAutorise(contexte.role, "membre:inviter");
  const peutRetirer = roleAutorise(contexte.role, "membre:retirer");

  const [membres, invitations, abonnement] = await Promise.all([
    listerMembres(),
    peutInviter ? listerInvitationsEnAttente() : Promise.resolve([]),
    abonnementCourant(),
  ]);

  // On n'invite jamais plus haut que soi : la liste proposée est bornée par le
  // rang de celui qui invite. Le serveur revérifie — un `<select>` se modifie.
  const rolesInvitables = (Object.keys(LIBELLE_ROLE) as Role[])
    .filter((role) => RANG_ROLE[role] < RANG_ROLE[contexte.role])
    .map((role) => ({ valeur: role, libelle: LIBELLE_ROLE[role]! }));

  const proprietaires = membres.filter((m) => m.role === "PROPRIETAIRE").length;

  return (
    <div className="flex flex-col gap-4">
      <header>
        <h1 className="text-2xl font-bold">Équipe</h1>
        <p className="text-sm text-attenue mt-1">
          Qui a accès à votre entreprise, et jusqu&apos;où.
        </p>
      </header>

      <Carte>
        <h2 className="font-semibold mb-3">
          Membres ({membres.length})
        </h2>
        <ul className="flex flex-col divide-y divide-trait">
          {membres.map((membre) => {
            const soi = membre.userId === contexte.userId;
            const dernierProprietaire = membre.role === "PROPRIETAIRE" && proprietaires <= 1;
            return (
              <li key={membre.id} className="py-3">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="font-medium">
                      {membre.user.nomComplet || membre.user.email}
                      {soi && (
                        <span className="text-succes text-sm font-semibold"> — vous</span>
                      )}
                    </p>
                    <p className="text-sm text-attenue break-all">{membre.user.email}</p>
                    <p className="text-sm text-attenue">
                      Dans l&apos;équipe depuis le {formatDate.format(membre.createdAt)}
                    </p>
                  </div>
                  <div className="text-right whitespace-nowrap flex flex-col items-end gap-1">
                    <Badge>{LIBELLE_ROLE[membre.role] ?? membre.role}</Badge>
                    {membre.user.totpActifLe && (
                      <Badge ton="succes">Second facteur actif</Badge>
                    )}
                  </div>
                </div>

                {peutRetirer && !soi && !dernierProprietaire && (
                  <BoutonRetrait
                    membershipId={membre.id}
                    nom={membre.user.nomComplet || membre.user.email}
                  />
                )}
                {peutRetirer && dernierProprietaire && (
                  <p className="text-sm text-attenue mt-2">
                    Dernier propriétaire : il ne peut pas être retiré, sans quoi plus
                    personne ne pourrait administrer l&apos;entreprise.
                  </p>
                )}
              </li>
            );
          })}
        </ul>
      </Carte>

      {peutInviter && (
        <Carte>
          <h2 className="font-semibold mb-3">Invitations en attente</h2>
          {invitations.length === 0 ? (
            <p className="text-sm text-attenue">Aucune invitation en attente.</p>
          ) : (
            <ul className="flex flex-col divide-y divide-trait">
              {invitations.map((invitation) => (
                <li key={invitation.id} className="py-3 flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="font-medium break-all">{invitation.email}</p>
                    <p className="text-sm text-attenue">
                      {LIBELLE_ROLE[invitation.role] ?? invitation.role} · expire le{" "}
                      {formatDate.format(invitation.expiresAt)}
                    </p>
                  </div>
                  <form action={revoquerInvitation}>
                    <input type="hidden" name="id" value={invitation.id} />
                    <button
                      type="submit"
                      className="min-h-11 px-3 rounded-controle text-sm font-semibold
                                 text-danger underline"
                    >
                      Révoquer
                    </button>
                  </form>
                </li>
              ))}
            </ul>
          )}
        </Carte>
      )}

      {peutInviter && rolesInvitables.length > 0 && (
        <FormulaireInvitation roles={rolesInvitables} />
      )}

      {/*
        Abonnement : Plombéo porte un ÉTAT, il n'encaisse rien. Afficher un
        bouton « payer » ou un statut « payé » qu'aucun paiement n'aurait produit
        serait exactement la simulation qui est proscrite (§76).
      */}
      <Carte>
        <h2 className="font-semibold mb-1">Abonnement</h2>
        {abonnement ? (
          <>
            <p className="text-sm">
              {abonnement.plan.libelle} —{" "}
              {LIBELLE_ETAT_ABONNEMENT[abonnement.etat] ?? abonnement.etat}
            </p>
            <p className="text-sm text-attenue mt-1">
              Depuis le {formatDate.format(abonnement.debutLe)}
              {abonnement.finLe ? `, jusqu'au ${formatDate.format(abonnement.finLe)}` : ""} ·
              jusqu&apos;à {abonnement.plan.maxUtilisateurs} utilisateur
              {abonnement.plan.maxUtilisateurs > 1 ? "s" : ""}
            </p>
          </>
        ) : (
          <p className="text-sm">Aucun abonnement enregistré pour cette entreprise.</p>
        )}
        <p className="text-sm text-attenue mt-2">
          Aucun prestataire de paiement n&apos;est raccordé : Plombéo ne prélève rien et
          n&apos;affiche aucun règlement qui n&apos;aurait pas eu lieu. Le nombre
          d&apos;utilisateurs n&apos;est pas non plus bloqué tant que ce choix n&apos;est
          pas fait.
        </p>
      </Carte>

      {membres.length === 1 && (
        <ListeVide titre="Vous travaillez seul pour l'instant">
          Inviter quelqu&apos;un lui donne un compte à son nom, avec son propre mot de
          passe. Chacun voit alors ce que son rôle autorise, et le journal
          d&apos;activité garde trace de qui a fait quoi.
        </ListeVide>
      )}
    </div>
  );
}
