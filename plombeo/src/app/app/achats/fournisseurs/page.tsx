import Link from "next/link";
import { Carte, ListeVide } from "@/components/ui";
import { listerFournisseurs } from "@/lib/achats";
import { sessionCourante } from "@/lib/dal";
import { roleAutorise } from "@/lib/permissions";
import { adresseCourte } from "@/lib/libelles";

export const metadata = { title: "Fournisseurs — Plombéo" };

export default async function PageFournisseurs() {
  const [fournisseurs, contexte] = await Promise.all([listerFournisseurs(), sessionCourante()]);
  const peutModifier = contexte ? roleAutorise(contexte.role, "achat:modifier") : false;

  return (
    <div className="flex flex-col gap-4">
      <header className="flex items-start justify-between gap-3">
        <div>
          <p className="text-sm text-attenue">
            <Link href="/app/achats" className="underline">
              Achats
            </Link>
          </p>
          <h1 className="text-2xl font-bold mt-1">Fournisseurs</h1>
        </div>
        {peutModifier && (
          <Link
            href="/app/achats/fournisseurs/nouveau"
            className="inline-flex items-center justify-center min-h-11 px-4 rounded-controle
                       font-semibold bg-action text-white hover:bg-action-fonce"
          >
            + Nouveau
          </Link>
        )}
      </header>

      {fournisseurs.length === 0 ? (
        <ListeVide titre="Aucun fournisseur">
          Enregistrez vos fournisseurs pour retrouver un contact et un numéro de compte.
        </ListeVide>
      ) : (
        <ul className="flex flex-col gap-2">
          {fournisseurs.map((f) => (
            <li key={f.id}>
              <Link href={`/app/achats/fournisseurs/${f.id}`} className="block">
                <Carte>
                  <p className="font-semibold">{f.nom}</p>
                  {f.numeroCompte && (
                    <p className="text-sm text-attenue">Compte {f.numeroCompte}</p>
                  )}
                  {adresseCourte(f) && <p className="text-sm text-attenue">{adresseCourte(f)}</p>}
                  {f.telephone && <p className="text-sm">{f.telephone}</p>}
                </Carte>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
