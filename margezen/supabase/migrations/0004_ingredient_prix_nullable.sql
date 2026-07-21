-- L'onboarding (Sprint 3) crée des fiches techniques avant qu'aucune
-- facture n'ait jamais été scannée : le prix d'un ingrédient proposé par
-- l'IA peut donc être inconnu au moment de la création. `prix_unitaire_cts`
-- devient nullable — un prix manquant se traduit par un coût matière
-- incomplet (« — » affiché, jamais une estimation silencieuse), exactement
-- comme le gère déjà `coutMatierePortion` dans lib/marge.ts.

alter table ingredient alter column prix_unitaire_cts drop not null;
