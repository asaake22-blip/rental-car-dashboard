/**
 * Slack Incoming Webhook クライアント
 *
 * SLACK_WEBHOOK_URL が未設定の場合はメッセージをスキップ（開発環境用）。
 */

export interface SlackMessage {
  text: string;
  blocks?: SlackBlock[];
}

export interface SlackBlock {
  type: "section" | "divider" | "header";
  text?: { type: "mrkdwn" | "plain_text"; text: string };
}

/**
 * Slack Webhook にメッセージを送信
 *
 * @returns true: 送信成功 or スキップ、false: 送信失敗
 */
export async function sendSlackMessage(message: SlackMessage): Promise<boolean> {
  const webhookUrl = process.env.SLACK_WEBHOOK_URL;

  if (!webhookUrl) {
    // 未設定時は静かにスキップ（開発環境では Slack がなくても動作する）
    return true;
  }

  try {
    const response = await fetch(webhookUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(message),
    });

    if (!response.ok) {
      console.error(`[Slack] Webhook 送信失敗: ${response.status} ${response.statusText}`);
      return false;
    }

    return true;
  } catch (error) {
    console.error("[Slack] Webhook 送信エラー:", error);
    return false;
  }
}
