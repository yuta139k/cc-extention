---
allowed-tools: Read, Bash
---

最新のスクリーンショットを読み込み、内容を分析してください。

ユーザーの質問: $ARGUMENTS

## 手順

### 1. OS を判定する
Bash で `uname -s 2>/dev/null || echo Windows` を実行し、OS を特定する。

### 2. スクリーンショットの保存先と検索パターンを決定する

**macOS の場合:**
- 保存先: `defaults read com.apple.screencapture location 2>/dev/null || echo "$HOME/Desktop"`
- 検索: `ls -t [保存先]/Screenshot*.png [保存先]/スクリーンショット*.png 2>/dev/null | head -1`

**Linux の場合:**
- 保存先: `$HOME/Pictures/Screenshots` または `$HOME/Pictures` または `$HOME/Desktop`
- 検索: `ls -t [保存先]/Screenshot*.png [保存先]/*screenshot*.png 2>/dev/null | head -1`
- 上記で見つからなければ次の保存先を試す

**Windows の場合:**
- 保存先: `$USERPROFILE/Pictures/Screenshots` または `$USERPROFILE/Desktop`
- 検索: `ls -t "[保存先]/Screenshot"*.png "[保存先]/"スクリーンショット*.png 2>/dev/null | head -1`
- Git Bash / WSL 環境を想定。パスは `/c/Users/...` 形式に変換して検索する

### 3. 最新ファイルを特定する
各 OS の検索コマンドを実行し、最も新しいスクリーンショットファイルを1つ取得する。

### 4. ファイルが見つからない場合
以下のメッセージを表示して終了する:
- macOS: 「スクリーンショットが見つかりません（Cmd+Shift+3: 全画面 / Cmd+Shift+4: 範囲選択 / Cmd+Shift+5: メニュー）」
- Windows: 「スクリーンショットが見つかりません（Win+Shift+S または PrintScreen で撮影してください）」
- Linux: 「スクリーンショットが見つかりません（gnome-screenshot や flameshot 等で撮影してください）」

### 5. 画像を読み込む
Read ツールでスクリーンショットファイルを読み込む（Claude は画像ファイルを視覚的に認識できる）

### 6. 質問に回答する
画像を認識したうえで作業を進める。$ARGUMENTS に指示があればそれに従い、なければ画像の内容から必要な作業を判断して進める。

### 7. スクリーンショットを削除する
回答完了後、読み込んだスクリーンショットファイルを Bash で削除する:
- macOS / Linux: `rm [ファイルパス]`
- Windows: `rm [ファイルパス]`（Git Bash）または `del [ファイルパス]`（cmd）

削除したことをユーザーに伝える。
