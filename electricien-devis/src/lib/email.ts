import "server-only";

export type EnvoiResult = { ok: boolean; simule: boolean; erreur?: string };

/**
 * Envoi d'email via Resend. Sans RESEND_API_KEY / EMAIL_FROM configurés, l'envoi
 * est « simulé » (journalisé) : l'application reste fonctionnelle sans compte email.
 */
export async function envoyerEmail(opts: {
  to: string;
  sujet: string;
  html: string;
}): Promise<EnvoiResult> {
  const apiKey = process.env.RESEND_API_KEY;
  const from = process.env.EMAIL_FROM;

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
      return { ok: false, simule: false, erreur: `Resend ${res.status}: ${txt.slice(0, 200)}` };
    }
    return { ok: true, simule: false };
  } catch (e) {
    return {
      ok: false,
      simule: false,
      erreur: e instanceof Error ? e.message : "Erreur réseau",
    };
  }
}
