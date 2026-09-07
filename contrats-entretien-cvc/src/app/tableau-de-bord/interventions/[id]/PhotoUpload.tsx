"use client";

import { useRef, useState, useTransition } from "react";
import { ajouterPhoto, supprimerPhoto } from "../actions";

type Photo = { id: string; dataUrl: string; legende: string };

const TAILLE_MAX = 1400;
const QUALITE_JPEG = 0.72;

/** Redimensionne/compresse une image côté navigateur avant envoi, pour rester
 * largement sous la limite de taille des Server Actions et garder des lignes
 * raisonnables en base (les photos sont stockées en base64 — voir README). */
function compresserImage(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error("Lecture du fichier impossible."));
    reader.onload = () => {
      const img = new Image();
      img.onerror = () => reject(new Error("Image illisible."));
      img.onload = () => {
        const ratio = Math.min(1, TAILLE_MAX / Math.max(img.width, img.height));
        const canvas = document.createElement("canvas");
        canvas.width = Math.round(img.width * ratio);
        canvas.height = Math.round(img.height * ratio);
        const ctx = canvas.getContext("2d");
        if (!ctx) return reject(new Error("Canvas indisponible."));
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
        resolve(canvas.toDataURL("image/jpeg", QUALITE_JPEG));
      };
      img.src = String(reader.result);
    };
    reader.readAsDataURL(file);
  });
}

export function PhotoUpload({
  interventionId,
  photos,
  editable,
}: {
  interventionId: string;
  photos: Photo[];
  editable: boolean;
}) {
  const [pending, startTransition] = useTransition();
  const [erreur, setErreur] = useState<string | null>(null);
  const [agrandie, setAgrandie] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  function onFichiers(e: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files ?? []);
    if (files.length === 0) return;
    setErreur(null);

    startTransition(async () => {
      for (const file of files) {
        try {
          const dataUrl = await compresserImage(file);
          const res = await ajouterPhoto(interventionId, dataUrl, "");
          if (res.error) {
            setErreur(res.error);
            break;
          }
        } catch {
          setErreur("Une photo n'a pas pu être ajoutée.");
        }
      }
    });
    if (inputRef.current) inputRef.current.value = "";
  }

  return (
    <div>
      {photos.length === 0 ? (
        <p className="text-sm text-muted mb-3">Aucune photo pour le moment.</p>
      ) : (
        <div className="grid grid-cols-3 sm:grid-cols-4 gap-2 mb-4">
          {photos.map((p) => (
            <div key={p.id} className="relative aspect-square">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={p.dataUrl}
                alt={p.legende || "Photo d'intervention"}
                className="h-full w-full object-cover rounded-control border border-line cursor-zoom-in"
                onClick={() => setAgrandie(p.dataUrl)}
              />
              {editable && (
                <button
                  type="button"
                  onClick={() => startTransition(() => supprimerPhoto(p.id))}
                  className="absolute -top-1.5 -right-1.5 h-6 w-6 rounded-full bg-danger text-white text-sm leading-none grid place-items-center shadow"
                  aria-label="Supprimer cette photo"
                >
                  ×
                </button>
              )}
            </div>
          ))}
        </div>
      )}

      {editable && (
        <>
          <input
            ref={inputRef}
            type="file"
            accept="image/*"
            capture="environment"
            multiple
            onChange={onFichiers}
            disabled={pending}
            className="text-sm"
          />
          {pending && <p className="text-xs text-muted mt-1">Envoi en cours…</p>}
          {erreur && <p className="text-danger text-sm mt-1">{erreur}</p>}
        </>
      )}

      {agrandie && (
        <div
          className="fixed inset-0 z-30 bg-black/70 flex items-center justify-center p-4"
          onClick={() => setAgrandie(null)}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={agrandie} alt="Photo agrandie" className="max-h-full max-w-full rounded-control" />
        </div>
      )}

      {editable && photos.length === 0 && (
        <p className="text-xs text-muted mt-2">
          Les photos sont stockées directement en base de données pour cette V1 —
          suffisant pour un usage courant, à faire évoluer vers un stockage objet
          externe (S3, Cloudinary…) avant un usage intensif. Voir le README.
        </p>
      )}
    </div>
  );
}
