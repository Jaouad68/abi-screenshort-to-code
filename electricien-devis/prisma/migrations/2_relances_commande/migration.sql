-- AlterTable
ALTER TABLE "Company" ADD COLUMN     "relanceJours" INTEGER NOT NULL DEFAULT 7;

-- AlterTable
ALTER TABLE "Devis" ADD COLUMN     "dateAcceptation" TIMESTAMP(3),
ADD COLUMN     "envoyeLe" TIMESTAMP(3),
ADD COLUMN     "numeroCommande" TEXT NOT NULL DEFAULT '',
ADD COLUMN     "relanceLe" TIMESTAMP(3);

-- AlterTable
ALTER TABLE "Facture" ADD COLUMN     "numeroCommande" TEXT NOT NULL DEFAULT '';

