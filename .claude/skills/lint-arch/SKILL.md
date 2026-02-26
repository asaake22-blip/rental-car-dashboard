---
name: lint-arch
description: アーキテクチャ違反を自動検出する
allowed-tools: Read, Grep, Glob, Bash
model: haiku
---

## アーキテクチャ違反検出

以下のパターンを Grep で検出し、違反を報告する:

### 1. Server Actions 内の Prisma 直接呼び出し
- 対象: `src/app/actions/**/*.ts`
- 検出パターン: `prisma.` の直接使用（`from "@/lib/prisma"` の import）

### 2. コンポーネント内の Prisma 呼び出し
- 対象: `src/components/**/*.tsx`
- 検出パターン: `from "@/lib/prisma"` の import
- 注意: `src/app/(dashboard)/**/page.tsx` は Server Component でのデータ取得として許可

### 3. サービス層での Next.js API 使用
- 対象: `src/lib/services/**/*.ts`（`.test.ts` 除外）
- 検出パターン: `redirect`, `revalidatePath`, `cookies`, `headers` の import（`next/` から）

### 4. コンポーネント内の Zod バリデーション
- 対象: `src/components/**/*.tsx`
- 検出パターン: `.safeParse(`, `.parse(` の呼び出し

### 5. サービス層の直接レスポンス
- 対象: `src/lib/services/**/*.ts`（`.test.ts` 除外）
- 検出パターン: `Response.json`, `NextResponse`

### 出力形式
- 違反あり: ファイルパス、行番号、違反ルール名を一覧表示
- 違反なし: 「アーキテクチャ違反なし」と報告
