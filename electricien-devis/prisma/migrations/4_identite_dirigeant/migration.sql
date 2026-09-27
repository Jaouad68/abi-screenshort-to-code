-- AlterTable
ALTER TABLE "Company" ADD COLUMN     "dirigeant" TEXT NOT NULL DEFAULT '',
ADD COLUMN     "activite" TEXT NOT NULL DEFAULT '';

-- Données : identité de MELLADO Électricité (fiche PagesJaunes) pour le compte existant.
UPDATE "Company" SET "dirigeant" = 'Francisco MELLADO' WHERE "dirigeant" = '';
UPDATE "Company" SET "activite" = 'Entreprise d''électricité générale' WHERE "activite" = '';

-- Remplace uniquement l'ancien numéro d'exemple par le vrai numéro de l'entreprise.
UPDATE "Company" SET "telephone" = '02 37 45 08 03' WHERE "telephone" = '02 37 45 12 89';
