-- AlterTable
ALTER TABLE "Client" ADD COLUMN     "email" TEXT;

-- CreateTable
CREATE TABLE "Praticien" (
    "id" TEXT NOT NULL,
    "nom" TEXT NOT NULL,
    "actif" BOOLEAN NOT NULL DEFAULT true,
    "salonId" TEXT NOT NULL,

    CONSTRAINT "Praticien_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Praticien_salonId_idx" ON "Praticien"("salonId");

-- AddForeignKey
ALTER TABLE "Praticien" ADD CONSTRAINT "Praticien_salonId_fkey" FOREIGN KEY ("salonId") REFERENCES "Salon"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Backfill: give every existing salon a default practitioner, so existing
-- appointments have somewhere to point before praticienId becomes required.
INSERT INTO "Praticien" ("id", "nom", "actif", "salonId")
SELECT gen_random_uuid()::text, 'Praticien principal', true, "id"
FROM "Salon";

-- AlterTable (nullable first, backfilled below, then made required)
ALTER TABLE "Appointment" ADD COLUMN     "praticienId" TEXT;

UPDATE "Appointment" a
SET "praticienId" = (SELECT p."id" FROM "Praticien" p WHERE p."salonId" = a."salonId" LIMIT 1);

ALTER TABLE "Appointment" ALTER COLUMN "praticienId" SET NOT NULL;

-- AddForeignKey
ALTER TABLE "Appointment" ADD CONSTRAINT "Appointment_praticienId_fkey" FOREIGN KEY ("praticienId") REFERENCES "Praticien"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
