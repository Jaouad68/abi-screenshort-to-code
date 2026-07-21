"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { comprimerImageFacture } from "@/lib/images/compression";

interface PlatImporte {
  id: string;
  nom: string;
}

export function ImporterCarte({ etablissementId }: { etablissementId: string }) {
  const router = useRouter();
  const [enCours, setEnCours] = useState(false);
  const [erreur, setErreur] = useState<string | null>(null);

  async function surSelectionFichier(evenement: React.ChangeEvent<HTMLInputElement>) {
    const fichier = evenement.target.files?.[0];
    if (!fichier) return;

    setErreur(null);
    setEnCours(true);
    try {
      const imageComprimee = await comprimerImageFacture(fichier);

      const formData = new FormData();
      formData.append("image", imageComprimee);
      formData.append("etablissement_id", etablissementId);

      const reponse = await fetch("/api/carte/importer", {
        method: "POST",
        body: formData,
      });
      const resultat: {
        mode: string;
        raison?: string;
        plats?: PlatImporte[];
      } = await reponse.json();

      if (resultat.mode === "importe" && resultat.plats && resultat.plats.length > 0) {
        router.push(`/plats/${resultat.plats[0]!.id}/fiche-technique`);
        return;
      }

      if (resultat.mode === "manuel") {
        setErreur(
          resultat.raison === "aucun_plat_detecte"
            ? "Aucun plat n'a été détecté sur cette photo. Réessaie avec une photo plus nette, ou ajoute tes plats manuellement."
            : "La lecture de la carte a échoué. Réessaie avec une photo plus nette, ou ajoute tes plats manuellement.",
        );
        return;
      }

      setErreur("Une erreur inattendue est survenue.");
    } catch {
      setErreur("L'envoi de la photo a échoué. Vérifie ta connexion et réessaie.");
    } finally {
      setEnCours(false);
    }
  }

  return (
    <main className="flex min-h-dvh flex-col items-center justify-center gap-6 bg-[var(--color-fond)] px-6 text-center text-[var(--color-texte)]">
      <h1 className="font-[family-name:var(--font-display)] text-3xl">
        Photographie ta carte
      </h1>
      <p className="text-sm text-[var(--color-texte)]/70">
        Un plat par ligne, avec son prix. On s&apos;occupe du reste.
      </p>

      <label className="flex h-14 w-full max-w-xs cursor-pointer items-center justify-center rounded-md bg-[var(--color-positif)] px-6 font-semibold text-[var(--color-fond)]">
        {enCours ? "Analyse en cours…" : "Prendre une photo"}
        <input
          type="file"
          accept="image/*"
          capture="environment"
          className="hidden"
          disabled={enCours}
          onChange={surSelectionFichier}
        />
      </label>

      {erreur && <p className="max-w-xs text-sm text-[var(--color-alerte)]">{erreur}</p>}
    </main>
  );
}
