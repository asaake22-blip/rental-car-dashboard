import html2canvas from "html2canvas-pro";
import { jsPDF } from "jspdf";

export interface PdfExportMetadata {
  fiscalYear: number;
  month: number | null;
  area: string | null;
  applyExclusions: boolean;
}

/**
 * ダッシュボードのキャプチャ対象要素をPDFに変換してダウンロードする
 */
export async function exportDashboardToPdf(
  elementId: string,
  metadata: PdfExportMetadata
): Promise<void> {
  const element = document.getElementById(elementId);
  if (!element) {
    throw new Error("キャプチャ対象の要素が見つかりません");
  }

  // Rechartsのアニメーション完了を待つ
  await new Promise((resolve) => setTimeout(resolve, 500));

  const canvas = await html2canvas(element, {
    scale: 2,
    useCORS: true,
    logging: false,
    backgroundColor: "#ffffff",
    onclone: (_doc, clonedElement) => {
      // html2canvas が SVG 内の <text> を正しくレンダリングするために
      // 計算済みスタイルをインラインで付与する
      const svgTexts = clonedElement.querySelectorAll("svg text");
      svgTexts.forEach((textEl) => {
        const computed = window.getComputedStyle(textEl);
        const s = (textEl as SVGTextElement).style;
        s.fontFamily = computed.fontFamily || "sans-serif";
        s.fontSize = computed.fontSize || "12px";
        s.fill = computed.fill || "#000000";
      });
    },
  });

  // A4横向き
  const pdf = new jsPDF({
    orientation: "landscape",
    unit: "mm",
    format: "a4",
  });

  const pageWidth = pdf.internal.pageSize.getWidth();
  const pageHeight = pdf.internal.pageSize.getHeight();

  // ヘッダー描画
  const headerHeight = drawHeader(pdf, metadata, pageWidth);

  // コンテンツ領域の計算
  const contentMargin = 5;
  const contentTop = headerHeight + 4;
  const contentWidth = pageWidth - contentMargin * 2;
  const contentHeight = pageHeight - contentTop - contentMargin;

  // Canvas画像をPDFに収まるようリサイズして配置
  const canvasAspect = canvas.width / canvas.height;
  const contentAspect = contentWidth / contentHeight;

  let imgWidth: number;
  let imgHeight: number;

  if (canvasAspect > contentAspect) {
    // 横幅基準
    imgWidth = contentWidth;
    imgHeight = contentWidth / canvasAspect;
  } else {
    // 高さ基準
    imgHeight = contentHeight;
    imgWidth = contentHeight * canvasAspect;
  }

  const imgData = canvas.toDataURL("image/png");
  pdf.addImage(imgData, "PNG", contentMargin, contentTop, imgWidth, imgHeight);

  // ファイル名生成 + ダウンロード
  const filename = buildFilename(metadata);
  pdf.save(filename);
}

function drawHeader(
  pdf: jsPDF,
  metadata: PdfExportMetadata,
  pageWidth: number
): number {
  const margin = 5;
  let y = 10;

  // タイトル
  pdf.setFontSize(16);
  pdf.setFont("helvetica", "bold");
  pdf.text("Dashboard Report", margin, y);

  // フィルタ条件
  y += 8;
  pdf.setFontSize(10);
  pdf.setFont("helvetica", "normal");

  const conditions: string[] = [
    `FY${metadata.fiscalYear}`,
    metadata.month ? `Month: ${metadata.month}` : "All Months",
    metadata.area ?? "All Areas",
  ];
  if (metadata.applyExclusions) {
    conditions.push("Exclusions Applied");
  }
  pdf.text(conditions.join("  |  "), margin, y);

  // 出力日時（右寄せ）
  const now = new Date();
  const dateStr = `${now.getFullYear()}/${String(now.getMonth() + 1).padStart(2, "0")}/${String(now.getDate()).padStart(2, "0")} ${String(now.getHours()).padStart(2, "0")}:${String(now.getMinutes()).padStart(2, "0")}`;
  const dateWidth = pdf.getTextWidth(dateStr);
  pdf.text(dateStr, pageWidth - margin - dateWidth, y);

  // 区切り線
  y += 2;
  pdf.setDrawColor(200, 200, 200);
  pdf.line(margin, y, pageWidth - margin, y);

  return y;
}

function buildFilename(metadata: PdfExportMetadata): string {
  const parts = [
    "dashboard",
    `FY${metadata.fiscalYear}`,
    metadata.month ? `${metadata.month}M` : "all",
    metadata.area ?? "all-area",
  ];

  const now = new Date();
  const dateStr = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, "0")}${String(now.getDate()).padStart(2, "0")}`;
  parts.push(dateStr);

  return `${parts.join("_")}.pdf`;
}
