import { useEffect, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { InitiateAuthCommand } from '@aws-sdk/client-cognito-identity-provider';
import { useAuthStatus } from '../lib/authBridge';
import { createCognitoClient, getCognitoClientId } from '../lib/cognitoClient';

type LoginPageLocationState = {
  from?: { pathname?: string };
  email?: string;
  flashMessage?: string;
};

function LoginPage() {
  const auth = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const { isAuthenticated, logoutAll } = useAuthStatus();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const state = (location.state as LoginPageLocationState | null) ?? null;

  useEffect(() => {
    if (state?.email) {
      setEmail(state.email);
    }
  }, [state?.email]);

  // 認証状態に応じて画面を切り替え
  if (auth.isLoading) {
    return <div className="min-h-screen bg-gray-900 text-white flex items-center justify-center">Loading...</div>;
  }

  if (auth.error) {
    return (
      <div className="min-h-screen bg-gray-900 text-white flex items-center justify-center">
        エラーが発生しました: {auth.error.message}
      </div>
    );
  }

  if (isAuthenticated) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <div className="bg-gray-800 p-8 rounded-lg shadow-lg w-96 text-white">
          <h1 className="text-2xl font-bold mb-4">ログイン済み</h1>
          <p className="mb-6">{auth.user?.profile.email ?? 'サインイン中'}</p>
          <button onClick={logoutAll} className="w-full bg-gray-700 hover:bg-gray-600 text-white py-2 rounded">
            ログアウト
          </button>
        </div>
      </div>
    );
  }

  // Cognito の USER_PASSWORD_AUTH でサインインしてトークンを保存
  const handlePasswordLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    try {
      const cognito = createCognitoClient();

      const command = new InitiateAuthCommand({
        AuthFlow: 'USER_PASSWORD_AUTH',
        ClientId: getCognitoClientId(),
        AuthParameters: {
          USERNAME: email,
          PASSWORD: password,
        },
      });
      const response = await cognito.send(command);
      const result = response.AuthenticationResult;
      if (!result) throw new Error('Authentication failed');

      localStorage.setItem(
        'cognito_tokens',
        JSON.stringify({
          id_token: result.IdToken,
          access_token: result.AccessToken,
          refresh_token: result.RefreshToken,
        }),
      );

      const redirectTo = state?.from?.pathname ?? '/';
      navigate(redirectTo, { replace: true });
    } catch (loginError) {
      const errorName =
        typeof loginError === 'object' && loginError && 'name' in loginError
          ? String((loginError as { name?: unknown }).name)
          : null;

      if (errorName === 'UserNotConfirmedException') {
        navigate(`/signup/confirm?email=${encodeURIComponent(email)}`, {
          replace: true,
          state: {
            message: '確認コードを入力してください。確認メールが未着なら再送できます。',
          },
        });
        return;
      }

      setError('メールまたはパスワードが正しくありません');
    }
  };

  return (
    <div className="min-h-screen bg-gray-900 flex items-center justify-center">
      <div className="bg-gray-800 p-8 rounded-lg shadow-lg w-96">
        <h1 className="text-2xl font-bold text-white mb-6">ログイン</h1>
        <form onSubmit={handlePasswordLogin} className="space-y-4">
          {state?.flashMessage && <p className="text-green-400">{state.flashMessage}</p>}
          {error && <p className="text-red-500">{error}</p>}
          <div>
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
          <div>
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
          <button type="submit" className="w-full bg-blue-600 text-white py-2 rounded font-semibold hover:bg-blue-700">
            ログイン
          </button>
        </form>
        <div className="mt-4 text-center">
          <button onClick={() => navigate('/signup')} className="text-blue-400 hover:text-blue-300">
            アカウントを作成
          </button>
          <span className="text-gray-500 mx-2">|</span>
          <button onClick={() => navigate('/password-reset')} className="text-blue-400 hover:text-blue-300">
            パスワードをお忘れの方
          </button>
        </div>
      </div>
    </div>
  );
}

export default LoginPage;
