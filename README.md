# レンタカー営業管理ダッシュボード

レンタカー事業の営業データ管理・分析・車両管理・予約管理を統合したWebダッシュボードアプリケーション。
見積書 → 予約 → 請求書 → 入金の一気通貫フローを提供し、車両マスタ・リース契約・点検整備・駐車場マップ・配車表を一元管理する。

**このプロジェクトはポートフォリオ用のデモアプリケーションです。** 実際の業務データは含まれておらず、すべてダミーデータ（約15,000件）で動作します。

## 技術スタック

| レイヤー | 技術 | バージョン |
|---|---|---|
| フレームワーク | Next.js (App Router) | 16.1.6 |
| 言語 | TypeScript | 5.x |
| UI | shadcn/ui + Tailwind CSS | v4 |
| チャート | Recharts | 3.x |
| テーブル | TanStack Table | 8.x |
| ORM | Prisma | 7.4.0 |
| DB | PostgreSQL | 16 (Alpine) |
| Excel/CSV | SheetJS (xlsx) | 0.18.x |
| バリデーション | Zod | 4.x |
| PDF出力 | html2canvas-pro + jsPDF | — |
| toast 通知 | sonner | — |
| テスト | Vitest | 4.x |

## 📝 このリポジトリについて

このプロジェクトは**ポートフォリオ用のデモアプリケーション**です。実際の業務データは含まれておらず、すべてダミーデータで動作します。

- 認証機能のコードは実装されていますが、デモ環境では無効化されています
- 本番環境で使用する場合は、[SECURITY.md](SECURITY.md) を参照してください

## 🔒 セキュリティに関する注意

**本番環境にデプロイする場合は、以下を実施してください：**

1. **認証の有効化**
   - `.env` に `BASIC_AUTH_USER` / `BASIC_AUTH_PASSWORD` を設定
   - `.env` に `API_KEY` をランダムな文字列（64文字以上推奨）で設定

2. **データベース認証情報の変更**
   - `.env` の `DATABASE_URL` に含まれるパスワードを変更
   - デフォルトのパスワード（`rental_db_password`）は開発用です

3. **機密情報の管理**
   - `.env` ファイルは絶対に公開リポジトリにコミットしないでください
   - Git 履歴に認証情報が含まれていないか確認してください

詳細は [SECURITY.md](SECURITY.md) を参照してください。

## セットアップ

### 前提条件

- Node.js v20+
- Docker / Docker Compose
- npm

### 手順

```bash
# 1. 依存パッケージのインストール
npm install

# 2. 環境変数の設定
cp .env.example .env
# 必要に応じて .env を編集（デフォルトのままでOK）

# 3. PostgreSQLの起動
docker-compose up -d

# 4. DBマイグレーション
npx prisma migrate dev

# 5. Prismaクライアント生成
npx prisma generate

# 6. シードデータ投入（ダミーデータ）
npm run db:seed

# 7. 開発サーバーの起動
npm run dev
```

ブラウザで http://localhost:3000 にアクセス。

### よく使うコマンド

```bash
# 開発サーバー起動
npm run dev

# PostgreSQL起動 / 停止
docker-compose up -d
docker-compose down

# DBスキーマ変更後のマイグレーション
npx prisma migrate dev --name <変更名>

# Prisma Studio（DBのGUI閲覧）
npx prisma studio

# テスト実行
npm test              # ウォッチモード
npm run test:run      # 1回実行（CI用）
npm run test:coverage # カバレッジ付き

# ビルド確認
npm run build
```

## プロジェクト構成

```
rental-car/
├── src/
│   ├── app/
│   │   ├── layout.tsx                # ルートレイアウト
│   │   ├── (dashboard)/              # ダッシュボードルートグループ
│   │   │   ├── layout.tsx            # サイドバー付きレイアウト
│   │   │   ├── page.tsx              # トップ：ダッシュボード + PDF出力
│   │   │   ├── accounts/             # 取引先一覧 + 詳細 + 編集
│   │   │   ├── quotations/           # 見積書一覧 + 詳細 + 明細行 + ステータス操作
│   │   │   ├── invoices/             # 請求書一覧 + 詳細 + 明細行 + 消込情報
│   │   │   ├── targets/              # 目標管理
│   │   │   ├── masters/              # マスタ管理
│   │   │   ├── import/               # データインポート
│   │   │   ├── approvals/            # 承認一覧 + 一括承認
│   │   │   ├── vehicles/             # 車両一覧 + 詳細 + 編集
│   │   │   ├── lease-contracts/       # リース契約一覧 + 詳細 + 明細管理
│   │   │   ├── inspections/          # 点検・整備一覧 + 詳細
│   │   │   ├── parking/              # 駐車場一覧 + マップ + エディタ
│   │   │   ├── payments/             # 入金管理 + 消込（請求書紐づけ）
│   │   │   ├── terminals/            # 決済端末一覧 + 詳細
│   │   │   ├── offices/              # 営業所一覧 + 詳細 + 編集
│   │   │   ├── reservations/         # 予約一覧 + 詳細 + 編集 + ステータス操作
│   │   │   ├── dispatch/             # 配車表（ガントチャート）
│   │   │   ├── vehicle-classes/      # 車両クラス一覧
│   │   │   ├── rate-plans/           # 料金プラン一覧
│   │   │   └── daily-schedule/       # 業務予定表
│   │   ├── api/                      # REST API
│   │   │   ├── accounts/             # 取引先 API
│   │   │   ├── quotations/           # 見積書 API（CRUD + ステータス操作）
│   │   │   ├── approvals/            # 承認 API
│   │   │   ├── vehicles/             # 車両 API
│   │   │   ├── lease-contracts/       # リース契約 API
│   │   │   ├── payments/             # 入金 API（消込含む）
│   │   │   ├── terminals/            # 決済端末 API
│   │   │   ├── parking/              # 駐車場 API
│   │   │   ├── reservations/         # 予約 API（CRUD + ステータス操作）
│   │   │   ├── dispatch/             # 配車表 API
│   │   │   ├── daily-schedule/       # 業務予定表 API
│   │   │   └── import/               # インポート API
│   │   └── actions/                  # Server Actions（CRUD・承認・予約操作）
│   ├── components/
│   │   ├── ui/                       # shadcn/ui コンポーネント
│   │   ├── crud/                     # CRUD 共通部品
│   │   ├── data-table/               # DataTable + ページネーション
│   │   ├── dashboard/                # ダッシュボード（KPI・チャート・フィルタ・PDF出力）
│   │   ├── record-detail/            # レコード詳細・編集 共通部品
│   │   ├── parking/                  # 駐車場マップ・エディタ（SVG描画・スポット・アノテーション）
│   │   ├── gantt/                    # ガントチャート（配車表、8コンポーネント）
│   │   ├── line-items/               # 明細行エディタ・テーブル（見積書/請求書共通）
│   │   └── layout/                   # サイドバー等
│   ├── __tests__/helpers/            # テストヘルパー・フィクスチャ
│   ├── lib/
│   │   ├── prisma.ts                 # Prismaクライアント
│   │   ├── auth.ts                   # 認証スタブ
│   │   ├── errors.ts                 # カスタムエラークラス
│   │   ├── api/                      # REST API 共通基盤
│   │   ├── services/                 # サービス層（ビジネスロジック）
│   │   ├── validations/              # Zod バリデーションスキーマ
│   │   ├── events/                   # イベントシステム（EventBus）
│   │   ├── integrations/             # 外部サービス連携（Slack等）
│   │   ├── pdf/                      # PDF出力ユーティリティ
│   │   ├── data-table/               # ページネーション共通ロジック
│   │   ├── dashboard/                # ダッシュボード用クエリ・設定
│   │   └── import/                   # Excel/CSVインポートロジック
│   └── generated/prisma/             # Prisma生成コード（git管理外）
├── public/
│   └── fonts/                        # 日本語フォント（NotoSansJP、貸渡証PDF用）
├── prisma/
│   ├── schema.prisma                 # DBスキーマ（29モデル + 16 enum）
│   └── migrations/                   # マイグレーション履歴
├── .claude/
│   ├── agents/                       # カスタムエージェント定義
│   └── skills/                       # スキル（スラッシュコマンド）定義
├── docs/                             # プロジェクトドキュメント
├── vitest.config.ts                  # テスト設定
├── docker-compose.yml                # ローカル開発用PostgreSQL
└── package.json
```

## 実装済み機能

### 基盤・インフラ
- Next.js 16 (App Router) + TypeScript + Tailwind CSS v4 + shadcn/ui
- docker-compose（PostgreSQL 16、ポート5433）
- Prisma 7 スキーマ（29モデル + 16 enum）+ マイグレーション
- サイドバー付きダッシュボードレイアウト
- 認証スタブ（将来 Firebase Auth 対応）

### データ管理
- faker.js によるダミーデータ生成（業務リアリティ重視、~15,000件）
- Excel/CSV インポート（SheetJS + プレビュー + バッチ挿入）
- TanStack Table + サーバーサイドページネーション（URLパラメータ駆動）
- 検索（デバウンス300ms）、ソート、表示件数切替、ページ番号直接入力

### ダッシュボード
- KPIカード（未入金額・消込率・本日出発/帰着予定・現在貸出中・車両稼働率 等）
- Recharts チャート（月別推移・エリア別構成・営業所別達成率 等）
- フィルタ（会計年度・月・エリア・除外条件トグル）
- **PDF出力**（html2canvas-pro + jsPDF、A4横向き、フィルタ条件付きヘッダー）

### 取引先管理（Phase 11）
- **取引先マスタ CRUD**（取引先コード自動採番 `AC-00001`、法人/個人区分）
- 支払条件管理（締日・支払月オフセット・支払日 → dueDate 自動計算）
- MoneyForward パートナー連携（`mfPartnerId` / `mfPartnerCode`）
- 取引先詳細に関連見積書・請求書・予約一覧

### 見積書管理（Phase 11）
- **見積書 CRUD**（見積書コード自動採番 `QT-00001`、ステータス遷移: 下書き→送付→承諾/不成立）
- **明細行エディタ**（品名・数量・単価・税率 → 金額自動計算、行追加/削除）
- 取引先選択 → 宛名自動セット
- 承諾済み見積書 → 予約に自動変換（車両クラス・日程・営業所を引き継ぎ）

### 請求書管理（Phase 10-11）
- **請求書 CRUD**（請求書番号自動採番 `IV-00001`、ステータス: 下書き→発行→入金済/延滞）
- **明細行エディタ**（見積書と同じ共通コンポーネント）
- 取引先選択 + 消込情報セクション（入金リンク・消込金額・残額サマリ）
- MoneyForward 請求書連携（`invoice.issued` イベントで自動連携）

### 入金管理・決済端末
- **入金管理**（N:N 消込構造 — 1入金→複数予約/請求書消込）
  - 自動採番（PM-00001）、7種の決済カテゴリ
  - 消込ステータス自動計算（未消込 / 一部消込 / 全額消込）
  - 一括消込機能（予約選択時に関連請求書をセレクト可能）
- **決済端末管理**（端末台帳 + 入金取引との紐付け、自動採番 TM-00001）

### 車両管理
- **車両マスタ CRUD**（車両コード自動採番 `VH-00001`・車種・ステータス・営業所紐付け）
- **リース契約管理 M:N**（1契約に複数車両、1車両が複数契約に紐づく）
  - 契約番号自動採番 `LC-00001`、明細管理、途中解約時に車両ステータス自動復元
- **点検・整備管理**（車検・法定点検・オイル交換等）
- **営業所マスタ CRUD**

### 駐車場マップ・エディタ
- **SVG ベースの駐車場マップ表示**（駐車枠・車両割当状況を可視化）
- **インタラクティブエディタ**（ドラッグ移動・リサイズ・回転・削除）
- **アノテーション機能**（外形・道路・建物・入口・出口・ラベル・区切り線の7種類）

### 予約管理・配車表
- **予約管理 CRUD**（予約コード自動採番 `RS-00001`、ステータス遷移: 予約→車両割当→出発→帰着→精算）
  - 車両クラス + 料金プラン + 料金計算エンジン（時間制/日数制/泊数制 + 免責補償 + オプション）
  - 精算時に Payment 自動作成
- **配車表（ガントチャート）**（SVG ベース、月/3か月/6か月/3日間の4表示モード、ドラッグ編集）
- **業務予定表**（日別の出発予定・帰着予定一覧）
- **貸渡証PDF**（jsPDF + NotoSansJP 日本語フォント対応、A4 縦）

### REST API・外部連携
- REST API（取引先・見積書・請求書・入金・車両・リース契約・予約・配車表等の全エンドポイント、API Key 認証、統一レスポンス形式）
- イベントシステム（EventBus + DomainEvent 41種類、fire-and-forget パターン）
- Slack 連携（Incoming Webhook、未設定時スキップ）
- MoneyForward 連携（請求書 API + パートナー連携）

### テスト・品質管理
- Vitest ユニットテスト（301テスト、モックベースでDB接続不要）
- カスタムエージェント5種 + スキル6種（コードレビュー・テスト・ビルド・アーキテクチャ違反検出等）

## データベース

### テーブル一覧（29モデル + 16 enum）

| カテゴリ | モデル名 | 概要 |
|---|---|---|
| ユーザー | User | ユーザー管理（将来の認証用） |
| 取引先 | Account | 取引先マスタ（法人/個人、支払条件、MF連携） |
| マスタ | Company | 会社マスタ（レガシー） |
| マスタ | Customer | 顧客マスタ（レガシー） |
| マスタ | DailyReportDealer | 日報ディーラー |
| マスタ | SalesRepAssignment | 担当営業（月別正規化済み） |
| マスタ | Office | 営業所マスタ |
| 見積 | Quotation | 見積書（ステータス遷移・予約変換） |
| 見積 | QuotationLine | 見積明細行 |
| 請求 | Invoice | 請求書（ステータス遷移・MF連携） |
| 請求 | InvoiceLine | 請求明細行 |
| 目標 | OrderTarget | 受注目標（月別正規化済み） |
| 目標 | SalesTarget | 売上目標（月別正規化済み） |
| 車両 | Vehicle | 車両マスタ（自動採番 `VH-NNNNN`） |
| 車両 | VehicleClass | 車両クラス（自動採番 `CL-NNNNN`） |
| リース | LeaseContract | リース契約ヘッダー |
| リース | LeaseContractLine | リース契約明細（M:N 中間テーブル） |
| 車両 | VehicleInspection | 点検・整備記録 |
| 駐車場 | ParkingLot | 駐車場（キャンバスサイズ・アノテーション JSON） |
| 駐車場 | ParkingSpot | 駐車枠（座標・サイズ・回転・車両割当） |
| 入金 | Payment | 入金データ（自動採番 `PM-NNNNN`・消込ステータス） |
| 入金 | PaymentAllocation | 消込明細（入金⇔予約/請求書 N:N） |
| 入金 | PaymentTerminal | 決済端末台帳 |
| 予約 | Reservation | 予約データ（自動採番 `RS-NNNNN`・ステータス遷移） |
| 予約 | RatePlan | 料金プラン |
| 予約 | RateOption | レンタルオプション |
| 予約 | ReservationOption | 予約オプション中間テーブル |
| 管理 | ImportHistory | インポート履歴 |
| 管理 | ExclusionRule | 除外条件 |

詳細なスキーマは [prisma/schema.prisma](prisma/schema.prisma) を参照。

## 認証・セキュリティ

### Web UI（暫定 Basic 認証）
- アプリ内認証は未実装（`src/lib/auth.ts` にスタブ。将来 Firebase Auth 対応予定）
- デプロイ環境では **Basic 認証**（`src/middleware.ts`）で保護
  - 環境変数 `BASIC_AUTH_USER` / `BASIC_AUTH_PASSWORD` で制御
  - 未設定時はスキップ（ローカル開発に影響なし）
  - 認証成功時に `__session` Cookie（60日有効）を発行
  - ブラウザ内の `fetch()` は Cookie 経由で API 認証される

### REST API（3段フォールバック認証）
1. **Bearer トークン**: `Authorization: Bearer <API_KEY>`（外部 API クライアント向け）
2. **Basic 認証ヘッダー**: ブラウザが送信する場合に受け入れ
3. **セッション Cookie**: middleware で発行された `__session` Cookie

全 API Route が `withAuth()` で保護済み。

### セキュリティ
- `next.config.ts` で `X-Content-Type-Options`, `X-Frame-Options`, `Referrer-Policy` 等を設定
- 500 エラー時は内部情報を隠蔽し汎用メッセージを返却（情報漏洩防止）

## デプロイ（App Engine Standard）

GAE Standard 環境 (Node.js 22) + Cloud SQL (PostgreSQL 16) でデプロイ。

### 前提条件
- GCP プロジェクト（App Engine + Cloud SQL インスタンス作成済み）
- `gcloud` CLI インストール・認証済み
- Cloud SQL Auth Proxy（マイグレーション実行時に使用）

### デプロイ手順

```bash
# 1. app.yaml をテンプレートから作成し、秘密情報を記入
cp app.yaml.example app.yaml
# app.yaml を編集: DATABASE_URL, API_KEY, BASIC_AUTH_USER, BASIC_AUTH_PASSWORD

# 2. デプロイ
gcloud app deploy app.yaml --project=<PROJECT_ID>
```

### DB マイグレーション（Cloud SQL Auth Proxy 経由）

```bash
# 1. Auth Proxy 起動（別ターミナル）
cloud-sql-proxy <PROJECT_ID>:<REGION>:<INSTANCE> --port=5434

# 2. マイグレーション実行
DATABASE_URL="postgresql://USER:PW@localhost:5434/DB" npx prisma migrate deploy

# 3. シードデータ投入（初回のみ）
DATABASE_URL="postgresql://USER:PW@localhost:5434/DB" npm run db:seed
```

### GAE ビルドプロセス

GAE は以下の順序でビルドする:
1. `npm install`（devDependencies 含む）
2. `gcp-build` スクリプト実行（`prisma generate && next build`）
3. `npm prune --production`（devDependencies 削除）
4. `npm start`（`next start`）

**重要**: `@prisma/client` は `dependencies` に配置必須（`devDependencies` だと prune で消える）

### 環境変数

| 変数名 | 必須 | 説明 |
|--------|------|------|
| `DATABASE_URL` | 必須 | Cloud SQL 接続文字列（Unix ソケット形式） |
| `API_KEY` | 必須（本番） | REST API 認証キー（Bearer トークン） |
| `BASIC_AUTH_USER` | 必須（本番） | Basic 認証ユーザー名 |
| `BASIC_AUTH_PASSWORD` | 必須（本番） | Basic 認証パスワード |
| `SLACK_WEBHOOK_URL` | 任意 | Slack 通知（Incoming Webhook URL） |
| `MONEYFORWARD_API_KEY` | 任意 | MF 請求書 API キー |
| `MONEYFORWARD_BASE_URL` | 任意 | MF API ベース URL |
| `NEXT_PUBLIC_MF_BASE_URL` | 任意 | MF 画面リンク用 URL |

### 秘密情報の管理

- `app.yaml` に環境変数として直接記載（`.gitignore` 対象）
- `app.yaml.example` をテンプレートとしてコミット（秘密情報なし）

詳細: [docs/deployment-gae.md](docs/deployment-gae.md)

