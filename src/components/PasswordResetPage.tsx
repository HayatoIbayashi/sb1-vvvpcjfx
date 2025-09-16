import { useAuth } from 'react-oidc-context';

function PasswordResetPage() {
  const auth = useAuth();

  if (auth.isLoading) {
    return <div className="min-h-screen bg-gray-900 text-white flex items-center justify-center">Loading...</div>;
  }

  if (auth.isAuthenticated) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <div className="bg-gray-800 p-8 rounded-lg shadow-lg w-96 text-white">
          <h1 className="text-2xl font-bold mb-4">ログイン済み</h1>
          <p className="mb-6">パスワードリセットは不要です。</p>
          <button
            onClick={() => auth.signoutRedirect()}
            className="w-full bg-gray-700 hover:bg-gray-600 text-white py-2 rounded"
          >
            ログアウト
          </button>
        </div>
      </div>
    );
  }

  const handleHostedReset = () => {
    // Hosted UI の「パスワードをお忘れですか？」からフローに入れるため、サインイン画面へ誘導
    auth.signinRedirect();
  };

  return (
    <div className="min-h-screen bg-gray-900 flex items-center justify-center">
      <div className="bg-gray-800 p-8 rounded-lg shadow-lg w-96">
        <h1 className="text-2xl font-bold text-white mb-6">パスワードリセット</h1>
        <p className="text-gray-300 mb-4">Cognito Hosted UI にてパスワードリセットを行います。</p>
        <button
          onClick={handleHostedReset}
          className="w-full bg-blue-600 text-white py-2 rounded font-semibold hover:bg-blue-700"
        >
          Hosted UI へ移動
        </button>
      </div>
    </div>
  );
}

export default PasswordResetPage;

