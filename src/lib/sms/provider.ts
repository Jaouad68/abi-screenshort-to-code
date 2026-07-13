import "server-only";

export type EnvoiSms = {
  destinataire: string;
  corps: string;
};

export type ResultatEnvoiSms = {
  statut: "ENVOYE" | "ECHEC" | "SIMULE";
};

export interface SmsProvider {
  envoyer(message: EnvoiSms): Promise<ResultatEnvoiSms>;
}

/**
 * Default provider: no third-party SMS account exists yet, so messages are only
 * logged (see lib/sms/service.ts) instead of actually sent. Switches automatically
 * to BrevoSmsProvider once BREVO_API_KEY and SMS_SENDER_NAME are configured.
 */
class NullSmsProvider implements SmsProvider {
  async envoyer(message: EnvoiSms): Promise<ResultatEnvoiSms> {
    console.log(`[SMS simule -> ${message.destinataire}] ${message.corps}`);
    return { statut: "SIMULE" };
  }
}

/** Brevo transactional SMS API. https://developers.brevo.com/reference/sendtransacsms */
class BrevoSmsProvider implements SmsProvider {
  constructor(
    private readonly apiKey: string,
    private readonly sender: string
  ) {}

  async envoyer(message: EnvoiSms): Promise<ResultatEnvoiSms> {
    try {
      const reponse = await fetch("https://api.brevo.com/v3/transactionalSMS/sms", {
        method: "POST",
        headers: {
          "api-key": this.apiKey,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          sender: this.sender,
          recipient: message.destinataire,
          content: message.corps,
          type: "transactional",
        }),
      });
      return { statut: reponse.ok ? "ENVOYE" : "ECHEC" };
    } catch {
      return { statut: "ECHEC" };
    }
  }
}

let provider: SmsProvider | undefined;

export function getSmsProvider(): SmsProvider {
  if (!provider) {
    const apiKey = process.env.BREVO_API_KEY;
    const sender = process.env.SMS_SENDER_NAME;
    provider = apiKey && sender ? new BrevoSmsProvider(apiKey, sender) : new NullSmsProvider();
  }
  return provider;
}
