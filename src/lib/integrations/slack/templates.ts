/**
 * Slack メッセージテンプレート
 *
 * イベント種別に応じた通知メッセージを生成する。
 */

import type { SlackMessage } from "./client";
import type { Reservation, Invoice } from "@/generated/prisma/client";

/** 予約承認通知 */
export function reservationApprovedMessage(reservation: Reservation): SlackMessage {
  return {
    text: `予約が承認されました: ${reservation.reservationCode}`,
    blocks: [
      { type: "header", text: { type: "plain_text", text: "予約承認" } },
      {
        type: "section",
        text: {
          type: "mrkdwn",
          text: [
            `*予約コード:* ${reservation.reservationCode}`,
            `*顧客名:* ${reservation.customerName}`,
            `*出発日:* ${formatDate(reservation.pickupDate)}`,
            `*帰着日:* ${formatDate(reservation.returnDate)}`,
          ].join("\n"),
        },
      },
    ],
  };
}

/** 予約却下通知 */
export function reservationRejectedMessage(reservation: Reservation): SlackMessage {
  return {
    text: `予約が却下されました: ${reservation.reservationCode}`,
    blocks: [
      { type: "header", text: { type: "plain_text", text: "予約却下" } },
      {
        type: "section",
        text: {
          type: "mrkdwn",
          text: [
            `*予約コード:* ${reservation.reservationCode}`,
            `*顧客名:* ${reservation.customerName}`,
            reservation.approvalComment ? `*却下理由:* ${reservation.approvalComment}` : "",
          ].filter(Boolean).join("\n"),
        },
      },
    ],
  };
}

/** 請求書発行通知 */
export function invoiceIssuedMessage(invoice: Invoice): SlackMessage {
  return {
    text: `請求書 ${invoice.invoiceNumber} が発行されました`,
    blocks: [
      { type: "header", text: { type: "plain_text", text: "請求書発行" } },
      {
        type: "section",
        text: {
          type: "mrkdwn",
          text: [
            `*請求書番号:* ${invoice.invoiceNumber}`,
            `*顧客名:* ${invoice.customerName}`,
            `*請求金額:* ¥${invoice.totalAmount.toLocaleString()}`,
            `*支払期日:* ${formatDate(invoice.dueDate)}`,
          ].join("\n"),
        },
      },
    ],
  };
}

/** 請求書入金確認通知 */
export function invoicePaidMessage(invoice: Invoice): SlackMessage {
  return {
    text: `請求書 ${invoice.invoiceNumber} の入金が確認されました`,
    blocks: [
      { type: "header", text: { type: "plain_text", text: "入金確認" } },
      {
        type: "section",
        text: {
          type: "mrkdwn",
          text: [
            `*請求書番号:* ${invoice.invoiceNumber}`,
            `*顧客名:* ${invoice.customerName}`,
            `*請求金額:* ¥${invoice.totalAmount.toLocaleString()}`,
            invoice.paidAt ? `*入金日:* ${formatDate(invoice.paidAt)}` : "",
          ].filter(Boolean).join("\n"),
        },
      },
    ],
  };
}

/** 日付フォーマット（YYYY-MM-DD） */
function formatDate(date: Date): string {
  return date.toISOString().split("T")[0];
}
