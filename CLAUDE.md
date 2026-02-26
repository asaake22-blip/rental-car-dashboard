# CLAUDE.md - プロジェクトコンテキスト

## プロジェクト概要

レンタカー事業の営業データ管理・分析・車両管理・予約管理を統合したWebダッシュボードアプリ。
Excelで管理していた営業資料をPostgreSQLにDB化し、BI的な機能（フィルタ・ソート・グラフ）を提供するとともに、車両マスタ・リース契約・点検整備・駐車場マップ・予約～精算の貸渡業務フローを一元管理する。

## 技術スタック

- **フレームワーク**: Next.js 16 (App Router) + TypeScript
- **UI**: shadcn/ui + Tailwind CSS v4
- **ORM**: Prisma 7.4 （`prisma-client` ジェネレーター + `@prisma/adapter-pg`）
- **DB**: PostgreSQL 16 (docker-compose, ポート5433)
- **テスト**: Vitest 4.x（モックベース、DB接続不要）
- **認証**: アプリ内認証は未実装（`src/lib/auth.ts` にスタブ。将来Firebase Auth対応予定）
- **デプロイ**: App Engine Standard（`app.yaml`）+ Cloud SQL（PostgreSQL 16）
- **認証（暫定）**: Basic 認証（`src/middleware.ts`）+ セッション Cookie（60日）

## 重要な技術的注意点

### Prisma v7 の特殊事項
- ジェネレーターは `prisma-client`（旧 `prisma-client-js` ではない）
- 生成先: `src/generated/prisma/`（.gitignore対象）
- インポートパス: `@/generated/prisma/client`（`/client` サフィックス必須）
- PrismaClient には `@prisma/adapter-pg` の Pool アダプターが必須
- `new PrismaClient({})` は不可、必ず `{ adapter }` を渡す

### ポート
- Next.js dev server: デフォルト 3000（ユーザー環境では3001を使用している場合あり）
- PostgreSQL: **5433**（ホスト側の5432は別プロセスが使用中のため）

### 会計年度
- 日本の会計年度に従う: **4月〜翌年3月**
- 目標テーブル・担当営業テーブルの `month` カラム: 4〜12, 1〜3 の値
- `fiscalYear` は年度開始年（例: 2025年度 → fiscalYear=2025, month=4〜3）

### .next キャッシュのリセット（重要）
- **Prisma スキーマ変更後やPrisma Client再生成後は、必ず `.next` を削除して開発サーバーを再起動すること**
- `.next` キャッシュが古い Prisma Client を参照し、`Invalid value for argument 'by'` 等のランタイムエラーが発生する
- 手順:
  1. 開発サーバーを停止
  2. `.next` ディレクトリを削除
  3. `npm run dev` で再起動

### 自動採番パターン
各サービス層で `XX-NNNNN` 形式のコードを自動採番する。手動入力は不要。

| プレフィックス | 対象モデル | 例 |
|-------------|----------|------|
| `AC-` | Account（取引先コード） | `AC-00001` |
| `VH-` | Vehicle（車両コード） | `VH-00001` |
| `LC-` | LeaseContract（契約番号） | `LC-00001` |
| `PM-` | Payment（入金番号） | `PM-00001` |
| `TM-` | PaymentTerminal（端末コード） | `TM-00001` |
| `CL-` | VehicleClass（車両クラスコード） | `CL-00001` |
| `RS-` | Reservation（予約コード） | `RS-00001` |
| `QT-` | Quotation（見積書コード） | `QT-00001` |
| `IV-` | Invoice（請求書番号） | `IV-00001` |

### データに関する注意
- 実データ（Excel）はgit管理外（.gitignore: `*.xlsx`, `*.xls`, `*.csv`）
- 開発にはダミーデータを使用する（`prisma/seed.ts` で生成）
- シードデータはメーカー/車種の正しい紐づけ、自然な法人名・部署名、整合性チェック付き（詳細: `docs/seed-data-overhaul.md`）
- 実データの内容をメモリやドキュメントに記録しないこと

---

## プロジェクト構成

```
src/__tests__/helpers/         # テストヘルパー（fixtures + setup）
src/app/(dashboard)/          # 全ページがサイドバーレイアウト内
src/app/actions/              # Server Actions（薄いラッパー）
src/app/api/                  # REST API Route（サービス層の HTTP ラッパー）
src/components/ui/            # shadcn/ui コンポーネント
src/components/layout/        # AppSidebar 等
src/components/crud/          # CRUD 共通部品（FormField・ConfirmDialog）
src/components/data-table/    # DataTable + ページネーション
src/components/dashboard/     # ダッシュボード（KPIカード・チャート・フィルタ・PDF出力）
src/components/record-detail/ # レコード詳細・編集 共通部品
src/components/parking/       # 駐車場マップ・エディタ（SVG描画・スポット・アノテーション）
src/components/gantt/         # ガントチャート（配車表、8コンポーネント）
src/components/line-items/    # 明細行エディタ・テーブル（見積書/請求書共通）
src/lib/prisma.ts             # DB接続（singleton）
src/lib/auth.ts               # 認証スタブ（将来 Firebase Auth 差し替え）
src/middleware.ts              # Basic 認証（BASIC_AUTH_USER/PASSWORD 環境変数）
src/lib/errors.ts             # カスタムエラークラス
src/lib/services/             # ビジネスロジック（サービス層）
src/lib/validations/          # Zod バリデーションスキーマ
src/lib/api/                  # REST API 共通処理（認証・レスポンス・エラーハンドラー）
src/lib/events/               # イベントシステム（EventBus + ハンドラー）
src/lib/integrations/         # 外部サービスアダプター（Slack・MoneyForward 等）
src/lib/pdf/                  # PDF出力ユーティリティ
src/lib/dashboard/            # ダッシュボード用クエリ・型・チャート設定
src/lib/dashboard/chart-configs/  # グラフ別設定ファイル（色・サイズ・閾値等）
prisma/schema.prisma          # 29モデル + 16 enum
prisma/seed.ts                # ダミーデータ生成（~15,000件、整合性チェック付き）
.claude/agents/               # カスタムエージェント定義
.claude/skills/               # スキル（スラッシュコマンド）定義
app.yaml                      # App Engine デプロイ設定（.gitignore対象、秘密情報含む）
app.yaml.example              # app.yaml テンプレート（秘密情報なし、コミット対象）
.gcloudignore                 # デプロイ除外設定
```

---

## アーキテクチャルール

### レイヤー分離（厳守）

```
フロントエンド → Server Actions → サービス層 → Prisma
外部 API     → REST API Route → サービス層 → Prisma
```

以下のルールに違反している箇所があれば修正する:

- **Server Actions 内で Prisma を直接呼び出さない**（必ずサービス層を経由する）
- **React コンポーネント内にビジネスロジックを書かない**（表示とユーザー操作の受付に徹する）
- **サービス層で Next.js 固有の機能を使わない**（`redirect`, `revalidatePath`, `cookies` 等はServer Actions側で処理する）
- **サービス層から直接レスポンスを返さない**（サービス層はデータまたはエラーを返し、HTTPレスポンスの形式はServer Actions / API Routeが決める）
- **Zod バリデーションをコンポーネント内で実行しない**（サービス層またはServer Actionsで実行する）

### エラーハンドリング方針

- **サービス層**: 業務エラーは明示的なカスタムエラーを throw する（`ValidationError`, `NotFoundError`, `PermissionError`）。Prisma のエラー（一意制約違反等）もサービス層でキャッチし、業務的に意味のあるエラーに変換する
- **Server Actions**: try-catch でサービス層のエラーを捕捉し、`{ success: boolean, data?: T, error?: string }` 形式の統一レスポンスを返す。Server Actions 自身は throw しない
- **API Route**: `handleApiError()` でサービス層エラーを HTTP ステータスに変換（ValidationError→400, NotFoundError→404, PermissionError→403）
- **フロントエンド**: Server Actions の戻り値を確認し、`success: false` の場合は sonner toast でエラー表示

---

## コーディング規約

- 日本語でコメント・ドキュメントを書く
- ファイル名は英語のケバブケース（`sales-reps`, `data-table`）
- コンポーネントはPascalCase（`AppSidebar`, `DataTable`）
- ビジネスロジックは `src/lib/services/` に配置し、Server Actions / API Route の両方から呼び出す

### 命名規則

| 種類 | ファイルパス | export 名の例 |
|------|-------------|---------------|
| サービス | `src/lib/services/invoice-service.ts` | `invoiceService` オブジェクト |
| Zod スキーマ | `src/lib/validations/invoice.ts` | `createInvoiceSchema`, `updateInvoiceSchema` |
| Server Actions | `src/app/actions/invoice.ts` | `createInvoice`, `updateInvoice`, `issueInvoice` |
| カスタムエラー | `src/lib/errors.ts` | `ValidationError`, `NotFoundError`, `PermissionError` |
| API Route | `src/app/api/invoices/route.ts` | `GET`, `POST`（`withAuth` ラッパー） |
| API 共通 | `src/lib/api/auth.ts` | `withAuth`, `authenticateApiRequest` |
| API レスポンス | `src/lib/api/response.ts` | `apiSuccess`, `apiError`, `apiPaginated` |

---

## REST API

### 認証
- API Key（Bearer トークン形式）: `Authorization: Bearer <API_KEY>`
- 環境変数 `API_KEY` で設定（未設定時: 開発環境はスキップ、本番は401）
- `withAuth()` HOF でハンドラーをラップ（**全 API Route に適用必須**）

### セキュリティ・認証アーキテクチャ

ページ表示と API リクエストで認証方式が異なる:

```
ページアクセス:  ブラウザ → middleware（Basic 認証）→ __session Cookie 発行
API（ブラウザ）: fetch({credentials:"include"}) → withAuth（Cookie で認証）
API（外部）:     Authorization: Bearer <API_KEY> → withAuth（トークンで認証）
```

- **Basic 認証 middleware**: `src/middleware.ts` — ページ表示時に認証。`/api/` パスは除外
  - 認証成功で `__session` Cookie（60日有効）を発行
  - 環境変数: `BASIC_AUTH_USER` / `BASIC_AUTH_PASSWORD`（未設定時はスキップ）
- **API 認証（3段フォールバック）**: `src/lib/api/auth.ts`
  1. Bearer トークン（外部 API クライアント向け）
  2. Basic 認証ヘッダー（ブラウザが送信する場合）
  3. `__session` Cookie（middleware で発行されたもの）
- **注意**: URLにBasic認証情報を埋め込むと（`https://user:pass@host/`）、`fetch()` が `Request cannot be constructed from a URL that includes credentials` エラーになる。必ずブラウザのダイアログで入力すること
- **セキュリティヘッダー**: `next.config.ts` で `X-Content-Type-Options`, `X-Frame-Options`, `Referrer-Policy` を設定
- **エラーメッセージ隠蔽**: `handleApiError()` は500エラー時に内部メッセージをログ出力し、クライアントには汎用メッセージを返却

### エンドポイント

| Method | Path | 説明 |
|--------|------|------|
| GET/POST | /api/accounts | 取引先一覧 / 作成 |
| GET/PUT/DELETE | /api/accounts/:id | 取引先詳細 / 更新 / 削除 |
| POST | /api/approvals | 個別承認/却下（予約） |
| POST | /api/approvals/bulk | 一括承認/却下（予約） |
| GET/POST | /api/quotations | 見積書一覧 / 作成（明細同時） |
| GET/PUT/DELETE | /api/quotations/:id | 見積書詳細 / 更新 / 削除 |
| POST | /api/quotations/:id/send | 見積書送付（DRAFT→SENT） |
| POST | /api/quotations/:id/accept | 見積書承諾（SENT→ACCEPTED） |
| POST | /api/quotations/:id/reject | 見積書不成立（SENT→REJECTED） |
| POST | /api/quotations/:id/convert | 見積書→予約変換 |
| GET | /api/invoices | 請求書一覧（ページネーション + フィルタ） |
| POST | /api/invoices | 請求書作成 |
| GET | /api/invoices/:id | 請求書詳細 |
| PUT | /api/invoices/:id | 請求書更新 |
| DELETE | /api/invoices/:id | 請求書キャンセル |
| POST | /api/invoices/:id/issue | 請求書発行（DRAFT→ISSUED） |
| POST | /api/invoices/:id/pay | 入金確認（ISSUED/OVERDUE→PAID） |
| GET | /api/vehicles | 車両一覧 |
| POST | /api/vehicles | 車両作成 |
| GET | /api/vehicles/:id | 車両詳細 |
| PUT | /api/vehicles/:id | 車両更新 |
| DELETE | /api/vehicles/:id | 車両削除 |
| GET | /api/lease-contracts | リース契約一覧 |
| POST | /api/lease-contracts | リース契約作成（ヘッダー + 明細） |
| GET | /api/lease-contracts/:id | リース契約詳細（明細含む） |
| PUT | /api/lease-contracts/:id | リース契約ヘッダー更新 |
| DELETE | /api/lease-contracts/:id | リース契約削除 |
| POST | /api/lease-contracts/:id/terminate | リース契約途中解約 |
| POST | /api/lease-contracts/:id/lines | 契約明細追加 |
| PUT | /api/lease-contracts/:id/lines | 契約明細更新 |
| GET | /api/payments | 入金一覧（ページネーション + フィルタ） |
| POST | /api/payments | 入金作成（消込同時指定可） |
| GET | /api/payments/:id | 入金詳細（消込明細含む） |
| PUT | /api/payments/:id | 入金ヘッダー更新 |
| DELETE | /api/payments/:id | 入金削除（cascade） |
| POST | /api/payments/:id/allocations | 消込追加 |
| PUT | /api/payments/:id/allocations | 消込更新 |
| GET | /api/terminals | 決済端末一覧 |
| POST | /api/terminals | 決済端末作成 |
| GET | /api/terminals/:id | 決済端末詳細 |
| PUT | /api/terminals/:id | 決済端末更新 |
| DELETE | /api/terminals/:id | 決済端末削除 |
| GET | /api/parking/:lotId | 駐車場詳細（スポット・アノテーション含む） |
| GET | /api/reservations | 予約一覧（ページネーション + フィルタ） |
| POST | /api/reservations | 予約作成 |
| GET | /api/reservations/:id | 予約詳細 |
| PUT | /api/reservations/:id | 予約更新 |
| DELETE | /api/reservations/:id | 予約キャンセル |
| POST | /api/reservations/:id/assign | 車両割当 |
| POST | /api/reservations/:id/cancel | 予約キャンセル（POST版） |
| POST | /api/reservations/:id/depart | 出発処理 |
| POST | /api/reservations/:id/return | 帰着処理 |
| POST | /api/reservations/:id/settle | 精算処理 |
| POST | /api/reservations/:id/approve | 承認/却下 |
| GET | /api/dispatch | 配車表データ取得（車両 + 予約） |
| POST | /api/dispatch/batch-update | 予約日程の一括更新 |
| GET | /api/daily-schedule | 業務予定表（出発/帰着予定） |
| POST | /api/invoices/check-overdue | OVERDUE 一括検出 |

### 統一レスポンス形式
```json
{ "success": true, "data": { ... } }
{ "success": false, "error": "メッセージ", "fieldErrors": { ... } }
{ "success": true, "data": [...], "pagination": { "page": 1, "limit": 50, "total": 120, "totalPages": 3 } }
```

---

## イベントシステム・外部連携

### EventBus
- `src/lib/events/event-bus.ts` — シングルトン、fire-and-forget パターン
- `src/lib/events/event-types.ts` — DomainEvent discriminated union 型（41種類）
- `src/lib/events/handlers/index.ts` — 新ハンドラーはここに import 追加

### Slack 連携
- `src/lib/integrations/slack/client.ts` — Incoming Webhook
- 環境変数: `SLACK_WEBHOOK_URL`（未設定時はスキップ）

### MoneyForward 連携
- `src/lib/integrations/moneyforward/client.ts` — 請求書 API クライアント
- `src/lib/events/handlers/moneyforward-handler.ts` — `invoice.issued` イベントで自動連携
- 環境変数: `MONEYFORWARD_API_KEY`, `MONEYFORWARD_BASE_URL`（未設定時はスキップ）
- Invoice モデルの `externalId` / `externalUrl` / `externalStatus` / `syncedAt` で連携状態を管理

### 外部サービス追加手順
1. `src/lib/integrations/<service>/client.ts` — API クライアント作成
2. `src/lib/events/handlers/<service>-handler.ts` — イベントハンドラー作成
3. `src/lib/events/handlers/index.ts` に import 追加
4. `.env` に必要な設定値を追加

---

## テスト方針

Vitest 4.x でモックベースのユニットテストを実施。DB 接続不要で `npm test` で即実行可能。

- **テスト対象**: `src/lib/` 配下（API共通基盤・サービス層・イベント・外部連携・エラー・認証）
- **テストヘルパー**: `src/__tests__/helpers/`（fixtures.ts: ダミーデータ、setup.ts: モックファクトリ）
- **モック戦略**: Prisma・auth・EventBus を `vi.mock` で差し替え、ビジネスロジックのみをテスト
- **Prisma 型モック**: `vi.mock("@/generated/prisma/client", () => ({}))` が必須
- **テスト配置**: 対象ファイルと同ディレクトリに `*.test.ts` を配置
- **カバレッジ**: `npm run test:coverage`（V8ベース）

---

## プランモード

プランドキュメントは**簡潔に**書くこと。以下を厳守する:

- **CLAUDE.md の内容を繰り返さない**（アーキテクチャルール、命名規則、技術スタック等は既知の前提）
- **書くべきこと**: 変更対象ファイル一覧、各ファイルの変更内容（箇条書き）、依存関係・実行順序
- **書かないこと**: 背景説明、既存設計の再説明、「〜に従います」等の宣言文
- **フォーマット**: 箇条書き中心。説明文は1〜2文まで。コード例は必要最小限
- **目安**: 1タスクあたり30行以内

---

## エージェント・スキル

### カスタムエージェント（`.claude/agents/`）

| エージェント | 用途 | モデル |
|-------------|------|--------|
| reviewer | コードレビュー・CLAUDE.md 準拠チェック | sonnet |
| backend | サービス層・API・バリデーション・イベント | opus |
| frontend | ページ・コンポーネント・Server Actions | opus |
| tester | テスト作成・実行・分析 | sonnet |
| db-schema | Prisma スキーマ・マイグレーション・シード | sonnet |

### スキル（`.claude/skills/`）

| コマンド | 用途 |
|---------|------|
| `/review` | コードレビュー |
| `/test` | テスト実行・結果分析 |
| `/build` | 型チェック + ビルド |
| `/db-migrate` | Prisma マイグレーション一式 |
| `/lint-arch` | アーキテクチャ違反検出 |
| `/new-service` | 新CRUD サービスのスキャフォールド |

詳細: `docs/agent-skills-guide.md`

---

## デプロイ（App Engine Standard）

- **GCP プロジェクト**: `<YOUR_PROJECT_ID>`（リージョン: `asia-northeast1`）
- **ランタイム**: Node.js 22（`app.yaml` で指定）
- **DB**: Cloud SQL PostgreSQL 16（インスタンス: `<YOUR_INSTANCE_NAME>`、Unix ソケット接続）
- **ビルド**: `gcp-build` スクリプト（`prisma generate && next build`）が GAE ビルド時に実行される
- **`@prisma/client`** は `dependencies` に配置必須（`devDependencies` だと `npm prune --production` で消える）
- **秘密情報**: `app.yaml` に環境変数として直接記載。`app.yaml` は `.gitignore` 対象
- **デプロイ手順**: `gcloud app deploy app.yaml --project=<YOUR_PROJECT_ID>`
- **マイグレーション**: Cloud SQL Auth Proxy 経由でローカルから `prisma migrate deploy` を実行

詳細: `docs/deployment-gae.md`

---

## セキュリティチェックリスト（GitHub公開前）

- [x] `.env` / `app.yaml` が `.gitignore` に含まれている
- [x] Git 履歴に機密情報が含まれていない
- [x] プロジェクト固有名が汎用化されている
- [x] GCP プロジェクト ID が除去されている（`<YOUR_PROJECT_ID>` に置換）
- [x] `SECURITY.md` が存在する
- [x] `LICENSE` ファイルが存在する
- [x] README.md にセキュリティ注意書きが含まれている
