-- CreateEnum
CREATE TYPE "DevisStatut" AS ENUM ('BROUILLON', 'PRET', 'ENVOYE', 'ACCEPTE', 'REFUSE', 'EXPIRE', 'ANNULE');

-- CreateTable
CREATE TABLE "Service" (
    "id" TEXT NOT NULL,
    "libelle" TEXT NOT NULL,
    "description" TEXT NOT NULL DEFAULT '',
    "unite" TEXT NOT NULL DEFAULT 'u',
    "prixUnitaireCents" INTEGER NOT NULL DEFAULT 0,
    "tauxTvaCentiemes" INTEGER NOT NULL DEFAULT 2000,
    "dureeMin" INTEGER NOT NULL DEFAULT 0,
    "archivedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "organizationId" TEXT NOT NULL,

    CONSTRAINT "Service_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Product" (
    "id" TEXT NOT NULL,
    "libelle" TEXT NOT NULL,
    "description" TEXT NOT NULL DEFAULT '',
    "reference" TEXT NOT NULL DEFAULT '',
    "unite" TEXT NOT NULL DEFAULT 'u',
    "prixUnitaireCents" INTEGER NOT NULL DEFAULT 0,
    "tauxTvaCentiemes" INTEGER NOT NULL DEFAULT 2000,
    "archivedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "organizationId" TEXT NOT NULL,

    CONSTRAINT "Product_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Quote" (
    "id" TEXT NOT NULL,
    "numero" TEXT,
    "statut" "DevisStatut" NOT NULL DEFAULT 'BROUILLON',
    "objet" TEXT NOT NULL DEFAULT '',
    "conditions" TEXT NOT NULL DEFAULT '',
    "notes" TEXT NOT NULL DEFAULT '',
    "dateDevis" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "validiteJours" INTEGER NOT NULL DEFAULT 30,
    "pretLe" TIMESTAMP(3),
    "envoyeLe" TIMESTAMP(3),
    "accepteLe" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "clientId" TEXT NOT NULL,
    "propertyId" TEXT,
    "interventionId" TEXT,
    "organizationId" TEXT NOT NULL,

    CONSTRAINT "Quote_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "QuoteOption" (
    "id" TEXT NOT NULL,
    "libelle" TEXT NOT NULL DEFAULT 'Proposition',
    "ordre" INTEGER NOT NULL DEFAULT 0,
    "remisePourMille" INTEGER NOT NULL DEFAULT 0,
    "acomptePourMille" INTEGER NOT NULL DEFAULT 0,
    "quoteId" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,

    CONSTRAINT "QuoteOption_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "QuoteLine" (
    "id" TEXT NOT NULL,
    "libelle" TEXT NOT NULL,
    "description" TEXT NOT NULL DEFAULT '',
    "quantiteMilli" INTEGER NOT NULL DEFAULT 1000,
    "unite" TEXT NOT NULL DEFAULT 'u',
    "prixUnitaireCents" INTEGER NOT NULL DEFAULT 0,
    "tauxTvaCentiemes" INTEGER NOT NULL DEFAULT 2000,
    "ordre" INTEGER NOT NULL DEFAULT 0,
    "origineType" TEXT NOT NULL DEFAULT '',
    "origineId" TEXT NOT NULL DEFAULT '',
    "optionId" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,

    CONSTRAINT "QuoteLine_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CompteurDevis" (
    "id" TEXT NOT NULL,
    "annee" INTEGER NOT NULL,
    "dernier" INTEGER NOT NULL DEFAULT 0,
    "organizationId" TEXT NOT NULL,

    CONSTRAINT "CompteurDevis_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Service_organizationId_archivedAt_idx" ON "Service"("organizationId", "archivedAt");

-- CreateIndex
CREATE INDEX "Product_organizationId_archivedAt_idx" ON "Product"("organizationId", "archivedAt");

-- CreateIndex
CREATE INDEX "Quote_organizationId_statut_idx" ON "Quote"("organizationId", "statut");

-- CreateIndex
CREATE INDEX "Quote_clientId_idx" ON "Quote"("clientId");

-- CreateIndex
CREATE UNIQUE INDEX "Quote_organizationId_numero_key" ON "Quote"("organizationId", "numero");

-- CreateIndex
CREATE INDEX "QuoteOption_quoteId_idx" ON "QuoteOption"("quoteId");

-- CreateIndex
CREATE INDEX "QuoteOption_organizationId_idx" ON "QuoteOption"("organizationId");

-- CreateIndex
CREATE INDEX "QuoteLine_optionId_idx" ON "QuoteLine"("optionId");

-- CreateIndex
CREATE INDEX "QuoteLine_organizationId_idx" ON "QuoteLine"("organizationId");

-- CreateIndex
CREATE UNIQUE INDEX "CompteurDevis_organizationId_annee_key" ON "CompteurDevis"("organizationId", "annee");

-- AddForeignKey
ALTER TABLE "Service" ADD CONSTRAINT "Service_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Product" ADD CONSTRAINT "Product_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Quote" ADD CONSTRAINT "Quote_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "Client"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Quote" ADD CONSTRAINT "Quote_propertyId_fkey" FOREIGN KEY ("propertyId") REFERENCES "Property"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Quote" ADD CONSTRAINT "Quote_interventionId_fkey" FOREIGN KEY ("interventionId") REFERENCES "Intervention"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Quote" ADD CONSTRAINT "Quote_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "QuoteOption" ADD CONSTRAINT "QuoteOption_quoteId_fkey" FOREIGN KEY ("quoteId") REFERENCES "Quote"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "QuoteOption" ADD CONSTRAINT "QuoteOption_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "QuoteLine" ADD CONSTRAINT "QuoteLine_optionId_fkey" FOREIGN KEY ("optionId") REFERENCES "QuoteOption"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "QuoteLine" ADD CONSTRAINT "QuoteLine_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CompteurDevis" ADD CONSTRAINT "CompteurDevis_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;
