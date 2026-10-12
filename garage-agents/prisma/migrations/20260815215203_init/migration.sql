-- CreateEnum
CREATE TYPE "StatutRappelCt" AS ENUM ('A_VENIR', 'ENVOYE', 'SANS_REPONSE', 'CONFIRME');

-- CreateEnum
CREATE TYPE "StatutDevis" AS ENUM ('EN_ATTENTE', 'RELANCE', 'SIGNE', 'PERDU');

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Garage" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "nom" TEXT NOT NULL DEFAULT '',
    "telephone" TEXT NOT NULL DEFAULT '',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "rappelCtPaliers" INTEGER[] DEFAULT ARRAY[21, 10, 3]::INTEGER[],
    "devisRelanceApresJours" INTEGER NOT NULL DEFAULT 30,
    "devisPaiementFractionneApresJours" INTEGER NOT NULL DEFAULT 60,

    CONSTRAINT "Garage_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Vehicule" (
    "id" TEXT NOT NULL,
    "garageId" TEXT NOT NULL,
    "plaque" TEXT NOT NULL,
    "clientNom" TEXT NOT NULL,
    "clientTelephone" TEXT NOT NULL DEFAULT '',
    "clientEmail" TEXT NOT NULL DEFAULT '',
    "ctEcheance" TIMESTAMP(3) NOT NULL,
    "statut" "StatutRappelCt" NOT NULL DEFAULT 'A_VENIR',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Vehicule_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RappelCt" (
    "id" TEXT NOT NULL,
    "vehiculeId" TEXT NOT NULL,
    "palierJours" INTEGER NOT NULL,
    "envoyeLe" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "canal" TEXT NOT NULL DEFAULT 'sms',
    "simule" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "RappelCt_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Devis" (
    "id" TEXT NOT NULL,
    "garageId" TEXT NOT NULL,
    "reference" TEXT NOT NULL,
    "clientNom" TEXT NOT NULL,
    "clientTelephone" TEXT NOT NULL DEFAULT '',
    "clientEmail" TEXT NOT NULL DEFAULT '',
    "montantCentimes" INTEGER NOT NULL,
    "statut" "StatutDevis" NOT NULL DEFAULT 'EN_ATTENTE',
    "emisLe" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "paiementFractionneProposeLe" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Devis_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RelanceDevis" (
    "id" TEXT NOT NULL,
    "devisId" TEXT NOT NULL,
    "envoyeLe" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "canal" TEXT NOT NULL DEFAULT 'sms',
    "simule" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "RelanceDevis_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE UNIQUE INDEX "Garage_userId_key" ON "Garage"("userId");

-- CreateIndex
CREATE INDEX "Vehicule_garageId_ctEcheance_idx" ON "Vehicule"("garageId", "ctEcheance");

-- CreateIndex
CREATE INDEX "RappelCt_vehiculeId_idx" ON "RappelCt"("vehiculeId");

-- CreateIndex
CREATE INDEX "Devis_garageId_statut_idx" ON "Devis"("garageId", "statut");

-- CreateIndex
CREATE INDEX "RelanceDevis_devisId_idx" ON "RelanceDevis"("devisId");

-- AddForeignKey
ALTER TABLE "Garage" ADD CONSTRAINT "Garage_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Vehicule" ADD CONSTRAINT "Vehicule_garageId_fkey" FOREIGN KEY ("garageId") REFERENCES "Garage"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RappelCt" ADD CONSTRAINT "RappelCt_vehiculeId_fkey" FOREIGN KEY ("vehiculeId") REFERENCES "Vehicule"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Devis" ADD CONSTRAINT "Devis_garageId_fkey" FOREIGN KEY ("garageId") REFERENCES "Garage"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RelanceDevis" ADD CONSTRAINT "RelanceDevis_devisId_fkey" FOREIGN KEY ("devisId") REFERENCES "Devis"("id") ON DELETE CASCADE ON UPDATE CASCADE;
