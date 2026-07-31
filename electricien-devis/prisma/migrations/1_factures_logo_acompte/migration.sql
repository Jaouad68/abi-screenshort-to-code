-- CreateEnum
CREATE TYPE "FactureStatut" AS ENUM ('EMISE', 'PAYEE', 'ANNULEE');

-- AlterTable
ALTER TABLE "Company" ADD COLUMN     "logoDataUrl" TEXT NOT NULL DEFAULT '',
ADD COLUMN     "prefixeFacture" TEXT NOT NULL DEFAULT 'FAC';

-- AlterTable
ALTER TABLE "Devis" ADD COLUMN     "acomptePct" INTEGER NOT NULL DEFAULT 0;

-- CreateTable
CREATE TABLE "Facture" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "numero" TEXT NOT NULL,
    "devisId" TEXT,
    "clientId" TEXT NOT NULL,
    "statut" "FactureStatut" NOT NULL DEFAULT 'EMISE',
    "dateFacture" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "objet" TEXT NOT NULL DEFAULT '',
    "notes" TEXT NOT NULL DEFAULT '',
    "conditions" TEXT NOT NULL DEFAULT '',
    "acomptePct" INTEGER NOT NULL DEFAULT 0,
    "totalHtCents" INTEGER NOT NULL DEFAULT 0,
    "totalTvaCents" INTEGER NOT NULL DEFAULT 0,
    "totalTtcCents" INTEGER NOT NULL DEFAULT 0,
    "datePaiement" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Facture_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FactureLigne" (
    "id" TEXT NOT NULL,
    "factureId" TEXT NOT NULL,
    "libelle" TEXT NOT NULL,
    "description" TEXT NOT NULL DEFAULT '',
    "quantiteMilli" INTEGER NOT NULL DEFAULT 1000,
    "unite" TEXT NOT NULL DEFAULT 'u',
    "prixUnitaireCents" INTEGER NOT NULL DEFAULT 0,
    "tauxTva" INTEGER NOT NULL DEFAULT 20,
    "ordre" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "FactureLigne_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CompteurFacture" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "annee" INTEGER NOT NULL,
    "dernierNumero" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "CompteurFacture_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Facture_userId_idx" ON "Facture"("userId");

-- CreateIndex
CREATE INDEX "Facture_clientId_idx" ON "Facture"("clientId");

-- CreateIndex
CREATE UNIQUE INDEX "Facture_userId_numero_key" ON "Facture"("userId", "numero");

-- CreateIndex
CREATE INDEX "FactureLigne_factureId_idx" ON "FactureLigne"("factureId");

-- CreateIndex
CREATE UNIQUE INDEX "CompteurFacture_userId_annee_key" ON "CompteurFacture"("userId", "annee");

-- AddForeignKey
ALTER TABLE "Facture" ADD CONSTRAINT "Facture_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Facture" ADD CONSTRAINT "Facture_devisId_fkey" FOREIGN KEY ("devisId") REFERENCES "Devis"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Facture" ADD CONSTRAINT "Facture_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "Client"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FactureLigne" ADD CONSTRAINT "FactureLigne_factureId_fkey" FOREIGN KEY ("factureId") REFERENCES "Facture"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CompteurFacture" ADD CONSTRAINT "CompteurFacture_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

