-- CreateTable
CREATE TABLE "Membership" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "userId" TEXT NOT NULL,
    "salonId" TEXT NOT NULL,
    CONSTRAINT "Membership_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "Membership_salonId_fkey" FOREIGN KEY ("salonId") REFERENCES "Salon" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- Backfill: turn each existing 1:1 User<->Salon link into a Membership row before
-- the old User.salonId column is dropped below.
INSERT INTO "Membership" ("id", "userId", "salonId", "createdAt")
SELECT lower(hex(randomblob(16))), "id", "salonId", CURRENT_TIMESTAMP
FROM "User";

-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_User" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "email" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);
INSERT INTO "new_User" ("createdAt", "email", "id", "passwordHash") SELECT "createdAt", "email", "id", "passwordHash" FROM "User";
DROP TABLE "User";
ALTER TABLE "new_User" RENAME TO "User";
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;

-- CreateIndex
CREATE INDEX "Membership_salonId_idx" ON "Membership"("salonId");

-- CreateIndex
CREATE UNIQUE INDEX "Membership_userId_salonId_key" ON "Membership"("userId", "salonId");
