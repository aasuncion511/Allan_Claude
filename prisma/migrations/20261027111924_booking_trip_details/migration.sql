-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Booking" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "organizationId" TEXT NOT NULL,
    "vehicleId" TEXT NOT NULL,
    "customerId" TEXT NOT NULL,
    "startDate" DATETIME NOT NULL,
    "endDate" DATETIME NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'RESERVED',
    "source" TEXT NOT NULL DEFAULT 'STAFF',
    "dailyRate" REAL NOT NULL,
    "totalAmount" REAL NOT NULL,
    "securityDeposit" REAL NOT NULL DEFAULT 0,
    "depositReturned" BOOLEAN NOT NULL DEFAULT false,
    "amountPaid" REAL NOT NULL DEFAULT 0,
    "paymentStatus" TEXT NOT NULL DEFAULT 'UNPAID',
    "paymongoCheckoutId" TEXT,
    "holdExpiresAt" DATETIME,
    "corporateClientId" TEXT,
    "pickupLocation" TEXT,
    "dropoffLocation" TEXT,
    "rentalOption" TEXT NOT NULL DEFAULT 'SELF_DRIVE',
    "pickupMethod" TEXT NOT NULL DEFAULT 'GARAGE',
    "dropoffMethod" TEXT NOT NULL DEFAULT 'GARAGE',
    "startTime" TEXT,
    "endTime" TEXT,
    "excessHours" INTEGER NOT NULL DEFAULT 0,
    "carwashRequested" BOOLEAN NOT NULL DEFAULT false,
    "destinationDetails" TEXT,
    "purposeOfTravel" TEXT,
    "howFoundUs" TEXT,
    "driverFee" REAL NOT NULL DEFAULT 0,
    "deliveryFee" REAL NOT NULL DEFAULT 0,
    "dropoffFee" REAL NOT NULL DEFAULT 0,
    "carwashFee" REAL NOT NULL DEFAULT 0,
    "excessTimeFee" REAL NOT NULL DEFAULT 0,
    "notes" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Booking_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "Booking_vehicleId_fkey" FOREIGN KEY ("vehicleId") REFERENCES "Vehicle" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "Booking_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "Customer" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "Booking_corporateClientId_fkey" FOREIGN KEY ("corporateClientId") REFERENCES "CorporateClient" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_Booking" ("amountPaid", "corporateClientId", "createdAt", "customerId", "dailyRate", "depositReturned", "dropoffLocation", "endDate", "holdExpiresAt", "id", "notes", "organizationId", "paymentStatus", "paymongoCheckoutId", "pickupLocation", "securityDeposit", "source", "startDate", "status", "totalAmount", "updatedAt", "vehicleId") SELECT "amountPaid", "corporateClientId", "createdAt", "customerId", "dailyRate", "depositReturned", "dropoffLocation", "endDate", "holdExpiresAt", "id", "notes", "organizationId", "paymentStatus", "paymongoCheckoutId", "pickupLocation", "securityDeposit", "source", "startDate", "status", "totalAmount", "updatedAt", "vehicleId" FROM "Booking";
DROP TABLE "Booking";
ALTER TABLE "new_Booking" RENAME TO "Booking";
CREATE INDEX "Booking_organizationId_idx" ON "Booking"("organizationId");
CREATE INDEX "Booking_vehicleId_idx" ON "Booking"("vehicleId");
CREATE INDEX "Booking_customerId_idx" ON "Booking"("customerId");
CREATE INDEX "Booking_startDate_endDate_idx" ON "Booking"("startDate", "endDate");
CREATE INDEX "Booking_paymongoCheckoutId_idx" ON "Booking"("paymongoCheckoutId");
CREATE INDEX "Booking_corporateClientId_idx" ON "Booking"("corporateClientId");
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
    "holdFeeAmount" REAL NOT NULL DEFAULT 350,
    "offersDriverService" BOOLEAN NOT NULL DEFAULT false,
    "driverFeePerDay" REAL NOT NULL DEFAULT 0,
    "deliveryFeeAmount" REAL NOT NULL DEFAULT 0,
    "dropoffFeeAmount" REAL NOT NULL DEFAULT 0,
    "carwashFeeAmount" REAL NOT NULL DEFAULT 0,
    "excessHourlyRate" REAL NOT NULL DEFAULT 0,
    "ghlLocationId" TEXT,
    "ghlApiToken" TEXT
);
INSERT INTO "new_Organization" ("aboutText", "address", "cancelAtPeriodEnd", "contactEmail", "contactPhone", "createdAt", "currentPeriodEnd", "facebookUrl", "ghlApiToken", "ghlLocationId", "heroImageUrl", "holdFeeAmount", "id", "instagramUrl", "logoUrl", "name", "paymongoLiveMode", "paymongoPublicKey", "paymongoSecretKey", "paymongoWebhookSecret", "requirementsText", "reservationFeeAmount", "slug", "stripeCustomerId", "stripePriceId", "stripeSubscriptionId", "subscriptionStatus", "tagline", "tiktokUrl", "trialEndsAt") SELECT "aboutText", "address", "cancelAtPeriodEnd", "contactEmail", "contactPhone", "createdAt", "currentPeriodEnd", "facebookUrl", "ghlApiToken", "ghlLocationId", "heroImageUrl", "holdFeeAmount", "id", "instagramUrl", "logoUrl", "name", "paymongoLiveMode", "paymongoPublicKey", "paymongoSecretKey", "paymongoWebhookSecret", "requirementsText", "reservationFeeAmount", "slug", "stripeCustomerId", "stripePriceId", "stripeSubscriptionId", "subscriptionStatus", "tagline", "tiktokUrl", "trialEndsAt" FROM "Organization";
DROP TABLE "Organization";
ALTER TABLE "new_Organization" RENAME TO "Organization";
CREATE UNIQUE INDEX "Organization_slug_key" ON "Organization"("slug");
CREATE UNIQUE INDEX "Organization_stripeCustomerId_key" ON "Organization"("stripeCustomerId");
CREATE UNIQUE INDEX "Organization_stripeSubscriptionId_key" ON "Organization"("stripeSubscriptionId");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
