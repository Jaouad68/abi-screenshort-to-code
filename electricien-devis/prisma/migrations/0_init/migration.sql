-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "public";

-- CreateEnum
CREATE TYPE "DevisStatut" AS ENUM ('BROUILLON', 'ENVOYE', 'ACCEPTE', 'REFUSE', 'FACTURE');

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Company" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "nom" TEXT NOT NULL DEFAULT '',
    "adresse" TEXT NOT NULL DEFAULT '',
    "codePostal" TEXT NOT NULL DEFAULT '',
    "ville" TEXT NOT NULL DEFAULT '',
    "telephone" TEXT NOT NULL DEFAULT '',
    "email" TEXT NOT NULL DEFAULT '',
    "siret" TEXT NOT NULL DEFAULT '',
    "tvaIntra" TEXT NOT NULL DEFAULT '',
    "assurance" TEXT NOT NULL DEFAULT '',
    "iban" TEXT NOT NULL DEFAULT '',
    "prefixeDevis" TEXT NOT NULL DEFAULT 'DEV',
    "tauxTvaDefaut" INTEGER NOT NULL DEFAULT 20,
    "dureeValidite" INTEGER NOT NULL DEFAULT 30,
    "mentionsLegales" TEXT NOT NULL DEFAULT '',
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Company_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Client" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "nom" TEXT NOT NULL,
    "adresse" TEXT NOT NULL DEFAULT '',
    "codePostal" TEXT NOT NULL DEFAULT '',
    "ville" TEXT NOT NULL DEFAULT '',
    "telephone" TEXT NOT NULL DEFAULT '',
    "email" TEXT NOT NULL DEFAULT '',
    "notes" TEXT NOT NULL DEFAULT '',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Client_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Prestation" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "libelle" TEXT NOT NULL,
    "description" TEXT NOT NULL DEFAULT '',
    "unite" TEXT NOT NULL DEFAULT 'u',
    "prixUnitaireCents" INTEGER NOT NULL DEFAULT 0,
    "tauxTva" INTEGER NOT NULL DEFAULT 20,
    "actif" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Prestation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Devis" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "numero" TEXT NOT NULL,
    "clientId" TEXT NOT NULL,
    "statut" "DevisStatut" NOT NULL DEFAULT 'BROUILLON',
    "dateDevis" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "dureeValidite" INTEGER NOT NULL DEFAULT 30,
    "objet" TEXT NOT NULL DEFAULT '',
    "notes" TEXT NOT NULL DEFAULT '',
    "conditions" TEXT NOT NULL DEFAULT '',
    "totalHtCents" INTEGER NOT NULL DEFAULT 0,
    "totalTvaCents" INTEGER NOT NULL DEFAULT 0,
    "totalTtcCents" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Devis_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DevisLigne" (
    "id" TEXT NOT NULL,
    "devisId" TEXT NOT NULL,
    "libelle" TEXT NOT NULL,
    "description" TEXT NOT NULL DEFAULT '',
    "quantiteMilli" INTEGER NOT NULL DEFAULT 1000,
    "unite" TEXT NOT NULL DEFAULT 'u',
    "prixUnitaireCents" INTEGER NOT NULL DEFAULT 0,
    "tauxTva" INTEGER NOT NULL DEFAULT 20,
    "ordre" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "DevisLigne_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CompteurDevis" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "annee" INTEGER NOT NULL,
    "dernierNumero" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "CompteurDevis_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE UNIQUE INDEX "Company_userId_key" ON "Company"("userId");

-- CreateIndex
CREATE INDEX "Client_userId_idx" ON "Client"("userId");

-- CreateIndex
CREATE INDEX "Prestation_userId_idx" ON "Prestation"("userId");

-- CreateIndex
CREATE INDEX "Devis_userId_idx" ON "Devis"("userId");

-- CreateIndex
CREATE INDEX "Devis_clientId_idx" ON "Devis"("clientId");

-- CreateIndex
CREATE UNIQUE INDEX "Devis_userId_numero_key" ON "Devis"("userId", "numero");

-- CreateIndex
CREATE INDEX "DevisLigne_devisId_idx" ON "DevisLigne"("devisId");

-- CreateIndex
CREATE UNIQUE INDEX "CompteurDevis_userId_annee_key" ON "CompteurDevis"("userId", "annee");

-- AddForeignKey
ALTER TABLE "Company" ADD CONSTRAINT "Company_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Client" ADD CONSTRAINT "Client_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Prestation" ADD CONSTRAINT "Prestation_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Devis" ADD CONSTRAINT "Devis_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Devis" ADD CONSTRAINT "Devis_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "Client"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DevisLigne" ADD CONSTRAINT "DevisLigne_devisId_fkey" FOREIGN KEY ("devisId") REFERENCES "Devis"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CompteurDevis" ADD CONSTRAINT "CompteurDevis_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

