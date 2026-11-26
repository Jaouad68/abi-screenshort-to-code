import { getStripe, readRaw, send, fail, HttpError } from '../lib/stripe.js';

// POST /api/webhook  (appelé par Stripe)
// Vérifie la signature et journalise les événements d'abonnement.
// Pas encore de base de données : le statut n'est pas stocké (voir replica/backend.md).
const HANDLED = new Set([
  'checkout.session.completed',
  'customer.subscription.updated',
  'customer.subscription.deleted',
  'invoice.payment_failed',
]);

export default async function handler(req, res) {
  try {
    if (req.method !== 'POST') {
      res.setHeader('Allow', 'POST');
      throw new HttpError(405, 'Méthode non autorisée.');
    }
    const secret = process.env.STRIPE_WEBHOOK_SECRET;
    if (!secret) throw new HttpError(500, 'STRIPE_WEBHOOK_SECRET manquante.');
    const signature = req.headers['stripe-signature'];
    if (!signature) throw new HttpError(400, 'Signature absente.');

    const raw = await readRaw(req);
    let event;
    try {
      event = getStripe().webhooks.constructEvent(raw, signature, secret);
    } catch {
      throw new HttpError(400, 'Signature invalide.');
    }

    if (HANDLED.has(event.type)) {
      const obj = event.data.object;
      // Identifiants seulement, aucune donnée personnelle dans les journaux.
      console.log(JSON.stringify({ stripe_event: event.id, type: event.type, object: obj.id, status: obj.status ?? null }));
    }
    send(res, 200, { received: true });
  } catch (err) {
    fail(res, err);
  }
}
