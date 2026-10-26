-- CreateTable
CREATE TABLE "BookingCharge" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "organizationId" TEXT NOT NULL,
    "bookingId" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "amount" REAL NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "paymongoCheckoutId" TEXT,
    "paidVia" TEXT,
    "recordedByUserId" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "paidAt" DATETIME,
    CONSTRAINT "BookingCharge_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "BookingCharge_bookingId_fkey" FOREIGN KEY ("bookingId") REFERENCES "Booking" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "CorporateClient" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "organizationId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "accessCode" TEXT NOT NULL,
    "contactName" TEXT,
    "contactEmail" TEXT,
    "contactPhone" TEXT,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "CorporateClient_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

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
    "notes" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Booking_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "Booking_vehicleId_fkey" FOREIGN KEY ("vehicleId") REFERENCES "Vehicle" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "Booking_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "Customer" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "Booking_corporateClientId_fkey" FOREIGN KEY ("corporateClientId") REFERENCES "CorporateClient" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_Booking" ("amountPaid", "createdAt", "customerId", "dailyRate", "depositReturned", "dropoffLocation", "endDate", "holdExpiresAt", "id", "notes", "organizationId", "paymentStatus", "paymongoCheckoutId", "pickupLocation", "securityDeposit", "source", "startDate", "status", "totalAmount", "updatedAt", "vehicleId") SELECT "amountPaid", "createdAt", "customerId", "dailyRate", "depositReturned", "dropoffLocation", "endDate", "holdExpiresAt", "id", "notes", "organizationId", "paymentStatus", "paymongoCheckoutId", "pickupLocation", "securityDeposit", "source", "startDate", "status", "totalAmount", "updatedAt", "vehicleId" FROM "Booking";
DROP TABLE "Booking";
ALTER TABLE "new_Booking" RENAME TO "Booking";
CREATE INDEX "Booking_organizationId_idx" ON "Booking"("organizationId");
CREATE INDEX "Booking_vehicleId_idx" ON "Booking"("vehicleId");
CREATE INDEX "Booking_customerId_idx" ON "Booking"("customerId");
CREATE INDEX "Booking_startDate_endDate_idx" ON "Booking"("startDate", "endDate");
CREATE INDEX "Booking_paymongoCheckoutId_idx" ON "Booking"("paymongoCheckoutId");
CREATE INDEX "Booking_corporateClientId_idx" ON "Booking"("corporateClientId");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;

-- CreateIndex
CREATE INDEX "BookingCharge_organizationId_status_idx" ON "BookingCharge"("organizationId", "status");

-- CreateIndex
CREATE INDEX "BookingCharge_bookingId_idx" ON "BookingCharge"("bookingId");

-- CreateIndex
CREATE INDEX "BookingCharge_paymongoCheckoutId_idx" ON "BookingCharge"("paymongoCheckoutId");

-- CreateIndex
CREATE INDEX "CorporateClient_organizationId_active_idx" ON "CorporateClient"("organizationId", "active");

-- CreateIndex
CREATE UNIQUE INDEX "CorporateClient_organizationId_name_key" ON "CorporateClient"("organizationId", "name");
