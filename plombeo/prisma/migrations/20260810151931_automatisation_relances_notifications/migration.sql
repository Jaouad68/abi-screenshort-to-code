-- CreateEnum
CREATE TYPE "DeclencheurAutomatisation" AS ENUM ('FACTURE_ECHUE', 'DEVIS_SANS_REPONSE', 'RENDEZ_VOUS_DEMAIN', 'INTERVENTION_A_CLOTURER');

-- CreateEnum
CREATE TYPE "ActionAutomatisation" AS ENUM ('NOTIFIER', 'ENVOYER_EMAIL');

-- CreateEnum
CREATE TYPE "EtatExecution" AS ENUM ('PLANIFIEE', 'REUSSIE', 'ECHOUEE', 'ECARTEE');

-- CreateEnum
CREATE TYPE "EtatEmail" AS ENUM ('EN_ATTENTE', 'ENVOYE', 'ECHOUE');

-- AlterTable
ALTER TABLE "Client" ADD COLUMN     "relancesDesactivees" BOOLEAN NOT NULL DEFAULT false;

-- CreateTable
CREATE TABLE "AutomationRule" (
    "id" TEXT NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT false,
    "declencheur" "DeclencheurAutomatisation" NOT NULL,
    "action" "ActionAutomatisation" NOT NULL DEFAULT 'NOTIFIER',
    "delaiJours" INTEGER NOT NULL DEFAULT 0,
    "libelle" TEXT NOT NULL DEFAULT '',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "organizationId" TEXT NOT NULL,

    CONSTRAINT "AutomationRule_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AutomationExecution" (
    "id" TEXT NOT NULL,
    "etat" "EtatExecution" NOT NULL DEFAULT 'PLANIFIEE',
    "cleIdempotence" TEXT NOT NULL,
    "motif" TEXT NOT NULL DEFAULT '',
    "entiteType" TEXT NOT NULL DEFAULT '',
    "entiteId" TEXT NOT NULL DEFAULT '',
    "executeeLe" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "ruleId" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,

    CONSTRAINT "AutomationExecution_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Notification" (
    "id" TEXT NOT NULL,
    "titre" TEXT NOT NULL,
    "corps" TEXT NOT NULL DEFAULT '',
    "lien" TEXT NOT NULL DEFAULT '',
    "lueLe" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "organizationId" TEXT NOT NULL,

    CONSTRAINT "Notification_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EmailMessage" (
    "id" TEXT NOT NULL,
    "etat" "EtatEmail" NOT NULL DEFAULT 'EN_ATTENTE',
    "destinataire" TEXT NOT NULL,
    "sujet" TEXT NOT NULL,
    "corps" TEXT NOT NULL,
    "pieceJointe" TEXT NOT NULL DEFAULT '',
    "tentatives" INTEGER NOT NULL DEFAULT 0,
    "erreur" TEXT NOT NULL DEFAULT '',
    "envoyeLe" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "organizationId" TEXT NOT NULL,

    CONSTRAINT "EmailMessage_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ModeleMessage" (
    "id" TEXT NOT NULL,
    "cle" TEXT NOT NULL,
    "sujet" TEXT NOT NULL,
    "corps" TEXT NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "organizationId" TEXT NOT NULL,

    CONSTRAINT "ModeleMessage_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "AutomationRule_organizationId_active_idx" ON "AutomationRule"("organizationId", "active");

-- CreateIndex
CREATE UNIQUE INDEX "AutomationRule_organizationId_declencheur_delaiJours_key" ON "AutomationRule"("organizationId", "declencheur", "delaiJours");

-- CreateIndex
CREATE UNIQUE INDEX "AutomationExecution_cleIdempotence_key" ON "AutomationExecution"("cleIdempotence");

-- CreateIndex
CREATE INDEX "AutomationExecution_organizationId_executeeLe_idx" ON "AutomationExecution"("organizationId", "executeeLe");

-- CreateIndex
CREATE INDEX "AutomationExecution_entiteType_entiteId_idx" ON "AutomationExecution"("entiteType", "entiteId");

-- CreateIndex
CREATE INDEX "Notification_organizationId_lueLe_idx" ON "Notification"("organizationId", "lueLe");

-- CreateIndex
CREATE INDEX "Notification_organizationId_createdAt_idx" ON "Notification"("organizationId", "createdAt");

-- CreateIndex
CREATE INDEX "EmailMessage_organizationId_etat_idx" ON "EmailMessage"("organizationId", "etat");

-- CreateIndex
CREATE INDEX "EmailMessage_organizationId_createdAt_idx" ON "EmailMessage"("organizationId", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "ModeleMessage_organizationId_cle_key" ON "ModeleMessage"("organizationId", "cle");

-- AddForeignKey
ALTER TABLE "AutomationRule" ADD CONSTRAINT "AutomationRule_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AutomationExecution" ADD CONSTRAINT "AutomationExecution_ruleId_fkey" FOREIGN KEY ("ruleId") REFERENCES "AutomationRule"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AutomationExecution" ADD CONSTRAINT "AutomationExecution_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Notification" ADD CONSTRAINT "Notification_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EmailMessage" ADD CONSTRAINT "EmailMessage_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ModeleMessage" ADD CONSTRAINT "ModeleMessage_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;
