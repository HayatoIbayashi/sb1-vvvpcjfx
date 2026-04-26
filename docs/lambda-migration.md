## Lambda 移行メモ

- フロントのデータ取得は `src/lib/apiClient.ts` 経由で API Gateway / Lambda を呼び出す構成です。
- 認証は Cognito とアプリ内コンテキストで処理しており、旧 Supabase shim は削除済みです。
- 決済系のフロント入口は `api/` 配下のプロキシと Lambda エンドポイントに寄せています。

### 主要なフロント設定

- `VITE_API_BASE_URL`
  - 通常は `/api`
  - 直接 API Gateway を向ける場合は完全 URL を設定

### 主な移行済み API

- `POST /auth/signup`
- `POST /auth/reset-password`
- `GET /movies`
- `GET /movies/:id`
- `GET /profile`
- `PUT /profile`
- `POST /subscriptions/checkout-session`
- `POST /billing-portal/session`

### 補足

- 古い Supabase 依存コードは残さず、必要な呼び出しは API クライアントへ集約しています。
- 追加の移行や削除を行う場合も、まず `apiClient` と Lambda の責務分離を維持してください。
