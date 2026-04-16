import { useState } from 'react';
import { useLocation, useNavigate, useSearchParams } from 'react-router-dom';
import {
  ConfirmSignUpCommand,
  ResendConfirmationCodeCommand,
} from '@aws-sdk/client-cognito-identity-provider';
import { createCognitoClient, getCognitoClientId } from '../lib/cognitoClient';

type ConfirmPageLocationState = {
  message?: string;
};

function ConfirmSignUpPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams] = useSearchParams();
  const initialEmail = searchParams.get('email') ?? '';
  const state = (location.state as ConfirmPageLocationState | null) ?? null;
  const [email, setEmail] = useState(initialEmail);
  const [code, setCode] = useState('');
  const [message, setMessage] = useState(state?.message ?? '確認メールに届いたコードを入力してください。');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleConfirm = async () => {
    try {
      setError('');
      setLoading(true);

      if (!email || !code) {
        throw new Error('メールアドレスと確認コードを入力してください');
      }

      const client = createCognitoClient();
      await client.send(new ConfirmSignUpCommand({
        ClientId: getCognitoClientId(),
        Username: email,
        ConfirmationCode: code,
      }));

      navigate('/login', {
        replace: true,
        state: {
          email,
          flashMessage: 'メール確認が完了しました。ログインしてください。',
        },
      });
    } catch (confirmError) {
      setError(confirmError instanceof Error ? confirmError.message : '確認に失敗しました');
    } finally {
      setLoading(false);
    }
  };

  const handleResend = async () => {
    try {
      setError('');
      setLoading(true);

      if (!email) {
        throw new Error('メールアドレスを入力してください');
      }

      const client = createCognitoClient();
      await client.send(new ResendConfirmationCodeCommand({
        ClientId: getCognitoClientId(),
        Username: email,
      }));

      setMessage('確認コードを再送しました。メールをご確認ください。');
    } catch (resendError) {
      setError(resendError instanceof Error ? resendError.message : '確認コードの再送に失敗しました');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-900 flex items-center justify-center">
      <div className="bg-gray-800 p-8 rounded-lg shadow-lg w-96">
        <h1 className="text-2xl font-bold text-white mb-6">メール確認</h1>
        <div className="space-y-4">
          {message && <p className="text-sm text-gray-300">{message}</p>}
          {error && <p className="text-sm text-red-400">{error}</p>}
          <div>
            <label className="block text-gray-300 mb-2" htmlFor="confirm-email">メールアドレス</label>
            <input
              id="confirm-email"
              type="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              className="w-full px-4 py-2 bg-gray-700 text-white rounded"
              placeholder="you@example.com"
              required
            />
          </div>
          <div>
            <label className="block text-gray-300 mb-2" htmlFor="confirmation-code">確認コード</label>
            <input
              id="confirmation-code"
              type="text"
              value={code}
              onChange={(event) => setCode(event.target.value)}
              className="w-full px-4 py-2 bg-gray-700 text-white rounded"
              placeholder="確認コード"
              required
            />
          </div>
          <button
            type="button"
            onClick={handleConfirm}
            disabled={loading || !email || !code}
            className="w-full bg-blue-600 disabled:bg-blue-600/60 text-white py-2 rounded font-semibold hover:bg-blue-700"
          >
            {loading ? '処理中...' : '確認を完了する'}
          </button>
          <button
            type="button"
            onClick={handleResend}
            disabled={loading || !email}
            className="w-full bg-gray-700 disabled:bg-gray-700/60 text-white py-2 rounded font-semibold hover:bg-gray-600"
          >
            確認コードを再送する
          </button>
        </div>
      </div>
    </div>
  );
}

export default ConfirmSignUpPage;
