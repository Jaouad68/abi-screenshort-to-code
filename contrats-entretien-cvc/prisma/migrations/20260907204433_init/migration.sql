-- CreateEnum
CREATE TYPE "Role" AS ENUM ('DIRIGEANT', 'ADMINISTRATIF', 'TECHNICIEN');

-- CreateEnum
CREATE TYPE "Periodicite" AS ENUM ('MENSUELLE', 'TRIMESTRIELLE', 'SEMESTRIELLE', 'ANNUELLE', 'BIENNALE', 'AUTRE');

-- CreateEnum
CREATE TYPE "StatutRenouvellement" AS ENUM ('A_CONTACTER', 'CONTACTE', 'RENOUVELE', 'PERDU');

-- CreateEnum
CREATE TYPE "StatutIntervention" AS ENUM ('PLANIFIEE', 'EN_COURS', 'TERMINEE', 'ANNULEE');

-- CreateTable
CREATE TABLE "Company" (
    "id" TEXT NOT NULL,
    "nom" TEXT NOT NULL,
    "demo" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Company_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "nom" TEXT NOT NULL,
    "role" "Role" NOT NULL DEFAULT 'TECHNICIEN',
    "actif" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Client" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "nom" TEXT NOT NULL,
    "adresse" TEXT NOT NULL DEFAULT '',
    "codePostal" TEXT NOT NULL DEFAULT '',
    "ville" TEXT NOT NULL DEFAULT '',
    "telephone" TEXT NOT NULL DEFAULT '',
    "email" TEXT NOT NULL DEFAULT '',
    "notes" TEXT NOT NULL DEFAULT '',
    "importeLe" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Client_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Equipement" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "clientId" TEXT NOT NULL,
    "type" TEXT NOT NULL DEFAULT '',
    "marque" TEXT NOT NULL DEFAULT '',
    "modele" TEXT NOT NULL DEFAULT '',
    "numeroSerie" TEXT NOT NULL DEFAULT '',
    "localisation" TEXT NOT NULL DEFAULT '',
    "dateInstallation" TIMESTAMP(3),
    "notes" TEXT NOT NULL DEFAULT '',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Equipement_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Contrat" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "reference" TEXT NOT NULL,
    "clientId" TEXT NOT NULL,
    "equipementId" TEXT,
    "type" TEXT NOT NULL DEFAULT 'Entretien annuel',
    "periodicite" "Periodicite" NOT NULL DEFAULT 'ANNUELLE',
    "montantCents" INTEGER NOT NULL DEFAULT 0,
    "dateDebut" TIMESTAMP(3) NOT NULL,
    "dateEcheance" TIMESTAMP(3) NOT NULL,
    "statut" "StatutRenouvellement" NOT NULL DEFAULT 'A_CONTACTER',
    "actif" BOOLEAN NOT NULL DEFAULT true,
    "notes" TEXT NOT NULL DEFAULT '',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Contrat_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ContratHistorique" (
    "id" TEXT NOT NULL,
    "contratId" TEXT NOT NULL,
    "statut" "StatutRenouvellement" NOT NULL,
    "commentaire" TEXT NOT NULL DEFAULT '',
    "creeParId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ContratHistorique_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Intervention" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "clientId" TEXT NOT NULL,
    "equipementId" TEXT,
    "contratId" TEXT,
    "titre" TEXT NOT NULL DEFAULT 'Entretien',
    "datePrevue" TIMESTAMP(3) NOT NULL,
    "technicienId" TEXT,
    "statut" "StatutIntervention" NOT NULL DEFAULT 'PLANIFIEE',
    "commentaires" TEXT NOT NULL DEFAULT '',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "termineeLe" TIMESTAMP(3),

    CONSTRAINT "Intervention_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "InterventionChecklistItem" (
    "id" TEXT NOT NULL,
    "interventionId" TEXT NOT NULL,
    "libelle" TEXT NOT NULL,
    "fait" BOOLEAN NOT NULL DEFAULT false,
    "ordre" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "InterventionChecklistItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "InterventionPhoto" (
    "id" TEXT NOT NULL,
    "interventionId" TEXT NOT NULL,
    "dataUrl" TEXT NOT NULL,
    "legende" TEXT NOT NULL DEFAULT '',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "InterventionPhoto_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE INDEX "User_companyId_idx" ON "User"("companyId");

-- CreateIndex
CREATE INDEX "Client_companyId_idx" ON "Client"("companyId");

-- CreateIndex
CREATE INDEX "Equipement_companyId_idx" ON "Equipement"("companyId");

-- CreateIndex
CREATE INDEX "Equipement_clientId_idx" ON "Equipement"("clientId");

-- CreateIndex
CREATE INDEX "Contrat_companyId_idx" ON "Contrat"("companyId");

-- CreateIndex
CREATE INDEX "Contrat_clientId_idx" ON "Contrat"("clientId");

-- CreateIndex
CREATE INDEX "Contrat_dateEcheance_idx" ON "Contrat"("dateEcheance");

-- CreateIndex
CREATE UNIQUE INDEX "Contrat_companyId_reference_key" ON "Contrat"("companyId", "reference");

-- CreateIndex
CREATE INDEX "ContratHistorique_contratId_idx" ON "ContratHistorique"("contratId");

-- CreateIndex
CREATE INDEX "Intervention_companyId_idx" ON "Intervention"("companyId");

-- CreateIndex
CREATE INDEX "Intervention_clientId_idx" ON "Intervention"("clientId");

-- CreateIndex
CREATE INDEX "Intervention_technicienId_idx" ON "Intervention"("technicienId");

-- CreateIndex
CREATE INDEX "Intervention_datePrevue_idx" ON "Intervention"("datePrevue");

-- CreateIndex
CREATE INDEX "InterventionChecklistItem_interventionId_idx" ON "InterventionChecklistItem"("interventionId");

-- CreateIndex
CREATE INDEX "InterventionPhoto_interventionId_idx" ON "InterventionPhoto"("interventionId");

-- AddForeignKey
ALTER TABLE "User" ADD CONSTRAINT "User_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Client" ADD CONSTRAINT "Client_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Equipement" ADD CONSTRAINT "Equipement_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Equipement" ADD CONSTRAINT "Equipement_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "Client"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Contrat" ADD CONSTRAINT "Contrat_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Contrat" ADD CONSTRAINT "Contrat_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "Client"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Contrat" ADD CONSTRAINT "Contrat_equipementId_fkey" FOREIGN KEY ("equipementId") REFERENCES "Equipement"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ContratHistorique" ADD CONSTRAINT "ContratHistorique_contratId_fkey" FOREIGN KEY ("contratId") REFERENCES "Contrat"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ContratHistorique" ADD CONSTRAINT "ContratHistorique_creeParId_fkey" FOREIGN KEY ("creeParId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Intervention" ADD CONSTRAINT "Intervention_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Intervention" ADD CONSTRAINT "Intervention_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "Client"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Intervention" ADD CONSTRAINT "Intervention_equipementId_fkey" FOREIGN KEY ("equipementId") REFERENCES "Equipement"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Intervention" ADD CONSTRAINT "Intervention_contratId_fkey" FOREIGN KEY ("contratId") REFERENCES "Contrat"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Intervention" ADD CONSTRAINT "Intervention_technicienId_fkey" FOREIGN KEY ("technicienId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InterventionChecklistItem" ADD CONSTRAINT "InterventionChecklistItem_interventionId_fkey" FOREIGN KEY ("interventionId") REFERENCES "Intervention"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InterventionPhoto" ADD CONSTRAINT "InterventionPhoto_interventionId_fkey" FOREIGN KEY ("interventionId") REFERENCES "Intervention"("id") ON DELETE CASCADE ON UPDATE CASCADE;
