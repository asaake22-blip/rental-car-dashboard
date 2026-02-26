"use client";

/**
 * 貸渡証PDF出力ボタン
 *
 * DEPARTED / RETURNED / SETTLED ステータスの予約詳細ページに表示し、
 * ボタン押下で貸渡証PDFを生成・ダウンロードする。
 */

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { FileText } from "lucide-react";
import {
  generateRentalAgreementPdf,
  type RentalAgreementData,
} from "@/lib/pdf/rental-agreement";
import { toast } from "sonner";

interface PrintAgreementButtonProps {
  data: RentalAgreementData;
}

export function PrintAgreementButton({ data }: PrintAgreementButtonProps) {
  const [isGenerating, setIsGenerating] = useState(false);

  const handleClick = async () => {
    try {
      setIsGenerating(true);
      await generateRentalAgreementPdf(data);
      toast.success("貸渡証PDFをダウンロードしました");
    } catch {
      toast.error("PDF生成に失敗しました");
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <Button
      variant="outline"
      size="sm"
      onClick={handleClick}
      disabled={isGenerating}
    >
      <FileText className="mr-1.5 h-4 w-4" />
      {isGenerating ? "生成中..." : "貸渡証PDF"}
    </Button>
  );
}
