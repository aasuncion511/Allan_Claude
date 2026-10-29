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
    "securityDepositStatus" TEXT NOT NULL DEFAULT 'NOT_COLLECTED',
    "securityDepositCollectedMethod" TEXT,
    "securityDepositCollectedAt" DATETIME,
    "securityDepositRefundMethod" TEXT,
    "securityDepositRefundedAt" DATETIME,
    "securityDepositRefundedByUserId" TEXT,
    "amountPaid" REAL NOT NULL DEFAULT 0,
    "paymentStatus" TEXT NOT NULL DEFAULT 'UNPAID',
    "paymongoCheckoutId" TEXT,
    "paymongoCheckoutUrl" TEXT,
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
    "signatureToken" TEXT,
    "signedAt" DATETIME,
    "signedName" TEXT,
    "signedMethod" TEXT,
    "signedIp" TEXT,
    "confirmationEmailSentAt" DATETIME,
    "confirmationEmailError" TEXT,
    "pickupReminderSentAt" DATETIME,
    "returnReminderSentAt" DATETIME,
    "reservationFeeDue" REAL,
    "checkoutInitiatedAt" DATETIME,
    "paymentConfirmedAt" DATETIME,
    "checkoutExpiredAt" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Booking_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "Booking_vehicleId_fkey" FOREIGN KEY ("vehicleId") REFERENCES "Vehicle" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "Booking_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "Customer" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "Booking_corporateClientId_fkey" FOREIGN KEY ("corporateClientId") REFERENCES "CorporateClient" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_Booking" ("amountPaid", "carwashFee", "carwashRequested", "checkoutExpiredAt", "checkoutInitiatedAt", "confirmationEmailError", "confirmationEmailSentAt", "corporateClientId", "createdAt", "customerId", "dailyRate", "deliveryFee", "destinationDetails", "driverFee", "dropoffFee", "dropoffLocation", "dropoffMethod", "endDate", "endTime", "excessHours", "excessTimeFee", "holdExpiresAt", "howFoundUs", "id", "notes", "organizationId", "paymentConfirmedAt", "paymentStatus", "paymongoCheckoutId", "paymongoCheckoutUrl", "pickupLocation", "pickupMethod", "pickupReminderSentAt", "purposeOfTravel", "rentalOption", "reservationFeeDue", "returnReminderSentAt", "securityDeposit", "signatureToken", "signedAt", "signedIp", "signedMethod", "signedName", "source", "startDate", "startTime", "status", "totalAmount", "updatedAt", "vehicleId") SELECT "amountPaid", "carwashFee", "carwashRequested", "checkoutExpiredAt", "checkoutInitiatedAt", "confirmationEmailError", "confirmationEmailSentAt", "corporateClientId", "createdAt", "customerId", "dailyRate", "deliveryFee", "destinationDetails", "driverFee", "dropoffFee", "dropoffLocation", "dropoffMethod", "endDate", "endTime", "excessHours", "excessTimeFee", "holdExpiresAt", "howFoundUs", "id", "notes", "organizationId", "paymentConfirmedAt", "paymentStatus", "paymongoCheckoutId", "paymongoCheckoutUrl", "pickupLocation", "pickupMethod", "pickupReminderSentAt", "purposeOfTravel", "rentalOption", "reservationFeeDue", "returnReminderSentAt", "securityDeposit", "signatureToken", "signedAt", "signedIp", "signedMethod", "signedName", "source", "startDate", "startTime", "status", "totalAmount", "updatedAt", "vehicleId" FROM "Booking";
DROP TABLE "Booking";
ALTER TABLE "new_Booking" RENAME TO "Booking";
CREATE UNIQUE INDEX "Booking_signatureToken_key" ON "Booking"("signatureToken");
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
INSERT INTO "new_Organization" ("aboutText", "address", "cancelAtPeriodEnd", "carwashFeeAmount", "contactEmail", "contactPhone", "createdAt", "currentPeriodEnd", "deliveryFeeAmount", "driverFeePerDay", "dropoffFeeAmount", "excessHourlyRate", "facebookUrl", "ghlApiToken", "ghlLocationId", "heroImageUrl", "holdWindowSeconds", "id", "instagramUrl", "logoUrl", "name", "offersDriverService", "paymongoLiveMode", "paymongoPublicKey", "paymongoSecretKey", "paymongoWebhookSecret", "pickupReservationFee", "requirementsText", "sedanReservationFee", "slug", "smsBirthdayGreetingsEnabled", "smsHolidayGreetingsEnabled", "smsInactivityMonths", "smsRemindersEnabled", "stripeCustomerId", "stripePriceId", "stripeSubscriptionId", "subscriptionStatus", "suvReservationFee", "tagline", "termsAndConditionsText", "tiktokUrl", "trialEndsAt") SELECT "aboutText", "address", "cancelAtPeriodEnd", "carwashFeeAmount", "contactEmail", "contactPhone", "createdAt", "currentPeriodEnd", "deliveryFeeAmount", "driverFeePerDay", "dropoffFeeAmount", "excessHourlyRate", "facebookUrl", "ghlApiToken", "ghlLocationId", "heroImageUrl", "holdWindowSeconds", "id", "instagramUrl", "logoUrl", "name", "offersDriverService", "paymongoLiveMode", "paymongoPublicKey", "paymongoSecretKey", "paymongoWebhookSecret", "pickupReservationFee", "requirementsText", "sedanReservationFee", "slug", "smsBirthdayGreetingsEnabled", "smsHolidayGreetingsEnabled", "smsInactivityMonths", "smsRemindersEnabled", "stripeCustomerId", "stripePriceId", "stripeSubscriptionId", "subscriptionStatus", "suvReservationFee", "tagline", "termsAndConditionsText", "tiktokUrl", "trialEndsAt" FROM "Organization";
DROP TABLE "Organization";
ALTER TABLE "new_Organization" RENAME TO "Organization";
CREATE UNIQUE INDEX "Organization_slug_key" ON "Organization"("slug");
CREATE UNIQUE INDEX "Organization_stripeCustomerId_key" ON "Organization"("stripeCustomerId");
CREATE UNIQUE INDEX "Organization_stripeSubscriptionId_key" ON "Organization"("stripeSubscriptionId");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;

