# サークル管理アプリ

大学サークル・チームの運営を支援するフルスタック Web アプリ。  
**宿泊大会管理・合宿管理・会計管理・スケジュール**の 4 タブ構成で、イベント運営をまとめて管理できます。

👉 **アプリ URL**: https://practice.circlemanage.jp  
📱 スマホのホーム画面にも追加可能（PWA 対応）

---

## 技術スタック

| 領域 | 技術 |
|------|------|
| フロントエンド | Next.js 16 / React 19 / TypeScript |
| スタイリング | Tailwind CSS v4（ダークモード対応） |
| 認証 | NextAuth.js（Google OAuth + メール/パスワード認証） |
| バックエンド | FastAPI（Python） |
| DB | PostgreSQL（psycopg2 / API キャッシュ用） |
| 最適化エンジン | Fixstars Amplify（量子アニーリング） |
| 外部 API | NAVITIME（電車所要時間）/ Google Maps Geocoding / Google Forms / Google Sheets |
| インフラ | Raspberry Pi（自己ホスト）/ Cloudflare Tunnel（外部公開） |

---

## 画面構成

```
ホーム
├── 宿泊大会管理（実装済み）
│     ├── 配車
│     └── 会計
├── 合宿管理（開発中）
├── 会計管理（開発中）
└── スケジュール（開発中）
```

---

## 機能一覧

### 🏠 宿泊大会管理タブ

#### 🚗 配車

メンバーの最寄り駅・ドライバー/乗客・定員・人間関係（一緒になりたい人 / 気まずい人）を入力すると、**乗車時間と人間関係スコアを同時に最適化した配車結果**を出力します。

- NAVITIME API（RapidAPI 経由）で駅間の電車乗車時間を取得
- Google Maps Geocoding API で駅名 → 座標変換（ThreadPoolExecutor で並列処理）
- **Fixstars Amplify** を使った QUBO 定式化による量子アニーリング最適化
  - 目的関数：乗車時間コスト ＋ 人間関係スコア（重み付き）
  - 制約：1 人 1 台・定員上限
  - Amplify が使えない場合はグリーディアルゴリズムにフォールバック
- API 呼び出し結果を PostgreSQL にキャッシュし、重複リクエストを排除
- CSV インポートによる一括入力
- 30 分単位の時刻スロットでキャッシュを管理し API 消費を最小化

#### 💴 会計

サークルの収支をイベント・メンバーと紐づけて管理します。

- 収入・支出の記録と残高の自動計算
- イベントごとの収支サマリー
- メンバー管理と会費の記録
- データは localStorage に永続化

---

## 取り組んだこと・工夫した点

### 1. 量子アニーリングによる配車最適化

単純な「近い人を同じ車に」では解けない多目的最適化問題（乗車時間 ＋ 人間関係）を、Fixstars Amplify を使って QUBO（二次制約なし二値最適化）として定式化しました。

```
目的関数 = α × Σ(乗車時間 × x[i][k])
         + β × Σ(人間関係スコア × x[i][k] × x[j][k])

制約条件（ペナルティ法）
  - 各乗客は必ず 1 台に割り当て
  - 各車の乗員数が定員以下
```

API キーがない環境や最適解が見つからない場合は、グリーディアルゴリズムに自動的にフォールバックし、どんな状況でも結果を返します。

### 2. API コスト削減のためのキャッシュ設計

NAVITIME API は呼び出し回数に制限があります。

- **時刻スロット単位のキャッシュ**：目標到着時刻を 30 分単位に丸め、同じ時間帯のリクエストを再利用
- **対称ルート流用**：A→B のキャッシュがあれば B→A の呼び出しを省略
- **PostgreSQL 永続化**：サーバー再起動後もキャッシュを維持
- **並列ジオコーディング**：`ThreadPoolExecutor` で座標変換を並列化し待ち時間を短縮

### 3. 認証基盤の設計

Google OAuth（NextAuth.js）に加え、メール/パスワード認証も独自実装しました。

- bcrypt によるパスワードハッシュ（passlib）
- パスワード 72 バイト上限をフロント・バックエンド両方で検証（bcrypt の仕様制約）
- NextAuth の credentials プロバイダー経由で FastAPI の認証 API を呼び出すプロキシ構成

### 4. UI/UX の繰り返し改善

コミット履歴が示す通り、機能実装と並行して UI を複数回フルリニューアルしました。

- Tailwind CSS v4 + ダークモード（`dark:` バリアント）に完全対応
- モバイルファーストのレスポンシブデザイン
- 割り勘の数字パッドなど、スマホ操作に最適化したコンポーネントを自作

---

## システム構成

```
ブラウザ
    │
    ├─ Google OAuth ─── NextAuth.js
    │
    └─ HTTPS ──── Cloudflare Tunnel ──── Raspberry Pi（自宅サーバー）
                                              │
                                              ├─ Next.js（フロントエンド）
                                              ├─ FastAPI（バックエンド）
                                              │     ├─ NAVITIME API (RapidAPI)
                                              │     ├─ Google Maps Geocoding API
                                              │     ├─ Google Forms / Sheets API
                                              │     └─ Fixstars Amplify
                                              └─ PostgreSQL（キャッシュ）
```

---

## 開発・デプロイの経緯

Vercel でのプロトタイプ開発から、Raspberry Pi を用いたセルフホスト環境での実用化まで、以下のステップを経て構築しました。

### 1. インフラ：Raspberry Pi による自前サーバー構築

- **ハードウェア**：Raspberry Pi 3 Model B（松本研究室所有）を使用
- **選定理由**：最小単位での初期リリースを目指し、研究室の資産を活用することでインフラコストを完全に無料化
- **外部公開**：お名前.com で独自ドメインを取得。Cloudflare Tunnel を採用し、ポート開放を行わず安全なトンネル経由で外部公開を実現

### 2. デプロイ・ワークフロー

- **開発体制**：阿部・南によるフロントエンド/バックエンドのコーディング
- **反映フロー**：ローカルで開発・テストしたコードを GitHub に集約 → Raspberry Pi 上で `git pull` → Docker コンテナとしてデプロイ

### 3. 直面した課題と技術的解決

#### ① 環境変数の管理

- **課題**：Vercel からラズパイへ移行した際、バックエンドが正常に動作しない問題が発生
- **解決**：サーバー側でも `.env` ファイルによる API キー管理が必要であることを確認し、環境変数の注入を徹底

#### ② API クォータ削減のための DB キャッシュ実装

- **課題**：外部 API（NAVITIME・Google Maps）の呼び出し回数に制限があり、リクエストのたびに計算するのが非効率だった
- **解決**：PostgreSQL を導入し、一度取得した駅間の所要時間・座標データを DB に保存するキャッシュ機構を実装。API 消費量を大幅に削減しつつレスポンスを高速化

#### ③ Google OAuth の設定とセキュリティ

- **課題**：初期実装時に Google Cloud Console の設定ミスにより「安全ではないページ」警告が表示される問題が発生
- **解決**：OAuth クライアントの承認済み JavaScript 生成元・リダイレクト URI を正確に定義し直してセキュリティ警告を解消。加えて、登録エラー時のバリデーションとエラーハンドリングをフロントエンドで強化

---

## セットアップ

### バックエンド（FastAPI）

```bash
pip install -r requirements.txt
uvicorn main:app --reload
```

`.env` に以下を設定：

```
GOOGLE_MAPS_API_KEY=your_key
NAVITIME_API_KEY=your_key
FIXSTARS_API_KEY=your_key
POSTGRES_HOST=your_host
POSTGRES_USER=your_user
POSTGRES_PASSWORD=your_password
POSTGRES_DB=your_db
ALLOWED_ORIGINS=http://localhost:3000
```

### フロントエンド（Next.js）

```bash
cd frontend
npm install
npm run dev
```

`.env.local` に以下を設定：

```
NEXT_PUBLIC_API_URL=http://localhost:8000
NEXTAUTH_SECRET=your_secret
NEXTAUTH_URL=http://localhost:3000
GOOGLE_CLIENT_ID=your_client_id
GOOGLE_CLIENT_SECRET=your_client_secret
```

---

## スマホでアプリとして使う（PWA）

| OS | 手順 |
|----|------|
| iPhone (Safari) | 共有ボタン → 「ホーム画面に追加」 |
| Android (Chrome) | 右上「⋮」→「ホーム画面に追加」 |
