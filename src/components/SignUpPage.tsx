import { useAuth } from 'react-oidc-context';
import { useAuthStatus } from '../lib/authBridge';
import { useState } from 'react';

function SignUpPage() {
  const auth = useAuth();
  const { isAuthenticated, logoutAll } = useAuthStatus();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  if (auth.isLoading) {
    return <div className="min-h-screen bg-gray-900 text-white flex items-center justify-center">Loading...</div>;
  }

  if (isAuthenticated) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <div className="bg-gray-800 p-8 rounded-lg shadow-lg w-96 text-white">
          <h1 className="text-2xl font-bold mb-4">ログイン済み</h1>
          <p className="mb-6">{auth.user?.profile.email ?? ''}</p>
          <button
            onClick={logoutAll}
            className="w-full bg-gray-700 hover:bg-gray-600 text-white py-2 rounded"
          >
            ログアウト
          </button>
        </div>
      </div>
    );
  }

  const handleHostedSignup = () => {
    // Hosted UI へ遷移。login_hint でメールを事前入力ヒントとして渡す
    auth.signinRedirect({
      extraQueryParams: {
        login_hint: email || undefined,
        screen_hint: 'signup', // サインアップ画面表示をヒント（対応環境のみ）
      },
    });
  };

  return (
    <div className="min-h-screen bg-gray-900 flex items-center justify-center">
      <div className="bg-gray-800 p-8 rounded-lg shadow-lg w-96">
        <h1 className="text-2xl font-bold text-white mb-6">アカウント作成</h1>
        <div className="space-y-4 mb-4">
          <div>
            <label className="block text-gray-300 mb-2" htmlFor="email">メールアドレス</label>
            <input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full px-4 py-2 bg-gray-700 text-white rounded"
              placeholder="you@example.com"
            />
          </div>
          <div>
            <label className="block text-gray-300 mb-2" htmlFor="password">パスワード</label>
            <input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full px-4 py-2 bg-gray-700 text-white rounded"
              placeholder="8文字以上を推奨"
            />
            <p className="text-xs text-gray-400 mt-2">注意: Hosted UI に遷移後、パスワードは再入力が必要です（セキュリティ上、自動入力はできません）。</p>
          </div>
        </div>
        <button
          onClick={handleHostedSignup}
          className="w-full bg-blue-600 text-white py-2 rounded font-semibold hover:bg-blue-700"
        >
          Hosted UI でサインアップ
        </button>
      </div>
    </div>
  );
}

export default SignUpPage;
