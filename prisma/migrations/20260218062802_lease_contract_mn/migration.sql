-- CreateEnum
CREATE TYPE "LesseeType" AS ENUM ('INDIVIDUAL', 'CORPORATE');

-- CreateTable
CREATE TABLE "LeaseContract" (
    "id" TEXT NOT NULL,
    "contractNumber" TEXT NOT NULL,
    "externalId" TEXT,
    "lesseeType" "LesseeType" NOT NULL,
    "lesseeCompanyCode" TEXT,
    "lesseeName" TEXT NOT NULL,
    "startDate" TIMESTAMP(3) NOT NULL,
    "endDate" TIMESTAMP(3) NOT NULL,
    "status" "LeaseStatus" NOT NULL DEFAULT 'ACTIVE',
    "note" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "LeaseContract_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LeaseContractLine" (
    "id" TEXT NOT NULL,
    "contractId" TEXT NOT NULL,
    "vehicleId" TEXT NOT NULL,
    "startDate" TIMESTAMP(3) NOT NULL,
    "endDate" TIMESTAMP(3) NOT NULL,
    "monthlyAmount" INTEGER NOT NULL,
    "note" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "LeaseContractLine_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "LeaseContract_contractNumber_key" ON "LeaseContract"("contractNumber");

-- CreateIndex
CREATE UNIQUE INDEX "LeaseContract_externalId_key" ON "LeaseContract"("externalId");

-- CreateIndex
CREATE INDEX "LeaseContract_status_idx" ON "LeaseContract"("status");

-- CreateIndex
CREATE INDEX "LeaseContract_endDate_idx" ON "LeaseContract"("endDate");

-- CreateIndex
CREATE INDEX "LeaseContract_lesseeName_idx" ON "LeaseContract"("lesseeName");

-- CreateIndex
CREATE INDEX "LeaseContractLine_contractId_idx" ON "LeaseContractLine"("contractId");

-- CreateIndex
CREATE INDEX "LeaseContractLine_vehicleId_idx" ON "LeaseContractLine"("vehicleId");

-- CreateIndex
CREATE UNIQUE INDEX "LeaseContractLine_contractId_vehicleId_key" ON "LeaseContractLine"("contractId", "vehicleId");

-- データ移行: VehicleLease → LeaseContract + LeaseContractLine
-- 契約ヘッダーを生成（1レコード=1契約として移行）
INSERT INTO "LeaseContract" ("id", "contractNumber", "lesseeType", "lesseeCompanyCode", "lesseeName", "startDate", "endDate", "status", "note", "createdAt", "updatedAt")
SELECT
  "id",
  'LC-' || LPAD(ROW_NUMBER() OVER (ORDER BY "createdAt")::TEXT, 5, '0'),
  CASE WHEN "lesseeType" = 1 THEN 'INDIVIDUAL'::"LesseeType" ELSE 'CORPORATE'::"LesseeType" END,
  "lesseeCompanyCode",
  "lesseeName",
  "startDate",
  "endDate",
  "status"::"LeaseStatus",
  "note",
  "createdAt",
  "updatedAt"
FROM "VehicleLease";

-- 契約明細を生成（既存レコードを1:1で明細に変換）
INSERT INTO "LeaseContractLine" ("id", "contractId", "vehicleId", "startDate", "endDate", "monthlyAmount", "note", "createdAt", "updatedAt")
SELECT
  'cl_' || gen_random_uuid()::TEXT,
  "id",
  "vehicleId",
  "startDate",
  "endDate",
  "monthlyAmount",
  NULL,
  "createdAt",
  "updatedAt"
FROM "VehicleLease";

-- DropForeignKey
ALTER TABLE "VehicleLease" DROP CONSTRAINT "VehicleLease_vehicleId_fkey";

-- DropIndex
DROP INDEX "VehicleLease_endDate_idx";

-- DropIndex
DROP INDEX "VehicleLease_status_idx";

-- DropIndex
DROP INDEX "VehicleLease_vehicleId_idx";

-- DropTable
DROP TABLE "VehicleLease";

-- AddForeignKey
ALTER TABLE "LeaseContractLine" ADD CONSTRAINT "LeaseContractLine_contractId_fkey" FOREIGN KEY ("contractId") REFERENCES "LeaseContract"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LeaseContractLine" ADD CONSTRAINT "LeaseContractLine_vehicleId_fkey" FOREIGN KEY ("vehicleId") REFERENCES "Vehicle"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
