-- Le taux de TVA réduit (5,5 %, rénovation énergétique / logements > 2 ans)
-- ne pouvait pas être enregistré : la colonne était un entier (INTEGER) alors
-- que le sélecteur de l'interface propose 5.5 comme option. On passe ces
-- colonnes en nombre à virgule flottante pour accepter ce taux.

-- AlterTable
ALTER TABLE "Company" ALTER COLUMN "tauxTvaDefaut" TYPE DOUBLE PRECISION;

-- AlterTable
ALTER TABLE "Prestation" ALTER COLUMN "tauxTva" TYPE DOUBLE PRECISION;

-- AlterTable
ALTER TABLE "DevisLigne" ALTER COLUMN "tauxTva" TYPE DOUBLE PRECISION;

-- AlterTable
ALTER TABLE "FactureLigne" ALTER COLUMN "tauxTva" TYPE DOUBLE PRECISION;
