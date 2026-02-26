-- CreateEnum
CREATE TYPE "Role" AS ENUM ('ADMIN', 'MANAGER', 'MEMBER');

-- CreateEnum
CREATE TYPE "ApprovalStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED');

-- CreateEnum
CREATE TYPE "ImportStatus" AS ENUM ('SUCCESS', 'PARTIAL', 'FAILED');

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "role" "Role" NOT NULL DEFAULT 'MEMBER',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Company" (
    "customerCompanyCode" TEXT NOT NULL,
    "companyNameKana" TEXT NOT NULL,
    "officialName" TEXT NOT NULL,
    "shortName" TEXT NOT NULL,
    "channelCode" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Company_pkey" PRIMARY KEY ("customerCompanyCode")
);

-- CreateTable
CREATE TABLE "Customer" (
    "id" TEXT NOT NULL,
    "area" TEXT,
    "dealer" TEXT,
    "channelCode" TEXT NOT NULL,
    "departmentCode" TEXT NOT NULL,
    "companyCode" TEXT NOT NULL,
    "customerCompanyCode" TEXT NOT NULL,
    "departmentCustomerCode" TEXT NOT NULL,
    "departmentCustomerNameKana" TEXT NOT NULL,
    "departmentCustomerName" TEXT NOT NULL,
    "shortName" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Customer_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DailyReportDealer" (
    "companyCode" TEXT NOT NULL,
    "companyName" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "DailyReportDealer_pkey" PRIMARY KEY ("companyCode")
);

-- CreateTable
CREATE TABLE "SalesRepAssignment" (
    "id" TEXT NOT NULL,
    "customerCode" TEXT NOT NULL,
    "companyCode" TEXT NOT NULL,
    "departmentCode" TEXT NOT NULL,
    "clientName" TEXT NOT NULL,
    "storeName" TEXT NOT NULL,
    "officeName" TEXT NOT NULL,
    "isNewThisTerm" BOOLEAN NOT NULL DEFAULT false,
    "note" TEXT,
    "fiscalYear" INTEGER NOT NULL,
    "month" INTEGER NOT NULL,
    "salesRepName" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SalesRepAssignment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Order" (
    "id" TEXT NOT NULL,
    "area" TEXT,
    "dailyReportDealer" TEXT,
    "departmentCode" TEXT NOT NULL,
    "channel" TEXT NOT NULL,
    "companyCode" TEXT NOT NULL,
    "reservationKey" TEXT NOT NULL,
    "registrationDate" TIMESTAMP(3) NOT NULL,
    "entityType" INTEGER NOT NULL,
    "customerCode" TEXT NOT NULL,
    "borrowerNameKanji" TEXT NOT NULL,
    "borrowerNameKana" TEXT NOT NULL,
    "approvalStatus" "ApprovalStatus" NOT NULL DEFAULT 'PENDING',
    "approvedById" TEXT,
    "approvedAt" TIMESTAMP(3),
    "approvalComment" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Order_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Sale" (
    "id" TEXT NOT NULL,
    "area" TEXT,
    "dailyReportDealer" TEXT,
    "departmentCode" TEXT NOT NULL,
    "channel" TEXT NOT NULL,
    "companyCode" TEXT NOT NULL,
    "reservationKey" TEXT NOT NULL,
    "recordingDate" TIMESTAMP(3) NOT NULL,
    "salesStore" TEXT NOT NULL,
    "entityType" INTEGER NOT NULL,
    "customerCode" TEXT NOT NULL,
    "customerName" TEXT NOT NULL,
    "customerNameKana" TEXT NOT NULL,
    "salesAmount" INTEGER NOT NULL,
    "taxAmount" INTEGER NOT NULL,
    "approvalStatus" "ApprovalStatus" NOT NULL DEFAULT 'PENDING',
    "approvedById" TEXT,
    "approvedAt" TIMESTAMP(3),
    "approvalComment" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Sale_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "OrderTarget" (
    "id" TEXT NOT NULL,
    "clientName" TEXT NOT NULL,
    "storeName" TEXT NOT NULL,
    "officeName" TEXT NOT NULL,
    "fiscalYear" INTEGER NOT NULL,
    "month" INTEGER NOT NULL,
    "targetCount" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "OrderTarget_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SalesTarget" (
    "id" TEXT NOT NULL,
    "clientName" TEXT NOT NULL,
    "storeName" TEXT NOT NULL,
    "officeName" TEXT NOT NULL,
    "fiscalYear" INTEGER NOT NULL,
    "month" INTEGER NOT NULL,
    "targetAmount" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SalesTarget_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ImportHistory" (
    "id" TEXT NOT NULL,
    "fileName" TEXT NOT NULL,
    "sheetName" TEXT,
    "recordCount" INTEGER NOT NULL,
    "status" "ImportStatus" NOT NULL,
    "errorLog" TEXT,
    "importedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "importedById" TEXT,

    CONSTRAINT "ImportHistory_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ExclusionRule" (
    "id" TEXT NOT NULL,
    "ruleType" TEXT NOT NULL,
    "value" TEXT NOT NULL,
    "description" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ExclusionRule_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE INDEX "Customer_companyCode_idx" ON "Customer"("companyCode");

-- CreateIndex
CREATE INDEX "Customer_area_idx" ON "Customer"("area");

-- CreateIndex
CREATE UNIQUE INDEX "Customer_departmentCode_customerCompanyCode_key" ON "Customer"("departmentCode", "customerCompanyCode");

-- CreateIndex
CREATE INDEX "SalesRepAssignment_clientName_storeName_officeName_idx" ON "SalesRepAssignment"("clientName", "storeName", "officeName");

-- CreateIndex
CREATE INDEX "SalesRepAssignment_salesRepName_idx" ON "SalesRepAssignment"("salesRepName");

-- CreateIndex
CREATE UNIQUE INDEX "SalesRepAssignment_customerCode_fiscalYear_month_key" ON "SalesRepAssignment"("customerCode", "fiscalYear", "month");

-- CreateIndex
CREATE UNIQUE INDEX "Order_reservationKey_key" ON "Order"("reservationKey");

-- CreateIndex
CREATE INDEX "Order_registrationDate_idx" ON "Order"("registrationDate");

-- CreateIndex
CREATE INDEX "Order_companyCode_idx" ON "Order"("companyCode");

-- CreateIndex
CREATE INDEX "Order_customerCode_idx" ON "Order"("customerCode");

-- CreateIndex
CREATE INDEX "Order_approvalStatus_idx" ON "Order"("approvalStatus");

-- CreateIndex
CREATE INDEX "Sale_recordingDate_idx" ON "Sale"("recordingDate");

-- CreateIndex
CREATE INDEX "Sale_companyCode_idx" ON "Sale"("companyCode");

-- CreateIndex
CREATE INDEX "Sale_customerCode_idx" ON "Sale"("customerCode");

-- CreateIndex
CREATE INDEX "Sale_approvalStatus_idx" ON "Sale"("approvalStatus");

-- CreateIndex
CREATE INDEX "Sale_salesStore_idx" ON "Sale"("salesStore");

-- CreateIndex
CREATE UNIQUE INDEX "OrderTarget_clientName_storeName_officeName_fiscalYear_mont_key" ON "OrderTarget"("clientName", "storeName", "officeName", "fiscalYear", "month");

-- CreateIndex
CREATE UNIQUE INDEX "SalesTarget_clientName_storeName_officeName_fiscalYear_mont_key" ON "SalesTarget"("clientName", "storeName", "officeName", "fiscalYear", "month");

-- CreateIndex
CREATE UNIQUE INDEX "ExclusionRule_ruleType_value_key" ON "ExclusionRule"("ruleType", "value");
