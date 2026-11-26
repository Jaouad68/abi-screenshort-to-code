import { getStripe, siteUrl, readJson, send, fail, HttpError } from '../lib/stripe.js';

// POST /api/portal  { "session_id": "cs_test_..." }
// Ouvre le portail client Stripe (changer de formule, arrêter) pour l'abonnement
// créé par cette session Checkout. Sans compte utilisateur, la session sert de preuve.
export default async function handler(req, res) {
  try {
    if (req.method !== 'POST') {
      res.setHeader('Allow', 'POST');
      throw new HttpError(405, 'Méthode non autorisée.');
    }
    const { session_id: sessionId } = await readJson(req);
    if (typeof sessionId !== 'string' || !/^cs_(test|live)_[A-Za-z0-9]+$/.test(sessionId)) {
      throw new HttpError(400, 'Session invalide.');
    }
    const stripe = getStripe();
    const session = await stripe.checkout.sessions.retrieve(sessionId);
    if (session.status !== 'complete' || !session.customer) {
      throw new HttpError(404, 'Aucun abonnement trouvé pour cette session.');
    }
    const portal = await stripe.billingPortal.sessions.create({
      customer: typeof session.customer === 'string' ? session.customer : session.customer.id,
      return_url: `${siteUrl(req)}/merci.html?session_id=${encodeURIComponent(sessionId)}`,
      locale: 'fr',
    });
    send(res, 200, { url: portal.url });
  } catch (err) {
    fail(res, err);
  }
}
