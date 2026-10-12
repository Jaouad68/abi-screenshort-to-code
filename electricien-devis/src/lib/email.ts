import "server-only";
import { diagnostiquerResend, nettoyerVariable, type RaisonEchec } from "@/lib/email-erreur";

export type EnvoiResult = { ok: boolean; simule: boolean; erreur?: string; raison?: RaisonEchec };

/**
 * Envoi d'email via Resend. Sans RESEND_API_KEY / EMAIL_FROM configurés, l'envoi
 * est « simulé » (journalisé) : l'application reste fonctionnelle sans compte email.
 */
export async function envoyerEmail(opts: {
  to: string;
  sujet: string;
  html: string;
}): Promise<EnvoiResult> {
  const apiKey = nettoyerVariable(process.env.RESEND_API_KEY);
  const from = nettoyerVariable(process.env.EMAIL_FROM);

  if (!apiKey || !from) {
    console.info(`[email simulé] à=${opts.to} · sujet="${opts.sujet}"`);
    return { ok: true, simule: true };
  }

  try {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from,
        to: opts.to,
        subject: opts.sujet,
        html: opts.html,
      }),
    });

    if (!res.ok) {
      const txt = await res.text();
      const raison = diagnostiquerResend(res.status, txt);
      // Visible dans les journaux Vercel (Deployments → Logs) pour le diagnostic.
      console.error(`[email] échec Resend ${res.status} (${raison}) from="${from}" : ${txt.slice(0, 500)}`);
      return { ok: false, simule: false, raison, erreur: `Resend ${res.status}: ${txt.slice(0, 200)}` };
    }
    return { ok: true, simule: false };
  } catch (e) {
    const erreur = e instanceof Error ? e.message : "Erreur réseau";
    console.error(`[email] Resend injoignable : ${erreur}`);
    return { ok: false, simule: false, raison: "reseau", erreur };
  }
}
