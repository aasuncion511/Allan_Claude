
-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Organization" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "customDomain" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "isDemo" BOOLEAN NOT NULL DEFAULT false,
    "theme" TEXT NOT NULL DEFAULT 'CLASSIC',
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
    "termsAndConditionsText" TEXT,
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
    "holdWindowSeconds" INTEGER NOT NULL DEFAULT 1500,
    "sedanReservationFee" REAL NOT NULL DEFAULT 800,
    "suvReservationFee" REAL NOT NULL DEFAULT 1000,
    "pickupReservationFee" REAL NOT NULL DEFAULT 1000,
    "securityDepositAmount" REAL NOT NULL DEFAULT 2000,
    "offersDriverService" BOOLEAN NOT NULL DEFAULT false,
    "driverFeePerDay" REAL NOT NULL DEFAULT 0,
    "deliveryFeeAmount" REAL NOT NULL DEFAULT 0,
    "dropoffFeeAmount" REAL NOT NULL DEFAULT 0,
    "carwashFeeAmount" REAL NOT NULL DEFAULT 0,
    "excessHourlyRate" REAL NOT NULL DEFAULT 0,
    "ghlLocationId" TEXT,
    "ghlApiToken" TEXT,
    "smsRemindersEnabled" BOOLEAN NOT NULL DEFAULT false,
    "smsBirthdayGreetingsEnabled" BOOLEAN NOT NULL DEFAULT false,
    "smsHolidayGreetingsEnabled" BOOLEAN NOT NULL DEFAULT false,
    "smsInactivityMonths" INTEGER NOT NULL DEFAULT 24
);
INSERT INTO "new_Organization" ("aboutText", "address", "cancelAtPeriodEnd", "carwashFeeAmount", "contactEmail", "contactPhone", "createdAt", "currentPeriodEnd", "customDomain", "deliveryFeeAmount", "driverFeePerDay", "dropoffFeeAmount", "excessHourlyRate", "facebookUrl", "ghlApiToken", "ghlLocationId", "heroImageUrl", "holdWindowSeconds", "id", "instagramUrl", "logoUrl", "name", "offersDriverService", "paymongoLiveMode", "paymongoPublicKey", "paymongoSecretKey", "paymongoWebhookSecret", "pickupReservationFee", "requirementsText", "securityDepositAmount", "sedanReservationFee", "slug", "smsBirthdayGreetingsEnabled", "smsHolidayGreetingsEnabled", "smsInactivityMonths", "smsRemindersEnabled", "stripeCustomerId", "stripePriceId", "stripeSubscriptionId", "subscriptionStatus", "suvReservationFee", "tagline", "termsAndConditionsText", "theme", "tiktokUrl", "trialEndsAt") SELECT "aboutText", "address", "cancelAtPeriodEnd", "carwashFeeAmount", "contactEmail", "contactPhone", "createdAt", "currentPeriodEnd", "customDomain", "deliveryFeeAmount", "driverFeePerDay", "dropoffFeeAmount", "excessHourlyRate", "facebookUrl", "ghlApiToken", "ghlLocationId", "heroImageUrl", "holdWindowSeconds", "id", "instagramUrl", "logoUrl", "name", "offersDriverService", "paymongoLiveMode", "paymongoPublicKey", "paymongoSecretKey", "paymongoWebhookSecret", "pickupReservationFee", "requirementsText", "securityDepositAmount", "sedanReservationFee", "slug", "smsBirthdayGreetingsEnabled", "smsHolidayGreetingsEnabled", "smsInactivityMonths", "smsRemindersEnabled", "stripeCustomerId", "stripePriceId", "stripeSubscriptionId", "subscriptionStatus", "suvReservationFee", "tagline", "termsAndConditionsText", "theme", "tiktokUrl", "trialEndsAt" FROM "Organization";
DROP TABLE "Organization";
ALTER TABLE "new_Organization" RENAME TO "Organization";
CREATE UNIQUE INDEX "Organization_slug_key" ON "Organization"("slug");
CREATE UNIQUE INDEX "Organization_customDomain_key" ON "Organization"("customDomain");
CREATE UNIQUE INDEX "Organization_stripeCustomerId_key" ON "Organization"("stripeCustomerId");
CREATE UNIQUE INDEX "Organization_stripeSubscriptionId_key" ON "Organization"("stripeSubscriptionId");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;

