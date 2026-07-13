import "server-only";
import Stripe from "stripe";

export type CreationSessionParams = {
  appointmentId: string;
  montantCents: number;
  description: string;
  successUrl: string;
  cancelUrl: string;
};

export type SessionPaiement = {
  /** Where to redirect the client to pay. Null in Null-provider mode (no real payment). */
  url: string | null;
  sessionId: string | null;
};

export interface PaymentProvider {
  creerSessionPaiement(params: CreationSessionParams): Promise<SessionPaiement>;
  rembourser(sessionId: string): Promise<void>;
}

/**
 * Default provider: no Stripe account exists yet, so a deposit is recorded as
 * "due" (DEMANDE) but never actually collected online. Switches automatically to
 * StripePaymentProvider once STRIPE_SECRET_KEY is configured.
 */
class NullPaymentProvider implements PaymentProvider {
  async creerSessionPaiement(params: CreationSessionParams): Promise<SessionPaiement> {
    console.log(
      `[Acompte simule] RDV ${params.appointmentId} : ${(params.montantCents / 100).toFixed(2)} EUR dus, non collectes (Stripe non configure).`
    );
    return { url: null, sessionId: null };
  }

  async rembourser(sessionId: string): Promise<void> {
    console.log(`[Remboursement simule] session ${sessionId}`);
  }
}

class StripePaymentProvider implements PaymentProvider {
  private readonly stripe: Stripe;

  constructor(secretKey: string) {
    this.stripe = new Stripe(secretKey);
  }

  async creerSessionPaiement(params: CreationSessionParams): Promise<SessionPaiement> {
    const session = await this.stripe.checkout.sessions.create({
      mode: "payment",
      line_items: [
        {
          price_data: {
            currency: "eur",
            product_data: { name: params.description },
            unit_amount: params.montantCents,
          },
          quantity: 1,
        },
      ],
      metadata: { appointmentId: params.appointmentId },
      success_url: params.successUrl,
      cancel_url: params.cancelUrl,
    });

    return { url: session.url, sessionId: session.id };
  }

  async rembourser(sessionId: string): Promise<void> {
    const session = await this.stripe.checkout.sessions.retrieve(sessionId);
    if (typeof session.payment_intent === "string") {
      await this.stripe.refunds.create({ payment_intent: session.payment_intent });
    }
  }
}

let provider: PaymentProvider | undefined;

export function getPaymentProvider(): PaymentProvider {
  if (!provider) {
    const secretKey = process.env.STRIPE_SECRET_KEY;
    provider = secretKey ? new StripePaymentProvider(secretKey) : new NullPaymentProvider();
  }
  return provider;
}
