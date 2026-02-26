---
name: db-migrate
description: Prisma マイグレーションのフルワークフロー実行
allowed-tools: Read, Grep, Glob, Bash
disable-model-invocation: true
argument-hint: "[migration-name]"
---

## Prisma マイグレーションワークフロー

マイグレーション名: $ARGUMENTS

### 手順（順番厳守）

1. 現在の schema.prisma の変更内容を確認
2. マイグレーション作成: `npx prisma migrate dev --name $ARGUMENTS`
3. クライアント再生成: `npx prisma generate`
4. .next キャッシュ削除: `rm -rf .next`（**必須** — 古い Prisma Client キャッシュ回避）
5. 結果を報告:
   - 作成されたマイグレーションファイル
   - スキーマ変更の概要
   - 「dev server の再起動が必要です」と通知
