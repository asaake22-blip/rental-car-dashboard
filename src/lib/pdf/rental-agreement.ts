"use client";

import { jsPDF } from "jspdf";

export interface RentalAgreementData {
  reservationCode: string;
  customerName: string;
  customerPhone: string;
  customerEmail?: string | null;
  vehicleCode: string;
  vehicleName: string; // maker + modelName
  plateNumber: string | null;
  vehicleClassName: string;
  pickupDate: string;
  returnDate: string;
  actualPickupDate: string;
  pickupOfficeName: string;
  returnOfficeName: string;
  estimatedAmount: number | null;
  departureOdometer: number;
  note?: string | null;
}

/** フォントのキャッシュ（一度取得したら再利用） */
let cachedFontBase64: string | null = null;

/** NotoSansJP フォントを取得して base64 に変換する */
async function loadJapaneseFont(): Promise<string> {
  if (cachedFontBase64) return cachedFontBase64;

  const res = await fetch("/fonts/NotoSansJP-Regular.ttf");
  if (!res.ok) throw new Error("日本語フォントの読み込みに失敗しました");

  const blob = await res.blob();
  const base64 = await new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const dataUrl = reader.result as string;
      resolve(dataUrl.split(",")[1]); // data:... prefix を除去
    };
    reader.onerror = () => reject(new Error("フォントの変換に失敗しました"));
    reader.readAsDataURL(blob);
  });

  cachedFontBase64 = base64;
  return base64;
}

export async function generateRentalAgreementPdf(data: RentalAgreementData): Promise<void> {
  const doc = new jsPDF("p", "mm", "a4");

  // 日本語フォントを登録
  const fontBase64 = await loadJapaneseFont();
  doc.addFileToVFS("NotoSansJP-Regular.ttf", fontBase64);
  doc.addFont("NotoSansJP-Regular.ttf", "NotoSansJP", "normal");
  doc.setFont("NotoSansJP");

  const pageWidth = 210;
  const margin = 20;
  const contentWidth = pageWidth - margin * 2;
  let y = 25;

  // タイトル
  doc.setFontSize(18);
  doc.text("貸渡証", pageWidth / 2, y, { align: "center" });
  y += 12;

  // 予約番号
  doc.setFontSize(11);
  doc.text(`予約番号: ${data.reservationCode}`, margin, y);
  y += 6;
  doc.text(
    `発行日: ${new Date().toLocaleDateString("ja-JP")}`,
    pageWidth - margin,
    y,
    { align: "right" },
  );
  y += 10;

  // 罫線
  doc.setDrawColor(0);
  doc.setLineWidth(0.5);
  doc.line(margin, y, pageWidth - margin, y);
  y += 8;

  // 顧客情報セクション
  doc.setFontSize(12);
  doc.text("お客様情報", margin, y);
  y += 7;
  doc.setFontSize(10);
  const customerLines = [
    `氏名: ${data.customerName}`,
    `電話番号: ${data.customerPhone}`,
  ];
  if (data.customerEmail) customerLines.push(`メール: ${data.customerEmail}`);
  for (const line of customerLines) {
    doc.text(line, margin + 5, y);
    y += 6;
  }
  y += 4;

  // 車両情報セクション
  doc.setFontSize(12);
  doc.text("車両情報", margin, y);
  y += 7;
  doc.setFontSize(10);
  const vehicleLines = [
    `車両コード: ${data.vehicleCode}`,
    `車種: ${data.vehicleName}`,
    `ナンバー: ${data.plateNumber ?? "未登録"}`,
    `車両クラス: ${data.vehicleClassName}`,
    `出発時走行距離: ${data.departureOdometer.toLocaleString("ja-JP")} km`,
  ];
  for (const line of vehicleLines) {
    doc.text(line, margin + 5, y);
    y += 6;
  }
  y += 4;

  // 貸渡条件セクション
  doc.setFontSize(12);
  doc.text("貸渡条件", margin, y);
  y += 7;
  doc.setFontSize(10);
  const conditionLines = [
    `出発予定日時: ${data.pickupDate}`,
    `実出発日時: ${data.actualPickupDate}`,
    `帰着予定日時: ${data.returnDate}`,
    `出発営業所: ${data.pickupOfficeName}`,
    `帰着営業所: ${data.returnOfficeName}`,
  ];
  if (data.estimatedAmount != null) {
    conditionLines.push(
      `見積金額: ¥${data.estimatedAmount.toLocaleString("ja-JP")}`,
    );
  }
  for (const line of conditionLines) {
    doc.text(line, margin + 5, y);
    y += 6;
  }
  y += 4;

  // 備考
  if (data.note) {
    doc.setFontSize(12);
    doc.text("備考", margin, y);
    y += 7;
    doc.setFontSize(10);
    const noteLines = doc.splitTextToSize(data.note, contentWidth - 10);
    doc.text(noteLines, margin + 5, y);
    y += noteLines.length * 5 + 4;
  }

  // 罫線
  y += 5;
  doc.line(margin, y, pageWidth - margin, y);
  y += 15;

  // 署名欄
  doc.setFontSize(10);
  const sigWidth = (contentWidth - 20) / 2;
  doc.text("お客様署名:", margin, y);
  doc.line(margin + 25, y + 1, margin + sigWidth, y + 1);
  doc.text("担当者署名:", margin + sigWidth + 20, y);
  doc.line(margin + sigWidth + 45, y + 1, pageWidth - margin, y + 1);

  // フッター
  y = 280;
  doc.setFontSize(8);
  doc.setTextColor(128);
  doc.text(
    "本書は貸渡契約の証として発行するものです。",
    pageWidth / 2,
    y,
    { align: "center" },
  );

  // ダウンロード
  doc.save(`貸渡証_${data.reservationCode}.pdf`);
}
