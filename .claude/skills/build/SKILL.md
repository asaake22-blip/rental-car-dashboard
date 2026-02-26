---
name: build
description: Next.js プロダクションビルドを実行しエラーを確認する
allowed-tools: Read, Grep, Glob, Bash
---

## ビルドチェック

### 手順

1. TypeScript 型チェック: `npx tsc --noEmit`
2. プロダクションビルド: `npm run build`
3. エラーがあれば:
   - エラーメッセージを解析
   - 該当ファイルを読んで原因を特定
   - 修正案を日本語で報告
4. 成功した場合: ビルド結果サマリーを報告
