# リリース管理ガイド

## 概要

YouTube Shorts Blockerは、GitHub Actionsを使用した自動リリース機能を備えています。mainブランチへのプッシュ時に、拡張機能のZIPファイルが自動的に作成され、GitHubリリースとして公開されます。

## バージョン管理

### セマンティックバージョニング

このプロジェクトは[セマンティックバージョニング](https://semver.org/)に従います：

- **MAJOR** (`X.0.0`) - 互換性のない変更
- **MINOR** (`0.X.0`) - 新機能の追加（下位互換性あり）
- **PATCH** (`0.0.X`) - バグ修正（下位互換性あり）

### バージョン更新コマンド

```bash
# パッチバージョンアップ (バグ修正)
npm run version:patch

# マイナーバージョンアップ (新機能)
npm run version:minor

# メジャーバージョンアップ (破壊的変更)
npm run version:major
```

これらのコマンドは以下を自動実行します：
1. `package.json`のバージョンを更新
2. `manifest.json`のバージョンを同期
3. 次のステップの指示を表示

## リリースプロセス

### 1. バージョンアップ

```bash
# 例: パッチバージョンを更新
npm run version:patch
```

### 2. 変更をコミット

```bash
git add .
git commit -m "Release v1.0.3"
```

### 3. mainブランチにプッシュ

```bash
git push origin main
```

### 4. 自動リリース

GitHub Actionが以下を自動実行：
- バージョンタグの作成
- 拡張機能ZIPファイルの生成
- GitHubリリースの作成
- ZIPファイルのアップロード

## GitHub Action詳細

### トリガー条件

- `main`ブランチへのプッシュ
- `manifest.json`ファイルの変更

### リリース内容

ZIPファイルに含まれるファイル：
- `manifest.json`
- `background.js`
- `content.js`
- `lock_screen.js`
- `popup.html`
- `popup.css`
- `popup.js`
- `icons/` ディレクトリ

### 除外されるファイル

- 開発用ファイル (`package.json`, `scripts/`, etc.)
- ドキュメント (`docs/`, `README.md`, etc.)
- Git関連ファイル (`.github/`, `.gitignore`)

## インストール方法（ユーザー向け）

1. [Releases](https://github.com/check5004/youtube-shorts-blocker/releases)から最新のZIPファイルをダウンロード
2. ZIPファイルを解凍
3. Chromeの拡張機能管理画面を開く
4. 「デベロッパーモード」を有効化
5. 「パッケージ化されていない拡張機能を読み込む」で解凍したフォルダを選択

## トラブルシューティング

### 重複リリースの回避

同じバージョンのタグが既に存在する場合、GitHub Actionは新しいリリースを作成しません。

### マニュアルリリース

必要に応じて、GitHub Actionsページから手動でワークフローを実行できます：
1. Actionsタブを開く
2. "Release Extension"ワークフローを選択
3. "Run workflow"をクリック

### ビルド検証

リリース前に拡張機能の整合性を確認：

```bash
npm run build
```

このコマンドは必要なファイルの存在とmanifest.jsonの妥当性をチェックします。