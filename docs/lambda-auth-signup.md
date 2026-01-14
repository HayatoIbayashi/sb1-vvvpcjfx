## Lambda: POST /v1/auth/signup（Hosted UI 誘導版）

このLambdaは、フロントの`/api/auth/signup`（プロキシ）から呼ばれ、以下を実行します。

1. Cognito ユーザー作成（SignUp）
2. RDB（PostgreSQL）に `users` と `profiles` を upsert
3. フロントは成功後に Hosted UI へリダイレクト（`login_hint=email`）

### デプロイ構成

- ランタイム: Node.js 20.x 推奨
- ハンドラ: `dist/handler.handler`
- ビルド: `npm run package`（`lambda/auth-signup` ディレクトリ）

### 環境変数

- `COGNITO_REGION`（例: `ap-northeast-1`）
- `COGNITO_CLIENT_ID`（クライアントシークレット無しを推奨）
- `COGNITO_CLIENT_SECRET`（任意。設定時は SecretHash を付与）
- `DATABASE_URL`（PostgreSQL 接続文字列。例: `postgres://user:pass@host:5432/dbname`）

### 期待リクエスト（JSON）

```
{
  "email": "user@example.com",
  "password": "********",
  "gender": "male|female|other|prefer_not_to_say",
  "age": 20,
  "prefecture": "東京都",
  "displayName": "任意の表示名（重複可）"
}
```

`gender/age/prefecture` は省略可。`age` は 0..120 を検証。

### レスポンス

- 成功: `200 { ok: true }`
- 409: `USERNAME_EXISTS`（Cognito 上に既存）
- 400: `VALIDATION_ERROR`
- 500: `COGNITO_ERROR | DB_ERROR | UNEXPECTED`

### スキーマ更新（display_name）

`profiles` に表示名を保存する場合、以下のSQLを適用してください。

```
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS display_name TEXT;
```


### API Gateway 配置

- HTTP API 推奨。ルート: `POST /v1/auth/signup`
- CORS はバックエンド直接公開時のみ必要。フロントからは `/api/auth/signup` プロキシ経由を推奨。

### ローカル/開発連携

- フロント `.env`:
  - `VITE_API_BASE_URL=/api`
- プロキシ `.env`（ホスティング側）:
  - `LAMBDA_AUTH_SIGNUP_URL=https://<api-id>.execute-api.<region>.amazonaws.com/v1/auth/signup`

### 備考

- メール確認を有効にしている場合、ユーザーは Hosted UI 側で確認後にログイン可能。
- Hosted UI を通じたログインでトークン管理を一元化（`react-oidc-context`）。
