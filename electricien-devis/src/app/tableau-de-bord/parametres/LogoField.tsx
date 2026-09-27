"use client";

import { useRef, useState, useTransition } from "react";
import { Logo } from "@/components/Logo";
import { mettreAJourLogo, retirerLogo } from "./actions";
import { btnSecondaire, carte } from "@/lib/ui";

export function LogoField({ nom, logoDataUrl }: { nom: string; logoDataUrl: string }) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [pending, startTransition] = useTransition();
  const [erreur, setErreur] = useState<string>();

  const choisir = (fichier: File) => {
    setErreur(undefined);
    if (!fichier.type.startsWith("image/")) {
      setErreur("Choisissez un fichier image (PNG, JPG…).");
      return;
    }
    if (fichier.size > 1_000_000) {
      setErreur("Image trop lourde (max ~1 Mo).");
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      const dataUrl = reader.result as string;
      startTransition(async () => {
        const res = await mettreAJourLogo(dataUrl);
        if (res.error) setErreur(res.error);
      });
    };
    reader.readAsDataURL(fichier);
  };

  return (
    <section className={carte}>
      <h2 className="font-bold text-lg mb-4">Logo</h2>
      <div className="flex items-center gap-4">
        <div className="grid h-16 min-w-16 place-items-center rounded-control border border-line bg-white px-2 shrink-0">
          <Logo logoDataUrl={logoDataUrl} nom={nom} size={44} />
        </div>
        <div className="flex flex-wrap gap-2">
          <input
            ref={inputRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) choisir(f);
              e.target.value = "";
            }}
          />
          <button
            type="button"
            className={btnSecondaire}
            disabled={pending}
            onClick={() => inputRef.current?.click()}
          >
            {pending ? "Chargement…" : "Remplacer le logo"}
          </button>
          {logoDataUrl && (
            <button
              type="button"
              className={btnSecondaire}
              disabled={pending}
              onClick={() => startTransition(async () => void (await retirerLogo()))}
            >
              Retirer
            </button>
          )}
        </div>
      </div>
      <p className="text-xs text-muted mt-3">
        Le logo apparaît dans l’en-tête de vos devis et factures. Sans logo téléversé, le logo
        Francisco MELLADO est utilisé. PNG ou JPG, ~1 Mo max.
      </p>
      {erreur && <p className="text-danger text-sm mt-2">{erreur}</p>}
    </section>
  );
}
