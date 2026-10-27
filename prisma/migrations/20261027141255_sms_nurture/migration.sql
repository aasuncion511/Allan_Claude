-- AlterTable
ALTER TABLE "Booking" ADD COLUMN "pickupReminderSentAt" DATETIME;
ALTER TABLE "Booking" ADD COLUMN "returnReminderSentAt" DATETIME;

-- CreateTable
CREATE TABLE "SmsLog" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "organizationId" TEXT NOT NULL,
    "customerId" TEXT,
    "kind" TEXT NOT NULL,
    "dedupeKey" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "error" TEXT,
    "sentAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "SmsLog_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "SmsLog_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "Customer" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Customer" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "organizationId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "email" TEXT,
    "phone" TEXT NOT NULL,
    "address" TEXT,
    "driverLicense" TEXT,
    "notes" TEXT,
    "birthday" DATETIME,
    "smsOptOut" BOOLEAN NOT NULL DEFAULT false,
    "smsOptOutReason" TEXT,
    "passwordHash" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Customer_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_Customer" ("address", "createdAt", "driverLicense", "email", "id", "name", "notes", "organizationId", "passwordHash", "phone", "updatedAt") SELECT "address", "createdAt", "driverLicense", "email", "id", "name", "notes", "organizationId", "passwordHash", "phone", "updatedAt" FROM "Customer";
DROP TABLE "Customer";
ALTER TABLE "new_Customer" RENAME TO "Customer";
CREATE INDEX "Customer_organizationId_name_idx" ON "Customer"("organizationId", "name");
CREATE UNIQUE INDEX "Customer_organizationId_email_key" ON "Customer"("organizationId", "email");
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
    "reservationFeeAmount" REAL NOT NULL DEFAULT 500,
    "holdFeeAmount" REAL NOT NULL DEFAULT 350,
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
INSERT INTO "new_Organization" ("aboutText", "address", "cancelAtPeriodEnd", "carwashFeeAmount", "contactEmail", "contactPhone", "createdAt", "currentPeriodEnd", "deliveryFeeAmount", "driverFeePerDay", "dropoffFeeAmount", "excessHourlyRate", "facebookUrl", "ghlApiToken", "ghlLocationId", "heroImageUrl", "holdFeeAmount", "id", "instagramUrl", "logoUrl", "name", "offersDriverService", "paymongoLiveMode", "paymongoPublicKey", "paymongoSecretKey", "paymongoWebhookSecret", "requirementsText", "reservationFeeAmount", "slug", "stripeCustomerId", "stripePriceId", "stripeSubscriptionId", "subscriptionStatus", "tagline", "termsAndConditionsText", "tiktokUrl", "trialEndsAt") SELECT "aboutText", "address", "cancelAtPeriodEnd", "carwashFeeAmount", "contactEmail", "contactPhone", "createdAt", "currentPeriodEnd", "deliveryFeeAmount", "driverFeePerDay", "dropoffFeeAmount", "excessHourlyRate", "facebookUrl", "ghlApiToken", "ghlLocationId", "heroImageUrl", "holdFeeAmount", "id", "instagramUrl", "logoUrl", "name", "offersDriverService", "paymongoLiveMode", "paymongoPublicKey", "paymongoSecretKey", "paymongoWebhookSecret", "requirementsText", "reservationFeeAmount", "slug", "stripeCustomerId", "stripePriceId", "stripeSubscriptionId", "subscriptionStatus", "tagline", "termsAndConditionsText", "tiktokUrl", "trialEndsAt" FROM "Organization";
DROP TABLE "Organization";
ALTER TABLE "new_Organization" RENAME TO "Organization";
CREATE UNIQUE INDEX "Organization_slug_key" ON "Organization"("slug");
CREATE UNIQUE INDEX "Organization_stripeCustomerId_key" ON "Organization"("stripeCustomerId");
CREATE UNIQUE INDEX "Organization_stripeSubscriptionId_key" ON "Organization"("stripeSubscriptionId");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;

-- CreateIndex
CREATE INDEX "SmsLog_organizationId_kind_idx" ON "SmsLog"("organizationId", "kind");

-- CreateIndex
CREATE UNIQUE INDEX "SmsLog_organizationId_customerId_dedupeKey_key" ON "SmsLog"("organizationId", "customerId", "dedupeKey");

