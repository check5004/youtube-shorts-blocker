# タイマーデバッグ分析

## タイマー停止条件一覧

### 1. 明示的な停止条件

#### 1.1 タブ関連の停止
- **全てのショートタブが閉じられた時** (`handleTabRemoved`, line 232)
  - `timerState.activeShortsTabs.size === 0` の場合に `pauseTimer()` を呼び出す
  - 連続延長カウントもリセットされる

- **ショート以外のページに遷移した時** (`handleTabUpdate`, line 208)
  - YouTube Shorts以外のURLに変更された場合
  - アクティブなショートタブがゼロになると `pauseTimer()` を呼び出す

#### 1.2 設定による停止
- **一時的にタブでタイマーを無効化** (`tempDisableForTab`, line 536)
  - ユーザーが「このタブでタイマーを一時停止」を選択した場合
  - `pauseTimer()` を呼び出してタイマーを停止

#### 1.3 タイマー期限切れ
- **タイマー満了時** (`handleTimerExpired`, line 342)
  - `resetTimer()` を呼び出してタイマーを完全にリセット
  - ロック画面表示またはリダイレクト後に実行

#### 1.4 日次リセット
- **午前4時の自動リセット** (`performDailyReset`, line 488)
  - `resetTimer()` を呼び出してタイマーを完全にリセット
  - 全ての統計情報もリセット

### 2. 条件付き開始（停止状態を維持）
- **タイマーが常に無効化されている場合** (`shouldStartTimer`, line 247)
  - `isTimerAlwaysDisabled` が true の場合
- **本日オフ期間中** (`shouldStartTimer`, line 249)
  - `todayOffUntil` が設定されており、現在時刻がその時刻より前の場合

## 潜在的なエラー条件

### 1. Chrome Storage API エラー
- **ストレージクォータ超過**
  - `chrome.storage.local.set()` が失敗する可能性（lines 124, 139）
  - エラー時の挙動：設定やタイマー状態が保存されない
  - 影響：ブラウザ再起動時に状態がリセットされる

### 2. Chrome Alarms API エラー
- **アラーム作成失敗** (`startTimer`, line 273-281)
  - `chrome.alarms.create()` が失敗する可能性
  - 原因：システムリソース不足、拡張機能の権限問題
  - 影響：タイマーが期限切れにならない

### 3. メモリ関連のエラー
- **Set/Array 変換エラー** (`tempDisableForTab.includes` エラー)
  - **根本原因**: `tempDisableForTab` が Set として保存されているが、popup.js で Array メソッドを使用
  - 発生箇所：
    - background.js line 123: `toSave.tempDisableForTab = Array.from(currentSettings.tempDisableForTab)`
    - popup.js で `status.settings.tempDisableForTab.includes()` を呼び出し時
  - **これが設定リセットの主要因と考えられる**

### 4. 拡張機能のライフサイクルイベント
- **拡張機能の更新** (`chrome.runtime.onInstalled`, line 66)
  - 新しいバージョンがインストールされた時
  - 設定は保持されるが、メモリ上のタイマー状態は失われる

- **Service Worker の停止**
  - Manifest V3では、Service Workerが非アクティブ時に停止される
  - 再起動時に `restoreTimerState()` で復元を試みる（line 143）

### 5. タブ通信エラー
- **コンテンツスクリプトへのメッセージ送信失敗** (line 362)
  - `chrome.tabs.sendMessage()` が失敗する可能性
  - 原因：タブがまだロード中、拡張機能が再読み込みされた
  - 影響：動画が一時停止されない可能性

### 6. 非同期処理の競合状態
- **複数のタブで同時に状態変更**
  - 複数のショートタブが同時に開閉される場合
  - 状態の不整合が発生する可能性

## 推奨される修正

### tempDisableForTab.includes エラーの修正
1. background.js の `getTimerStatus` 関数で、Set を Array に変換してから送信
2. popup.js で Array.isArray() チェックを追加

### エラーハンドリングの追加
1. すべての chrome API 呼び出しに try-catch を追加
2. エラー発生時のフォールバック処理を実装
3. デバッグログを拡充してエラー追跡を容易にする

### 状態の整合性チェック
1. タイマー状態を定期的に検証
2. 不整合が検出された場合は自動修復
3. 重要なイベントをログに記録（既に実装済み：`logDebugEvent`）