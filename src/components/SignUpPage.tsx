import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useAuthStatus } from '../lib/authBridge';
import apiClient from '../lib/apiClient';
import { getCognitoPasswordPolicyError, getCognitoPasswordPolicyMessage } from '../lib/cognitoPasswordPolicy';

const PREFECTURES = [
  '北海道', '青森県', '岩手県', '宮城県', '秋田県', '山形県', '福島県',
  '茨城県', '栃木県', '群馬県', '埼玉県', '千葉県', '東京都', '神奈川県',
  '新潟県', '富山県', '石川県', '福井県', '山梨県', '長野県',
  '岐阜県', '静岡県', '愛知県', '三重県',
  '滋賀県', '京都府', '大阪府', '兵庫県', '奈良県', '和歌山県',
  '鳥取県', '島根県', '岡山県', '広島県', '山口県',
  '徳島県', '香川県', '愛媛県', '高知県',
  '福岡県', '佐賀県', '長崎県', '熊本県', '大分県', '宮崎県', '鹿児島県', '沖縄県',
];

const GENDER_OPTIONS = [
  { value: 'male', label: '男性' },
  { value: 'female', label: '女性' },
  { value: 'other', label: 'その他' },
  { value: 'prefer_not_to_say', label: '回答しない' },
];

function SignUpPage() {
  const auth = useAuth();
  const navigate = useNavigate();
  const { isAuthenticated, logoutAll } = useAuthStatus();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [gender, setGender] = useState('prefer_not_to_say');
  const [age, setAge] = useState('');
  const [prefecture, setPrefecture] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const passwordPolicyError = getCognitoPasswordPolicyError(password);

  if (auth.isLoading) {
    return <div className="min-h-screen bg-gray-900 text-white flex items-center justify-center">Loading...</div>;
  }

  if (isAuthenticated) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <div className="bg-gray-800 p-8 rounded-lg shadow-lg w-96 text-white">
          <h1 className="text-2xl font-bold mb-4">ログイン済み</h1>
          <p className="mb-6">{auth.user?.profile.email ?? ''}</p>
          <button onClick={logoutAll} className="w-full bg-gray-700 hover:bg-gray-600 text-white py-2 rounded">
            ログアウト
          </button>
        </div>
      </div>
    );
  }

  const handleSignUp = async () => {
    try {
      setError('');
      setLoading(true);

      const ageNum = Number(age);

      if (!email || !password) {
        throw new Error('メールアドレスとパスワードを入力してください');
      }
      if (passwordPolicyError) {
        throw new Error(passwordPolicyError);
      }
      if (!Number.isFinite(ageNum) || !Number.isInteger(ageNum) || ageNum < 0 || ageNum > 120) {
        throw new Error('年齢は整数で0〜120の範囲で入力してください');
      }
      if (!prefecture) {
        throw new Error('都道府県を選択してください');
      }

      await apiClient.signUp({
        email,
        password,
        gender: gender === 'prefer_not_to_say' ? null : gender,
        age: ageNum,
        prefecture,
        displayName: displayName || null,
      });

      navigate(`/signup/confirm?email=${encodeURIComponent(email)}`, {
        replace: true,
        state: {
          message: '確認コードを送信しました。メールをご確認ください。',
        },
      });
    } catch (e) {
      setError(e instanceof Error ? e.message : 'サインアップに失敗しました');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-900 flex items-center justify-center">
      <div className="bg-gray-800 p-8 rounded-lg shadow-lg w-96">
        <h1 className="text-2xl font-bold text-white mb-6">アカウント登録</h1>
        <div className="space-y-4 mb-4">
          <div>
            <label className="block text-gray-300 mb-2" htmlFor="displayName">アカウント名</label>
            <input
              id="displayName"
              type="text"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              className="w-full px-4 py-2 bg-gray-700 text-white rounded"
              placeholder="表示用の名前"
            />
          </div>
          <div>
            <label className="block text-gray-300 mb-2" htmlFor="email">メールアドレス</label>
            <input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full px-4 py-2 bg-gray-700 text-white rounded"
              placeholder="you@example.com"
              required
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
              placeholder="Aa1!aaaa 形式"
              required
            />
            <p className="mt-2 text-xs text-gray-400">{getCognitoPasswordPolicyMessage()}</p>
            <p className="mt-1 text-xs text-gray-500">登録後は確認コード入力画面に進みます。メールに届くコードを使って確認してください。</p>
            {password && passwordPolicyError && <p className="mt-2 text-xs text-red-400">{passwordPolicyError}</p>}
          </div>
          <div>
            <label className="block text-gray-300 mb-2" htmlFor="gender">性別</label>
            <select
              id="gender"
              value={gender}
              onChange={(e) => setGender(e.target.value)}
              className="w-full px-4 py-2 bg-gray-700 text-white rounded"
              required
            >
              {GENDER_OPTIONS.map((g) => (
                <option key={g.value} value={g.value}>{g.label}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-gray-300 mb-2" htmlFor="age">年齢</label>
            <input
              id="age"
              type="number"
              min={0}
              max={120}
              value={age}
              onChange={(e) => setAge(e.target.value)}
              className="w-full px-4 py-2 bg-gray-700 text-white rounded"
              placeholder="0〜120"
              required
            />
          </div>
          <div>
            <label className="block text-gray-300 mb-2" htmlFor="prefecture">都道府県</label>
            <select
              id="prefecture"
              value={prefecture}
              onChange={(e) => setPrefecture(e.target.value)}
              className="w-full px-4 py-2 bg-gray-700 text-white rounded"
              required
            >
              <option value="">選択してください</option>
              {PREFECTURES.map((p) => (
                <option key={p} value={p}>{p}</option>
              ))}
            </select>
          </div>
          {error && <p className="text-red-500 text-sm">{error}</p>}
        </div>
        <button
          onClick={handleSignUp}
          disabled={loading || !email || !password || !age || !prefecture || !!passwordPolicyError}
          className="w-full bg-blue-600 disabled:bg-blue-600/60 text-white py-2 rounded font-semibold hover:bg-blue-700"
        >
          {loading ? '処理中...' : 'サインアップへ進む'}
        </button>
      </div>
    </div>
  );
}

export default SignUpPage;
