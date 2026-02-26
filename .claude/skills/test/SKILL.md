---
name: test
description: Vitest テストを実行し結果を分析する
allowed-tools: Read, Grep, Glob, Bash
---

## テスト実行

対象: $ARGUMENTS（未指定の場合は全テスト）

### 手順

1. テストを実行する
   - 引数がある場合: `npx vitest run $ARGUMENTS`
   - 引数がない場合: `npm run test:run`

2. 結果を分析:
   - 失敗テストがあれば、エラーメッセージとスタックトレースを読む
   - 該当するソースコードを確認
   - 失敗原因を特定して報告

3. カバレッジが要求された場合: `npm run test:coverage` を実行

4. 結果サマリーを日本語で報告:
   - テスト数（合格/失敗/スキップ）
   - 失敗テストの原因と修正案
   - カバレッジ情報（要求時）
