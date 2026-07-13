-- CreateTable
CREATE TABLE "SmsLog" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "appointmentId" TEXT NOT NULL,
    "direction" TEXT NOT NULL DEFAULT 'SORTANT',
    "gabarit" TEXT NOT NULL,
    "destinataire" TEXT NOT NULL,
    "corps" TEXT NOT NULL,
    "segments" INTEGER NOT NULL,
    "statut" TEXT NOT NULL,
    "envoyeLe" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "SmsLog_appointmentId_fkey" FOREIGN KEY ("appointmentId") REFERENCES "Appointment" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Appointment" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "debutAt" DATETIME NOT NULL,
    "finAt" DATETIME NOT NULL,
    "statut" TEXT NOT NULL DEFAULT 'RESERVE',
    "source" TEXT NOT NULL DEFAULT 'EN_LIGNE',
    "acompteCents" INTEGER NOT NULL DEFAULT 0,
    "acompteStatut" TEXT NOT NULL DEFAULT 'AUCUN',
    "bookingToken" TEXT NOT NULL,
    "rappelEnvoye" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "salonId" TEXT NOT NULL,
    "serviceId" TEXT NOT NULL,
    "clientId" TEXT NOT NULL,
    CONSTRAINT "Appointment_salonId_fkey" FOREIGN KEY ("salonId") REFERENCES "Salon" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "Appointment_serviceId_fkey" FOREIGN KEY ("serviceId") REFERENCES "Service" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "Appointment_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "Client" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
INSERT INTO "new_Appointment" ("acompteCents", "acompteStatut", "bookingToken", "clientId", "createdAt", "debutAt", "finAt", "id", "salonId", "serviceId", "source", "statut") SELECT "acompteCents", "acompteStatut", "bookingToken", "clientId", "createdAt", "debutAt", "finAt", "id", "salonId", "serviceId", "source", "statut" FROM "Appointment";
DROP TABLE "Appointment";
ALTER TABLE "new_Appointment" RENAME TO "Appointment";
CREATE UNIQUE INDEX "Appointment_bookingToken_key" ON "Appointment"("bookingToken");
CREATE INDEX "Appointment_salonId_debutAt_idx" ON "Appointment"("salonId", "debutAt");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;

-- CreateIndex
CREATE INDEX "SmsLog_appointmentId_idx" ON "SmsLog"("appointmentId");
