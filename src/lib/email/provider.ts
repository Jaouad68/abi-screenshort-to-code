import "server-only";

export type EnvoiEmail = {
  destinataire: string;
  sujet: string;
  corps: string;
};

export type ResultatEnvoiEmail = {
  statut: "ENVOYE" | "ECHEC" | "SIMULE";
};

export interface EmailProvider {
  envoyer(message: EnvoiEmail): Promise<ResultatEnvoiEmail>;
}

/**
 * Default provider: no transactional email account exists yet, so emails are only
 * logged to the console. Switches automatically to BrevoEmailProvider once
 * BREVO_API_KEY and EMAIL_FROM are configured (reuses the Brevo account already
 * used for SMS, on its transactional email API).
 */
class NullEmailProvider implements EmailProvider {
  async envoyer(message: EnvoiEmail): Promise<ResultatEnvoiEmail> {
    console.log(`[Email simule -> ${message.destinataire}] ${message.sujet}\n${message.corps}`);
    return { statut: "SIMULE" };
  }
}

/** Brevo transactional email API. https://developers.brevo.com/reference/sendtransacemail */
class BrevoEmailProvider implements EmailProvider {
  constructor(
    private readonly apiKey: string,
    private readonly expediteur: string
  ) {}

  async envoyer(message: EnvoiEmail): Promise<ResultatEnvoiEmail> {
    try {
      const reponse = await fetch("https://api.brevo.com/v3/smtp/email", {
        method: "POST",
        headers: {
          "api-key": this.apiKey,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          sender: { email: this.expediteur, name: "RésaZen" },
          to: [{ email: message.destinataire }],
          subject: message.sujet,
          textContent: message.corps,
        }),
      });
      return { statut: reponse.ok ? "ENVOYE" : "ECHEC" };
    } catch {
      return { statut: "ECHEC" };
    }
  }
}

let provider: EmailProvider | undefined;

export function getEmailProvider(): EmailProvider {
  if (!provider) {
    const apiKey = process.env.BREVO_API_KEY;
    const expediteur = process.env.EMAIL_FROM;
    provider = apiKey && expediteur ? new BrevoEmailProvider(apiKey, expediteur) : new NullEmailProvider();
  }
  return provider;
}
