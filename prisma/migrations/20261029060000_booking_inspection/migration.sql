CREATE TABLE "BookingInspection" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "organizationId" TEXT NOT NULL,
    "bookingId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "odometer" INTEGER,
    "fuelLevel" TEXT,
    "photos" JSONB NOT NULL DEFAULT [],
    "notes" TEXT,
    "performedByUserId" TEXT NOT NULL,
    "performedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "BookingInspection_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "BookingInspection_bookingId_fkey" FOREIGN KEY ("bookingId") REFERENCES "Booking" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateIndex
CREATE INDEX "BookingInspection_organizationId_idx" ON "BookingInspection"("organizationId");

-- CreateIndex
CREATE UNIQUE INDEX "BookingInspection_bookingId_type_key" ON "BookingInspection"("bookingId", "type");

