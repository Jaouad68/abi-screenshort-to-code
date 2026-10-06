"use client";

import { useState } from "react";
import { Section, Titre } from "@/components/ui";
import { useCatalogue } from "@/lib/client/catalogue";
import { useLangue } from "@/lib/client/langue";

export default function Page() {
  const { t } = useLangue();
  const { catalogue } = useCatalogue();
  const [copie, setCopie] = useState(false);
  const texte = `${t.fiche.checklist} :\n${t.guide.checklist.map((d) => `• ${d}`).join("\n")}`;

  const copier = async () => {
    try {
      await navigator.clipboard.writeText(texte);
      setCopie(true);
      setTimeout(() => setCopie(false), 2500);
    } catch {
      setCopie(false);
    }
  };

  return (
    <div className="grid gap-4">
      <Titre>{t.guide.titre}</Titre>
      <p className="text-muted">{t.guide.intro}</p>

      <ol className="grid gap-3">
        {t.guide.etapes.map(([titre, detail], i) => (
          <li key={titre} className="carte-ombre flex gap-3 rounded-2xl border border-line bg-surface p-4">
            <span className="num grid h-8 w-8 shrink-0 place-items-center rounded-full bg-detroit font-display font-bold text-on-detroit">{i + 1}</span>
            <div className="grid gap-0.5">
              <p className="font-semibold">{titre}</p>
              <p className="text-[14.5px] text-muted">{detail}</p>
            </div>
          </li>
        ))}
      </ol>

      <Section titre={t.fiche.checklist}>
        <ul className="grid gap-1.5 text-[15px]">
          {t.guide.checklist.map((d) => (
            <li key={d} className="flex gap-2">
              <span className="text-detroit" aria-hidden>□</span>
              {d}
            </li>
          ))}
        </ul>
        <div className="flex flex-wrap gap-2 pt-1">
          <a
            href={`https://wa.me/?text=${encodeURIComponent(texte)}`}
            target="_blank"
            rel="noreferrer"
            className="flex min-h-12 flex-1 items-center justify-center rounded-xl bg-detroit px-4 font-semibold text-on-detroit"
          >
            {t.guide.partager}
          </a>
          <button type="button" onClick={copier} className="min-h-12 rounded-xl bg-detroit-soft px-4 font-semibold text-detroit" aria-live="polite">
            {copie ? `${t.guide.copie} ✓` : t.guide.copier}
          </button>
        </div>
      </Section>

      <a href={catalogue.regle.lienOfficiel} target="_blank" rel="noreferrer" className="min-h-11 font-semibold text-detroit">
        {t.profil.portail} ↗
      </a>
    </div>
  );
}
