import { useEffect, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { InitiateAuthCommand } from '@aws-sdk/client-cognito-identity-provider';
import { useAuth } from '../../context/AuthContext';
import { createCognitoClient, getCognitoClientId } from '../../lib/cognitoClient';
import { getAdminRole, getAdminRoleFromTokens, type StoredTokens } from '../../lib/authStorage';

type AdminLoginLocationState = {
  from?: { pathname?: string };
  flashMessage?: string;
};

export default function AdminLoginPage() {
  const auth = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const state = (location.state as AdminLoginLocationState | null) ?? null;
  const adminRole = getAdminRole(auth.user?.profile);

  useEffect(() => {
    if (auth.isAuthenticated && adminRole) {
      navigate(state?.from?.pathname ?? '/admin', { replace: true });
    }
  }, [adminRole, auth.isAuthenticated, navigate, state?.from?.pathname]);

  useEffect(() => {
    if (auth.isAuthenticated && !adminRole) {
      void auth.removeUser();
    }
  }, [adminRole, auth]);

  const handlePasswordLogin = async (event: React.FormEvent) => {
    event.preventDefault();
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

      const tokens: StoredTokens = {
        id_token: result.IdToken,
        access_token: result.AccessToken,
        refresh_token: result.RefreshToken,
      };

      if (!getAdminRoleFromTokens(tokens)) {
        setError('管理者権限がありません。');
        return;
      }

      auth.setTokens(tokens);
      navigate(state?.from?.pathname ?? '/admin', { replace: true });
    } catch (loginError) {
      const errorName =
        typeof loginError === 'object' && loginError && 'name' in loginError
          ? String((loginError as { name?: unknown }).name)
          : null;

      if (errorName === 'UserNotConfirmedException') {
        setError('メール確認が完了していません。');
        return;
      }

      setError('メールアドレスまたはパスワードが正しくありません。');
    }
  };

  return (
    <div className="min-h-screen bg-gray-900 flex items-center justify-center px-4">
      <div className="bg-gray-800 p-8 rounded-lg shadow-lg w-full max-w-sm">
        <h1 className="text-2xl font-bold text-white mb-6">管理者ログイン</h1>
        <form onSubmit={handlePasswordLogin} className="space-y-4">
          {state?.flashMessage && <p className="text-yellow-400">{state.flashMessage}</p>}
          {error && <p className="text-red-500">{error}</p>}
          <div>
            <label className="block text-gray-300 mb-2" htmlFor="admin-email">
              メールアドレス
            </label>
            <input
              id="admin-email"
              type="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              className="w-full px-4 py-2 bg-gray-700 text-white rounded"
              required
            />
          </div>
          <div>
            <label className="block text-gray-300 mb-2" htmlFor="admin-password">
              パスワード
            </label>
            <input
              id="admin-password"
              type="password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              className="w-full px-4 py-2 bg-gray-700 text-white rounded"
              required
            />
          </div>
          <button type="submit" className="w-full bg-blue-600 text-white py-2 rounded font-semibold hover:bg-blue-700">
            ログイン
          </button>
        </form>
      </div>
    </div>
  );
}
