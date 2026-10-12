-- CreateEnum
CREATE TYPE "NiveauUrgence" AS ENUM ('NORMAL', 'RAPIDE', 'URGENT', 'CRITIQUE');

-- CreateEnum
CREATE TYPE "LeadStatut" AS ENUM ('NOUVEAU', 'QUALIFIE', 'CONVERTI', 'ABANDONNE');

-- CreateEnum
CREATE TYPE "AppointmentStatut" AS ENUM ('PLANIFIE', 'CONFIRME', 'EN_COURS', 'TERMINE', 'ANNULE');

-- CreateEnum
CREATE TYPE "InterventionStatut" AS ENUM ('PLANIFIEE', 'EN_COURS', 'TERMINEE', 'CLOTUREE', 'ANNULEE');

-- CreateTable
CREATE TABLE "Lead" (
    "id" TEXT NOT NULL,
    "statut" "LeadStatut" NOT NULL DEFAULT 'NOUVEAU',
    "urgence" "NiveauUrgence" NOT NULL DEFAULT 'NORMAL',
    "description" TEXT NOT NULL DEFAULT '',
    "contactNom" TEXT NOT NULL DEFAULT '',
    "contactTelephone" TEXT NOT NULL DEFAULT '',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "clientId" TEXT,
    "propertyId" TEXT,
    "organizationId" TEXT NOT NULL,

    CONSTRAINT "Lead_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Appointment" (
    "id" TEXT NOT NULL,
    "statut" "AppointmentStatut" NOT NULL DEFAULT 'PLANIFIE',
    "titre" TEXT NOT NULL DEFAULT '',
    "debut" TIMESTAMP(3) NOT NULL,
    "fin" TIMESTAMP(3) NOT NULL,
    "trajetMin" INTEGER NOT NULL DEFAULT 0,
    "urgence" "NiveauUrgence" NOT NULL DEFAULT 'NORMAL',
    "notes" TEXT NOT NULL DEFAULT '',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "clientId" TEXT NOT NULL,
    "propertyId" TEXT,
    "leadId" TEXT,
    "organizationId" TEXT NOT NULL,

    CONSTRAINT "Appointment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Intervention" (
    "id" TEXT NOT NULL,
    "statut" "InterventionStatut" NOT NULL DEFAULT 'PLANIFIEE',
    "probleme" TEXT NOT NULL DEFAULT '',
    "diagnostic" TEXT NOT NULL DEFAULT '',
    "compteRendu" TEXT NOT NULL DEFAULT '',
    "demarreeLe" TIMESTAMP(3),
    "termineeLe" TIMESTAMP(3),
    "clotureeLe" TIMESTAMP(3),
    "clientMutationId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "appointmentId" TEXT,
    "clientId" TEXT NOT NULL,
    "propertyId" TEXT,
    "equipmentId" TEXT,
    "organizationId" TEXT NOT NULL,

    CONSTRAINT "Intervention_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "InterventionTask" (
    "id" TEXT NOT NULL,
    "libelle" TEXT NOT NULL,
    "faite" BOOLEAN NOT NULL DEFAULT false,
    "ordre" INTEGER NOT NULL DEFAULT 0,
    "clientMutationId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "interventionId" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,

    CONSTRAINT "InterventionTask_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TimeEntry" (
    "id" TEXT NOT NULL,
    "minutes" INTEGER NOT NULL,
    "libelle" TEXT NOT NULL DEFAULT '',
    "clientMutationId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "interventionId" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,

    CONSTRAINT "TimeEntry_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "InterventionSupply" (
    "id" TEXT NOT NULL,
    "libelle" TEXT NOT NULL,
    "quantiteMilli" INTEGER NOT NULL DEFAULT 1000,
    "unite" TEXT NOT NULL DEFAULT 'u',
    "clientMutationId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "interventionId" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,

    CONSTRAINT "InterventionSupply_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Lead_organizationId_statut_idx" ON "Lead"("organizationId", "statut");

-- CreateIndex
CREATE INDEX "Lead_organizationId_urgence_idx" ON "Lead"("organizationId", "urgence");

-- CreateIndex
CREATE INDEX "Appointment_organizationId_debut_idx" ON "Appointment"("organizationId", "debut");

-- CreateIndex
CREATE INDEX "Appointment_clientId_idx" ON "Appointment"("clientId");

-- CreateIndex
CREATE UNIQUE INDEX "Intervention_clientMutationId_key" ON "Intervention"("clientMutationId");

-- CreateIndex
CREATE UNIQUE INDEX "Intervention_appointmentId_key" ON "Intervention"("appointmentId");

-- CreateIndex
CREATE INDEX "Intervention_organizationId_statut_idx" ON "Intervention"("organizationId", "statut");

-- CreateIndex
CREATE INDEX "Intervention_clientId_idx" ON "Intervention"("clientId");

-- CreateIndex
CREATE UNIQUE INDEX "InterventionTask_clientMutationId_key" ON "InterventionTask"("clientMutationId");

-- CreateIndex
CREATE INDEX "InterventionTask_interventionId_idx" ON "InterventionTask"("interventionId");

-- CreateIndex
CREATE INDEX "InterventionTask_organizationId_idx" ON "InterventionTask"("organizationId");

-- CreateIndex
CREATE UNIQUE INDEX "TimeEntry_clientMutationId_key" ON "TimeEntry"("clientMutationId");

-- CreateIndex
CREATE INDEX "TimeEntry_interventionId_idx" ON "TimeEntry"("interventionId");

-- CreateIndex
CREATE INDEX "TimeEntry_organizationId_idx" ON "TimeEntry"("organizationId");

-- CreateIndex
CREATE UNIQUE INDEX "InterventionSupply_clientMutationId_key" ON "InterventionSupply"("clientMutationId");

-- CreateIndex
CREATE INDEX "InterventionSupply_interventionId_idx" ON "InterventionSupply"("interventionId");

-- CreateIndex
CREATE INDEX "InterventionSupply_organizationId_idx" ON "InterventionSupply"("organizationId");

-- AddForeignKey
ALTER TABLE "Lead" ADD CONSTRAINT "Lead_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "Client"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Lead" ADD CONSTRAINT "Lead_propertyId_fkey" FOREIGN KEY ("propertyId") REFERENCES "Property"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Lead" ADD CONSTRAINT "Lead_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Appointment" ADD CONSTRAINT "Appointment_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "Client"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Appointment" ADD CONSTRAINT "Appointment_propertyId_fkey" FOREIGN KEY ("propertyId") REFERENCES "Property"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Appointment" ADD CONSTRAINT "Appointment_leadId_fkey" FOREIGN KEY ("leadId") REFERENCES "Lead"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Appointment" ADD CONSTRAINT "Appointment_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Intervention" ADD CONSTRAINT "Intervention_appointmentId_fkey" FOREIGN KEY ("appointmentId") REFERENCES "Appointment"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Intervention" ADD CONSTRAINT "Intervention_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "Client"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Intervention" ADD CONSTRAINT "Intervention_propertyId_fkey" FOREIGN KEY ("propertyId") REFERENCES "Property"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Intervention" ADD CONSTRAINT "Intervention_equipmentId_fkey" FOREIGN KEY ("equipmentId") REFERENCES "Equipment"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Intervention" ADD CONSTRAINT "Intervention_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InterventionTask" ADD CONSTRAINT "InterventionTask_interventionId_fkey" FOREIGN KEY ("interventionId") REFERENCES "Intervention"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InterventionTask" ADD CONSTRAINT "InterventionTask_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TimeEntry" ADD CONSTRAINT "TimeEntry_interventionId_fkey" FOREIGN KEY ("interventionId") REFERENCES "Intervention"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TimeEntry" ADD CONSTRAINT "TimeEntry_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InterventionSupply" ADD CONSTRAINT "InterventionSupply_interventionId_fkey" FOREIGN KEY ("interventionId") REFERENCES "Intervention"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InterventionSupply" ADD CONSTRAINT "InterventionSupply_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;
