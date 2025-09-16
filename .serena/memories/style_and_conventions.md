# コードスタイル・規約

- Lint: ESLint 推奨設定 + `typescript-eslint` 推奨 + `react-hooks` 推奨
- TypeScript: Strict, noUnusedLocals/Parameters, noFallthroughCasesInSwitch
- モジュール解決: `moduleResolution: bundler`, `isolatedModules: true`
- React: 関数コンポーネント、JSXは `react-jsx`
- 命名: コンポーネントは PascalCase, ユーティリティ/ファイルは camelCase を基本
- CSS: Tailwind CSS を中心に `index.css` から適用
- インポート: 相対/エイリアス未定義 (必要に応じ構成)
- フォーマッタ: Prettier 等の設定は未検出 (プロジェクトに導入されていない)
- 画像/アセット: `src/assets/` に配置

# 設計上の注意
- `vite.config.ts` で `global` Polyfill と NodeGlobals Polyfill を有効化
- `/api` リクエストはローカルのバックエンドへプロキシ (CORS回避)
- 認証設定は `src/main.tsx` の `AuthProvider` 構成を参照
