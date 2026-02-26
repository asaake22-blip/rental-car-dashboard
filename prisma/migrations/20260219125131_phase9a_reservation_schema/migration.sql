-- CreateEnum
CREATE TYPE "ReservationStatus" AS ENUM ('RESERVED', 'CONFIRMED', 'DEPARTED', 'RETURNED', 'SETTLED', 'CANCELLED', 'NO_SHOW');

-- CreateEnum
CREATE TYPE "RateType" AS ENUM ('HOURLY', 'DAILY', 'OVERNIGHT');

-- AlterEnum
ALTER TYPE "VehicleStatus" ADD VALUE 'RENTED';

-- DropIndex (plateNumber は nullable になるため unique 制約削除)
DROP INDEX IF EXISTS "Vehicle_plateNumber_key";

-- AlterTable (vehicleCode を nullable で追加し、後で更新してから NOT NULL 化)
ALTER TABLE "Vehicle" ADD COLUMN IF NOT EXISTS "vehicleClassId" TEXT;
ALTER TABLE "Vehicle" ADD COLUMN IF NOT EXISTS "vehicleCode" TEXT;
ALTER TABLE "Vehicle" ALTER COLUMN "plateNumber" DROP NOT NULL;

-- CreateTable
CREATE TABLE "VehicleClass" (
    "id" TEXT NOT NULL,
    "classCode" TEXT NOT NULL,
    "className" TEXT NOT NULL,
    "description" TEXT,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "VehicleClass_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Reservation" (
    "id" TEXT NOT NULL,
    "reservationCode" TEXT NOT NULL,
    "status" "ReservationStatus" NOT NULL DEFAULT 'RESERVED',
    "vehicleClassId" TEXT NOT NULL,
    "vehicleId" TEXT,
    "customerName" TEXT NOT NULL,
    "customerNameKana" TEXT NOT NULL,
    "customerPhone" TEXT NOT NULL,
    "customerEmail" TEXT,
    "pickupDate" TIMESTAMP(3) NOT NULL,
    "returnDate" TIMESTAMP(3) NOT NULL,
    "actualPickupDate" TIMESTAMP(3),
    "actualReturnDate" TIMESTAMP(3),
    "pickupOfficeId" TEXT NOT NULL,
    "returnOfficeId" TEXT NOT NULL,
    "departureOdometer" INTEGER,
    "returnOdometer" INTEGER,
    "fuelLevelAtReturn" TEXT,
    "estimatedAmount" INTEGER,
    "actualAmount" INTEGER,
    "note" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Reservation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RatePlan" (
    "id" TEXT NOT NULL,
    "vehicleClassId" TEXT NOT NULL,
    "planName" TEXT NOT NULL,
    "rateType" "RateType" NOT NULL,
    "basePrice" INTEGER NOT NULL,
    "additionalHourPrice" INTEGER NOT NULL DEFAULT 0,
    "insurancePrice" INTEGER NOT NULL DEFAULT 0,
    "validFrom" TIMESTAMP(3) NOT NULL,
    "validTo" TIMESTAMP(3),
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "RatePlan_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RateOption" (
    "id" TEXT NOT NULL,
    "optionName" TEXT NOT NULL,
    "price" INTEGER NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "RateOption_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ReservationOption" (
    "id" TEXT NOT NULL,
    "reservationId" TEXT NOT NULL,
    "optionId" TEXT NOT NULL,
    "quantity" INTEGER NOT NULL DEFAULT 1,
    "unitPrice" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ReservationOption_pkey" PRIMARY KEY ("id")
);

-- 既存 Vehicle レコードに vehicleCode を自動採番で埋める（VH-00001 形式）
WITH numbered AS (
  SELECT
    id,
    'VH-' || LPAD(ROW_NUMBER() OVER (ORDER BY "createdAt", id)::TEXT, 5, '0') AS code
  FROM "Vehicle"
  WHERE "vehicleCode" IS NULL
)
UPDATE "Vehicle"
SET "vehicleCode" = numbered.code
FROM numbered
WHERE "Vehicle".id = numbered.id;

-- vehicleCode を NOT NULL に変更
ALTER TABLE "Vehicle" ALTER COLUMN "vehicleCode" SET NOT NULL;

-- CreateIndex
CREATE UNIQUE INDEX "VehicleClass_classCode_key" ON "VehicleClass"("classCode");

-- CreateIndex
CREATE UNIQUE INDEX "VehicleClass_className_key" ON "VehicleClass"("className");

-- CreateIndex
CREATE UNIQUE INDEX "Reservation_reservationCode_key" ON "Reservation"("reservationCode");

-- CreateIndex
CREATE INDEX "Reservation_status_idx" ON "Reservation"("status");

-- CreateIndex
CREATE INDEX "Reservation_vehicleClassId_idx" ON "Reservation"("vehicleClassId");

-- CreateIndex
CREATE INDEX "Reservation_vehicleId_idx" ON "Reservation"("vehicleId");

-- CreateIndex
CREATE INDEX "Reservation_pickupDate_idx" ON "Reservation"("pickupDate");

-- CreateIndex
CREATE INDEX "Reservation_returnDate_idx" ON "Reservation"("returnDate");

-- CreateIndex
CREATE INDEX "Reservation_pickupOfficeId_idx" ON "Reservation"("pickupOfficeId");

-- CreateIndex
CREATE INDEX "Reservation_returnOfficeId_idx" ON "Reservation"("returnOfficeId");

-- CreateIndex
CREATE INDEX "Reservation_customerName_idx" ON "Reservation"("customerName");

-- CreateIndex
CREATE INDEX "RatePlan_vehicleClassId_idx" ON "RatePlan"("vehicleClassId");

-- CreateIndex
CREATE INDEX "RatePlan_isActive_idx" ON "RatePlan"("isActive");

-- CreateIndex
CREATE INDEX "RatePlan_validFrom_idx" ON "RatePlan"("validFrom");

-- CreateIndex
CREATE UNIQUE INDEX "RateOption_optionName_key" ON "RateOption"("optionName");

-- CreateIndex
CREATE INDEX "ReservationOption_reservationId_idx" ON "ReservationOption"("reservationId");

-- CreateIndex
CREATE INDEX "ReservationOption_optionId_idx" ON "ReservationOption"("optionId");

-- CreateIndex
CREATE UNIQUE INDEX "ReservationOption_reservationId_optionId_key" ON "ReservationOption"("reservationId", "optionId");

-- CreateIndex
CREATE UNIQUE INDEX "Vehicle_vehicleCode_key" ON "Vehicle"("vehicleCode");

-- CreateIndex
CREATE INDEX "Vehicle_vehicleClassId_idx" ON "Vehicle"("vehicleClassId");

-- AddForeignKey
ALTER TABLE "Vehicle" ADD CONSTRAINT "Vehicle_vehicleClassId_fkey" FOREIGN KEY ("vehicleClassId") REFERENCES "VehicleClass"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Reservation" ADD CONSTRAINT "Reservation_vehicleClassId_fkey" FOREIGN KEY ("vehicleClassId") REFERENCES "VehicleClass"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Reservation" ADD CONSTRAINT "Reservation_vehicleId_fkey" FOREIGN KEY ("vehicleId") REFERENCES "Vehicle"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Reservation" ADD CONSTRAINT "Reservation_pickupOfficeId_fkey" FOREIGN KEY ("pickupOfficeId") REFERENCES "Office"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Reservation" ADD CONSTRAINT "Reservation_returnOfficeId_fkey" FOREIGN KEY ("returnOfficeId") REFERENCES "Office"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RatePlan" ADD CONSTRAINT "RatePlan_vehicleClassId_fkey" FOREIGN KEY ("vehicleClassId") REFERENCES "VehicleClass"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ReservationOption" ADD CONSTRAINT "ReservationOption_reservationId_fkey" FOREIGN KEY ("reservationId") REFERENCES "Reservation"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ReservationOption" ADD CONSTRAINT "ReservationOption_optionId_fkey" FOREIGN KEY ("optionId") REFERENCES "RateOption"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
