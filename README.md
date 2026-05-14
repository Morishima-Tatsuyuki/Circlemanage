# サークル管理アプリ

大学サークル・チームの運営を支援するフルスタック Web アプリ。  
**宿泊大会管理・合宿管理・会計管理・スケジュール**の 4 タブ構成で、イベント運営をまとめて管理できます。

👉 **アプリ URL**: https://practice.circlemanage.jp  
📱 スマホのホーム画面にも追加可能（PWA 対応）

---

## ドキュメント

| ファイル | 内容 | 担当 |
|----------|------|------|
| [docs/frontend.md](./docs/frontend.md) | フロントエンド構成・認証設計・セットアップ | 南（一部森島） |
| [docs/backend.md](./docs/backend.md) | API エンドポイント・最適化アルゴリズム・キャッシュ設計 | 阿部（一部南） |
| [docs/server.md](./docs/server.md) | Raspberry Pi 構築・Cloudflare Tunnel・デプロイ経緯 | 森島 |

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

## 機能概要

### 🚗 配車（宿泊大会管理タブ）

メンバーの最寄り駅・ドライバー/乗客・定員・人間関係（一緒になりたい人 / 気まずい人）を入力すると、**乗車時間と人間関係スコアを同時に最適化した配車結果**を出力します。

- Fixstars Amplify による QUBO 定式化・量子アニーリング最適化
- NAVITIME API で駅間の電車所要時間を取得、PostgreSQL でキャッシュ
- CSV インポートによる一括入力
- 詳細は [docs/backend.md](./docs/backend.md) を参照

### 💴 会計（宿泊大会管理タブ）

サークルの収支をイベント・メンバーと紐づけて管理します。

- 収入・支出の記録と残高の自動計算
- イベントごとの収支サマリー
- データは localStorage に永続化

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
