-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Organization" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "tagline" TEXT,
    "aboutText" TEXT,
    "logoUrl" TEXT,
    "heroImageUrl" TEXT,
    "contactPhone" TEXT,
    "contactEmail" TEXT,
    "address" TEXT,
    "facebookUrl" TEXT,
    "instagramUrl" TEXT,
    "tiktokUrl" TEXT,
    "requirementsText" TEXT,
    "stripeCustomerId" TEXT,
    "stripeSubscriptionId" TEXT,
    "stripePriceId" TEXT,
    "subscriptionStatus" TEXT NOT NULL DEFAULT 'TRIALING',
    "trialEndsAt" DATETIME,
    "currentPeriodEnd" DATETIME,
    "cancelAtPeriodEnd" BOOLEAN NOT NULL DEFAULT false,
    "paymongoSecretKey" TEXT,
    "paymongoPublicKey" TEXT,
    "paymongoWebhookSecret" TEXT,
    "paymongoLiveMode" BOOLEAN NOT NULL DEFAULT false,
    "reservationFeeAmount" REAL NOT NULL DEFAULT 500,
    "ghlLocationId" TEXT,
    "ghlApiToken" TEXT
);
INSERT INTO "new_Organization" ("aboutText", "address", "cancelAtPeriodEnd", "contactEmail", "contactPhone", "createdAt", "currentPeriodEnd", "facebookUrl", "ghlApiToken", "ghlLocationId", "heroImageUrl", "id", "instagramUrl", "logoUrl", "name", "paymongoPublicKey", "paymongoSecretKey", "requirementsText", "reservationFeeAmount", "slug", "stripeCustomerId", "stripePriceId", "stripeSubscriptionId", "subscriptionStatus", "tagline", "tiktokUrl", "trialEndsAt") SELECT "aboutText", "address", "cancelAtPeriodEnd", "contactEmail", "contactPhone", "createdAt", "currentPeriodEnd", "facebookUrl", "ghlApiToken", "ghlLocationId", "heroImageUrl", "id", "instagramUrl", "logoUrl", "name", "paymongoPublicKey", "paymongoSecretKey", "requirementsText", "reservationFeeAmount", "slug", "stripeCustomerId", "stripePriceId", "stripeSubscriptionId", "subscriptionStatus", "tagline", "tiktokUrl", "trialEndsAt" FROM "Organization";
DROP TABLE "Organization";
ALTER TABLE "new_Organization" RENAME TO "Organization";
CREATE UNIQUE INDEX "Organization_slug_key" ON "Organization"("slug");
CREATE UNIQUE INDEX "Organization_stripeCustomerId_key" ON "Organization"("stripeCustomerId");
CREATE UNIQUE INDEX "Organization_stripeSubscriptionId_key" ON "Organization"("stripeSubscriptionId");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
