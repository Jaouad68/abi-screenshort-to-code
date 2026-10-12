"use client";

import { useRef, useState, useTransition } from "react";
import { ajouterLigneChecklist, basculerChecklistItem, supprimerLigneChecklist } from "../actions";
import { champ, btnPetit } from "@/lib/ui";

type Item = { id: string; libelle: string; fait: boolean };

export function ChecklistPanel({
  interventionId,
  items,
  editable,
}: {
  interventionId: string;
  items: Item[];
  editable: boolean;
}) {
  const [pending, startTransition] = useTransition();
  const [nouvelle, setNouvelle] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  const fait = items.filter((i) => i.fait).length;

  return (
    <div>
      <p className="text-sm text-muted mb-3">
        {fait} / {items.length} points vérifiés
      </p>
      <ul className="flex flex-col gap-2">
        {items.map((item) => (
          <li key={item.id} className="flex items-center gap-2.5">
            <label className="flex items-center gap-2.5 flex-1 min-w-0 cursor-pointer">
              <input
                type="checkbox"
                checked={item.fait}
                disabled={!editable || pending}
                onChange={(e) => startTransition(() => basculerChecklistItem(item.id, e.target.checked))}
                className="h-5 w-5 shrink-0 accent-brand"
              />
              <span className={item.fait ? "text-muted line-through" : "text-ink"}>{item.libelle}</span>
            </label>
            {editable && (
              <button
                type="button"
                onClick={() => startTransition(() => supprimerLigneChecklist(item.id))}
                className="text-muted hover:text-danger text-sm shrink-0"
                aria-label="Supprimer cette ligne"
              >
                ×
              </button>
            )}
          </li>
        ))}
      </ul>

      {editable && (
        <form
          className="flex gap-2 mt-4"
          onSubmit={(e) => {
            e.preventDefault();
            if (!nouvelle.trim()) return;
            startTransition(() => ajouterLigneChecklist(interventionId, nouvelle));
            setNouvelle("");
            inputRef.current?.focus();
          }}
        >
          <input
            ref={inputRef}
            value={nouvelle}
            onChange={(e) => setNouvelle(e.target.value)}
            placeholder="Ajouter un point de contrôle…"
            className={champ}
          />
          <button type="submit" className={btnPetit}>
            Ajouter
          </button>
        </form>
      )}
    </div>
  );
}
