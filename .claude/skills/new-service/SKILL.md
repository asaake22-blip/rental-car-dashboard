---
name: new-service
description: 新しい CRUD サービスのスキャフォールド生成
disable-model-invocation: true
argument-hint: "[model-name]"
---

## 新規 CRUD サービス スキャフォールド

モデル名: $ARGUMENTS（例: vehicle, contract）

### 生成ファイル一覧

既存パターン（order-service.ts 等）をテンプレートとして、以下を生成する:

1. **バリデーション**: `src/lib/validations/$ARGUMENTS.ts`
   - `createXxxSchema`, `updateXxxSchema` (Zod v4)
   - 日本語エラーメッセージ

2. **サービス層**: `src/lib/services/$ARGUMENTS-service.ts`
   - `xxxService` オブジェクト export
   - create / update / delete メソッド
   - ValidationError, PermissionError の throw
   - EventBus emit

3. **Server Actions**: `src/app/actions/$ARGUMENTS.ts`
   - `createXxx`, `updateXxx`, `deleteXxx`
   - try-catch → ActionResult

4. **API Route**: `src/app/api/${ARGUMENTS}s/route.ts` + `[id]/route.ts`
   - withAuth ラッパー
   - GET(一覧), POST(作成), GET/:id, PUT/:id, DELETE/:id

5. **イベント型**: `src/lib/events/event-types.ts` に追加
   - `xxx.created`, `xxx.updated`, `xxx.deleted`

6. **テスト**: `src/lib/services/$ARGUMENTS-service.test.ts`
   - `src/__tests__/helpers/setup.ts` のモックパターン準拠

### 手順
1. `src/lib/services/order-service.ts` をテンプレートとして読み込む
2. `src/lib/validations/order.ts` をテンプレートとして読み込む
3. `src/app/actions/order.ts` をテンプレートとして読み込む
4. `src/app/api/orders/route.ts` と `src/app/api/orders/[id]/route.ts` をテンプレートとして読み込む
5. `src/lib/services/order-service.test.ts` をテンプレートとして読み込む
6. モデル名に合わせて変換し、各ファイルを生成
7. `src/lib/events/event-types.ts` の DomainEvent union に型追加
8. テストを実行して PASS を確認
