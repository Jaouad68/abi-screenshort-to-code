import "server-only";

export type ResultatEnvoiSms = { ok: boolean; simule: boolean };

/**
 * Envoi de SMS via Brevo. Sans BREVO_API_KEY / SMS_SENDER_NAME configurés,
 * l'envoi est « simulé » (journalisé en base par l'appelant + console) :
 * les agents restent utilisables en démo sans compte SMS.
 */
export async function envoyerSms(destinataire: string, corps: string): Promise<ResultatEnvoiSms> {
  const apiKey = process.env.BREVO_API_KEY;
  const sender = process.env.SMS_SENDER_NAME;

  if (!apiKey || !sender) {
    console.info(`[SMS simulé -> ${destinataire}] ${corps}`);
    return { ok: true, simule: true };
  }

  try {
    const res = await fetch("https://api.brevo.com/v3/transactionalSMS/sms", {
      method: "POST",
      headers: {
        "api-key": apiKey,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        sender,
        recipient: destinataire,
        content: corps,
        type: "transactional",
      }),
    });
    return { ok: res.ok, simule: false };
  } catch {
    return { ok: false, simule: false };
  }
}
