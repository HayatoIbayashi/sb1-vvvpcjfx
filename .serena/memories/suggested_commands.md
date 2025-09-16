# よく使うコマンド

## セットアップ
- 依存関係インストール: `pnpm install` (pnpm推奨) または `npm ci`

## 開発
- 開発サーバ起動: `pnpm dev`
- Lint 実行: `pnpm lint`

## ビルド/プレビュー
- 本番ビルド: `pnpm build`
- ローカルプレビュー: `pnpm preview`

## 補助
- 型チェック (Vite/TSによる): ビルド・開発時にエラー表示。必要なら `tsc -p tsconfig.app.json --noEmit` を追加検討
- 環境変数: `.env` を編集 (クライアントで使う値は `VITE_` 前置)

## Linux システム補助
- ファイル一覧: `ls -la`
- 検索: `rg <pattern>` (ripgrep)
- 移動: `cd <dir>`
- パス確認: `pwd`
