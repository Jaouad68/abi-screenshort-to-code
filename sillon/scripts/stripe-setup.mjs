// Crée (une seule fois) les produits et prix Sillon dans Stripe, en mode test.
// Usage : STRIPE_SECRET_KEY=sk_test_... npm run stripe:setup
// Relançable sans risque : un prix déjà présent (même lookup_key) est conservé.
import Stripe from 'stripe';
import { PLANS, CURRENCY } from '../lib/plans.js';

const key = process.env.STRIPE_SECRET_KEY;
if (!key) {
  console.error('STRIPE_SECRET_KEY manquante.');
  process.exit(1);
}
if (key.startsWith('sk_live_')) {
  console.error('Clé live refusée : ce script ne crée que des prix de test.');
  process.exit(1);
}
const stripe = new Stripe(key);

for (const [plan, def] of Object.entries(PLANS)) {
  const existing = await stripe.prices.list({ lookup_keys: [def.lookupKey], limit: 1 });
  if (existing.data[0]) {
    const p = existing.data[0];
    const same = p.unit_amount === def.amount && p.currency === CURRENCY && p.recurring?.interval === 'month';
    console.log(`${plan}: prix existant ${p.id}${same ? '' : ' (montant différent du code, à vérifier)'}`);
    continue;
  }
  const product = await stripe.products.create({ name: def.name, description: def.description, metadata: { plan } });
  const price = await stripe.prices.create({
    product: product.id,
    currency: CURRENCY,
    unit_amount: def.amount,
    recurring: { interval: 'month' },
    lookup_key: def.lookupKey,
    tax_behavior: 'inclusive',
    metadata: { plan },
  });
  console.log(`${plan}: créé ${product.id} / ${price.id}`);
}
