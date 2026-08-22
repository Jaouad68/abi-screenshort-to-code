import Link from "next/link";
import { Badge, Bouton, Carte, ListeVide } from "@/components/ui";
import { listerFournitures, listerPrestations } from "@/lib/devis";
import { sessionCourante } from "@/lib/dal";
import { roleAutorise } from "@/lib/permissions";
import { formaterEuros, formaterTaux } from "@/lib/calcul";
import { formaterDuree } from "@/lib/format";
import { archiverArticle } from "../devis/actions";
import { basculerSuiviStock } from "../achats/actions";
import { margeFourniture } from "@/lib/stock";
import { FormulaireArticle } from "./FormulaireArticle";

export const metadata = { title: "Catalogue — Plombéo" };

export default async function PageCatalogue() {
  const [prestations, fournitures] = await Promise.all([
    listerPrestations(),
    listerFournitures(),
  ]);
  const contexte = await sessionCourante();
  const peutModifier = contexte ? roleAutorise(contexte.role, "catalogue:modifier") : false;
  const peutStock = contexte ? roleAutorise(contexte.role, "stock:modifier") : false;

  return (
    <div className="flex flex-col gap-4">
      <header>
        <h1 className="text-2xl font-bold">Catalogue</h1>
        <p className="text-attenue mt-1">
          Vos prestations et fournitures habituelles, pour chiffrer sans tout retaper.
        </p>
      </header>

      <section className="flex flex-col gap-2">
        <h2 className="font-semibold">Prestations</h2>
        {prestations.length === 0 ? (
          <ListeVide titre="Aucune prestation">
            Ajoutez votre main-d&apos;œuvre, vos forfaits de déplacement, vos dépannages.
          </ListeVide>
        ) : (
          <ul className="flex flex-col gap-2">
            {prestations.map((p) => (
              <li key={p.id}>
                <Carte>
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="font-semibold">{p.libelle}</p>
                      {p.description && (
                        <p className="text-sm text-attenue">{p.description}</p>
                      )}
                      <p className="text-sm text-attenue">
                        {formaterEuros(p.prixUnitaireCents)} / {p.unite} ·{" "}
                        TVA {formaterTaux(p.tauxTvaCentiemes)}
                        {p.dureeMin > 0 ? ` · ${formaterDuree(p.dureeMin)}` : ""}
                      </p>
                    </div>
                    {peutModifier && (
                      <form action={archiverArticle}>
                        <input type="hidden" name="id" value={p.id} />
                        <input type="hidden" name="type" value="prestation" />
                        <Bouton type="submit" variante="discret">
                          Retirer
                        </Bouton>
                      </form>
                    )}
                  </div>
                </Carte>
              </li>
            ))}
          </ul>
        )}
        {peutModifier && <FormulaireArticle type="prestation" />}
      </section>

      <section className="flex flex-col gap-2">
        <h2 className="font-semibold">Fournitures</h2>
        {fournitures.length === 0 ? (
          <ListeVide titre="Aucune fourniture">
            Ajoutez le matériel que vous posez régulièrement.
          </ListeVide>
        ) : (
          <ul className="flex flex-col gap-2">
            {fournitures.map((f) => (
              <li key={f.id}>
                <Carte>
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="font-semibold">{f.libelle}</p>
                      {f.reference && <Badge>{f.reference}</Badge>}
                      <p className="text-sm text-attenue">
                        {formaterEuros(f.prixUnitaireCents)} / {f.unite} ·{" "}
                        TVA {formaterTaux(f.tauxTvaCentiemes)}
                      </p>
                      {/* La marge n'apparaît QUE si le prix d'achat est connu :
                          un zéro par défaut afficherait 100 % de marge. */}
                      {(() => {
                        const marge = margeFourniture(f.prixUnitaireCents, f.prixAchatCents);
                        return marge ? (
                          <p className="text-sm mt-1">
                            Achat {formaterEuros(f.prixAchatCents)} · marge{" "}
                            {formaterEuros(marge.margeCents)} ({formaterTaux(marge.tauxCentiemes)})
                          </p>
                        ) : (
                          <p className="text-sm text-attenue mt-1">
                            Prix d&apos;achat inconnu : marge non calculée.
                          </p>
                        );
                      })()}
                      {f.suiviStock && (
                        <p className="text-sm text-attenue mt-1">
                          <Link href={`/app/stock/${f.id}`} className="underline">
                            Suivi en stock
                          </Link>
                        </p>
                      )}
                    </div>
                    {peutModifier && (
                      <div className="flex flex-col gap-2">
                        {peutStock && (
                          <form action={basculerSuiviStock}>
                            <input type="hidden" name="id" value={f.id} />
                            <Bouton type="submit" variante="discret">
                              {f.suiviStock ? "Ne plus suivre" : "Suivre en stock"}
                            </Bouton>
                          </form>
                        )}
                        <form action={archiverArticle}>
                          <input type="hidden" name="id" value={f.id} />
                          <input type="hidden" name="type" value="fourniture" />
                          <Bouton type="submit" variante="discret">
                            Retirer
                          </Bouton>
                        </form>
                      </div>
                    )}
                  </div>
                </Carte>
              </li>
            ))}
          </ul>
        )}
        {peutModifier && <FormulaireArticle type="fourniture" />}
      </section>

      <p className="text-xs text-attenue">
        Le taux de TVA que vous indiquez ici sert de valeur par défaut, modifiable sur
        chaque ligne de devis. Plombéo ne détermine jamais le taux applicable à votre
        place : cette responsabilité vous revient, avec votre expert-comptable.
      </p>
    </div>
  );
}
