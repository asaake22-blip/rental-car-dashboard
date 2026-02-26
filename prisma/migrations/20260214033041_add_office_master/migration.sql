/*
  Warnings:

  - Added the required column `officeName` to the `Sale` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "Sale" ADD COLUMN     "officeName" TEXT NOT NULL;

-- CreateTable
CREATE TABLE "Office" (
    "id" TEXT NOT NULL,
    "officeName" TEXT NOT NULL,
    "area" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Office_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Office_officeName_key" ON "Office"("officeName");

-- CreateIndex
CREATE INDEX "Sale_officeName_idx" ON "Sale"("officeName");
