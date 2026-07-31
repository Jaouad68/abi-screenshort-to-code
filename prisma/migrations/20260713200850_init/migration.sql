-- CreateEnum
CREATE TYPE "Plan" AS ENUM ('ESSENTIEL', 'SERENITE', 'PREMIUM');

-- CreateEnum
CREATE TYPE "AbonnementStatut" AS ENUM ('ESSAI', 'ACTIF', 'IMPAYE', 'ANNULE');

-- CreateEnum
CREATE TYPE "AppointmentStatut" AS ENUM ('RESERVE', 'CONFIRME', 'ANNULE', 'HONORE', 'NON_VENU');

-- CreateEnum
CREATE TYPE "AppointmentSource" AS ENUM ('EN_LIGNE', 'TELEPHONE');

-- CreateEnum
CREATE TYPE "AcompteStatut" AS ENUM ('AUCUN', 'DEMANDE', 'REGLE', 'CONSERVE', 'REMBOURSE');

-- CreateEnum
CREATE TYPE "SmsDirection" AS ENUM ('SORTANT', 'ENTRANT');

-- CreateEnum
CREATE TYPE "SmsGabarit" AS ENUM ('CONFIRMATION', 'RAPPEL_J2', 'ANNULATION', 'NOTIF_GERANT', 'STOP');

-- CreateEnum
CREATE TYPE "SmsStatut" AS ENUM ('ENVOYE', 'ECHEC', 'SIMULE', 'QUOTA_DEPASSE');

-- CreateTable
CREATE TABLE "Salon" (
    "id" TEXT NOT NULL,
    "nom" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "adresse" TEXT,
    "ville" TEXT,
    "telephone" TEXT,
    "horaires" JSONB NOT NULL,
    "reglagesAcompte" JSONB NOT NULL,
    "plan" "Plan" NOT NULL DEFAULT 'ESSENTIEL',
    "abonnementStatut" "AbonnementStatut" NOT NULL DEFAULT 'ESSAI',
    "stripeCustomerId" TEXT,
    "stripeSubscriptionId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Salon_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Membership" (
    "id" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "userId" TEXT NOT NULL,
    "salonId" TEXT NOT NULL,

    CONSTRAINT "Membership_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PasswordResetToken" (
    "id" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "usedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "userId" TEXT NOT NULL,

    CONSTRAINT "PasswordResetToken_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Service" (
    "id" TEXT NOT NULL,
    "nom" TEXT NOT NULL,
    "dureeMin" INTEGER NOT NULL,
    "bufferMin" INTEGER NOT NULL DEFAULT 0,
    "prixCents" INTEGER NOT NULL,
    "actif" BOOLEAN NOT NULL DEFAULT true,
    "salonId" TEXT NOT NULL,

    CONSTRAINT "Service_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Client" (
    "id" TEXT NOT NULL,
    "prenom" TEXT NOT NULL,
    "telephone" TEXT NOT NULL,
    "consentementSms" BOOLEAN NOT NULL DEFAULT false,
    "consentementDate" TIMESTAMP(3),
    "noShowCount" INTEGER NOT NULL DEFAULT 0,
    "honoredCount" INTEGER NOT NULL DEFAULT 0,
    "salonId" TEXT NOT NULL,

    CONSTRAINT "Client_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Appointment" (
    "id" TEXT NOT NULL,
    "debutAt" TIMESTAMP(3) NOT NULL,
    "finAt" TIMESTAMP(3) NOT NULL,
    "statut" "AppointmentStatut" NOT NULL DEFAULT 'RESERVE',
    "source" "AppointmentSource" NOT NULL DEFAULT 'EN_LIGNE',
    "acompteCents" INTEGER NOT NULL DEFAULT 0,
    "acompteStatut" "AcompteStatut" NOT NULL DEFAULT 'AUCUN',
    "bookingToken" TEXT NOT NULL,
    "rappelEnvoye" BOOLEAN NOT NULL DEFAULT false,
    "stripeSessionId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "salonId" TEXT NOT NULL,
    "serviceId" TEXT NOT NULL,
    "clientId" TEXT NOT NULL,

    CONSTRAINT "Appointment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SmsLog" (
    "id" TEXT NOT NULL,
    "appointmentId" TEXT NOT NULL,
    "direction" "SmsDirection" NOT NULL DEFAULT 'SORTANT',
    "gabarit" "SmsGabarit" NOT NULL,
    "destinataire" TEXT NOT NULL,
    "corps" TEXT NOT NULL,
    "segments" INTEGER NOT NULL,
    "statut" "SmsStatut" NOT NULL,
    "envoyeLe" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SmsLog_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Salon_slug_key" ON "Salon"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "Salon_stripeSubscriptionId_key" ON "Salon"("stripeSubscriptionId");

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE INDEX "Membership_salonId_idx" ON "Membership"("salonId");

-- CreateIndex
CREATE UNIQUE INDEX "Membership_userId_salonId_key" ON "Membership"("userId", "salonId");

-- CreateIndex
CREATE UNIQUE INDEX "PasswordResetToken_token_key" ON "PasswordResetToken"("token");

-- CreateIndex
CREATE INDEX "PasswordResetToken_userId_idx" ON "PasswordResetToken"("userId");

-- CreateIndex
CREATE INDEX "Service_salonId_idx" ON "Service"("salonId");

-- CreateIndex
CREATE UNIQUE INDEX "Client_salonId_telephone_key" ON "Client"("salonId", "telephone");

-- CreateIndex
CREATE UNIQUE INDEX "Appointment_bookingToken_key" ON "Appointment"("bookingToken");

-- CreateIndex
CREATE UNIQUE INDEX "Appointment_stripeSessionId_key" ON "Appointment"("stripeSessionId");

-- CreateIndex
CREATE INDEX "Appointment_salonId_debutAt_idx" ON "Appointment"("salonId", "debutAt");

-- CreateIndex
CREATE INDEX "SmsLog_appointmentId_idx" ON "SmsLog"("appointmentId");

-- AddForeignKey
ALTER TABLE "Membership" ADD CONSTRAINT "Membership_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Membership" ADD CONSTRAINT "Membership_salonId_fkey" FOREIGN KEY ("salonId") REFERENCES "Salon"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PasswordResetToken" ADD CONSTRAINT "PasswordResetToken_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Service" ADD CONSTRAINT "Service_salonId_fkey" FOREIGN KEY ("salonId") REFERENCES "Salon"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Client" ADD CONSTRAINT "Client_salonId_fkey" FOREIGN KEY ("salonId") REFERENCES "Salon"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Appointment" ADD CONSTRAINT "Appointment_salonId_fkey" FOREIGN KEY ("salonId") REFERENCES "Salon"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Appointment" ADD CONSTRAINT "Appointment_serviceId_fkey" FOREIGN KEY ("serviceId") REFERENCES "Service"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Appointment" ADD CONSTRAINT "Appointment_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "Client"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SmsLog" ADD CONSTRAINT "SmsLog_appointmentId_fkey" FOREIGN KEY ("appointmentId") REFERENCES "Appointment"("id") ON DELETE CASCADE ON UPDATE CASCADE;
