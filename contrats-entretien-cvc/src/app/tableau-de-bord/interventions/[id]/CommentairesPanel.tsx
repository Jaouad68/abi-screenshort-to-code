"use client";

import { useState, useTransition } from "react";
import { enregistrerCommentaires } from "../actions";
import { champ, btnPrimaire } from "@/lib/ui";

export function CommentairesPanel({
  interventionId,
  commentaires,
  editable,
}: {
  interventionId: string;
  commentaires: string;
  editable: boolean;
}) {
  const [valeur, setValeur] = useState(commentaires);
  const [pending, startTransition] = useTransition();
  const [enregistre, setEnregistre] = useState(false);

  if (!editable) {
    return commentaires ? (
      <p className="whitespace-pre-wrap text-sm text-ink-2">{commentaires}</p>
    ) : (
      <p className="text-sm text-muted">Aucun commentaire.</p>
    );
  }

  return (
    <div>
      <textarea
        value={valeur}
        onChange={(e) => {
          setValeur(e.target.value);
          setEnregistre(false);
        }}
        rows={5}
        className={champ}
        placeholder="Observations, pièces remplacées, anomalies constatées…"
      />
      <button
        type="button"
        disabled={pending}
        onClick={() =>
          startTransition(async () => {
            await enregistrerCommentaires(interventionId, valeur);
            setEnregistre(true);
          })
        }
        className={`${btnPrimaire} mt-2`}
      >
        {pending ? "Enregistrement…" : enregistre ? "Enregistré ✓" : "Enregistrer"}
      </button>
    </div>
  );
}
