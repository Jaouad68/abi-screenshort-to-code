// Formules Sillon : source unique pour le script de création des prix et pour l'API.
// Les prix Stripe sont retrouvés par lookup_key, aucun identifiant n'est écrit en dur.
export const PLANS = {
  solo: {
    name: 'Sillon Solo',
    description: '1 compte Premium.',
    lookupKey: 'sillon_solo_monthly',
    amount: 1099,
    trialDays: 30,
  },
  etudiant: {
    name: 'Sillon Étudiant',
    description: '1 compte Premium à tarif étudiant, sur justificatif.',
    lookupKey: 'sillon_etudiant_monthly',
    amount: 549,
    trialDays: 30,
  },
  duo: {
    name: 'Sillon Duo',
    description: '2 comptes Premium pour deux personnes à la même adresse.',
    lookupKey: 'sillon_duo_monthly',
    amount: 1449,
    trialDays: 0,
  },
  foyer: {
    name: 'Sillon Foyer',
    description: "Jusqu'à 6 comptes Premium à la même adresse.",
    lookupKey: 'sillon_foyer_monthly',
    amount: 1799,
    trialDays: 0,
  },
};

export const CURRENCY = 'eur';
