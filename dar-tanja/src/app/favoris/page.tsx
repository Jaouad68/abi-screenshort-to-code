"use client";

import { useMemo } from "react";
import { CarteProgramme } from "@/components/carte-programme";
import { Titre } from "@/components/ui";
import { useCatalogue } from "@/lib/client/catalogue";
import { useLangue } from "@/lib/client/langue";
import { usePrefs } from "@/lib/client/prefs";
import { CRITERES_DEFAUT, rechercher } from "@/lib/filtres";

export default function Page() {
  const { t } = useLangue();
  const { catalogue, aujourdHui } = useCatalogue();
  const { favoris, profil } = usePrefs();
  // Les favoris s'affichent même s'ils ne passent plus les filtres : le badge montre leur état actuel.
  const resultats = useMemo(
    () =>
      rechercher(catalogue, { ...CRITERES_DEFAUT, foncierSur: false, aideEligible: false }, profil, aujourdHui).filter((r) =>
        favoris.includes(r.programme.id),
      ),
    [catalogue, favoris, profil, aujourdHui],
  );

  return (
    <div className="grid gap-4">
      <Titre>{t.favoris.titre}</Titre>
      {resultats.length === 0 ? <p className="rounded-2xl bg-surface-2 p-4 text-muted">{t.favoris.vide}</p> : null}
      <div className="grid gap-3.5">
        {resultats.map((r) => (
          <CarteProgramme key={r.programme.id} resultat={r} />
        ))}
      </div>
    </div>
  );
}
