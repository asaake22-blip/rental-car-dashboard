---
name: review
description: コード変更を CLAUDE.md 基準でレビューする
allowed-tools: Read, Grep, Glob, Bash
model: sonnet
---

## コードレビュー

対象: $ARGUMENTS（未指定の場合は `git diff` の変更ファイル）

### 手順

1. 変更されたファイルを特定する
   - 引数がある場合: 指定されたファイル/ディレクトリ
   - 引数がない場合: `git diff --name-only HEAD` の出力

2. 各ファイルを読み、以下をチェック:

   **レイヤー分離**
   - Server Actions 内で Prisma 直接呼び出しがないか
   - コンポーネント内にビジネスロジックがないか
   - サービス層で Next.js 固有機能を使っていないか

   **エラーハンドリング**
   - サービス層: カスタムエラー throw
   - Server Actions: try-catch → `{ success, error }`
   - API Route: `handleApiError()`

   **命名規則**
   - ファイル: ケバブケース
   - コンポーネント: PascalCase
   - サービス: `xxxService` オブジェクト export

   **セキュリティ**
   - インジェクション系リスク
   - 認証チェック漏れ

3. 結果を報告（重大 → 警告 → 提案の優先順）
