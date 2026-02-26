/**
 * イベントバス
 *
 * サービス層からイベントを発行し、登録済みハンドラーに通知する。
 * fire-and-forget パターン: ハンドラーのエラーはメイン処理を阻害しない。
 * 将来 Redis Pub/Sub や BullMQ に置き換え可能。
 */

import type { EventType, EventPayload } from "./event-types";

/** イベントハンドラーの型 */
type EventHandler<T extends EventType> = (payload: EventPayload<T>) => Promise<void>;

/** 型安全でないハンドラー（内部用） */
type AnyHandler = (payload: unknown) => Promise<void>;

export class EventBus {
  private handlers = new Map<string, AnyHandler[]>();

  /** ハンドラーを登録 */
  on<T extends EventType>(eventType: T, handler: EventHandler<T>): void {
    const existing = this.handlers.get(eventType) ?? [];
    existing.push(handler as AnyHandler);
    this.handlers.set(eventType, existing);
  }

  /**
   * イベントを発行
   *
   * 登録済みの全ハンドラーを並列実行（Promise.allSettled）。
   * エラーが発生しても他のハンドラーやメイン処理は中断しない。
   */
  async emit<T extends EventType>(eventType: T, payload: EventPayload<T>): Promise<void> {
    const handlers = this.handlers.get(eventType);
    if (!handlers || handlers.length === 0) return;

    const results = await Promise.allSettled(
      handlers.map((handler) => handler(payload)),
    );

    // エラーログ（本番では外部ログサービスに送信）
    for (const result of results) {
      if (result.status === "rejected") {
        console.error(`[EventBus] ${eventType} handler error:`, result.reason);
      }
    }
  }
}

/** シングルトンインスタンス */
export const eventBus = new EventBus();
