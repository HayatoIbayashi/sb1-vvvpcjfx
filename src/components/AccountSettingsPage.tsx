import { useEffect, useMemo, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Header } from './common/Header';
import type { RecommendationPreferences as RecommendationPreferencesPayload, SubscriptionCurrent } from '../lib/apiClient';
import { getBillingToken, useAuthStatus } from '../lib/authBridge';
import {
  RECOMMENDATION_CONTENT_FILTER_MASTER,
  RECOMMENDATION_GENRE_MASTER,
  type RecommendationPreferenceOption,
} from '../lib/recommendationPreferenceMaster';
import { buildSubscriptionPath, getReturnToFromLocation } from '../lib/subscriptionNavigation';
import useApiClient from '../lib/useApiClient';
import useHeaderGenres from '../lib/useHeaderGenres';

type Profile = {
  displayName: string;
  email: string;
  gender: string;
  age: number | '';
  prefecture: string;
};

type RecommendationPreferences = RecommendationPreferencesPayload;
type RecommendationPreferencesResponse = Partial<RecommendationPreferences> | null | undefined;

type Watch = {
  id: string;
  title: string;
  watchedAt: string;
};

type OidcProfile = {
  email?: string;
  name?: string;
  auth_time?: number | string;
  created_at?: number | string;
  updated_at?: number | string;
};

type OidcUser = {
  id_token?: string;
  idToken?: string;
  profile?: OidcProfile;
};

const GENDER_OPTIONS = [
  { value: 'male', label: '男性' },
  { value: 'female', label: '女性' },
  { value: 'other', label: 'その他' },
  { value: 'prefer_not_to_say', label: '回答しない' },
];

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

const LS_PROFILE = 'mock_account_profile_v1';
const LS_MEMBER = 'mock_is_member_v1';
const LS_WATCH = 'mock_watch_history_v1';
const LS_REGISTERED_AT = 'mock_registered_at_v1';
const LS_RECOMMENDATION_PREFERENCES = 'account_recommendation_preferences_v1';

const CONTENT_FILTER_MASTER_IDS = new Set(RECOMMENDATION_CONTENT_FILTER_MASTER.map((option) => option.id));
const GENRE_MASTER_IDS = new Set(RECOMMENDATION_GENRE_MASTER.map((option) => option.id));

function loadJSON<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return fallback;
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

function saveJSON<T>(key: string, value: T) {
  localStorage.setItem(key, JSON.stringify(value));
}

function sanitizeSelection(values: unknown, allowedIds: Set<string>) {
  if (!Array.isArray(values)) return [];

  return Array.from(
    new Set(
      values.filter((value): value is string => typeof value === 'string' && allowedIds.has(value)),
    ),
  );
}

function sanitizeRecommendationPreferences(
  raw: RecommendationPreferencesResponse,
): RecommendationPreferences {
  return {
    hiddenCategoryIds: sanitizeSelection(raw?.hiddenCategoryIds, CONTENT_FILTER_MASTER_IDS),
    warningCategoryIds: sanitizeSelection(raw?.warningCategoryIds, CONTENT_FILTER_MASTER_IDS),
    desiredGenreIds: sanitizeSelection(raw?.desiredGenreIds, GENRE_MASTER_IDS),
  };
}

function toggleRecommendationSelection(
  current: RecommendationPreferences,
  key: keyof RecommendationPreferences,
  optionId: string,
): RecommendationPreferences {
  const nextSet = new Set(current[key]);

  if (nextSet.has(optionId)) {
    nextSet.delete(optionId);
  } else {
    nextSet.add(optionId);
  }

  if (key === 'hiddenCategoryIds') {
    const warningSet = new Set(current.warningCategoryIds);
    warningSet.delete(optionId);
    return {
      ...current,
      hiddenCategoryIds: Array.from(nextSet),
      warningCategoryIds: Array.from(warningSet),
    };
  }

  if (key === 'warningCategoryIds') {
    const hiddenSet = new Set(current.hiddenCategoryIds);
    hiddenSet.delete(optionId);
    return {
      ...current,
      hiddenCategoryIds: Array.from(hiddenSet),
      warningCategoryIds: Array.from(nextSet),
    };
  }

  return {
    ...current,
    desiredGenreIds: Array.from(nextSet),
  };
}

type PreferenceButtonGroupProps = {
  title: string;
  description: string;
  options: RecommendationPreferenceOption[];
  selectedIds: string[];
  selectedTone: 'red' | 'amber' | 'sky';
  onToggle: (optionId: string) => void;
};

function PreferenceButtonGroup({
  title,
  description,
  options,
  selectedIds,
  selectedTone,
  onToggle,
}: PreferenceButtonGroupProps) {
  const selectedSet = new Set(selectedIds);

  const selectedClassMap = {
    red: 'border-red-400 bg-red-500/10 text-red-200',
    amber: 'border-amber-400 bg-amber-500/10 text-amber-100',
    sky: 'border-sky-400 bg-sky-500/10 text-sky-100',
  } as const;

  return (
    <div className="rounded-lg bg-gray-700/40 p-4">
      <h3 className="text-base font-semibold text-white">{title}</h3>
      <p className="mt-2 text-sm text-gray-300">{description}</p>
      <div className="mt-4 grid gap-3 sm:grid-cols-2">
        {options.map((option) => {
          const isSelected = selectedSet.has(option.id);
          return (
            <button
              key={option.id}
              type="button"
              aria-pressed={isSelected}
              aria-label={`${title}:${option.label}`}
              onClick={() => onToggle(option.id)}
              className={`rounded-lg border px-4 py-3 text-left transition ${isSelected
                  ? selectedClassMap[selectedTone]
                  : 'border-gray-600 bg-gray-800/80 text-gray-200 hover:border-gray-500 hover:bg-gray-800'
                }`}
            >
              <div className="font-medium">{option.label}</div>
              {option.description && (
                <div className="mt-1 text-xs text-gray-400">{option.description}</div>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}

export default function AccountSettingsPage() {
  const { isAuthenticated, logoutAll } = useAuthStatus();
  const auth = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const api = useApiClient();
  const genreOptions = useHeaderGenres();
  const useMockProfile = import.meta.env.VITE_USE_MOCK_PROFILE === 'true';
  const useMockSubscriptions = import.meta.env.VITE_USE_MOCK_SUBSCRIPTIONS === 'true';
  const useMockWatchHistory = import.meta.env.VITE_USE_MOCK_WATCH_HISTORY === 'true';
  const subscriptionPath = useMemo(
    () => buildSubscriptionPath(getReturnToFromLocation(location)),
    [location],
  );
  const oidcUser = auth.user as OidcUser | null | undefined;
  const oidcProfile = oidcUser?.profile;

  const initialProfile: Profile = useMemo(() => {
    const stored = loadJSON<Partial<Profile> | null>(LS_PROFILE, null);
    const email = oidcProfile?.email || '';
    const displayName = oidcProfile?.name || 'User';

    return {
      displayName: stored?.displayName ?? displayName,
      email: stored?.email ?? email,
      gender: stored?.gender ?? '',
      age: stored?.age ?? '',
      prefecture: stored?.prefecture ?? '',
    };
  }, [oidcProfile]);

  const initialRegisteredAt = useMemo(() => {
    try {
      const stored = localStorage.getItem(LS_REGISTERED_AT);
      if (stored) return stored;

      const authTime = oidcProfile?.auth_time;
      const created = oidcProfile?.created_at ?? oidcProfile?.updated_at;
      const iso = authTime
        ? new Date(Number(authTime) * 1000).toISOString()
        : typeof created === 'number'
          ? new Date(Number(created) * 1000).toISOString()
          : (typeof created === 'string' ? created : new Date().toISOString());

      localStorage.setItem(LS_REGISTERED_AT, iso);
      return iso;
    } catch {
      const now = new Date().toISOString();
      try {
        localStorage.setItem(LS_REGISTERED_AT, now);
      } catch {
        return now;
      }
      return now;
    }
  }, [oidcProfile]);

  const [profile, setProfile] = useState<Profile>(initialProfile);
  const [recommendationPreferences, setRecommendationPreferences] = useState<RecommendationPreferences>(() =>
    sanitizeRecommendationPreferences(
      loadJSON<Partial<RecommendationPreferences> | null>(LS_RECOMMENDATION_PREFERENCES, null),
    ),
  );
  const [saved, setSaved] = useState('');
  const [isMember, setIsMember] = useState<boolean>(() => loadJSON<boolean>(LS_MEMBER, false));
  const [subscriptionInfo, setSubscriptionInfo] = useState<SubscriptionCurrent['subscription'] | null>(null);
  const [watchHistory, setWatchHistory] = useState<Watch[]>(() => loadJSON<Watch[]>(LS_WATCH, []));
  const [isBillingPortalLoading, setIsBillingPortalLoading] = useState(false);
  const [isSubscriptionActionLoading, setIsSubscriptionActionLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    setProfile(initialProfile);
  }, [initialProfile]);

  useEffect(() => {
    let cancelled = false;

    const loadProfile = async () => {
      if (!isAuthenticated || useMockProfile) return;

      try {
        const result = await api.getProfile();
        if (cancelled) return;

        setProfile((current) => ({
          ...current,
          displayName: result.display_name ?? current.displayName,
          email: result.email ?? current.email,
          gender: result.gender ?? '',
          age: result.age ?? '',
          prefecture: result.prefecture ?? '',
        }));
        setRecommendationPreferences(
          sanitizeRecommendationPreferences(result.recommendation_preferences),
        );
        saveJSON(
          LS_RECOMMENDATION_PREFERENCES,
          sanitizeRecommendationPreferences(result.recommendation_preferences),
        );
      } catch (error) {
        console.error('Error fetching profile:', error);
      }
    };

    void loadProfile();
    return () => {
      cancelled = true;
    };
  }, [api, isAuthenticated, useMockProfile]);

  useEffect(() => {
    let cancelled = false;

    const loadWatchHistory = async () => {
      if (!isAuthenticated || useMockWatchHistory) return;

      try {
        const result = await api.getWatchHistory({ limit: 20 });
        if (cancelled) return;

        const mapped = result.items.map((item) => ({
          id: item.movie_id,
          title: item.title,
          watchedAt: item.watched_at,
        }));

        setWatchHistory(mapped);
      } catch (error) {
        console.error('Error fetching watch history:', error);
      }
    };

    void loadWatchHistory();
    return () => {
      cancelled = true;
    };
  }, [api, isAuthenticated, useMockWatchHistory]);

  useEffect(() => {
    let cancelled = false;

    const loadSubscription = async () => {
      if (!isAuthenticated || useMockSubscriptions) return;

      try {
        const result = await api.getSubscriptionCurrent();
        if (cancelled) return;

        setIsMember(result.active);
        setSubscriptionInfo(result.subscription);
      } catch (error) {
        console.error('Error fetching subscription:', error);
      }
    };

    void loadSubscription();
    return () => {
      cancelled = true;
    };
  }, [api, isAuthenticated, useMockSubscriptions]);

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-gray-900 text-white">
        <Header
          isAuthenticated={false}
          onLogin={() => navigate('/login')}
          onLogout={logoutAll}
          searchQuery={searchQuery}
          onSearchChange={setSearchQuery}
          genreOptions={genreOptions}
        />
        <div className="flex min-h-screen items-center justify-center px-4 pt-24">
          <div className="w-full max-w-md rounded-lg bg-gray-800 p-8 text-center text-white">
            <p className="mb-6">
              アカウント設定を利用するにはログインが必要です。会員登録がまだの場合は、無料会員として登録してください。
            </p>
            <div className="flex flex-col gap-3">
              <button
                onClick={() => navigate('/login')}
                className="w-full rounded bg-blue-600 py-2 font-semibold hover:bg-blue-700"
              >
                ログイン
              </button>
              <button
                onClick={() => navigate('/signup')}
                className="w-full rounded border border-gray-600 py-2 font-semibold hover:bg-gray-700"
              >
                会員登録する
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  const handleSave = async () => {
    let nextProfile = profile;

    if (!useMockProfile) {
      try {
        const updated = await api.updateProfile({
          displayName: profile.displayName || null,
          email: profile.email || null,
          gender: profile.gender && profile.gender !== 'prefer_not_to_say' ? profile.gender : null,
          age: profile.age === '' ? null : Number(profile.age),
          prefecture: profile.prefecture || null,
          recommendationPreferences,
        });

        nextProfile = {
          ...profile,
          displayName: updated.display_name ?? profile.displayName,
          email: updated.email ?? profile.email,
          gender: updated.gender ?? profile.gender,
          age: updated.age ?? profile.age,
          prefecture: updated.prefecture ?? profile.prefecture,
        };
        setProfile(nextProfile);
        setRecommendationPreferences(
          sanitizeRecommendationPreferences(updated.recommendation_preferences),
        );
      } catch (error) {
        console.error('Error updating profile:', error);
        setSaved('保存に失敗しました。');
        setTimeout(() => setSaved(''), 2500);
        return;
      }
    }

    saveJSON(LS_PROFILE, nextProfile);
    saveJSON(LS_RECOMMENDATION_PREFERENCES, recommendationPreferences);
    setSaved('保存しました。');
    setTimeout(() => setSaved(''), 2000);
  };

  const handleOpenBillingPortal = async () => {
    if (useMockSubscriptions) {
      alert('請求情報の管理は Stripe 連携時に利用できます。');
      return;
    }

    const billingToken = getBillingToken(auth);

    if (!billingToken) {
      alert('請求情報を管理するには再ログインが必要です。');
      return;
    }

    try {
      setIsBillingPortalLoading(true);
      const session = await api.createBillingPortalSession(
        { returnUrl: `${window.location.origin}/account` },
        billingToken,
      );
      window.location.assign(session.url);
    } catch (error) {
      console.error('Error opening billing portal:', error);
      alert('請求情報画面の起動に失敗しました。');
    } finally {
      setIsBillingPortalLoading(false);
    }
  };

  const handleCancelMembership = async () => {
    if (!isMember) return;
    if (!confirm('メンバーシップを解約しますか？')) return;

    if (!useMockSubscriptions) {
      const billingToken = getBillingToken(auth);
      if (!billingToken) {
        alert('メンバーシップを解約するには、もう一度ログインしてください。');
        return;
      }

      try {
        setIsSubscriptionActionLoading(true);
        const result = await api.cancelSubscriptionCurrent(billingToken);
        setIsMember(result.active);
        setSubscriptionInfo(result.subscription);
        saveJSON(LS_MEMBER, result.active);
        alert('メンバーシップを解約しました。');
      } catch (error) {
        console.error('Error canceling subscription:', error);
        alert('解約に失敗しました。');
      } finally {
        setIsSubscriptionActionLoading(false);
      }
      return;
    }

    setIsMember(false);
    setSubscriptionInfo(null);
    saveJSON(LS_MEMBER, false);
    alert('メンバーシップを解約しました。');
  };

  const seedMock = () => {
    const now = new Date();
    const nextWatchHistory: Watch[] = [
      { id: 'w1', title: '狂武蔵', watchedAt: new Date(now.getTime() - 1000 * 60 * 90).toISOString() },
      { id: 'w2', title: 'SAMPLE', watchedAt: new Date(now.getTime() - 1000 * 60 * 60 * 24).toISOString() },
    ];

    setWatchHistory(nextWatchHistory);
    saveJSON(LS_WATCH, nextWatchHistory);
    setIsMember(true);
    setSubscriptionInfo({
      id: 'mock-subscription',
      user_id: 'mock-user',
      plan_id: 'mock-membership',
      status: 'active',
      started_at: new Date(now.getTime() - 1000 * 60 * 60 * 24 * 14).toISOString(),
      renews_at: new Date(now.getTime() + 1000 * 60 * 60 * 24 * 16).toISOString(),
      canceled_at: null,
      ended_at: null,
      created_at: new Date(now.getTime() - 1000 * 60 * 60 * 24 * 14).toISOString(),
      updated_at: now.toISOString(),
      plan_name: 'メンバーシップ',
      price_monthly: MEMBERSHIP_MONTHLY_PRICE,
      plan_is_active: true,
    });
    saveJSON(LS_MEMBER, true);
  };

  return (
    <div className="min-h-screen bg-gray-900 text-white">
      <Header
        isAuthenticated={isAuthenticated}
        onLogin={() => navigate('/login')}
        onLogout={logoutAll}
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        genreOptions={genreOptions}
      />
      <div className="container mx-auto max-w-4xl px-4 pb-12 pt-24">
        <h1 className="mb-6 text-3xl font-bold">アカウント設定</h1>

        <div className="mb-8 rounded-lg bg-gray-800 p-6">
          <h2 className="mb-4 text-xl font-semibold">プロフィール</h2>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <div>
              <label className="mb-2 block text-gray-300">表示名</label>
              <input
                type="text"
                value={profile.displayName}
                onChange={(event) => setProfile({ ...profile, displayName: event.target.value })}
                className="w-full rounded bg-gray-700 px-4 py-2 text-white"
                placeholder="表示名"
              />
            </div>
            <div>
              <label className="mb-2 block text-gray-300">メールアドレス</label>
              <input
                type="email"
                value={profile.email}
                onChange={(event) => setProfile({ ...profile, email: event.target.value })}
                className="w-full rounded bg-gray-700 px-4 py-2 text-white"
                placeholder="you@example.com"
              />
            </div>
            <div>
              <label className="mb-2 block text-gray-300">性別</label>
              <select
                value={profile.gender}
                onChange={(event) => setProfile({ ...profile, gender: event.target.value })}
                className="w-full rounded bg-gray-700 px-4 py-2 text-white"
              >
                <option value="">選択してください</option>
                {GENDER_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="mb-2 block text-gray-300">年齢</label>
              <input
                type="number"
                min={0}
                max={120}
                value={profile.age}
                onChange={(event) => {
                  const next = event.target.value;
                  setProfile({ ...profile, age: next === '' ? '' : Number(next) });
                }}
                className="w-full rounded bg-gray-700 px-4 py-2 text-white"
                placeholder="29"
              />
            </div>
            <div>
              <label className="mb-2 block text-gray-300">都道府県</label>
              <select
                value={profile.prefecture}
                onChange={(event) => setProfile({ ...profile, prefecture: event.target.value })}
                className="w-full rounded bg-gray-700 px-4 py-2 text-white"
              >
                <option value="">選択してください</option>
                {PREFECTURES.map((prefecture) => (
                  <option key={prefecture} value={prefecture}>
                    {prefecture}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="mb-2 block text-gray-300">登録日</label>
              <div className="w-full rounded bg-gray-700 px-4 py-2 text-gray-200">
                {new Date(initialRegisteredAt).toLocaleString()}
              </div>
            </div>
          </div>
          <div className="mt-4 flex items-center justify-end gap-4">
            <button
              onClick={handleSave}
              className="rounded bg-blue-600 px-8 py-2 font-semibold hover:bg-blue-700"
            >
              保存
            </button>
            {saved && <span className="text-sm text-green-400">{saved}</span>}
          </div>
        </div>

        <div className="mb-8 rounded-lg bg-gray-800 p-6">
          <h2 className="text-xl font-semibold text-white">視聴設定</h2>
          <p className="mt-2 text-sm text-gray-300">
            レコメンド対象や表示制御に使う仮設定です。選択肢はマスター管理にしているので、今後は項目差し替えだけで拡張できます。
          </p>

          <div className="mt-6 grid gap-4">
            <PreferenceButtonGroup
              title="完全非表示"
              description="選択した項目を含む作品はレコメンド対象から除外します。"
              options={RECOMMENDATION_CONTENT_FILTER_MASTER}
              selectedIds={recommendationPreferences.hiddenCategoryIds}
              selectedTone="red"
              onToggle={(optionId) => {
                setRecommendationPreferences((current) =>
                  toggleRecommendationSelection(current, 'hiddenCategoryIds', optionId),
                );
              }}
            />

            <PreferenceButtonGroup
              title="警告表示"
              description="選択した項目を含む作品は表示前に注意喚起を出す想定です。完全非表示と重複した場合は完全非表示を優先します。"
              options={RECOMMENDATION_CONTENT_FILTER_MASTER}
              selectedIds={recommendationPreferences.warningCategoryIds}
              selectedTone="amber"
              onToggle={(optionId) => {
                setRecommendationPreferences((current) =>
                  toggleRecommendationSelection(current, 'warningCategoryIds', optionId),
                );
              }}
            />

            <PreferenceButtonGroup
              title="見たいジャンル"
              description="選択した項目を今後のおすすめで優先する想定です。"
              options={RECOMMENDATION_GENRE_MASTER}
              selectedIds={recommendationPreferences.desiredGenreIds}
              selectedTone="sky"
              onToggle={(optionId) => {
                setRecommendationPreferences((current) =>
                  toggleRecommendationSelection(current, 'desiredGenreIds', optionId),
                );
              }}
            />
          </div>

          <div className="mt-4 flex items-center justify-end gap-4">
            <button
              onClick={handleSave}
              className="rounded bg-blue-600 px-4 py-2 font-semibold hover:bg-blue-700"
            >
              視聴設定を保存
            </button>
            {saved && <span className="text-sm text-green-400">{saved}</span>}
          </div>
        </div>

        {false && (
          <div className="mb-8 rounded-lg border border-gray-700 bg-gray-800 p-6">
            <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
              <div>
                <h2 className="text-xl font-semibold">メンバーシップ</h2>
                <p className="mt-2 text-sm text-gray-300">
                  単品購入は提供していません。ログイン済みユーザーはメンバーシップ登録により全作品を視聴できます。
                </p>
              </div>
              <span
                className={`rounded px-3 py-1 text-sm ${isMember ? 'bg-green-500/10 text-green-400' : 'bg-gray-600/30 text-gray-300'
                  }`}
              >
                {isMember ? '登録中' : '未登録'}
              </span>
            </div>

            <div className="mt-6 grid gap-4 md:grid-cols-2">
              <div className="rounded-lg bg-gray-700/60 p-4">
                <p className="text-xs text-gray-400">料金</p>
                <p className="mt-2 text-lg font-semibold">月額 {membershipPrice.toLocaleString()} 円</p>
              </div>
              <div className="rounded-lg bg-gray-700/60 p-4">
                <p className="text-xs text-gray-400">次回更新日</p>
                <p className="mt-2 text-lg font-semibold">{renewalDate ?? '未設定'}</p>
              </div>
            </div>

            <div className="mt-6 flex flex-wrap gap-3">
              {isMember ? (
                <>
                  <button
                    onClick={() => {
                      void handleOpenBillingPortal();
                    }}
                    disabled={isBillingPortalLoading}
                    className="rounded bg-white px-8 py-2 font-semibold text-gray-900 hover:bg-gray-100 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    {isBillingPortalLoading ? '起動中...' : '請求情報を管理'}
                  </button>
                  <button
                    onClick={() => {
                      void handleCancelMembership();
                    }}
                    disabled={isSubscriptionActionLoading}
                    className="rounded bg-red-600 px-8 py-2 font-semibold hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    {isSubscriptionActionLoading ? '処理中...' : 'メンバーシップを解約する'}
                  </button>
                </>
              ) : (
                <button
                  onClick={() => navigate(subscriptionPath)}
                  className="rounded bg-primary px-8 py-2 font-semibold hover:bg-primary/90"
                >
                  メンバーシップに登録
                </button>
              )}
            </div>
          </div>
        )}

        <div className="grid gap-6 md:grid-cols-2">
          <div className="order-3 rounded-lg bg-gray-800 p-6">
            <h2 className="mb-4 text-xl font-semibold">視聴履歴</h2>
            <ul className="max-h-[7.5rem] space-y-2 overflow-y-auto pr-2">
              {watchHistory.length === 0 && <li className="text-sm text-gray-400">履歴はありません</li>}
              {watchHistory.map((item) => (
                <li key={item.id}>
                  <button
                    type="button"
                    onClick={() => navigate(`/movies/${item.id}`)}
                    className="flex w-full justify-between gap-4 rounded-md px-2 py-1 text-left text-sm text-gray-200 transition hover:bg-gray-700/60"
                  >
                    <span>{item.title}</span>
                    <span className="text-gray-400">{new Date(item.watchedAt).toLocaleString()}</span>
                  </button>
                </li>
              ))}
            </ul>
          </div>

          <div className="order-2 rounded-lg bg-gray-800 p-6">
            <h2 className="mb-4 text-xl font-semibold">ブックマーク</h2>
            <p className="text-sm text-gray-300">
              あとで見たい作品を一覧で管理できます。
            </p>
            <button
              onClick={() => navigate('/watchlist')}
              className="mt-6 ml-auto block rounded bg-gray-700 px-8 py-2 font-semibold hover:bg-gray-600"
            >
              ブックマークを開く
            </button>
          </div>
          <div className="order-1 rounded-lg bg-gray-800 p-6">
            <h2 className="mb-4 text-xl font-semibold">マイライブラリ</h2>
            <p className="text-sm text-gray-300">
              購入済みの作品を一覧で確認できます。
            </p>
            <button
              onClick={() => navigate('/library')}
              className="mt-6 ml-auto block rounded bg-gray-700 px-8 py-2 font-semibold hover:bg-gray-600"
            >
              マイライブラリを開く
            </button>
          </div>
        </div>

        <div className="mt-8 text-right">
          <button onClick={seedMock} className="text-xs text-gray-400 underline">
            デモデータを投入（視聴履歴・メンバーシップ）
          </button>
        </div>
      </div>
    </div>
  );
}
