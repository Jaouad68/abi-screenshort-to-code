-- AlterTable
ALTER TABLE "Company" ADD COLUMN     "formeJuridique" TEXT NOT NULL DEFAULT '';

-- Données légales de Francisco MELLADO (registre officiel INSEE / RNE, SIREN 511 030 710).
-- Chaque mise à jour ne remplace que la valeur d'exemple d'origine : une donnée saisie
-- par l'artisan n'est jamais écrasée.
UPDATE "Company" SET "formeJuridique" = 'Entrepreneur individuel (EI)' WHERE "formeJuridique" = '';
UPDATE "Company" SET "siret" = '511 030 710 00012' WHERE "siret" = '412 398 754 00023';
UPDATE "Company" SET "tvaIntra" = 'FR61511030710' WHERE "tvaIntra" = 'FR76412398754';
UPDATE "Company" SET "adresse" = '20 rue des Comblais' WHERE "adresse" = '20 rue Comblais';
