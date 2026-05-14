# バックエンド

**担当：阿部（一部南）**

## 技術スタック

| 技術 | 用途 |
|------|------|
| FastAPI（Python） | REST API サーバー |
| PostgreSQL / psycopg2 | API レスポンスのキャッシュ |
| Fixstars Amplify | 量子アニーリングによる配車最適化 |
| NAVITIME API（RapidAPI） | 駅間の電車所要時間取得 |
| Google Maps Geocoding API | 駅名 → 座標変換 |
| Google Forms / Sheets API | フォーム作成・回答取得 |
| passlib / bcrypt | パスワードハッシュ |

---

## API エンドポイント一覧

| メソッド | パス | 概要 |
|----------|------|------|
| POST | `/auth/register` | アカウント登録 |
| POST | `/auth/verify` | ログイン認証 |
| POST | `/assign` | 配車最適化（Amplify / グリーディ） |
| POST | `/calculate-costs` | 個別費用計算 |
| POST | `/create-form` | Google フォーム自動作成 |
| POST | `/get-responses` | Google スプレッドシートから回答取得 |

---

## 配車最適化の設計

単純な「距離が近い人を同じ車に」では解けない多目的最適化問題（乗車時間 ＋ 人間関係）を、Fixstars Amplify を使って QUBO（二次制約なし二値最適化）として定式化しています。

```
目的関数 = α × Σ(乗車時間 × x[i][k])
         + β × Σ(人間関係スコア × x[i][k] × x[j][k])

制約条件（ペナルティ法）
  - 各乗客は必ず 1 台に割り当て（one-hot 制約）
  - 各車の乗員数が定員以下（容量制約）
```

- `x[i][k]`：乗客 i が車 k に乗る場合 1、そうでない場合 0 の二値変数
- 人間関係スコア：「一緒になりたい」→ 負のコスト、「気まずい」→ 大きな正のコスト
- Amplify が使えない場合・解が見つからない場合はグリーディアルゴリズムに自動フォールバック

---

## API キャッシュ設計

NAVITIME API・Google Maps Geocoding API は呼び出し回数に上限があるため、PostgreSQL でキャッシュを管理しています。

| テーブル | 内容 |
|----------|------|
| `distance_cache` | 駅ペア × 時刻スロット → 所要時間（分） |
| `coord_cache` | 駅名 → 緯度経度 |
| `users` | メールアドレス・パスワードハッシュ・表示名 |

**キャッシュ最適化のポイント：**
- 目標到着時刻を **30 分単位に丸め**て同時間帯のリクエストを再利用
- A→B のキャッシュがあれば **B→A の API 呼び出しを省略**（対称ルート流用）
- `ThreadPoolExecutor` で座標変換を **並列処理**し待ち時間を短縮
- サーバー起動時に DB からキャッシュをオンメモリに読み込み、レスポンスを高速化

---

## セットアップ

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
