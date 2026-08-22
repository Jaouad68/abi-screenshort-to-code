-- CreateEnum
CREATE TYPE "TypeActionIA" AS ENUM ('MISE_AU_PROPRE', 'STRUCTURER_DEVIS');

-- CreateEnum
CREATE TYPE "DecisionIA" AS ENUM ('PROPOSEE', 'ACCEPTEE', 'REJETEE');

-- CreateTable
CREATE TABLE "AiAction" (
    "id" TEXT NOT NULL,
    "type" "TypeActionIA" NOT NULL,
    "decision" "DecisionIA" NOT NULL DEFAULT 'PROPOSEE',
    "demandeEnvoyee" TEXT NOT NULL,
    "proposition" TEXT NOT NULL DEFAULT '',
    "erreur" TEXT NOT NULL DEFAULT '',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "decideLe" TIMESTAMP(3),
    "interventionId" TEXT,
    "organizationId" TEXT NOT NULL,

    CONSTRAINT "AiAction_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "AiAction_organizationId_createdAt_idx" ON "AiAction"("organizationId", "createdAt");

-- AddForeignKey
ALTER TABLE "AiAction" ADD CONSTRAINT "AiAction_interventionId_fkey" FOREIGN KEY ("interventionId") REFERENCES "Intervention"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AiAction" ADD CONSTRAINT "AiAction_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;
