import "server-only";
import Stripe from "stripe";
import type { Plan } from "@/generated/prisma/enums";

function stripeClient(): Stripe | null {
  const secretKey = process.env.STRIPE_SECRET_KEY;
  return secretKey ? new Stripe(secretKey) : null;
}

function priceIdPourPlan(plan: Plan): string | undefined {
  const map: Record<Plan, string | undefined> = {
    ESSENTIEL: process.env.STRIPE_PRICE_ESSENTIEL,
    SERENITE: process.env.STRIPE_PRICE_SERENITE,
    PREMIUM: process.env.STRIPE_PRICE_PREMIUM,
  };
  return map[plan];
}

export function facturationConfiguree(): boolean {
  return !!stripeClient();
}

export async function creerSessionAbonnement(params: {
  salonId: string;
  plan: Plan;
  stripeCustomerId: string | null;
  email: string;
  successUrl: string;
  cancelUrl: string;
}): Promise<string | null> {
  const stripe = stripeClient();
  const priceId = priceIdPourPlan(params.plan);
  if (!stripe || !priceId) return null;

  const session = await stripe.checkout.sessions.create({
    mode: "subscription",
    customer: params.stripeCustomerId ?? undefined,
    customer_email: params.stripeCustomerId ? undefined : params.email,
    line_items: [{ price: priceId, quantity: 1 }],
    metadata: { salonId: params.salonId, plan: params.plan },
    subscription_data: { metadata: { salonId: params.salonId, plan: params.plan } },
    success_url: params.successUrl,
    cancel_url: params.cancelUrl,
  });

  return session.url;
}

export async function creerSessionPortailFacturation(
  stripeCustomerId: string,
  returnUrl: string
): Promise<string | null> {
  const stripe = stripeClient();
  if (!stripe) return null;

  const session = await stripe.billingPortal.sessions.create({
    customer: stripeCustomerId,
    return_url: returnUrl,
  });

  return session.url;
}
