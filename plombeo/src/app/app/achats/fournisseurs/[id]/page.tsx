import Link from "next/link";
import { notFound } from "next/navigation";
import { Bouton, Carte } from "@/components/ui";
import { lireFournisseur, totauxAchat } from "@/lib/achats";
import { sessionCourante } from "@/lib/dal";
import { roleAutorise } from "@/lib/permissions";
import { formaterEuros } from "@/lib/calcul";
import { archiverFournisseur } from "../../actions";
import { FormulaireFournisseur } from "../FormulaireFournisseur";

export const metadata = { title: "Fournisseur — Plombéo" };

const formatDate = new Intl.DateTimeFormat("fr-FR", { dateStyle: "short" });

export default async function PageFournisseur(
  props: PageProps<"/app/achats/fournisseurs/[id]">,
) {
  const { id } = await props.params;
  const fournisseur = await lireFournisseur(id);
  if (!fournisseur) notFound();

  const contexte = await sessionCourante();
  const peutModifier = contexte ? roleAutorise(contexte.role, "achat:modifier") : false;

  return (
    <div className="flex flex-col gap-4">
      <header>
        <p className="text-sm text-attenue">
          <Link href="/app/achats/fournisseurs" className="underline">
            Fournisseurs
          </Link>
        </p>
        <h1 className="text-2xl font-bold mt-1">{fournisseur.nom}</h1>
      </header>

      {peutModifier && (
        <FormulaireFournisseur
          fournisseur={{
            id: fournisseur.id,
            nom: fournisseur.nom,
            contact: fournisseur.contact,
            email: fournisseur.email,
            telephone: fournisseur.telephone,
            adresse: fournisseur.adresse,
            codePostal: fournisseur.codePostal,
            ville: fournisseur.ville,
            numeroCompte: fournisseur.numeroCompte,
            notes: fournisseur.notes,
          }}
        />
      )}

      <section className="flex flex-col gap-3">
        <h2 className="text-lg font-semibold">Derniers achats</h2>
        {fournisseur.achats.length === 0 ? (
          <p className="text-sm text-attenue">Aucun achat enregistré.</p>
        ) : (
          <ul className="flex flex-col gap-2">
            {fournisseur.achats.map((a) => (
              <li key={a.id}>
                <Link href={`/app/achats/${a.id}`} className="block">
                  <Carte>
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="font-medium truncate">{a.libelle || "Achat"}</p>
                        <p className="text-sm text-attenue">{formatDate.format(a.dateAchat)}</p>
                      </div>
                      <p className="font-semibold whitespace-nowrap">
                        {formaterEuros(totauxAchat({ ...a, lignes: [] }).totalTtcCents)}
                      </p>
                    </div>
                  </Carte>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>

      {peutModifier && !fournisseur.archivedAt && (
        <Carte>
          <h2 className="font-semibold mb-1">Archiver ce fournisseur</h2>
          <p className="text-sm text-attenue mb-3">
            Il disparaît des listes sans perdre l&apos;historique de vos achats.
          </p>
          <form action={archiverFournisseur}>
            <input type="hidden" name="id" value={fournisseur.id} />
            <Bouton type="submit" variante="discret">
              Archiver
            </Bouton>
          </form>
        </Carte>
      )}
    </div>
  );
}
