import { PLANS } from '../lib/plans.js';
import { getStripe, send, fail, HttpError } from '../lib/stripe.js';

// GET /api/session?session_id=cs_test_...
// Résumé minimal pour la page de remerciement : formule, statut, fin de l'essai.
// Ne renvoie ni e-mail ni nom.
export default async function handler(req, res) {
  try {
    if (req.method !== 'GET') {
      res.setHeader('Allow', 'GET');
      throw new HttpError(405, 'Méthode non autorisée.');
    }
    const sessionId = new URL(req.url, 'http://x').searchParams.get('session_id') || '';
    if (!/^cs_(test|live)_[A-Za-z0-9]+$/.test(sessionId)) throw new HttpError(400, 'Session invalide.');

    const stripe = getStripe();
    const session = await stripe.checkout.sessions.retrieve(sessionId, { expand: ['subscription'] });
    if (session.status !== 'complete') throw new HttpError(404, 'Paiement non finalisé.');

    const sub = typeof session.subscription === 'object' ? session.subscription : null;
    const plan = session.metadata?.plan;
    send(res, 200, {
      plan: Object.hasOwn(PLANS, plan) ? plan : null,
      planName: Object.hasOwn(PLANS, plan) ? PLANS[plan].name : null,
      status: sub?.status ?? null,
      trialEnd: sub?.trial_end ? new Date(sub.trial_end * 1000).toISOString() : null,
      livemode: session.livemode,
    });
  } catch (err) {
    fail(res, err);
  }
}
