/**
 * Slack 通知イベントハンドラー
 *
 * ドメインイベントに反応して Slack に通知を送信する。
 * SLACK_WEBHOOK_URL が未設定の場合は自動でスキップ。
 */

import { eventBus } from "../event-bus";
import { sendSlackMessage } from "@/lib/integrations/slack/client";
import {
  reservationApprovedMessage,
  reservationRejectedMessage,
  invoiceIssuedMessage,
  invoicePaidMessage,
} from "@/lib/integrations/slack/templates";

// 予約イベント
eventBus.on("reservation.approved", async ({ reservation }) => {
  await sendSlackMessage(reservationApprovedMessage(reservation));
});

eventBus.on("reservation.rejected", async ({ reservation }) => {
  await sendSlackMessage(reservationRejectedMessage(reservation));
});

// 請求書イベント
eventBus.on("invoice.issued", async ({ invoice }) => {
  await sendSlackMessage(invoiceIssuedMessage(invoice));
});

eventBus.on("invoice.paid", async ({ invoice }) => {
  await sendSlackMessage(invoicePaidMessage(invoice));
});
