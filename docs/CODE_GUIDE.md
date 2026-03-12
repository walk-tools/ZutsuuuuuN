# Zutsuu コード解説ドキュメント

## 目次
1. [アーキテクチャ全体像](#アーキテクチャ全体像)
2. [エントリポイント](#エントリポイント)
3. [型定義](#型定義)
4. [データベース層](#データベース層)
5. [カスタムフック](#カスタムフック)
6. [ユーティリティ](#ユーティリティ)
7. [コンポーネント](#コンポーネント)
8. [スタイリング](#スタイリング)
9. [PWA設定](#pwa設定)
10. [データフロー図](#データフロー図)

---

## アーキテクチャ全体像

```
┌─────────────────────────────────────────────────────┐
│                    App.tsx (ルーティング)              │
│  ┌─────────┐ ┌──────────┐ ┌────────┐ ┌───────────┐  │
│  │Calendar │ │Pressure  │ │DayDeta │ │ Settings  │  │
│  │         │ │Alert     │ │il      │ │           │  │
│  └────┬────┘ └────┬─────┘ └───┬────┘ └─────┬─────┘  │
│       │           │           │             │        │
│  ┌────┴────┐ ┌────┴─────┐ ┌──┴───┐   ┌─────┴─────┐  │
│  │useRecor │ │usePressur│ │Record│   │ Analysis  │  │
│  │ds       │ │e         │ │Form  │   │ (5タブ)    │  │
│  └────┬────┘ └────┬─────┘ └──┬───┘   └─────┬─────┘  │
│       │           │          │              │        │
│  ┌────┴───────────┴──────────┴──────────────┴─────┐  │
│  │              Dexie.js (IndexedDB)              │  │
│  └────────────────────────────────────────────────┘  │
│                                                      │
│  外部API:  Open-Meteo (気圧)  │  Nominatim (地名)    │
│            OpenAI (AI分析)                            │
└─────────────────────────────────────────────────────┘
```

### 設計思想
- **完全クライアントサイド**: バックエンドサーバーなし。データはすべて端末のIndexedDBに保存
- **ランニングコスト0円**: 無料API (Open-Meteo, Nominatim) + GitHub Pages ホスティング
- **PWA**: Service Worker でオフライン動作。iPhoneのホーム画面からネイティブアプリのように起動

---

## エントリポイント

### `index.html`
```
HTML → #root → main.tsx → App.tsx
```
- `lang="ja"`, `data-theme="light"` を初期値に設定
- `viewport-fit=cover` でiPhoneのノッチ領域にも対応

### `src/main.tsx`
React 19の `createRoot` でアプリをマウント。`StrictMode` で開発時の問題を検出。

### `src/App.tsx` — アプリのルートコンポーネント

**画面管理**: `view` state で4画面を切り替え。React Routerは使わず、シンプルなstate管理。

```typescript
type View = 'home' | 'detail' | 'settings' | 'analysis'
```

| View | 表示内容 |
|------|---------|
| `home` | PressureAlert + Calendar + FABボタン |
| `detail` | DayDetail（日付詳細） |
| `settings` | Settings（設定画面） |
| `analysis` | Analysis（AI分析） |

**主要なstate**:
- `year`, `month` — カレンダーの表示月
- `selectedDate` — 選択中の日付（`YYYY-MM-DD`）
- `showRecordSheet` — 記録用ボトムシートの表示状態
- `showSaved` — 保存完了チェックマークの表示

**SavedCheck コンポーネント**: 記録保存後に表示される緑のチェックマークアニメーション。1.2秒後に自動消去。

**FAB (Floating Action Button)**: 画面右下の「+」ボタン。タップするとボトムシート（画面下からスライドアップするパネル）が開き、頭痛を記録できる。

**ボトムシート**: オーバーレイ背景 + `animate-slide-up` でネイティブアプリ風の操作感。背景タップで閉じる。

---

## 型定義

### `src/types/index.ts`

```typescript
// 頭痛の種類
type HeadacheType = 'migraine' | 'tension' | 'other'
//                   片頭痛       緊張性       その他

// 程度 (1=軽い 〜 5=激しい)
type Severity = 1 | 2 | 3 | 4 | 5

// 頭痛記録
interface HeadacheRecord {
  id?: number           // Dexie自動採番
  date: string          // "2026-03-10" 形式
  type: HeadacheType
  severity: Severity
  recordedAt: string    // "14:30" (記録時刻)
  pressure?: number     // 1013.2 (記録時の気圧hPa、取得失敗時undefined)
  createdAt: Date
  updatedAt: Date
}

// ユーザー設定 (シングルトン、id=1固定)
interface UserSettings {
  id: 1
  latitude?: number
  longitude?: number
  pressureThreshold: number  // 気圧低下の警戒閾値 (デフォルト6hPa)
  theme: 'light' | 'dark'
  openaiApiKey?: string
  openaiModel?: OpenAIModel
}

// AI分析結果のキャッシュ
interface AnalysisCache {
  id?: number
  type: AnalysisType        // 'correlation' | 'monthly' | ...
  key: string               // "correlation:2026-03-10"
  result: string            // AI応答のJSON文字列
  createdAt: Date
}
```

**OpenAIモデル選択肢**: `OPENAI_MODELS` 配列で6種類のモデルをUI用に定義。

---

## データベース層

### `src/db/index.ts` — Dexie.js によるIndexedDB管理

```typescript
class ZutsuuDB extends Dexie {
  records!: Table<HeadacheRecord>
  settings!: Table<UserSettings>
  analysisCache!: Table<AnalysisCache>
}
```

**バージョン履歴**:

| Version | 変更内容 |
|---------|---------|
| v1 | `records`(++id, date), `settings`(id) の初期スキーマ |
| v2 | `recordedAt`, `pressure` フィールド追加。既存レコードに `createdAt` から `recordedAt` を逆算するマイグレーション |
| v3 | `analysisCache`(++id, type, key) テーブル追加 |

**なぜDexie.js?**
- IndexedDBの低レベルAPIを抽象化し、Promise/awaitで直感的に操作できる
- `useLiveQuery` フックでDBの変更を自動的にUIに反映（リアクティブ）
- スキーマバージョニングとマイグレーションを簡潔に記述できる

---

## カスタムフック

### `src/hooks/useRecords.ts` — 記録のCRUD操作

**クエリ（読み取り）**:
- `useRecordsByMonth(year, month)` — 月ごとの記録取得。`useLiveQuery` でリアクティブ。カレンダー表示で使用
- `useRecordsByDate(date)` — 日付ごとの記録取得。DayDetailで使用

**ミューテーション（書き込み）**:
- `addRecord(date, type, severity)` — 新規記録。記録時刻(`HH:mm`)を自動取得し、`getCurrentPressure()` で気圧も自動保存
- `updateRecord(id, changes)` — 種類・程度の変更。`updatedAt` を自動更新
- `deleteRecord(id)` — 記録削除

**ポイント**: `addRecord` 内で気圧API呼び出しが失敗しても `pressure: undefined` として記録は続行。ユーザー操作をブロックしない設計。

---

### `src/hooks/usePressure.ts` — 気圧データの取得

**データフロー**:
```
getLocation() → 位置情報(lat, lon)
    ↓
Promise.all([
  fetchPressureForecast(lat, lon),  // Open-Meteo API → 7日分の時間別気圧
  reverseGeocode(lat, lon),         // Nominatim → "横浜" 等の地名
])
    ↓
analyzeWeeklyRisk(forecast, threshold) → PressureWeekly
```

**位置情報の取得順序**:
1. IndexedDBに保存済みの緯度経度を優先
2. なければ `navigator.geolocation.getCurrentPosition()` でブラウザから取得
3. 取得成功したらIndexedDBに保存（次回は即座に使える）
4. 取得失敗時は `locationDenied: true` で「位置情報を許可して」のUIを表示

**位置情報のプライバシー**: 小数点2桁に丸めて保存（約1.1km精度）。正確すぎる位置を保存しない。

---

### `src/hooks/useTheme.ts` — テーマ切替

**仕組み**:
1. `document.documentElement.setAttribute('data-theme', ...)` でCSS変数を切替
2. `<meta name="theme-color">` も同時に更新（iPhoneのステータスバー色に反映）
3. IndexedDBに永続化

**初期化**: マウント時にDBから読み込み。DB未設定なら `'light'` がデフォルト。

---

## ユーティリティ

### `src/utils/constants.ts` — 共通定数

```typescript
TYPE_CONFIG  = [⚡片頭痛, 😣緊張性, 🤕その他]  // 種類選択UI用
SEVERITY_LEVELS = [1, 2, 3, 4, 5]               // 程度選択UI用
TYPE_LABEL   = { migraine: '⚡ 片頭痛', ... }   // 表示用ラベル
```

---

### `src/utils/pressure.ts` — 気圧API + リスク分析

**`fetchPressureForecast(lat, lon)`**
- Open-Meteo API から7日間の毎時気圧データを取得
- 無料・APIキー不要・レート制限も緩い

**`reverseGeocode(lat, lon)`**
- Nominatim (OpenStreetMap) で座標 → 地名変換
- city > town > village > county > state の優先順で地名を取得
- User-Agent ヘッダー必須（`Zutsuu-PWA/1.0`）

**`analyzeWeeklyRisk(forecast, threshold)`** — 7日間リスク分析のコアロジック:

```
各日について:
  1. 毎時データから min/max/avg を算出
  2. 6時間スライディングウィンドウで最大気圧低下を検出
  3. 閾値と比較してリスクレベルを判定:
     - maxDrop ≥ threshold     → 🔴 high (警戒)
     - maxDrop ≥ threshold×0.6 → 🟡 medium (注意)
     - それ以外               → 🟢 low (安定)
```

**デフォルト閾値**: 6hPa（6時間で6hPa以上の低下で「警戒」）

**型定義**:
```typescript
interface DailyRisk {
  date, label, weekday, day  // 日付情報
  level: 'low'|'medium'|'high'  // リスクレベル
  maxDrop: number            // 6h窓での最大低下量
  minPressure, maxPressure, avgPressure  // 統計
  dropStartsAt: string|null  // 低下開始時刻
  hourly: HourlyPoint[]      // 24時間の時間別気圧
}
```

---

### `src/utils/currentPressure.ts` — 記録時の現在気圧取得

頭痛記録時に呼ばれる。保存済み位置情報を使い、Open-Meteo APIから今日の毎時データを取得し、現在時刻に最も近い値を返す。失敗時は `undefined`（記録は続行）。

---

### `src/utils/openai.ts` — OpenAI API通信 + キャッシュ

**`callOpenAI(messages)`**:
- IndexedDBからAPIキーとモデル設定を取得
- `temperature: 0.3`（安定した応答のため低め）
- `max_tokens: 2000`
- 401エラー時はユーザーフレンドリーなメッセージを返す

**キャッシュシステム**:
- `getCachedAnalysis(type, key)` — キーに一致するキャッシュを検索。24時間以上経過していたら削除して `null` を返す
- `setCachedAnalysis(type, key, result)` — 同じキーの既存キャッシュを削除してから新規保存
- キーの形式: `"correlation:2026-03-10"`, `"monthly:2026-03"` 等

**なぜキャッシュ?**: OpenAI APIはコストがかかるため、同じ日に同じ分析を繰り返し実行した場合はキャッシュから返す。

---

### `src/utils/analysis.ts` — AI分析ロジック (5種類)

すべての分析関数は同じパターンで動作:
```
1. キャッシュ確認 → ヒットすればそのまま返す
2. IndexedDBからレコード取得
3. データ不足なら固定レスポンスを返す（API呼び出しなし）
4. プロンプト構築 → callOpenAI() → JSON parse → キャッシュ保存
```

| 関数 | 分析内容 | 必要データ数 | キャッシュキー |
|------|---------|------------|-------------|
| `analyzeCorrelation()` | 気圧×頭痛の相関 | 3件〜 | 日付(1日1回) |
| `analyzeMonthlySummary(year, month)` | 月次レポート + 前月比較 | 1件〜 | 年月 |
| `analyzeRiskPrediction(forecast)` | 24h頭痛リスク予測 | 5件〜 | 時間(1h単位) |
| `analyzeTimePattern()` | 時間帯・曜日パターン | 5件〜 | 日付(1日1回) |
| `analyzeTriggers()` | トリガー推論 | 10件〜 | 日付(1日1回) |

**プロンプト設計**: システムプロンプトで「JSON形式で返して」と型定義を与え、`parseJsonResponse()` でマークダウンのコードフェンス(````json`)を除去してからパース。

---

## コンポーネント

### `src/components/Calendar.tsx` — カレンダー表示

月表示のカレンダー。`useRecordsByMonth` でその月の記録を取得し、日付セルに色付きドットを表示。

**ドット表示ルール**:
| 頭痛タイプ | 色 |
|-----------|-----|
| 片頭痛 | purple-500 |
| 緊張性 | amber-500 |
| その他 | slate-400 |

ドットのサイズと透明度は severity (1〜5) に連動:
- severity 1: w-1.5 h-1.5 opacity-50（小さくて薄い）
- severity 5: w-3.5 h-3.5 opacity-100（大きくてはっきり）

1日に複数回記録がある場合は複数のドットが横並びで表示される。

**カレンダーグリッド生成**:
```
cells = [null × 月初の曜日] + [1, 2, 3, ..., 月末日]
         空白セル               日付セル
→ grid-cols-7 で曜日に揃えて表示
```

---

### `src/components/RecordForm.tsx` — 頭痛記録フォーム

3タップで記録完了するシンプルなフォーム:
1. 頭痛の種類を選択（3択ボタン）
2. 程度を選択（1〜5ボタン）
3. 「記録する」ボタン

**選択中のスタイル**: 種類・程度ともに、選択中は `scale-[1.03]` + `shadow-lg` で浮き上がるエフェクト。カラーパレットは種類ごとに異なる。

**保存処理**: `addRecord()` を呼び出し → 記録時刻・気圧を自動付与 → 親コンポーネントの `onSaved` コールバック。

---

### `src/components/DayDetail.tsx` — 日付詳細・編集

日付をタップすると開く詳細画面。

**表示モード**: 記録カードのリスト。タイプ・程度・記録時刻・気圧を表示。カードタップで編集モードに切替。

**編集モード (EditableRecord)**: 種類と程度の変更 + 削除。`updateRecord()` / `deleteRecord()` を呼び出し。

**記録がない日**: 「🌤 頭痛なし — いい調子！」と表示。

**追加記録**: 画面下部の「＋ 記録を追加」ボタンで RecordForm を展開。同日に複数回記録できる。

---

### `src/components/PressureAlert.tsx` — 気圧アラート + 週間予報

ホーム画面上部に表示される気圧情報。3つのUIパーツで構成:

**1. 今日のリスクバナー**
```
🔴 今日は 警戒
現在 1008.5 hPa · 最大 -7.2 hPa
📍 横浜付近の気圧情報
```
リスクレベルに応じてグラデーション背景が変化。

**2. 7日間バーチャート (DayColumn)**

各日のカラム:
```
  月     ← 曜日 (今日は "今日" と紫色で表示)
  10     ← 日付
  ██     ← 縦バー (min〜max範囲。色はリスクレベル)
  🟢     ← リスクアイコン
 -2.1    ← 最大低下量
```

バーの高さは全日の min/max を基準に正規化。タップで時間別グラフが展開。

**3. 時間別グラフ (HourlyChart)**

SVGで描画される24時間気圧折れ線グラフ:
- 紫→ピンクのグラデーションライン
- 面積部分は半透明の紫で塗りつぶし
- 最低気圧地点に赤丸マーカー
- X軸: 0時〜24時、Y軸: min〜max範囲で自動スケール
- 3本のグリッドライン（25%, 50%, 75%位置）

---

### `src/components/Settings.tsx` — 設定画面

**テーマ切替**: トグルスイッチ。ライト ☀️ / ダーク 🌙。`useTheme` フックで即座に切替＆永続化。

**OpenAI API設定**:
- APIキー入力（`type="password"` でマスク表示）
- モデル選択（2×3グリッドで6種類から選択）
- 保存ボタン → IndexedDBに保存 → 「保存しました」フィードバック
- 注記: 「APIキーは端末のIndexedDBにのみ保存され、外部に送信されません」

---

### `src/components/Analysis.tsx` — AI分析 (タブ管理)

5つの分析タブを横スクロールで切替:

| タブ | コンポーネント | 内容 |
|------|-------------|------|
| 📊 気圧相関 | CorrelationView | 気圧感度の判定、片頭痛/緊張性別の分析 |
| 📋 月次 | MonthlySummaryView | 月間集計、前月比較トレンド |
| ⚠ リスク | RiskPredictionView | 24時間の頭痛リスク予測 (%) |
| 🕐 時間帯 | TimePatternView | ピーク時間帯・曜日パターン |
| 🔍 トリガー | TriggerView | トリガー推論、季節性・周期性分析 |

**共通パターン (AnalysisCard)**:
```
初期状態    → 「分析を実行」ボタン
実行中      → スピナー + 「分析中...」
エラー      → エラーメッセージ + 「再試行」
結果表示    → 分析結果カード + 「再分析」ボタン
```

---

## スタイリング

### `src/index.css` — テーマ + グラスモーフィズム + アニメーション

**テーマシステム**: `:root` (ライト) と `[data-theme='dark']` で20個のCSS変数を切替。

| 変数 | ライト | ダーク |
|------|--------|--------|
| `--bg-base` | #f8f6ff (薄紫白) | #1a1625 (深紫黒) |
| `--bg-surface` | #ffffff | #241e35 |
| `--text-primary` | #1e1b2e | #f1f5f9 |
| `--glass-bg` | rgba(255,255,255,0.65) | rgba(255,255,255,0.05) |

**グラスモーフィズム**:
```css
.glass {
  background: var(--glass-bg);
  backdrop-filter: blur(20px);    /* 背景ぼかし */
  border: 1px solid var(--glass-border);
  box-shadow: 0 2px 12px var(--glass-shadow);
}
```
`.glass-strong` はより濃い背景＋強いぼかし(24px)。ヘッダーやボトムシートに使用。

**アニメーション**:
| クラス | 効果 | 用途 |
|--------|------|------|
| `animate-slide-up` | 下から上にスライド | ボトムシート |
| `animate-fade-in` | フェードイン | 画面遷移、オーバーレイ |
| `animate-pop-in` | スケール+フェード(跳ね) | チェックマーク、編集パネル |
| `animate-check` | SVGストローク描画 | 保存完了チェック |
| `animate-pulse-soft` | ゆるい明滅 | スケルトンUI |
| `animate-spin` | 回転 | ローディングスピナー |

**アクセシビリティ**: `prefers-reduced-motion: reduce` でアニメーションを無効化。

**`.pb-safe`**: `env(safe-area-inset-bottom)` でiPhoneのホームバー領域にパディング。

---

## PWA設定

### `vite.config.ts`

`vite-plugin-pwa` が以下を自動生成:
- **Service Worker** (Workbox): `*.js, *.css, *.html, *.png, *.svg` をキャッシュ
- **Web App Manifest**: アプリ名、アイコン、`display: standalone`
- `registerType: 'autoUpdate'` — 新バージョンを検出したら自動更新

### GitHub Pages デプロイ
- `base: '/ZutsuuuuuN/'` — サブパスでの配信に対応
- `.github/workflows/deploy.yml` — push時に自動ビルド＆デプロイ

---

## データフロー図

### 頭痛記録の流れ
```
ユーザー: FAB「+」タップ
    ↓
ボトムシート表示 (RecordForm)
    ↓
種類選択 → 程度選択 → 「記録する」タップ
    ↓
addRecord(date, type, severity)
    ├── 記録時刻: new Date() → "HH:mm"
    ├── 気圧取得: getCurrentPressure() → Open-Meteo API
    └── IndexedDB に保存
    ↓
useLiveQuery が変更を検知 → Calendar のドット自動更新
```

### 気圧アラートの流れ
```
App マウント
    ↓
usePressure() effect 発火
    ↓
getLocation()
    ├── DB にキャッシュあり → そのまま使用
    └── なし → navigator.geolocation → DB に保存
    ↓
Promise.all([
  fetchPressureForecast() → Open-Meteo API → 7日×24h気圧データ,
  reverseGeocode()        → Nominatim     → "横浜" 等,
])
    ↓
analyzeWeeklyRisk() → 各日のリスク判定 (6h窓で最大低下を計算)
    ↓
PressureAlert に weekly データを渡す → UI描画
```

### AI分析の流れ
```
ユーザー: 「分析を実行」タップ
    ↓
getCachedAnalysis(type, key)
    ├── キャッシュあり (24h以内) → 即座に返す
    └── なし ↓
        ↓
db.records → 全記録取得
    ↓
データ件数チェック (3件/5件/10件以上必要)
    ├── 不足 → 固定メッセージ返す (API呼び出しなし)
    └── 十分 ↓
        ↓
プロンプト構築 (system + user)
    ↓
callOpenAI(messages)
    ├── DB から APIキー + モデル取得
    └── fetch → OpenAI Chat Completions API
    ↓
parseJsonResponse() → JSONパース
    ↓
setCachedAnalysis() → IndexedDB にキャッシュ保存
    ↓
UI に結果表示
```
