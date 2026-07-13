-- CreateTable
CREATE TABLE "Salon" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "nom" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "adresse" TEXT,
    "ville" TEXT,
    "telephone" TEXT,
    "horaires" JSONB NOT NULL,
    "reglagesAcompte" JSONB NOT NULL,
    "plan" TEXT NOT NULL DEFAULT 'ESSENTIEL',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "email" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "salonId" TEXT NOT NULL,
    CONSTRAINT "User_salonId_fkey" FOREIGN KEY ("salonId") REFERENCES "Salon" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Service" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "nom" TEXT NOT NULL,
    "dureeMin" INTEGER NOT NULL,
    "bufferMin" INTEGER NOT NULL DEFAULT 0,
    "prixCents" INTEGER NOT NULL,
    "actif" BOOLEAN NOT NULL DEFAULT true,
    "salonId" TEXT NOT NULL,
    CONSTRAINT "Service_salonId_fkey" FOREIGN KEY ("salonId") REFERENCES "Salon" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Client" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "prenom" TEXT NOT NULL,
    "telephone" TEXT NOT NULL,
    "consentementSms" BOOLEAN NOT NULL DEFAULT false,
    "consentementDate" DATETIME,
    "noShowCount" INTEGER NOT NULL DEFAULT 0,
    "honoredCount" INTEGER NOT NULL DEFAULT 0,
    "salonId" TEXT NOT NULL,
    CONSTRAINT "Client_salonId_fkey" FOREIGN KEY ("salonId") REFERENCES "Salon" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Appointment" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "debutAt" DATETIME NOT NULL,
    "finAt" DATETIME NOT NULL,
    "statut" TEXT NOT NULL DEFAULT 'RESERVE',
    "source" TEXT NOT NULL DEFAULT 'EN_LIGNE',
    "acompteCents" INTEGER NOT NULL DEFAULT 0,
    "acompteStatut" TEXT NOT NULL DEFAULT 'AUCUN',
    "bookingToken" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "salonId" TEXT NOT NULL,
    "serviceId" TEXT NOT NULL,
    "clientId" TEXT NOT NULL,
    CONSTRAINT "Appointment_salonId_fkey" FOREIGN KEY ("salonId") REFERENCES "Salon" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "Appointment_serviceId_fkey" FOREIGN KEY ("serviceId") REFERENCES "Service" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "Appointment_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "Client" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateIndex
CREATE UNIQUE INDEX "Salon_slug_key" ON "Salon"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE UNIQUE INDEX "User_salonId_key" ON "User"("salonId");

-- CreateIndex
CREATE INDEX "Service_salonId_idx" ON "Service"("salonId");

-- CreateIndex
CREATE UNIQUE INDEX "Client_salonId_telephone_key" ON "Client"("salonId", "telephone");

-- CreateIndex
CREATE UNIQUE INDEX "Appointment_bookingToken_key" ON "Appointment"("bookingToken");

-- CreateIndex
CREATE INDEX "Appointment_salonId_debutAt_idx" ON "Appointment"("salonId", "debutAt");
