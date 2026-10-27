-- AlterTable
ALTER TABLE "Booking" ADD COLUMN "confirmationEmailError" TEXT;
ALTER TABLE "Booking" ADD COLUMN "confirmationEmailSentAt" DATETIME;
ALTER TABLE "Booking" ADD COLUMN "signatureToken" TEXT;
ALTER TABLE "Booking" ADD COLUMN "signedAt" DATETIME;
ALTER TABLE "Booking" ADD COLUMN "signedIp" TEXT;
ALTER TABLE "Booking" ADD COLUMN "signedMethod" TEXT;
ALTER TABLE "Booking" ADD COLUMN "signedName" TEXT;

-- AlterTable
ALTER TABLE "Organization" ADD COLUMN "termsAndConditionsText" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "Booking_signatureToken_key" ON "Booking"("signatureToken");

