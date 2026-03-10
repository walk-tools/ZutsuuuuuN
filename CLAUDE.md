# Zutsuu - 頭痛管理PWAアプリ

## プロジェクト概要
片頭痛・緊張性頭痛を持つユーザー向けの個人用頭痛管理アプリ。
iPhoneのホーム画面からネイティブアプリのように使えるPWA。

## ユーザーの頭痛タイプ
- **片頭痛**: 気圧変化がトリガー
- **緊張性頭痛**: 疲労・緊張がトリガー

## 技術スタック
- **フレームワーク**: React 19 + TypeScript (Vite 7)
- **スタイリング**: Tailwind CSS v4 (@tailwindcss/vite)
- **データ保存**: IndexedDB (Dexie.js v4)
- **気圧データ**: Open-Meteo API (無料・APIキー不要)
- **逆ジオコーディング**: Nominatim / OpenStreetMap (無料)
- **AI分析**: OpenAI API (ユーザーがAPIキーを設定)
- **ホスティング**: GitHub Pages (無料・未デプロイ)
- **PWA**: vite-plugin-pwa

## コスト制約
- ランニングコスト: ゼロ（サーバーレス、無料API、無料ホスティング）
- AI分析のみユーザー自身のOpenAI APIキーを使用

## 実装状況

### Phase 1: 記録 + カレンダー表示 ✅
1. **頭痛記録** — FABボタン → ボトムシートで3タップ記録
   - 種類: 片頭痛 / 緊張性 / その他
   - 程度: 1〜5
   - 記録時刻・記録時気圧を自動保存
2. **カレンダー表示** — 月表示、色分けドット、日付タップで詳細
3. **PWA対応** — Service Worker、マニフェスト、オフラインキャッシュ

### Phase 2: 気圧アラート ✅
1. **7日間気圧予報** — Open-Meteo API、縦バーチャートで直感表示
2. **時間別グラフ** — 日付タップで24時間の気圧折れ線グラフ
3. **地名表示** — Nominatim逆ジオコーディングで「○○付近の気圧情報」
4. **リスク判定** — 6hPa閾値で警戒/注意/安定の3段階

### 追加実装済み
- **ライト/ダーク テーマ切替** — CSS変数ベース、設定画面で切替、DB永続化
- **設定画面** — テーマ切替、OpenAI APIキー入力欄
- **記録時メタデータ** — 記録時刻(HH:mm) + 記録時気圧(hPa)を自動保存

### Phase 3: 将来拡張（未実装）
- AI相関分析（OpenAI API）— APIキー保存の枠は準備済み
- 疲労度の日次記録 → 緊張性頭痛のリズム予測
- 服薬記録
- Push通知によるバックグラウンドアラート

## ディレクトリ構成
```
├── public/
│   └── icon.svg              # PWAアイコン (SVG)
├── src/
│   ├── components/
│   │   ├── Calendar.tsx       # カレンダー表示
│   │   ├── RecordForm.tsx     # 頭痛記録フォーム
│   │   ├── DayDetail.tsx      # 日付詳細・編集
│   │   ├── PressureAlert.tsx  # 気圧アラート + 週間予報
│   │   └── Settings.tsx       # 設定画面
│   ├── db/
│   │   └── index.ts           # Dexie.js DB定義 (v2)
│   ├── hooks/
│   │   ├── useRecords.ts      # 記録CRUD
│   │   ├── usePressure.ts     # 気圧データ取得 + 地名
│   │   └── useTheme.ts        # テーマ切替
│   ├── types/
│   │   └── index.ts           # 型定義
│   ├── utils/
│   │   ├── constants.ts       # 共通定数 (TYPE_CONFIG等)
│   │   ├── pressure.ts        # 気圧API + 週間リスク分析
│   │   └── currentPressure.ts # 記録時の現在気圧取得
│   ├── App.tsx
│   ├── main.tsx
│   ├── index.css              # テーマCSS変数 + アニメーション
│   └── vite-env.d.ts
├── index.html
├── package.json
├── tsconfig.json
├── vite.config.ts
├── .gitignore
└── CLAUDE.md
```

## データモデル (DB version 2)
```typescript
interface HeadacheRecord {
  id?: number;
  date: string;          // YYYY-MM-DD
  type: 'migraine' | 'tension' | 'other';
  severity: 1 | 2 | 3 | 4 | 5;
  recordedAt: string;    // HH:mm (記録時刻)
  pressure?: number;     // 記録時の気圧 (hPa)
  createdAt: Date;
  updatedAt: Date;
}

interface UserSettings {
  id: 1;
  latitude?: number;
  longitude?: number;
  pressureThreshold: number;  // デフォルト: 6
  theme: 'light' | 'dark';
  openaiApiKey?: string;
}
```

## テーマ実装
- CSS変数ベース (`data-theme` 属性で切替)
- ユーティリティクラス: `.t-primary`, `.t-secondary`, `.t-muted`, `.t-btn-inactive`, `.glass`, `.glass-strong`
- テーマ設定はIndexedDBに永続化

## デザイン方針
- iPhone最適化（375px幅基準）
- ライト/ダーク切替対応
- グラスモーフィズム（半透明カード + backdrop-blur）
- 記録は最小タップで完了（FAB → ボトムシート → 3タップ）
- カラーパレット:
  - 片頭痛: purple-500 系
  - 緊張性: amber-500 系
  - アクセント: purple → pink グラデーション

## 注意事項
- localStorage は使わない → IndexedDB (Dexie.js) を使用
- Tailwind v4: `@import 'tailwindcss'` で読み込み (tailwind.config.js 不要)
- 1ファイルが大きくなりすぎないようコンポーネント分割を意識
- 日本語UIで構築
- アクセシビリティ: aria-label 付与済み
