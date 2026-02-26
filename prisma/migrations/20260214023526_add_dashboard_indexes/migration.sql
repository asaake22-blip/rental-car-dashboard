-- CreateIndex
CREATE INDEX "Order_approvalStatus_registrationDate_idx" ON "Order"("approvalStatus", "registrationDate");

-- CreateIndex
CREATE INDEX "OrderTarget_fiscalYear_month_idx" ON "OrderTarget"("fiscalYear", "month");

-- CreateIndex
CREATE INDEX "Sale_approvalStatus_recordingDate_idx" ON "Sale"("approvalStatus", "recordingDate");

-- CreateIndex
CREATE INDEX "Sale_approvalStatus_area_idx" ON "Sale"("approvalStatus", "area");

-- CreateIndex
CREATE INDEX "SalesTarget_fiscalYear_month_idx" ON "SalesTarget"("fiscalYear", "month");
