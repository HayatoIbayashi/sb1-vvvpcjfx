# 技術スタック

- 言語: TypeScript (Strictモード)
- ランタイム/ビルド: Vite 5, esbuild
- フレームワーク/ライブラリ: React 18, React Router, Tailwind CSS
- 認証: Amazon Cognito + `react-oidc-context`
- 外部サービス: Supabase (`@supabase/supabase-js`), Stripe (`@stripe/react-stripe-js`, `@stripe/stripe-js`), AWS Amplify/SDK
- Lint: ESLint (`@eslint/js`, `typescript-eslint`, `eslint-plugin-react-hooks`, `eslint-plugin-react-refresh`)
- 型: TypeScript 5 (tsconfig.app.json/tsconfig.node.json)

# 実行/ビルド
- 開発: `pnpm dev` (または `npm run dev`)
- ビルド: `pnpm build`
- プレビュー: `pnpm preview`
- Lint: `pnpm lint`

# 環境変数
- `.env` に `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`, `VITE_STRIPE_PUBLISHABLE_KEY` などを設定
- クライアントで参照する値は `VITE_` プレフィックス必須

# 開発サーバ
- 既定ポート: 5173
- APIプロキシ: `/api` → `http://localhost:3000` (vite server.proxy)
