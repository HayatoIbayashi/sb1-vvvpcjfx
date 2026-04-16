import { useMemo, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import {
  ConfirmForgotPasswordCommand,
  ForgotPasswordCommand,
} from '@aws-sdk/client-cognito-identity-provider';
import { useAuth } from '../context/AuthContext';
import { useAuthStatus } from '../lib/authBridge';
import { createCognitoClient, getCognitoClientId } from '../lib/cognitoClient';
import { getCognitoPasswordPolicyError, getCognitoPasswordPolicyMessage } from '../lib/cognitoPasswordPolicy';

type PasswordResetLocationState = {
  email?: string;
};

function PasswordResetPage() {
  const auth = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const { logoutAll } = useAuthStatus();
  const state = (location.state as PasswordResetLocationState | null) ?? null;
  const [email, setEmail] = useState(state?.email ?? '');
  const [code, setCode] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [isSendingCode, setIsSendingCode] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [hasRequestedCode, setHasRequestedCode] = useState(false);

  const passwordPolicyError = useMemo(
    () => getCognitoPasswordPolicyError(newPassword),
    [newPassword],
  );

  if (auth.isLoading) {
    return <div className="min-h-screen bg-gray-900 text-white flex items-center justify-center">Loading...</div>;
  }

  if (auth.isAuthenticated) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <div className="bg-gray-800 p-8 rounded-lg shadow-lg w-96 text-white">
          <h1 className="text-2xl font-bold mb-4">ログイン済み</h1>
          <p className="mb-6">パスワードリセットはログアウトしてから行ってください。</p>
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

  const handleSendCode = async () => {
    try {
      setError('');
      setMessage('');
      setIsSendingCode(true);

      if (!email) {
        throw new Error('メールアドレスを入力してください');
      }

      const client = createCognitoClient();
      await client.send(new ForgotPasswordCommand({
        ClientId: getCognitoClientId(),
        Username: email,
      }));

      setHasRequestedCode(true);
      setMessage('確認コードを送信しました。メールをご確認ください。');
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : '確認コードの送信に失敗しました');
    } finally {
      setIsSendingCode(false);
    }
  };

  const handleConfirmReset = async () => {
    try {
      setError('');
      setMessage('');
      setIsSubmitting(true);

      if (!email || !code || !newPassword) {
        throw new Error('メールアドレス、確認コード、新しいパスワードを入力してください');
      }

      if (passwordPolicyError) {
        throw new Error(passwordPolicyError);
      }

      const client = createCognitoClient();
      await client.send(new ConfirmForgotPasswordCommand({
        ClientId: getCognitoClientId(),
        Username: email,
        ConfirmationCode: code,
        Password: newPassword,
      }));

      navigate('/login', {
        replace: true,
        state: {
          email,
          flashMessage: 'パスワードを更新しました。新しいパスワードでログインしてください。',
        },
      });
    } catch (confirmError) {
      setError(confirmError instanceof Error ? confirmError.message : 'パスワードの更新に失敗しました');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-900 flex items-center justify-center">
      <div className="bg-gray-800 p-8 rounded-lg shadow-lg w-96">
        <h1 className="text-2xl font-bold text-white mb-6">パスワードリセット</h1>
        <div className="space-y-4">
          {message && <p className="text-sm text-green-400">{message}</p>}
          {error && <p className="text-sm text-red-400">{error}</p>}

          <div>
            <label className="block text-gray-300 mb-2" htmlFor="reset-email">
              メールアドレス
            </label>
            <input
              id="reset-email"
              type="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              className="w-full px-4 py-2 bg-gray-700 text-white rounded"
              placeholder="you@example.com"
              required
            />
          </div>

          <button
            type="button"
            onClick={handleSendCode}
            disabled={isSendingCode || !email}
            className="w-full bg-blue-600 disabled:bg-blue-600/60 text-white py-2 rounded font-semibold hover:bg-blue-700"
          >
            {isSendingCode ? '送信中...' : hasRequestedCode ? '確認コードを再送する' : '確認コードを送信する'}
          </button>

          {hasRequestedCode && (
            <>
              <div>
                <label className="block text-gray-300 mb-2" htmlFor="reset-code">
                  確認コード
                </label>
                <input
                  id="reset-code"
                  type="text"
                  value={code}
                  onChange={(event) => setCode(event.target.value)}
                  className="w-full px-4 py-2 bg-gray-700 text-white rounded"
                  placeholder="メールに届いたコード"
                  required
                />
              </div>

              <div>
                <label className="block text-gray-300 mb-2" htmlFor="new-password">
                  新しいパスワード
                </label>
                <input
                  id="new-password"
                  type="password"
                  value={newPassword}
                  onChange={(event) => setNewPassword(event.target.value)}
                  className="w-full px-4 py-2 bg-gray-700 text-white rounded"
                  placeholder="Aa1!aaaa"
                  required
                />
                <p className="mt-2 text-xs text-gray-400">{getCognitoPasswordPolicyMessage()}</p>
                {newPassword && passwordPolicyError && (
                  <p className="mt-2 text-xs text-red-400">{passwordPolicyError}</p>
                )}
              </div>

              <button
                type="button"
                onClick={handleConfirmReset}
                disabled={isSubmitting || !email || !code || !newPassword || !!passwordPolicyError}
                className="w-full bg-emerald-600 disabled:bg-emerald-600/60 text-white py-2 rounded font-semibold hover:bg-emerald-700"
              >
                {isSubmitting ? '更新中...' : 'パスワードを更新する'}
              </button>
            </>
          )}

          <button
            type="button"
            onClick={() => navigate('/login', { state: { email } })}
            className="w-full bg-gray-700 text-white py-2 rounded font-semibold hover:bg-gray-600"
          >
            ログインへ戻る
          </button>
        </div>
      </div>
    </div>
  );
}

export default PasswordResetPage;
