# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Response Style
- 挨拶・前置き・段階報告・絵文字禁止。結論ファーストで回答する
- 指摘すべきことは率直に指摘。エビデンスベースで論じる

## Project Overview

cc-extention — Claude Code の開発体験を改善する CLI ツール（コマンド解説 + スクリーンショット連携）
JavaScript のみ（依存なし）。npx でインストール可能。

## Tech Stack

- Language: JavaScript (ES2020+)
- Runtime: Node.js >= 18
- Framework: なし（標準ライブラリのみ）
- Database: なし
- Testing: node --test（Node.js 組み込みテストランナー）
- Package Manager: npm

## Commands

```bash
node bin/cc-ext.js              # ローカルインストール
node bin/cc-ext.js --uninstall  # アンインストール
npx cc-extention                # npm公開後のインストール
```

## Architecture

- `bin/cc-ext.js` — CLI エントリポイント。install/uninstall サブコマンド
- `hooks/explain-command.js` — PreToolUse フック。stdin から JSON を受け取り、リスク判定結果を stdout に出力
- `lib/command-rules.js` — コマンドリスクルール定義。high/medium の2レベル
- `commands/ss.md` — /ss スラッシュコマンド定義

### データフロー

```
Claude Code → PreToolUse → explain-command.js → command-rules.js → JSON応答
```

## Code Conventions

- `'use strict'` を全ファイル先頭に記述
- 外部依存なし。Node.js 標準ライブラリ（fs, path, os）のみ使用
- リスクルールは `lib/command-rules.js` に集約。パターン追加時はここのみ編集
- 日英対応: LANG 環境変数で自動判定。各ルールに `ja` / `en` フィールドを持つ
