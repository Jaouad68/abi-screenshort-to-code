import { NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";
import { prisma } from "@/lib/prisma";
import type { AbonnementStatut, Plan } from "@/generated/prisma/enums";

function statutDepuisAbonnementStripe(statutStripe: Stripe.Subscription.Status): AbonnementStatut {
  switch (statutStripe) {
    case "active":
      return "ACTIF";
    case "trialing":
      return "ESSAI";
    case "past_due":
    case "unpaid":
      return "IMPAYE";
    default:
      return "ANNULE";
  }
}

export async function POST(request: NextRequest) {
  const secretKey = process.env.STRIPE_SECRET_KEY;
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

  if (!secretKey || !webhookSecret) {
    return NextResponse.json({ error: "Stripe not configured" }, { status: 501 });
  }

  const signature = request.headers.get("stripe-signature");
  if (!signature) {
    return NextResponse.json({ error: "Missing signature" }, { status: 400 });
  }

  const rawBody = await request.text();

  let event: Stripe.Event;
  try {
    const stripe = new Stripe(secretKey);
    event = stripe.webhooks.constructEvent(rawBody, signature, webhookSecret);
  } catch {
    return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
  }

  switch (event.type) {
    case "checkout.session.completed": {
      const session = event.data.object as Stripe.Checkout.Session;

      if (session.mode === "subscription") {
        const salonId = session.metadata?.salonId;
        const plan = session.metadata?.plan as Plan | undefined;
        if (salonId && plan) {
          await prisma.salon.update({
            where: { id: salonId },
            data: {
              plan,
              abonnementStatut: "ACTIF",
              stripeCustomerId: typeof session.customer === "string" ? session.customer : null,
              stripeSubscriptionId:
                typeof session.subscription === "string" ? session.subscription : null,
            },
          });
        }
      } else {
        // Payment mode: this is a deposit (acompte) checkout, see Phase 3.
        await prisma.appointment.updateMany({
          where: { stripeSessionId: session.id },
          data: { acompteStatut: "REGLE" },
        });
      }
      break;
    }

    case "customer.subscription.updated": {
      const subscription = event.data.object as Stripe.Subscription;
      await prisma.salon.updateMany({
        where: { stripeSubscriptionId: subscription.id },
        data: { abonnementStatut: statutDepuisAbonnementStripe(subscription.status) },
      });
      break;
    }

    case "customer.subscription.deleted": {
      const subscription = event.data.object as Stripe.Subscription;
      await prisma.salon.updateMany({
        where: { stripeSubscriptionId: subscription.id },
        data: { abonnementStatut: "ANNULE" },
      });
      break;
    }

    case "invoice.payment_failed": {
      const invoice = event.data.object as Stripe.Invoice;
      const subscriptionDetails =
        invoice.parent?.type === "subscription_details" ? invoice.parent.subscription_details : null;
      const subscription = subscriptionDetails?.subscription;
      const subscriptionId = typeof subscription === "string" ? subscription : subscription?.id;
      if (subscriptionId) {
        await prisma.salon.updateMany({
          where: { stripeSubscriptionId: subscriptionId },
          data: { abonnementStatut: "IMPAYE" },
        });
      }
      break;
    }
  }

  return NextResponse.json({ received: true });
}
