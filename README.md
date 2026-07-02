# サークル管理アプリ

大学サークル・チームの運営を支援するフルスタック Web アプリ。  
**名簿・スケジュール・会計管理・合宿管理・宿泊大会管理**の 5 タブ構成で、イベント運営をまとめて管理できます。

👉 **本番アプリ URL**: https://practice.circlemanage.jp （Raspberry Pi 上の本番環境）  
📱 スマホのホーム画面にも追加可能（PWA 対応）

---

## `test` ブランチ（検証環境）について

このブランチは、Vercel にプレビューデプロイして新機能を検証するためのブランチです。本番（`main` ブランチ / Raspberry Pi）とは以下の点が異なります。

- **ログイン認証を無効化**：`frontend/middleware.ts` の matcher を空にしており、Google ログインなしで全機能にアクセスできます。ログイン画面自体は残っており、合宿管理の Google フォーム自動作成など Google の権限（Forms / Calendar API スコープ）が必要な機能を使うときだけ、任意で Google ログインします。
- **ホーム画面が「幹部 / メンバー」選択制に変更**：最初に役割を選び、幹部は名簿・スケジュール・会計管理・合宿管理・宿泊大会管理のタブへ、メンバーは個人カレンダー画面へ進みます。
- **多くの新機能がブラウザの `localStorage` にデータを保存**：名簿・スケジュール・合宿管理の入力内容は端末・ブラウザをまたいで引き継がれません（バックエンド保存は今後の課題）。
- **Vercel のプレビュー URL で動作確認**：`test` ブランチへ push すると Vercel が自動でプレビューデプロイを作成します。本番 URL（practice.circlemanage.jp）とは別 URL になります。

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
ホーム（幹部 / メンバー を選択）
├── 幹部ビュー
│     ├── 名簿（実装済み）
│     ├── スケジュール（実装済み・チームカレンダー）
│     ├── 会計管理（開発中）
│     ├── 合宿管理（実装済み）
│     └── 宿泊大会管理（実装済み）
│           ├── 配車
│           └── 会計
└── メンバービュー
      └── 個人カレンダー（実装済み・チーム予定の閲覧＋個人予定の管理）
```

---

## 機能概要

### 📋 名簿

学年ごとのメンバー一覧を管理します。

- CSV インポート / エクスポート（学年別）
- 入力内容は他タブ（合宿管理など）から参照

### 🗓️ スケジュール

幹部とメンバーで予定を分けて共有するカレンダー機能です。

- 幹部が登録したチーム予定を、メンバー側では閲覧専用（★表示）として表示
- メンバーは自分だけの個人予定（●表示）を追加・削除可能
- データは localStorage に永続化（`team_calendar_events` / `personal_calendar_events`）

### 🏕️ 合宿管理

合宿の期間設定から参加者の出欠管理までをサポートします。

- 合宿期間の設定・日付ごとの参加可否グリッド
- 参加可否確認用の Google フォームを自動作成（全参加 / 途中参加で質問を出し分け）
- 出欠データの Excel 出力

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

> 上記の「宿泊大会管理タブ内の会計」とは別に、ホーム画面の「会計管理」タブ（サークル全体の会計）はまだ Coming Soon（開発中）です。

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
