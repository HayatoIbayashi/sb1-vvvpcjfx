# プロジェクト概要

- 名称: sb1-vvvpcjfx (Vite + React TypeScript アプリ)
- 目的: 認証付きの動画配信 (VOD) アプリ。映画一覧/詳細/視聴、サブスクリプション/決済(Stripe)、管理画面(作品・ユーザー管理)を提供。
- 認証/認可: Amazon Cognito (react-oidc-context) によるOIDCコードフロー。
- バックエンド/外部サービス: Supabase (データ/ストレージ), AWS Amplify/SDK 一部利用, Stripe (決済)。
- フロントエンド: React 18, React Router, Tailwind CSS, Vite。
- エントリポイント: `src/main.tsx` → `src/App.tsx` (ルーティング構成)。
- 開発サーバ: Vite (`pnpm dev` / `npm run dev`), 既定ポート 5173。
- APIプロキシ: `vite.config.ts` で `/api` → `http://localhost:3000` にプロキシ。
- 環境変数: `.env` に `VITE_` で始まるキーを定義 (Supabase/Stripe 等)。

# ディレクトリ構成(抜粋)
- `src/`
  - `components/` 画面・コンポーネント (管理画面は `components/admin/`)
  - `context/` 認証などのContext
  - `lib/` 外部サービス連携 (supabase/stripe/storage utils) と型
  - `translations/` 翻訳リソース
  - `assets/` 画像など
  - `main.tsx` / `App.tsx` / `index.css`
- `vite.config.ts` Vite設定 (グローバルPolyfill, devサーバプロキシ等)
- `eslint.config.js` ESLint設定 (typescript-eslint + react-hooks)
- `tailwind.config.js` Tailwind設定
- `tsconfig*.json` TypeScript設定
