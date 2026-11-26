import { PLANS } from '../lib/plans.js';
import { getStripe, siteUrl, readJson, send, fail, HttpError } from '../lib/stripe.js';

// POST /api/checkout  { "plan": "solo" | "etudiant" | "duo" | "foyer" }
// Crée une session Stripe Checkout d'abonnement et renvoie son URL.
export default async function handler(req, res) {
  try {
    if (req.method !== 'POST') {
      res.setHeader('Allow', 'POST');
      throw new HttpError(405, 'Méthode non autorisée.');
    }
    const { plan } = await readJson(req);
    if (typeof plan !== 'string' || !Object.hasOwn(PLANS, plan)) {
      throw new HttpError(400, 'Formule inconnue.');
    }
    const def = PLANS[plan];
    const stripe = getStripe();

    const prices = await stripe.prices.list({ lookup_keys: [def.lookupKey], active: true, limit: 1 });
    const price = prices.data[0];
    if (!price) throw new HttpError(500, `Prix introuvable pour ${def.lookupKey} : lancez npm run stripe:setup.`);

    const base = siteUrl(req);
    const session = await stripe.checkout.sessions.create({
      mode: 'subscription',
      line_items: [{ price: price.id, quantity: 1 }],
      subscription_data: {
        ...(def.trialDays ? { trial_period_days: def.trialDays } : {}),
        metadata: { plan },
      },
      metadata: { plan },
      locale: 'fr',
      billing_address_collection: 'auto',
      success_url: `${base}/merci.html?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${base}/#formule-${plan}`,
    });

    send(res, 200, { url: session.url });
  } catch (err) {
    fail(res, err);
  }
}
