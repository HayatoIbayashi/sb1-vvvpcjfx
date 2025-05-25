// AWS Cognitoを使用したログイン機能を提供するコンポーネント
import { useState } from 'react';
import { useNavigate, Link, useLocation } from 'react-router-dom';
import { useAuth } from 'react-oidc-context';
import { CognitoIdentityProviderClient, InitiateAuthCommand } from '@aws-sdk/client-cognito-identity-provider';

// AWS Cognitoクライアントの初期化 (東京リージョン)
const cognito = new CognitoIdentityProviderClient({
  region: 'ap-northeast-1'
});

function LoginPage() {
  // 認証状態とナビゲーションのフック
  const auth = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  
  // ログイン後のリダイレクト先 (前のページまたはホーム)
  const redirectTo = location.state?.from?.pathname || '/';
  
  // フォームの状態管理
  const [email, setEmail] = useState(''); // メールアドレス入力
  const [password, setPassword] = useState(''); // パスワード入力
  const [error, setError] = useState(''); // エラーメッセージ
  console.log(auth);
  if (auth.isLoading) {
    return <div>Loading...</div>;
  }

  if (auth.error) {
    return <div>Encountering error... {auth.error.message}</div>;
  }

  // ローカルストレージからトークンをチェック
  const storedTokens = localStorage.getItem('cognito_tokens');
  if (auth.isAuthenticated || storedTokens) {
    return (
      <div>
        {storedTokens ? (
          <>
            <p>ログイン済みです</p>
            <button onClick={() => {
              localStorage.removeItem('cognito_tokens');
              window.location.reload();
            }}>ログアウト</button>
          </>
        ) : (
          <>
            <pre> Hello: {auth.user?.profile.email} </pre>
            <pre> ID Token: {auth.user?.id_token} </pre>
            <pre> Access Token: {auth.user?.access_token} </pre>
            <pre> Refresh Token: {auth.user?.refresh_token} </pre>
            <button onClick={() => auth.signoutRedirect()}>Sign out</button>
          </>
        )}
      </div>
    );
  }
  // ログイン処理
  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      // Cognito認証パラメータの設定
      const params: {
        AuthFlow: 'USER_PASSWORD_AUTH';
        ClientId: string;
        AuthParameters: {
          USERNAME: string;
          PASSWORD: string;
        };
      } = {
        AuthFlow: 'USER_PASSWORD_AUTH', // ユーザー名/パスワード認証フロー
        ClientId: '51p21ae4hhsgjtd1jfakg4mpiu', // CognitoアプリクライアントID
        AuthParameters: {
          USERNAME: email, // 入力されたメールアドレス
          PASSWORD: password // 入力されたパスワード
        }
      };
      
      const command = new InitiateAuthCommand(params);
      const response = await cognito.send(command);
      if (!response.AuthenticationResult) {
        throw new Error('Authentication failed');
      }
      
      const { AccessToken, IdToken, RefreshToken } = response.AuthenticationResult;
      
      // トークンを一時保存してページをリロード
      localStorage.setItem('cognito_tokens', JSON.stringify({
        id_token: IdToken,
        access_token: AccessToken,
        refresh_token: RefreshToken
      }));
      
      navigate(redirectTo, { replace: true });
    } catch (error) {
      setError('ログインに失敗しました。');
    }
  };

  return (
    <div className="min-h-screen bg-gray-900 flex items-center justify-center">
      <div className="bg-gray-800 p-8 rounded-lg shadow-lg w-96">
        <h1 className="text-2xl font-bold text-white mb-6">ログイン</h1>
        {error && <p className="text-red-500 mb-4">{error}</p>}
        <form onSubmit={handleLogin}>
          <div className="mb-4">
            <label className="block text-gray-300 mb-2" htmlFor="email">
              メールアドレス
            </label>
            <input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full px-4 py-2 bg-gray-700 text-white rounded"
              required
            />
          </div>
          <div className="mb-6">
            <label className="block text-gray-300 mb-2" htmlFor="password">
              パスワード
            </label>
            <input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full px-4 py-2 bg-gray-700 text-white rounded"
              required
            />
          </div>
          <button
            type="submit"
            className="w-full bg-blue-600 text-white py-2 rounded font-semibold hover:bg-blue-700"
          >
            ログイン
          </button>
        </form>
        <div className="mt-4 text-center">
          <Link to="/signup" state={{ from: location.state?.from }} className="text-blue-400 hover:text-blue-300">
            アカウントを作成
          </Link>
          <span className="text-gray-500 mx-2">|</span>
          <Link to="/password-reset" state={{ from: location.state?.from }} className="text-blue-400 hover:text-blue-300">
            パスワードを忘れた方
          </Link>
        </div>
      </div>
    </div>
  );
}

export default LoginPage;
