import Link from "next/link";
import { Carte } from "@/components/ui";
import { resoudreInvitation } from "@/lib/invitations";
import { LIBELLE_ROLE } from "@/lib/permissions";
import { RESUME_ROLE } from "@/lib/roles";
import { FormulaireAcceptation } from "./FormulaireAcceptation";

export const metadata = { title: "Invitation — Plombéo" };

/**
 * Acceptation d'une invitation.
 *
 * Aucun compte n'existe avant cet écran : un compte créé d'avance serait un
 * compte sans mot de passe choisi, donc une porte ouverte en attente.
 */
export default async function PageInvitation(props: PageProps<"/invitation/[jeton]">) {
  const { jeton } = await props.params;
  const invitation = await resoudreInvitation(jeton);

  if (!invitation) {
    return (
      <main id="contenu" className="flex-1 flex items-center justify-center px-5 py-12">
        <div className="w-full max-w-md">
          <h1 className="text-2xl font-bold mb-1">Lien invalide</h1>
          {/* Même message pour un lien inconnu, révoqué, expiré ou déjà utilisé :
              distinguer renseignerait sur l'existence d'une invitation. */}
          <p className="text-attenue mb-6">
            Ce lien d&apos;invitation n&apos;est plus valable. Demandez-en un nouveau à
            l&apos;entreprise qui vous a invité.
          </p>
          <p className="text-sm text-attenue">
            <Link href="/connexion" className="font-semibold text-encre underline">
              Aller à la connexion
            </Link>
          </p>
        </div>
      </main>
    );
  }

  return (
    <main id="contenu" className="flex-1 flex items-center justify-center px-5 py-12">
      <div className="w-full max-w-md">
        <h1 className="text-2xl font-bold mb-1">
          Rejoindre {invitation.nomEntreprise}
        </h1>
        <p className="text-attenue mb-6">
          {invitation.parEmail
            ? `${invitation.parEmail} vous invite à rejoindre son équipe sur Plombéo.`
            : "Vous êtes invité à rejoindre cette équipe sur Plombéo."}
        </p>

        <Carte className="mb-4">
          <p className="text-sm">
            <span className="text-attenue">Adresse invitée :</span>{" "}
            <strong>{invitation.email}</strong>
          </p>
          <p className="text-sm mt-1">
            <span className="text-attenue">Rôle :</span>{" "}
            <strong>{LIBELLE_ROLE[invitation.role] ?? invitation.role}</strong>
          </p>
          <p className="text-sm text-attenue mt-2">
            {RESUME_ROLE[invitation.role]}
          </p>
          {/* Le rôle est figé à l'invitation : le dire évite de laisser croire
              qu'il se négocie ici. */}
          <p className="text-sm text-attenue mt-2">
            Ce rôle a été choisi par l&apos;entreprise qui vous invite. Il ne peut pas
            être modifié depuis cet écran.
          </p>
        </Carte>

        <FormulaireAcceptation
          jeton={jeton}
          email={invitation.email}
          compteExistant={invitation.compteExistant}
        />
      </div>
    </main>
  );
}
