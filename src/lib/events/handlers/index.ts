/**
 * イベントハンドラー一括登録
 *
 * アプリ起動時にこのファイルを import することで、
 * 全ハンドラーが EventBus に登録される。
 *
 * 新しいハンドラーを追加する際はここに import を追加する。
 */

import "./slack-notifier";
import "./moneyforward-handler";
