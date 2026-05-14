# フロントエンド

**担当：南（一部森島）**

## 技術スタック

| 技術 | 用途 |
|------|------|
| Next.js 16 / React 19 | UI フレームワーク |
| TypeScript | 型安全な開発 |
| Tailwind CSS v4 | スタイリング（ダークモード対応） |
| NextAuth.js | 認証（Google OAuth + メール/パスワード） |

---

## ディレクトリ構成

```
frontend/
├── app/
│   ├── page.tsx          # ホーム（4タブのナビゲーション）
│   ├── haisha/           # 配車ページ
│   ├── accounting/       # 会計ページ
│   ├── calendar/         # カレンダーページ
│   ├── warikan/          # 割り勘ページ
│   ├── login/            # ログインページ
│   └── register/         # アカウント登録ページ
└── components/
    ├── haisha/           # 配車フォーム・結果表示
    ├── accounting/       # 会計管理（収支・メンバー・イベント）
    ├── calendar/         # 月カレンダー
    └── warikan/          # 割り勘（支払い入力・精算計算）
```

---

## 認証設計

Google OAuth（NextAuth.js）に加え、メール/パスワード認証を独自実装しています。

- bcrypt によるパスワードハッシュ（passlib）
- パスワード 72 バイト上限をフロント・バックエンド両方で検証（bcrypt の仕様制約）
- NextAuth の credentials プロバイダー経由で FastAPI の認証 API を呼び出すプロキシ構成
- Google OAuth 設定時の「安全ではないページ」警告を、承認済み JavaScript 生成元・リダイレクト URI の厳密な定義で解消

---

## UI/UX の工夫

- Tailwind CSS v4 のダークモード（`dark:` バリアント）に完全対応
- ローカル設定を `localStorage` に保存し、ページ再読み込み後も状態を維持
- モバイルファーストのレスポンシブデザイン（スマホからも PWA として利用可能）
- 割り勘の数字パッド・3ステップ支払い入力など、スマホ操作に最適化したコンポーネントを自作

---

## セットアップ

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
