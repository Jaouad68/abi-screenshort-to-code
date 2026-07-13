-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Salon" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "nom" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "adresse" TEXT,
    "ville" TEXT,
    "telephone" TEXT,
    "horaires" JSONB NOT NULL,
    "reglagesAcompte" JSONB NOT NULL,
    "plan" TEXT NOT NULL DEFAULT 'ESSENTIEL',
    "abonnementStatut" TEXT NOT NULL DEFAULT 'ESSAI',
    "stripeCustomerId" TEXT,
    "stripeSubscriptionId" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);
INSERT INTO "new_Salon" ("adresse", "createdAt", "horaires", "id", "nom", "plan", "reglagesAcompte", "slug", "telephone", "updatedAt", "ville") SELECT "adresse", "createdAt", "horaires", "id", "nom", "plan", "reglagesAcompte", "slug", "telephone", "updatedAt", "ville" FROM "Salon";
DROP TABLE "Salon";
ALTER TABLE "new_Salon" RENAME TO "Salon";
CREATE UNIQUE INDEX "Salon_slug_key" ON "Salon"("slug");
CREATE UNIQUE INDEX "Salon_stripeSubscriptionId_key" ON "Salon"("stripeSubscriptionId");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
