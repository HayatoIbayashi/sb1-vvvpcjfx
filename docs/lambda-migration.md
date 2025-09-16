## Lambda 接続準備と Supabase クリーンアップ

- フロントのデータアクセスを Supabase 直叩きから AWS Lambda（API Gateway 経由想定）へ移行する準備を実施。
  - `src/lib/supabase.ts`: Supabase SDK を廃止し、Lambda 向け REST を呼び出す軽量ラッパへ差し替え
  - `src/lib/apiClient.ts`: `VITE_API_BASE_URL` を基点にした API クライアントを追加
  - `api/create-payment-intent.ts`, `api/webhook.ts`: Supabase 依存を除去し、`LAMBDA_*` へプロキシ化

### 環境変数

- フロントエンド（Vite）
  - `VITE_API_BASE_URL`: 例 `/api`（未設定時は `/api`）

- ローカル API プロキシ（`api/` ディレクトリ）
  - `LAMBDA_PAYMENTS_URL`: 支払い Intent を作成する Lambda の URL
  - `LAMBDA_WEBHOOK_URL`: Stripe Webhook を受ける Lambda の URL

### 今後の移行ステップ例

- Lambda 側で以下のエンドポイントを用意（API Gateway 経由を想定）
  - `POST /auth/signup`: メール・パスワード登録とプロフィール初期化
  - `POST /auth/reset-password`: パスワードリセットメール要求
  - `POST /profiles/upsert`: プロフィールの upsert
  - `POST /payments/create-intent`: 支払い Intent 作成（Stripe 連携）
  - `POST /purchases/update` など必要に応じて

必要に応じて Amplify の API カテゴリ（REST）と Cognito の認証を用いた署名付きリクエストに置き換え可能です。
