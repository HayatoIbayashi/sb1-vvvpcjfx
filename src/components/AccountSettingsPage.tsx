import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from 'react-oidc-context';
import { useAuthStatus } from '../lib/authBridge';
import useApiClient from '../lib/useApiClient';

type Profile = {
  displayName: string;
  email: string;
  gender: string;
  age: number | '';
  prefecture: string;
};

type Purchase = {
  id: string;
  title: string;
  amount: number;
  purchasedAt: string; // ISO
};

type Watch = {
  id: string;
  title: string;
  watchedAt: string; // ISO
};

const LS_PROFILE = 'mock_account_profile_v1';
const LS_MEMBER = 'mock_is_member_v1';
const LS_PURCHASES = 'mock_purchase_history_v1';
const LS_WATCH = 'mock_watch_history_v1';
const LS_REGISTERED_AT = 'mock_registered_at_v1';

function loadJSON<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return fallback;
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

function saveJSON<T>(key: string, val: T) {
  localStorage.setItem(key, JSON.stringify(val));
}

export default function AccountSettingsPage() {
  const { isAuthenticated } = useAuthStatus();
  const auth = useAuth();
  const navigate = useNavigate();
  const api = useApiClient();
  const useMockProfile = import.meta.env.VITE_USE_MOCK_PROFILE === 'true';
  const useMockPurchases = import.meta.env.VITE_USE_MOCK_PURCHASES === 'true';
  const useMockSubscriptions = import.meta.env.VITE_USE_MOCK_SUBSCRIPTIONS === 'true';

  const initialProfile: Profile = useMemo(() => {
    const stored = loadJSON<Partial<Profile> | null>(LS_PROFILE, null as any);
    const email = (auth.user?.profile.email as string) || '';
    const displayName = (auth.user?.profile.name as string) || 'User';
    return {
      displayName: stored?.displayName ?? displayName,
      email: stored?.email ?? email,
      gender: stored?.gender ?? '',
      age: stored?.age ?? '',
      prefecture: stored?.prefecture ?? '',
    };
  }, [auth.user]);

  const [profile, setProfile] = useState<Profile>(initialProfile);
  const [saved, setSaved] = useState('');

  const [isMember, setIsMember] = useState<boolean>(() => loadJSON<boolean | null>(LS_MEMBER, false));
  const [purchases, setPurchases] = useState<Purchase[]>(() => loadJSON<Purchase[]>(LS_PURCHASES, []));
  const [pointSummary, setPointSummary] = useState(() =>
    ({
      total: 2300,
      expiringAmount: 500,
      expiringDate: '2025-12-01',
      paid: 1300,
      free: 1000,
    })
  );
  const [watchHistory, setWatchHistory] = useState<Watch[]>(() => loadJSON<Watch[]>(LS_WATCH, []));
  const useMockWallet = import.meta.env.VITE_USE_MOCK_WALLET === 'true';

  // 登録日（参照用）。保存されていなければOIDCのクレームや現在時刻を使用して初期化
  const initialRegisteredAt = useMemo(() => {
    try {
      const stored = localStorage.getItem(LS_REGISTERED_AT);
      if (stored) return stored;
      const prof: any = auth.user?.profile ?? {};
      const authTime = prof?.auth_time; // epoch seconds
      const created = prof?.created_at ?? prof?.updated_at; // epoch seconds or ISO
      const iso = authTime
        ? new Date(Number(authTime) * 1000).toISOString()
        : typeof created === 'number'
          ? new Date(Number(created) * 1000).toISOString()
          : (typeof created === 'string' ? created : new Date().toISOString());
      localStorage.setItem(LS_REGISTERED_AT, iso);
      return iso;
    } catch {
      const now = new Date().toISOString();
      try { localStorage.setItem(LS_REGISTERED_AT, now); } catch {}
      return now;
    }
  }, [auth.user]);
  const [registeredAt, setRegisteredAt] = useState<string>(initialRegisteredAt);

  useEffect(() => {
    setProfile(initialProfile);
  }, [initialProfile]);

  useEffect(() => {
    let cancelled = false;
    const loadProfile = async () => {
      if (!isAuthenticated || useMockProfile) return;
      try {
        const res = await api.getProfile();
        if (cancelled) return;
        setProfile((current) => ({
          ...current,
          email: res.email ?? current.email,
          gender: res.gender ?? '',
          age: res.age ?? '',
          prefecture: res.prefecture ?? '',
        }));
      } catch (error) {
        console.error('Error fetching profile:', error);
      }
    };
    loadProfile();
    return () => {
      cancelled = true;
    };
  }, [api, isAuthenticated, useMockProfile]);

  useEffect(() => {
    let cancelled = false;
    const loadPurchases = async () => {
      if (!isAuthenticated || useMockPurchases) return;
      try {
        const res = await api.getPurchases({ status: 'completed' });
        if (cancelled) return;
        const mapped = res.items.map((item) => ({
          id: item.id,
          title: item.title,
          amount: item.amount_total,
          purchasedAt: item.created_at,
        }));
        setPurchases(mapped);
      } catch (error) {
        console.error('Error fetching purchases:', error);
      }
    };
    loadPurchases();
    return () => {
      cancelled = true;
    };
  }, [api, isAuthenticated, useMockPurchases]);

  useEffect(() => {
    let cancelled = false;
    const loadWallet = async () => {
      if (!isAuthenticated || useMockWallet) return;
      try {
        const res = await api.getWalletSummary();
        if (cancelled) return;
        setPointSummary({
          total: res.total_points,
          expiringAmount: res.expiring_soon_amount,
          expiringDate: res.expiring_soon_date || '未定',
          paid: res.paid_points,
          free: res.bonus_points,
        });
      } catch (error) {
        console.error('Error fetching wallet summary:', error);
      }
    };
    loadWallet();
    return () => {
      cancelled = true;
    };
  }, [api, isAuthenticated, useMockWallet]);

  useEffect(() => {
    let cancelled = false;
    const loadSubscription = async () => {
      if (!isAuthenticated || useMockSubscriptions) return;
      try {
        const res = await api.getSubscriptionCurrent();
        if (cancelled) return;
        setIsMember(res.active);
      } catch (error) {
        console.error('Error fetching subscription:', error);
      }
    };
    loadSubscription();
    return () => {
      cancelled = true;
    };
  }, [api, isAuthenticated, useMockSubscriptions]);

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <div className="bg-gray-800 p-8 rounded-lg shadow-lg w-96 text-white text-center">
          <p className="mb-6">アカウント設定はログイン後に利用できます。</p>
          <button onClick={() => navigate('/login')} className="w-full bg-blue-600 text-white py-2 rounded font-semibold hover:bg-blue-700">
            ログインへ
          </button>
        </div>
      </div>
    );
  }

  const handleSave = async () => {
    let nextProfile = profile;
    if (!useMockProfile) {
      try {
        const updated = await api.updateProfile({
          email: profile.email || null,
          gender: profile.gender || null,
          age: profile.age === '' ? null : Number(profile.age),
          prefecture: profile.prefecture || null,
        });
        nextProfile = {
          ...profile,
          email: updated.email ?? profile.email,
          gender: updated.gender ?? profile.gender,
          age: updated.age ?? profile.age,
          prefecture: updated.prefecture ?? profile.prefecture,
        };
        setProfile(nextProfile);
      } catch (error) {
        console.error('Error updating profile:', error);
        setSaved('Save failed.');
        setTimeout(() => setSaved(''), 2500);
        return;
      }
    }
    saveJSON(LS_PROFILE, nextProfile);
    setSaved('Saved.');
    setTimeout(() => setSaved(''), 2000);
  };

  const handleChangePayment = () => {
    // 実装予定: Stripe Customer Portal へ遷移など
    alert('お支払い方法の変更は現在準備中です。');
  };

  const handleCancelMembership = () => {
    if (!isMember) return;
    if (!confirm('メンバーシップを退会しますか？')) return;
    setIsMember(false);
    saveJSON(LS_MEMBER, false);
    alert('退会手続きが完了しました（モック）。');
  };

  const seedMock = () => {
    // デモ用に履歴を投入
    const now = new Date();
    const ps: Purchase[] = [
      { id: 'p1', title: '1%er ワンパーセンター', amount: 1000, purchasedAt: new Date(now.getTime() - 86400000 * 3).toISOString() },
      { id: 'p2', title: 'RE:BORN', amount: 500, purchasedAt: new Date(now.getTime() - 86400000 * 10).toISOString() },
    ];
    const ws: Watch[] = [
      { id: 'w1', title: '狂武蔵', watchedAt: new Date(now.getTime() - 3600000 * 5).toISOString() },
      { id: 'w2', title: '1%er ワンパーセンター', watchedAt: new Date(now.getTime() - 3600000 * 30).toISOString() },
    ];
    setPurchases(ps);
    setWatchHistory(ws);
    saveJSON(LS_PURCHASES, ps);
    saveJSON(LS_WATCH, ws);
    setIsMember(true);
    saveJSON(LS_MEMBER, true);
  };

  return (
    <div className="min-h-screen bg-gray-900 text-white">
      <div className="container mx-auto px-4 pt-24 pb-12 max-w-4xl">
        <h1 className="text-3xl font-bold mb-6">アカウント設定</h1>

        <div className="bg-gray-800 rounded-lg p-6 mb-8">
          <h2 className="text-xl font-semibold mb-4">基本情報</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-gray-300 mb-2">ユーザー名</label>
              <input
                type="text"
                value={profile.displayName}
                onChange={(e) => setProfile({ ...profile, displayName: e.target.value })}
                className="w-full px-4 py-2 bg-gray-700 text-white rounded"
                placeholder="表示名"
              />
            </div>
            <div>
              <label className="block text-gray-300 mb-2">メールアドレス</label>
              <input
                type="email"
                value={profile.email}
                onChange={(e) => setProfile({ ...profile, email: e.target.value })}
                className="w-full px-4 py-2 bg-gray-700 text-white rounded"
                placeholder="you@example.com"
              />
            </div>
            <div>
              <label className="block text-gray-300 mb-2">性別</label>
              <input
                type="text"
                value={profile.gender}
                onChange={(e) => setProfile({ ...profile, gender: e.target.value })}
                className="w-full px-4 py-2 bg-gray-700 text-white rounded"
                placeholder="男性 / 女性 / その他"
              />
            </div>
            <div>
              <label className="block text-gray-300 mb-2">年齢</label>
              <input
                type="number"
                min={0}
                max={120}
                value={profile.age}
                onChange={(e) => {
                  const next = e.target.value;
                  setProfile({ ...profile, age: next === '' ? '' : Number(next) });
                }}
                className="w-full px-4 py-2 bg-gray-700 text-white rounded"
                placeholder="例: 29"
              />
            </div>
            <div>
              <label className="block text-gray-300 mb-2">都道府県</label>
              <input
                type="text"
                value={profile.prefecture}
                onChange={(e) => setProfile({ ...profile, prefecture: e.target.value })}
                className="w-full px-4 py-2 bg-gray-700 text-white rounded"
                placeholder="例: 東京都"
              />
            </div>
            <div>
              <label className="block text-gray-300 mb-2">登録日</label>
              <div className="w-full px-4 py-2 bg-gray-700 text-gray-200 rounded">
                {new Date(registeredAt).toLocaleString()}
              </div>
            </div>
          </div>
          <div className="mt-4 flex items-center gap-4">
            <button onClick={handleSave} className="bg-blue-600 hover:bg-blue-700 px-4 py-2 rounded font-semibold">保存</button>
            {saved && <span className="text-green-400 text-sm">{saved}</span>}
          </div>
        </div>

        <div className="bg-gray-800 rounded-lg p-6 mb-8">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-semibold">お支払い方法</h2>
            <button onClick={handleChangePayment} className="bg-gray-700 hover:bg-gray-600 px-4 py-2 rounded">お支払い方法を変更</button>
          </div>
          <p className="text-gray-300 text-sm">テスト環境ではモック操作です。</p>
        </div>

        <div className="bg-gray-800 rounded-lg p-6 mb-8 border border-gray-700">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-3">
            <div>
              <p className="text-sm text-gray-400">ポイント残高</p>
              <p className="text-3xl font-bold text-white">{pointSummary.total.toLocaleString()} pt</p>
              <p className="text-sm text-gray-300 mt-1">
                うち {pointSummary.expiringAmount.toLocaleString()} pt が {pointSummary.expiringDate} に失効予定
              </p>
            </div>
            <div className="flex gap-3">
              <div className="bg-gray-700/60 px-4 py-2 rounded-lg">
                <p className="text-xs text-gray-400">有償</p>
                <p className="text-lg font-semibold text-white">{pointSummary.paid.toLocaleString()} pt</p>
              </div>
              <div className="bg-gray-700/60 px-4 py-2 rounded-lg">
                <p className="text-xs text-gray-400">無償</p>
                <p className="text-lg font-semibold text-white">{pointSummary.free.toLocaleString()} pt</p>
              </div>
            </div>
          </div>
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
            <p className="text-xs text-gray-400">
              ※ポイントは有効期限の早いものから自動的に優先して利用されます。詳細はポイント画面で確認できます。
            </p>
            <button
              onClick={() => navigate('/account/points')}
              className="bg-white text-gray-900 px-4 py-2 rounded-lg font-semibold hover:bg-gray-100 text-sm"
            >
              ポイント画面を開く
            </button>
          </div>
        </div>

        <div className="grid md:grid-cols-2 gap-6 mb-8">
          <div className="bg-gray-800 rounded-lg p-6">
            <h2 className="text-xl font-semibold mb-4">視聴履歴</h2>
            <ul className="space-y-2">
              {watchHistory.length === 0 && <li className="text-gray-400 text-sm">履歴はありません</li>}
              {watchHistory.map((w) => (
                <li key={w.id} className="text-gray-200 text-sm flex justify-between">
                  <span>{w.title}</span>
                  <span className="text-gray-400">{new Date(w.watchedAt).toLocaleString()}</span>
                </li>
              ))}
            </ul>
          </div>
          <div className="bg-gray-800 rounded-lg p-6">
            <h2 className="text-xl font-semibold mb-4">購入履歴</h2>
            <ul className="space-y-2">
              {purchases.length === 0 && <li className="text-gray-400 text-sm">履歴はありません</li>}
              {purchases.map((p) => (
                <li key={p.id} className="text-gray-200 text-sm flex justify-between">
                  <span>{p.title}</span>
                  <span className="text-gray-400">¥{p.amount.toLocaleString()}・{new Date(p.purchasedAt).toLocaleString()}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>

        <div className="bg-gray-800 rounded-lg p-6 mb-8">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-semibold">メンバーシップ</h2>
            <span className={`px-2 py-1 rounded text-sm ${isMember ? 'bg-green-500/10 text-green-400' : 'bg-gray-600/30 text-gray-300'}`}>
              {isMember ? '登録中' : '未登録'}
            </span>
          </div>
          <div className="mt-4 flex items-center gap-4">
            {isMember ? (
              <button onClick={handleCancelMembership} className="bg-red-600 hover:bg-red-700 px-4 py-2 rounded">退会する</button>
            ) : (
              <button onClick={() => navigate('/subscription')} className="bg-primary hover:bg-primary/90 px-4 py-2 rounded">メンバーシップに登録</button>
            )}
          </div>
          <p className="text-gray-400 text-xs mt-2">退会はメンバーシップ登録者のみ可能です。</p>
        </div>

        <div className="text-center">
          <button onClick={seedMock} className="text-xs text-gray-400 underline">デモデータを投入（視聴/購入履歴・メンバーシップ）</button>
        </div>
      </div>
    </div>
  );
}
