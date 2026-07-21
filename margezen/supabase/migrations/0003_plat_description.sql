-- Ajoute la description de carte sur `plat`, nécessaire au Sprint 3 pour
-- alimenter le prompt de génération de fiche technique ("Description sur
-- la carte"). Absente du schéma initial du Sprint 1.

alter table plat add column description text;
