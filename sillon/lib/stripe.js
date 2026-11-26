import Stripe from 'stripe';

// Client Stripe partagé. Refuse une clé live tant que ALLOW_LIVE_STRIPE ne vaut pas 1 :
// la page est en mode test.
export function getStripe() {
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) throw new HttpError(500, 'STRIPE_SECRET_KEY manquante.');
  if (key.startsWith('sk_live_') && process.env.ALLOW_LIVE_STRIPE !== '1') {
    throw new HttpError(500, 'Clé Stripe live refusée : cette page tourne en mode test.');
  }
  return new Stripe(key);
}

export class HttpError extends Error {
  constructor(status, message) {
    super(message);
    this.status = status;
  }
}

// Adresse publique du site, pour les URL de retour de Stripe.
export function siteUrl(req) {
  if (process.env.SITE_URL) return process.env.SITE_URL.replace(/\/$/, '');
  const host = req.headers['x-forwarded-host'] || req.headers.host;
  const proto = req.headers['x-forwarded-proto'] || 'https';
  return `${proto}://${host}`;
}

export async function readJson(req, limit = 10_000) {
  if (req.body && typeof req.body === 'object') return req.body;
  const raw = await readRaw(req, limit);
  try {
    return raw.length ? JSON.parse(raw.toString('utf8')) : {};
  } catch {
    throw new HttpError(400, 'Corps de requête JSON invalide.');
  }
}

export async function readRaw(req, limit = 1_000_000) {
  const chunks = [];
  let size = 0;
  for await (const chunk of req) {
    size += chunk.length;
    if (size > limit) throw new HttpError(413, 'Requête trop volumineuse.');
    chunks.push(chunk);
  }
  return Buffer.concat(chunks);
}

export function send(res, status, body) {
  res.statusCode = status;
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.setHeader('Cache-Control', 'no-store');
  res.end(JSON.stringify(body));
}

// Les erreurs 5xx (configuration, Stripe indisponible) restent dans les journaux :
// le visiteur reçoit un message générique.
export function fail(res, err) {
  const status = err instanceof HttpError ? err.status : 500;
  if (status >= 500) console.error(err);
  send(res, status, { error: status >= 500 ? 'Paiement indisponible pour le moment.' : err.message });
}
