import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from 'react-oidc-context';
import AWS from 'aws-sdk';

const cognito = new AWS.CognitoIdentityServiceProvider({
  region: 'ap-northeast-1'
});

function LoginPage() {
  const auth = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  console.log(auth);
  if (auth.isLoading) {
    return <div>Loading...</div>;
  }

  if (auth.error) {
    return <div>Encountering error... {auth.error.message}</div>;
  }

  if (auth.isAuthenticated) {
    return (
      <div>
        <pre> Hello: {auth.user?.profile.email} </pre>
        <pre> ID Token: {auth.user?.id_token} </pre>
        <pre> Access Token: {auth.user?.access_token} </pre>
        <pre> Refresh Token: {auth.user?.refresh_token} </pre>

        <button onClick={() => auth.signoutRedirect()}>Sign out</button>
      </div>
    );
  }
  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const params = {
        AuthFlow: 'USER_PASSWORD_AUTH',
        ClientId: '51p21ae4hhsgjtd1jfakg4mpiu',
        AuthParameters: {
          USERNAME: email,
          PASSWORD: password
        }
      };
      
      const response = await cognito.initiateAuth(params).promise();
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
      
      window.location.reload();
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
          <Link to="/signup" className="text-blue-400 hover:text-blue-300">
            アカウントを作成
          </Link>
          <span className="text-gray-500 mx-2">|</span>
          <Link to="/password-reset" className="text-blue-400 hover:text-blue-300">
            パスワードを忘れた方
          </Link>
        </div>
      </div>
    </div>
  );
}

export default LoginPage;
