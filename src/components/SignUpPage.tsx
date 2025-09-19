import { useAuth } from 'react-oidc-context';
import { useAuthStatus } from '../lib/authBridge';

function SignUpPage() {
  const auth = useAuth();
  const { isAuthenticated, logoutAll } = useAuthStatus();

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
    // Hosted UI のサインイン画面から「サインアップ」を選択
    auth.signinRedirect();
  };

  return (
    <div className="min-h-screen bg-gray-900 flex items-center justify-center">
      <div className="bg-gray-800 p-8 rounded-lg shadow-lg w-96">
        <h1 className="text-2xl font-bold text-white mb-6">アカウント作成</h1>
        <p className="text-gray-300 mb-4">Cognito Hosted UI にてサインアップを行います。</p>
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

