-- CreateTable
CREATE TABLE "Etablissement" (
    "id" TEXT NOT NULL,
    "nom" TEXT NOT NULL,
    "adresse" TEXT,
    "siret" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Etablissement_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Utilisateur" (
    "id" TEXT NOT NULL,
    "nom" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "role" TEXT NOT NULL DEFAULT 'EMPLOYE',
    "actif" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "etablissementId" TEXT NOT NULL,

    CONSTRAINT "Utilisateur_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Equipement" (
    "id" TEXT NOT NULL,
    "nom" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "tempMin" DOUBLE PRECISION NOT NULL,
    "tempMax" DOUBLE PRECISION NOT NULL,
    "actif" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "etablissementId" TEXT NOT NULL,

    CONSTRAINT "Equipement_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ReleveTemperature" (
    "id" TEXT NOT NULL,
    "valeur" DOUBLE PRECISION NOT NULL,
    "conforme" BOOLEAN NOT NULL,
    "commentaire" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "equipementId" TEXT NOT NULL,
    "utilisateurId" TEXT NOT NULL,
    "saisiAt" TIMESTAMP(3),
    "horsLigne" BOOLEAN NOT NULL DEFAULT false,
    "motifCorrection" TEXT,
    "correctionDeId" TEXT,

    CONSTRAINT "ReleveTemperature_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TacheNettoyage" (
    "id" TEXT NOT NULL,
    "libelle" TEXT NOT NULL,
    "zone" TEXT NOT NULL,
    "frequence" TEXT NOT NULL DEFAULT 'QUOTIDIENNE',
    "actif" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "etablissementId" TEXT NOT NULL,

    CONSTRAINT "TacheNettoyage_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ValidationNettoyage" (
    "id" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "tacheId" TEXT NOT NULL,
    "utilisateurId" TEXT NOT NULL,

    CONSTRAINT "ValidationNettoyage_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Reception" (
    "id" TEXT NOT NULL,
    "fournisseur" TEXT NOT NULL,
    "produit" TEXT NOT NULL,
    "temperature" DOUBLE PRECISION,
    "numeroLot" TEXT,
    "conforme" BOOLEAN NOT NULL,
    "photoData" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "etablissementId" TEXT NOT NULL,
    "utilisateurId" TEXT NOT NULL,

    CONSTRAINT "Reception_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProduitOuvert" (
    "id" TEXT NOT NULL,
    "nom" TEXT NOT NULL,
    "dateOuverture" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "dureeJours" INTEGER NOT NULL DEFAULT 3,
    "dlcSecondaire" TIMESTAMP(3) NOT NULL,
    "statut" TEXT NOT NULL DEFAULT 'OUVERT',
    "clotureAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "etablissementId" TEXT NOT NULL,
    "utilisateurId" TEXT NOT NULL,

    CONSTRAINT "ProduitOuvert_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "NonConformite" (
    "id" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "photoData" TEXT,
    "actionCorrective" TEXT,
    "responsable" TEXT,
    "statut" TEXT NOT NULL DEFAULT 'OUVERT',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "resolvedAt" TIMESTAMP(3),
    "etablissementId" TEXT NOT NULL,
    "utilisateurId" TEXT NOT NULL,
    "releveId" TEXT,
    "receptionId" TEXT,

    CONSTRAINT "NonConformite_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Rappel" (
    "id" TEXT NOT NULL,
    "libelle" TEXT NOT NULL,
    "heure" TEXT NOT NULL,
    "actif" BOOLEAN NOT NULL DEFAULT true,
    "etablissementId" TEXT NOT NULL,

    CONSTRAINT "Rappel_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Utilisateur_email_key" ON "Utilisateur"("email");

-- CreateIndex
CREATE INDEX "Utilisateur_etablissementId_idx" ON "Utilisateur"("etablissementId");

-- CreateIndex
CREATE INDEX "Equipement_etablissementId_idx" ON "Equipement"("etablissementId");

-- CreateIndex
CREATE UNIQUE INDEX "ReleveTemperature_correctionDeId_key" ON "ReleveTemperature"("correctionDeId");

-- CreateIndex
CREATE INDEX "ReleveTemperature_equipementId_createdAt_idx" ON "ReleveTemperature"("equipementId", "createdAt");

-- CreateIndex
CREATE INDEX "TacheNettoyage_etablissementId_idx" ON "TacheNettoyage"("etablissementId");

-- CreateIndex
CREATE INDEX "ValidationNettoyage_tacheId_createdAt_idx" ON "ValidationNettoyage"("tacheId", "createdAt");

-- CreateIndex
CREATE INDEX "Reception_etablissementId_createdAt_idx" ON "Reception"("etablissementId", "createdAt");

-- CreateIndex
CREATE INDEX "ProduitOuvert_etablissementId_statut_idx" ON "ProduitOuvert"("etablissementId", "statut");

-- CreateIndex
CREATE UNIQUE INDEX "NonConformite_releveId_key" ON "NonConformite"("releveId");

-- CreateIndex
CREATE UNIQUE INDEX "NonConformite_receptionId_key" ON "NonConformite"("receptionId");

-- CreateIndex
CREATE INDEX "NonConformite_etablissementId_statut_idx" ON "NonConformite"("etablissementId", "statut");

-- CreateIndex
CREATE INDEX "Rappel_etablissementId_idx" ON "Rappel"("etablissementId");

-- AddForeignKey
ALTER TABLE "Utilisateur" ADD CONSTRAINT "Utilisateur_etablissementId_fkey" FOREIGN KEY ("etablissementId") REFERENCES "Etablissement"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Equipement" ADD CONSTRAINT "Equipement_etablissementId_fkey" FOREIGN KEY ("etablissementId") REFERENCES "Etablissement"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ReleveTemperature" ADD CONSTRAINT "ReleveTemperature_equipementId_fkey" FOREIGN KEY ("equipementId") REFERENCES "Equipement"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ReleveTemperature" ADD CONSTRAINT "ReleveTemperature_utilisateurId_fkey" FOREIGN KEY ("utilisateurId") REFERENCES "Utilisateur"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ReleveTemperature" ADD CONSTRAINT "ReleveTemperature_correctionDeId_fkey" FOREIGN KEY ("correctionDeId") REFERENCES "ReleveTemperature"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TacheNettoyage" ADD CONSTRAINT "TacheNettoyage_etablissementId_fkey" FOREIGN KEY ("etablissementId") REFERENCES "Etablissement"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ValidationNettoyage" ADD CONSTRAINT "ValidationNettoyage_tacheId_fkey" FOREIGN KEY ("tacheId") REFERENCES "TacheNettoyage"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ValidationNettoyage" ADD CONSTRAINT "ValidationNettoyage_utilisateurId_fkey" FOREIGN KEY ("utilisateurId") REFERENCES "Utilisateur"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Reception" ADD CONSTRAINT "Reception_etablissementId_fkey" FOREIGN KEY ("etablissementId") REFERENCES "Etablissement"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Reception" ADD CONSTRAINT "Reception_utilisateurId_fkey" FOREIGN KEY ("utilisateurId") REFERENCES "Utilisateur"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProduitOuvert" ADD CONSTRAINT "ProduitOuvert_etablissementId_fkey" FOREIGN KEY ("etablissementId") REFERENCES "Etablissement"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProduitOuvert" ADD CONSTRAINT "ProduitOuvert_utilisateurId_fkey" FOREIGN KEY ("utilisateurId") REFERENCES "Utilisateur"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "NonConformite" ADD CONSTRAINT "NonConformite_etablissementId_fkey" FOREIGN KEY ("etablissementId") REFERENCES "Etablissement"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "NonConformite" ADD CONSTRAINT "NonConformite_utilisateurId_fkey" FOREIGN KEY ("utilisateurId") REFERENCES "Utilisateur"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "NonConformite" ADD CONSTRAINT "NonConformite_releveId_fkey" FOREIGN KEY ("releveId") REFERENCES "ReleveTemperature"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "NonConformite" ADD CONSTRAINT "NonConformite_receptionId_fkey" FOREIGN KEY ("receptionId") REFERENCES "Reception"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Rappel" ADD CONSTRAINT "Rappel_etablissementId_fkey" FOREIGN KEY ("etablissementId") REFERENCES "Etablissement"("id") ON DELETE CASCADE ON UPDATE CASCADE;

