# 現在の実装全体像

最終更新: `2026-04-27`

このドキュメントは、現時点のフロントエンド、API、Lambda、認証、決済、管理画面、モック分岐の実装状況を 1 本にまとめたものです。既存の `README.md` や `docs/` 配下の個別メモは補助資料として扱い、このファイルを全体像の基準にします。

## 1. プロジェクト概要

- 種別: 認証付き VOD アプリ
- フロントエンド: `React 18` + `TypeScript` + `Vite` + `Tailwind CSS`
- 主要ルーティング: `src/App.tsx`
- API クライアント: `src/lib/apiClient.ts`
- 認証状態: `src/context/AuthContext.tsx`
- 管理画面: `src/components/admin/`

ユーザー向けには、動画一覧、動画詳細、動画再生、検索、メンバーシップ登録、アカウント設定、ウォッチリスト、視聴履歴を提供しています。管理者向けには、動画、一般ユーザー、管理者アカウントの管理 UI を持っています。

## 2. 現在のアーキテクチャ

現在の構成は次の 3 層です。

1. `src/`
   - 画面描画、状態管理、Cognito 認証、API 呼び出し
2. `api/`
   - フロントから見た BFF 風の薄いプロキシ
   - 例: `api/movies.ts`, `api/profile.ts`, `api/subscriptions/checkout-session.ts`
3. `lambda/`
   - 実処理本体
   - `lambda/movies`: 動画、プロフィール、ウォッチリスト、視聴履歴、サブスク参照、管理 CRUD、Stripe Webhook
   - `lambda/billing-portal`: Stripe Checkout / Billing Portal / 解約
   - `lambda/auth-signup`: Cognito 登録
   - `lambda/auth-signup` 内の DB upsert は VPC 側 Lambda 呼び出しで分離

ローカルでは `VITE_API_BASE_URL` 未指定時に `/api` を使い、`vite.config.ts` の proxy で `http://localhost:3000` に転送します。実運用では `VITE_API_BASE_URL` に API Gateway URL を直接設定する構成も想定しています。

## 3. フロントエンドの画面構成

### ユーザー向けルート

- `/`: トップ一覧
- `/login`: ログイン
- `/signup`: アカウント作成
- `/signup/confirm`: 確認コード入力
- `/password-reset`: パスワード再設定
- `/movies/:id`: 動画詳細
- `/watch/:id`: 動画再生
- `/search`: 検索結果
- `/subscription`: メンバーシップ登録
- `/subscription/complete`: Stripe 完了後の戻り先
- `/account`: アカウント設定
- `/watchlist`: ウォッチリスト

### 管理向けルート

- `/admin`: 管理ダッシュボード
- `/admin/movies`: 動画管理ページ

`/admin` 配下では、動画管理、一般ユーザー管理、管理者アカウント管理をタブで切り替えます。

## 4. 認証の現在地

認証は Amazon Cognito を使っていますが、現在は `Hosted UI` 主体ではなく、アプリ内フォームから `@aws-sdk/client-cognito-identity-provider` を直接呼ぶ構成です。

### 実装の流れ

- サインアップ:
  - `src/components/SignUpPage.tsx`
  - `POST /auth/signup`
  - Lambda で Cognito 登録後、DB に `users / profiles` を upsert
- 確認コード入力:
  - `src/components/ConfirmSignUpPage.tsx`
  - Cognito の `ConfirmSignUpCommand`
- ログイン:
  - `src/components/LoginPage.tsx`
  - Cognito の `InitiateAuthCommand` with `USER_PASSWORD_AUTH`
- パスワード再設定:
  - `src/components/PasswordResetPage.tsx`
  - Cognito の forgot password フロー
- ログアウト:
  - `localStorage` 上の token を破棄して `/` に戻す

### token の保持

- 保存先: `localStorage['cognito_tokens']`
- 保持値:
  - `id_token`
  - `access_token`
  - `refresh_token`

### 認証状態の判定

- `src/context/AuthContext.tsx`
- `src/lib/authBridge.ts`

`access_token` を API 用に優先しつつ、Stripe 課金系では `email` claim が必要なため `id_token` を優先して使う helper を分けています。

## 5. 会員状態と視聴制御

現在の会員状態は 3 段階です。

- `guest`: 未ログイン
- `registered`: ログイン済み、無料会員
- `member`: メンバーシップ登録済み

実装は `src/lib/useMembershipStatus.ts` です。ログイン済みの場合は `/subscriptions/current` を取得し、`active` なら `member`、それ以外は `registered` としています。

### 動画の公開区分

動画側の公開区分は現在 2 段階です。

- `public`
- `member`

判定は `src/lib/movieAccess.ts` で行っています。DB 上では `price` または `rental_price` が 0 より大きい場合に `member` とみなし、どちらも 0 の場合は `public` としています。

内部的には旧課金カラムを流用していますが、画面上の意味は「単品購入」ではなく「公開範囲」です。

## 6. トップ画面の現在の仕様

トップ画面は `src/components/MovieListPage.tsx` にあります。

### 画面の考え方

- ヒーロー表示
- おすすめ動画
- ログイン後の表示確認用サンプル
- 紹介動画またはログイン後の一覧
- 高評価動画

### 現在の表示ルール

- 未ログイン:
  - `紹介動画` を表示
  - これは「一般公開作品の本編一覧」というより、紹介用途の見せ方
- ログイン後:
  - おすすめ動画
  - ジャンル名を見出しにした一覧
  - 表示確認用のテストカード

### テスト表示の扱い

- `src/components/homeDisplaySamples.ts`
- 実データが空でもトップで一覧が崩れないように、紹介動画用とログイン後用のテストカードを用意
- カード表示はテスト用文言でも、クリック時は動画詳細ページへ遷移
- サンプルカードのジャンル表示は、アカウント設定の `見たいジャンル` 保存値を参照

## 7. 動画詳細・再生

### 動画詳細

- `src/components/MovieDetailPage.tsx`
- ジャンル表示あり
- コメントセクションあり
- 「今すぐ視聴する」から `/watch/:id?autoplay=1` へ遷移
- トップのサンプルカードから来た場合は、テスト用文言に差し替える導線あり

### 動画再生

- `src/components/MoviePlayerPage.tsx`
- 再生ソースは現在 `Amplify Storage` 上の固定サンプル動画
- 実体パス: `public/sample_output1.mp4`
- 取得 helper: `src/lib/storageUtils.ts`

### 視聴履歴

- 再生開始時に記録
- API: `/watch-history`
- ログイン済みで視聴可能な動画を再生した場合に保存
- `VITE_USE_MOCK_WATCH_HISTORY=true` の場合は `localStorage` 保存

## 8. メンバーシップと Stripe

### 現在の前提

- 単品購入は廃止
- メンバーシップは 1 プランのみ
- 月額は `1000円`
- 画面上はプラン名を強調せず、実質 1 商品構成

### 実装箇所

- フロント:
  - `src/components/SubscriptionPage.tsx`
  - `src/components/SubscriptionCompletionPage.tsx`
  - `src/components/AccountSettingsPage.tsx`
- API:
  - `/subscription-plans`
  - `/subscriptions/current`
  - `/subscriptions/checkout-session`
  - `/billing-portal/session`
- Lambda:
  - `lambda/billing-portal/src/handler.ts`
  - `lambda/movies/src/stripeWebhook.ts`
  - `lambda/movies/src/handler.ts`

### 現在の動き

- 登録開始時に Stripe Checkout Session を作成
- 完了後は `/subscription/complete` を経由し、購読状態が `active` になってから元の画面に戻す
- Billing Portal から解約導線あり
- Webhook で `subscriptions` テーブル更新

## 9. アカウント設定

`src/components/AccountSettingsPage.tsx` で扱う内容は次です。

- 基本プロフィール
  - 表示名
  - メールアドレス
  - 性別
  - 年齢
  - 都道府県
- メンバーシップ状態
- 視聴履歴
- 視聴設定
  - 完全非表示
  - 警告表示
  - 見たいジャンル

### 視聴設定の永続化

- DB 保存先: `profiles.recommendation_preferences`
- 形式: JSON
- 正規化処理:
  - `lambda/movies/src/recommendationPreferences.ts`

### 選択肢のマスター

- `src/lib/recommendationPreferenceMaster.ts`

現在は仮マスターですが、UI はマスター参照型になっているため差し替えやすい状態です。

## 10. 検索・コメント・ウォッチリスト

### 検索

- 画面: `src/components/SearchResultsPage.tsx`
- API: `/movies?q=...`
- 公開検索対象:
  - タイトル
  - 説明
  - 出演者

出演者検索はフロント・バックエンドともに有効です。

### コメント

- 画面コンポーネント: `src/components/ReviewSection.tsx`
- 画面上の文言は `レビュー` ではなく `コメント`
- API: `/reviews`
- `VITE_USE_MOCK_REVIEWS=true` の場合は `localStorage` ベースのモック実装

### ウォッチリスト

- API:
  - `GET /watchlist`
  - `POST /watchlist`
  - `DELETE /watchlist/:movieId`

## 11. 管理画面の現在の仕様

### 動画管理

- 一覧取得、検索、追加、編集、削除
- ジャンル選択 UI あり
- 公開区分は `public / member` の 2 段階
- サムネイルはテスト用画像表示
- MP4 ファイル選択 UI は追加済み

### 重要な未接続部分

MP4 のアップロード UI はありますが、Elemental MediaConvert / MediaPackage への連携はまだありません。現時点では次の状態です。

- `VideoFileField` でファイル選択はできる
- 保存 payload にはまだ流していない
- AWS へのアップロード処理は未実装

### 一般ユーザー管理

- 一覧取得、検索、状態更新、削除
- `VITE_USE_MOCK_USERS=true` でモック動作

### 管理者アカウント管理

- Cognito User Pool のユーザーとグループを管理
- `admin` / `super_admin` の 2 ロール
- `lambda/movies/src/adminAccounts.ts` で Cognito 管理 API を使用
- `VITE_USE_MOCK_ADMIN_USERS=true` でモック動作

## 12. バックエンド API の現在の範囲

### movies Lambda 系

`lambda/movies/src/handler.ts` が担当する主な API:

- `GET /v1/movies`
- `GET /v1/movies/:id`
- `GET /v1/watchlist`
- `POST /v1/watchlist`
- `DELETE /v1/watchlist/:movieId`
- `GET /v1/watch-history`
- `POST /v1/watch-history`
- `GET /v1/profile`
- `PUT /v1/profile`
- `GET /v1/subscription-plans`
- `GET /v1/subscriptions/current`
- `GET /v1/admin/movies`
- `POST /v1/admin/movies`
- `GET /v1/admin/movies/:id`
- `PUT /v1/admin/movies/:id`
- `DELETE /v1/admin/movies/:id`
- `GET /v1/admin/users`
- `PUT /v1/admin/users/:id`
- `DELETE /v1/admin/users/:id`
- `GET /v1/admin/admin-users`
- `POST /v1/admin/admin-users`
- `PUT /v1/admin/admin-users/:id`
- `DELETE /v1/admin/admin-users/:id`
- Stripe Webhook

### billing Lambda 系

- `POST /v1/subscriptions/checkout-session`
- `POST /v1/billing-portal/session`
- `DELETE /v1/subscriptions/current`

### auth-signup Lambda 系

- `POST /v1/auth/signup`

### API proxy 層

`api/` 配下は基本的に Lambda URL または API Gateway URL への単純転送です。認証ヘッダを付け替えず、そのまま forward する実装が中心です。

## 13. 永続化対象

主要な永続化対象は次です。

- `movies`
  - 動画メタデータ
  - ジャンル
  - 出演者
  - 公開区分
- `users`
  - ユーザー基本情報
- `profiles`
  - 表示名
  - 性別
  - 年齢
  - 都道府県
  - `recommendation_preferences`
- `subscriptions`
  - Stripe 連携後の購読状態
- `subscription_plans`
  - 現在は実質 1 プラン運用
- `watch_history`
  - 視聴履歴
- `watchlist`
  - ウォッチリスト

マイグレーション用の補助 SQL は `docs/sql/` にあります。

## 14. テストサムネイル・テスト文言

サムネイル表示は `src/lib/testMovieThumbnails.ts` を使っています。

特徴は次です。

- 実データのサムネイル URL を直接見せず、テスト用 SVG サムネイルを描画
- 一覧・ヒーロー・詳細でレイアウト違いあり
- 文言は日本語化済み
- 中央タイトルは固定で `SAMPLEMOVIE`

トップ画面の表示確認用カードとは別レイヤーで、個々の動画カードの見た目をテスト用に置き換えています。

## 15. モック分岐

現時点で明示的に残っている主なモック用環境変数:

- `VITE_USE_MOCK_MOVIES`
- `VITE_USE_MOCK_REVIEWS`
- `VITE_USE_MOCK_PROFILE`
- `VITE_USE_MOCK_SUBSCRIPTIONS`
- `VITE_USE_MOCK_WATCH_HISTORY`
- `VITE_USE_MOCK_USERS`
- `VITE_USE_MOCK_ADMIN_USERS`

モック時は `src/mockData.ts` や `localStorage` ベースのデータが使われます。特にトップ画面は、実データが空でも UI 確認ができるようテストカードでフォールバックする実装が入っています。

## 16. AWS / 外部サービスの実装状況

### 実際に組み込まれているもの

- Cognito
- Stripe
- Amplify Storage
- API Gateway / Lambda
- RDS(PostgreSQL 前提)

### まだ未接続または未完成のもの

- MediaConvert 連携
- MediaPackage 連携
- 管理画面からの MP4 実アップロード
- 動画変換ジョブ投入
- 配信パイプライン自動化

サンプル動画再生はできる状態ですが、アップロードした MP4 を変換し、その成果物を配信するところまでは未実装です。

## 17. ローカル開発

### 主なコマンド

- 開発サーバー: `npm run dev`
- ビルド: `npm run build`
- Lint: `npm run lint`
- テスト: `npm test`

### 補足

- `vite.config.ts` で `/api` を `http://localhost:3000` に proxy
- 実 API Gateway を直接使う場合は `VITE_API_BASE_URL` を設定
- テストは `Vitest`

## 18. 現時点の既知の注意点

1. `react-oidc-context` は依存関係としてまだ残っていますが、現在の認証本線は direct Cognito SDK + `localStorage` です。
2. 管理画面の MP4 選択 UI はあるものの、アップロード処理は未接続です。
3. サンプル再生は固定動画です。作品ごとの本番動画配信とはまだ連動していません。
4. 画面やテスト用データにテスト文言が多く残っており、表示確認を優先した状態です。
5. `docs/` 配下の個別メモには、現在の実装より古い前提が残っている可能性があります。

## 19. 未実装一覧

### 完全未実装

- 管理画面からの MP4 実アップロード
  - `VideoFileField` によるファイル選択 UI はあるものの、保存時に `videoFile` は未使用です。
- Elemental MediaConvert 連携
  - ジョブ投入、テンプレート選択、進捗確認、変換完了反映は未実装です。
- Elemental MediaPackage 連携
  - 配信チャネル生成、パッケージング設定、再生 URL 発行は未実装です。
- アップロード動画と作品レコードの紐付け
  - 作品ごとのストレージキー、配信 URL、変換成果物の管理は未実装です。
- 作品ごとの本番動画再生
  - 現在の再生は `public/sample_output1.mp4` の固定サンプル動画です。

### 部分実装

- コメント機能の本体サービス
  - フロントと `api/reviews.ts` はありますが、このリポジトリ内にレビュー永続化本体の Lambda 実装はありません。
- トップ画面の本番向け一覧表示
  - 実データが空でも崩れないように、テストカードでフォールバックする実装が入っています。
- サムネイルの本番画像表示
  - 画面上ではテスト用 SVG サムネイルを優先表示しています。

### モック依存が残っている箇所

- `VITE_USE_MOCK_MOVIES`
  - 動画一覧、動画詳細、動画再生、検索、管理画面の動画操作
- `VITE_USE_MOCK_REVIEWS`
  - コメント機能
- `VITE_USE_MOCK_PROFILE`
  - アカウント設定のプロフィール
- `VITE_USE_MOCK_SUBSCRIPTIONS`
  - メンバーシップ登録、加入状態表示
- `VITE_USE_MOCK_WATCH_HISTORY`
  - 視聴履歴
- `VITE_USE_MOCK_USERS`
  - 一般ユーザー管理
- `VITE_USE_MOCK_ADMIN_USERS`
  - 管理者アカウント管理

### 技術負債として残っているもの

- `react-oidc-context` の依存残り
  - 現在の認証本線では使っていませんが、依存関係には残っています。
- API proxy の環境変数依存
  - `api/` 配下は `LAMBDA_*_URL` が未設定だと動作できません。
- 旧課金カラムの流用
  - `price` / `rental_price` を公開区分の内部判定に流用しています。

### 優先度順に見ると先に詰めるべき項目

1. MP4 アップロード本体
2. MediaConvert 連携
3. MediaPackage 連携
4. 作品ごとの動画ソース紐付け
5. コメント本体の永続化サービス整理
6. モック分岐の削減

## 20. まず見るべきファイル

実装を追うときは、次の順で見ると全体を把握しやすいです。

1. `src/App.tsx`
2. `src/context/AuthContext.tsx`
3. `src/lib/apiClient.ts`
4. `src/components/MovieListPage.tsx`
5. `src/components/MovieDetailPage.tsx`
6. `src/components/MoviePlayerPage.tsx`
7. `src/components/SubscriptionPage.tsx`
8. `src/components/AccountSettingsPage.tsx`
9. `src/components/admin/VideoManagement.tsx`
10. `lambda/movies/src/handler.ts`
11. `lambda/billing-portal/src/handler.ts`
12. `lambda/auth-signup/src/handler.ts`
