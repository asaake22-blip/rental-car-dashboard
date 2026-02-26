"use client";

import { useState } from "react";
import { FileDown, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import {
  exportDashboardToPdf,
  type PdfExportMetadata,
} from "@/lib/pdf/export-dashboard";

interface PdfExportButtonProps {
  fiscalYear: number;
  month: number | null;
  area: string | null;
  applyExclusions: boolean;
}

export function PdfExportButton({
  fiscalYear,
  month,
  area,
  applyExclusions,
}: PdfExportButtonProps) {
  const [isExporting, setIsExporting] = useState(false);

  const handleExport = async () => {
    setIsExporting(true);
    try {
      const metadata: PdfExportMetadata = {
        fiscalYear,
        month,
        area,
        applyExclusions,
      };
      await exportDashboardToPdf("dashboard-print-area", metadata);
      toast.success("PDFをダウンロードしました");
    } catch (error) {
      console.error("PDF出力エラー:", error);
      toast.error("PDF出力に失敗しました");
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <Button
      variant="outline"
      size="sm"
      onClick={handleExport}
      disabled={isExporting}
    >
      {isExporting ? (
        <Loader2 className="animate-spin" />
      ) : (
        <FileDown />
      )}
      {isExporting ? "出力中..." : "PDF出力"}
    </Button>
  );
}
