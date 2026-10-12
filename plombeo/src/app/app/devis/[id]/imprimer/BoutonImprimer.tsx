"use client";

import { Bouton } from "@/components/ui";

/** Déclenche l'impression du navigateur, d'où l'artisan peut enregistrer un PDF. */
export function BoutonImprimer() {
  return (
    <Bouton type="button" onClick={() => window.print()}>
      Imprimer / enregistrer en PDF
    </Bouton>
  );
}
