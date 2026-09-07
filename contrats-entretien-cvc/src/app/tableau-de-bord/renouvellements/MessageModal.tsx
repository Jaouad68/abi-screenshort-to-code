"use client";

import { useState } from "react";
import { genererMessageEmail, genererMessageSms, lienMailto } from "@/lib/messages";
import { btnPrimaire, btnSecondaire, btnPetit, champ } from "@/lib/ui";

export function MessageModal({
  entrepriseNom,
  clientNom,
  clientEmail,
  equipementLibelle,
  contratType,
  dateEcheance,
  montantCents,
  compact = false,
}: {
  entrepriseNom: string;
  clientNom: string;
  clientEmail: string;
  equipementLibelle?: string;
  contratType: string;
  dateEcheance: Date;
  montantCents: number;
  compact?: boolean;
}) {
  const [ouvert, setOuvert] = useState(false);
  const [copie, setCopie] = useState<"email" | "sms" | null>(null);

  const ctx = { entrepriseNom, clientNom, equipementLibelle, contratType, dateEcheance, montantCents };
  const email = genererMessageEmail(ctx);
  const sms = genererMessageSms(ctx);

  async function copier(texte: string, cible: "email" | "sms") {
    try {
      await navigator.clipboard.writeText(texte);
      setCopie(cible);
      setTimeout(() => setCopie(null), 2000);
    } catch {
      window.prompt("Copiez le texte ci-dessous :", texte);
    }
  }

  return (
    <>
      <button type="button" onClick={() => setOuvert(true)} className={compact ? btnPetit : btnSecondaire}>
        Préparer un message
      </button>

      {ouvert && (
        <div
          className="fixed inset-0 z-30 bg-black/40 flex items-end sm:items-center justify-center p-0 sm:p-4"
          onClick={() => setOuvert(false)}
        >
          <div
            className="bg-card rounded-t-card sm:rounded-card w-full sm:max-w-lg max-h-[90dvh] overflow-y-auto p-5 sm:p-6"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-bold text-ink text-lg">Message de relance — brouillon</h3>
              <button type="button" onClick={() => setOuvert(false)} className="text-muted hover:text-ink text-xl leading-none">
                ×
              </button>
            </div>
            <p className="text-xs text-muted mb-4">
              Brouillon uniquement : rien n&apos;est envoyé automatiquement. Copiez le
              texte ou ouvrez votre client mail.
            </p>

            <div className="mb-5">
              <p className="font-semibold text-ink-2 mb-1.5">E-mail</p>
              <p className="text-xs text-muted mb-1">Objet : {email.objet}</p>
              <textarea readOnly value={email.corps} rows={8} className={champ + " text-sm"} />
              <div className="flex flex-wrap gap-2 mt-2">
                <button type="button" onClick={() => copier(`${email.objet}\n\n${email.corps}`, "email")} className={btnPetit}>
                  {copie === "email" ? "Copié ✓" : "Copier"}
                </button>
                {clientEmail && (
                  <a href={lienMailto(clientEmail, email.objet, email.corps)} className={btnPetit}>
                    Ouvrir dans le client mail
                  </a>
                )}
              </div>
            </div>

            <div className="mb-2">
              <p className="font-semibold text-ink-2 mb-1.5">SMS</p>
              <textarea readOnly value={sms} rows={3} className={champ + " text-sm"} />
              <div className="flex gap-2 mt-2">
                <button type="button" onClick={() => copier(sms, "sms")} className={btnPetit}>
                  {copie === "sms" ? "Copié ✓" : "Copier"}
                </button>
              </div>
              <p className="text-xs text-muted mt-1">
                Aucun fournisseur SMS n&apos;est branché dans cette version : copiez le
                texte dans votre application SMS habituelle.
              </p>
            </div>

            <button type="button" onClick={() => setOuvert(false)} className={`${btnPrimaire} w-full mt-3`}>
              Fermer
            </button>
          </div>
        </div>
      )}
    </>
  );
}
