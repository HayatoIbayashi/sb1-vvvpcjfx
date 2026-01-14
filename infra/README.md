# デプロイ雛形（メール確認あり / App Client Secret なし）

この `infra/` には、以下3方式のデプロイひな形を用意しています。

- CDK（TypeScript）: `infra/cdk`
- SAM: `infra/sam/template.yaml`
- Serverless Framework: `infra/serverless/serverless.yml`

いずれも以下を作成します。
- Cognito User Pool（メール確認あり、email ログイン、自動検証: email、パスワード最小8）
- Cognito App Client（Secretなし, OAuth code flow / PKCE 前提, Callback/Logout に `http://localhost:5173/`）
- API Gateway HTTP API（POST `/v1/auth/signup`）→ Lambda（`lambda/auth-signup/dist/handler.handler`）

前提:
- 事前に `npm --prefix lambda/auth-signup run package` で Lambda をビルドし、`lambda/auth-signup/dist` を生成しておいてください。
- DB接続文字列は環境変数 `DATABASE_URL` として渡します（例: `postgres://user:pass@host:5432/db`）。

## CDK（TypeScript）

手順:
1. Lambda をビルド: `npm --prefix lambda/auth-signup install && npm --prefix lambda/auth-signup run package`
2. 依存取得: `npm --prefix infra/cdk install`
3. デプロイ: `cd infra/cdk && npm run deploy`

環境変数:
- `DATABASE_URL` を `cdk deploy` 実行時にシェルから注入してください。

出力:
- `HttpApiUrl`, `UserPoolId`, `UserPoolClientId`

## SAM

手順:
1. Lambda をビルド: `npm --prefix lambda/auth-signup install && npm --prefix lambda/auth-signup run package`
2. デプロイ（パラメータ渡し）:
   - `sam deploy --guided --template-file infra/sam/template.yaml --parameter-overrides DatabaseUrl="<DATABASE_URL>"`

出力:
- `ApiEndpoint`, `UserPoolId`, `UserPoolClientId`

## Serverless Framework

手順:
1. Lambda をビルド: `npm --prefix lambda/auth-signup install && npm --prefix lambda/auth-signup run package`
2. `DATABASE_URL` を環境変数として設定
3. デプロイ: `sls deploy -c infra/serverless/serverless.yml`

出力:
- デプロイログ内の HttpApi エンドポイント、および CloudFormation リソースとしての `UserPool`/`UserPoolClient`

## 使い方（フロント連携）

1. デプロイ後の API エンドポイント（例: `https://xxxx.execute-api.ap-northeast-1.amazonaws.com`）を、フロントのプロキシ宛先として環境へ設定。
   - Vite 開発なら、`/api/auth/signup` → `LAMBDA_AUTH_SIGNUP_URL` に向ける（本リポジトリでは `api/auth/signup.ts` がプロキシ）
   - ホスティング先に `LAMBDA_AUTH_SIGNUP_URL` を設定
2. Hosted UI の Callback/Logout URL に `http://localhost:5173/`（本番は本番URL）を設定。
3. フロントの `/signup` で email/password 入力 → API呼び出し → Hosted UI へ遷移 → 認可後にアプリへ戻り、`react-oidc-context` がトークン処理。

## 注意
- メール確認を有効にしているため、初回は確認メールの認証が必要です（Cognito標準挙動）。
- App Client は Secret無しです。SPA での Hosted UI/PKCE および USER_PASSWORD_AUTH（メール/パスワードタブ）が利用できます。
- Server 用に Secret 有りクライアントが必要になった場合は、別途クライアントを追加し、Lambda で `COGNITO_CLIENT_SECRET` を設定してください（`lambda/auth-signup` は SecretHash に対応済み）。

