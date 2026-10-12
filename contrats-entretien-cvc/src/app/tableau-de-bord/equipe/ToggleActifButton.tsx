"use client";

import { useTransition } from "react";
import { basculerActifUtilisateur } from "./actions";
import { btnPetit } from "@/lib/ui";

export function ToggleActifButton({ id, actif }: { id: string; actif: boolean }) {
  const [pending, startTransition] = useTransition();

  return (
    <button
      type="button"
      disabled={pending}
      onClick={() => {
        const message = actif
          ? "Désactiver ce compte ? La personne ne pourra plus se connecter."
          : "Réactiver ce compte ?";
        if (window.confirm(message)) startTransition(() => basculerActifUtilisateur(id, !actif));
      }}
      className={`${btnPetit} ${actif ? "text-danger" : "text-ok"}`}
    >
      {actif ? "Désactiver" : "Réactiver"}
    </button>
  );
}
