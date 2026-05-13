import { useEffect, useMemo, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Header } from './common/Header';
import { useAuthStatus } from '../lib/authBridge';
import useApiClient from '../lib/useApiClient';
import type { Purchase } from '../lib/apiClient';
import useHeaderGenres from '../lib/useHeaderGenres';

function matchesQuery(purchase: Purchase, query: string) {
  const normalized = query.trim().toLowerCase();
  if (!normalized) return true;
  return (purchase.title ?? '').toLowerCase().includes(normalized);
}

function formatPurchasedAt(value: string | null) {
  if (!value) return '購入日時未記録';

  try {
    return new Intl.DateTimeFormat('ja-JP', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    }).format(new Date(value));
  } catch {
    return value;
  }
}

function formatAmount(amount: number, currency: string) {
  try {
    return new Intl.NumberFormat('ja-JP', {
      style: 'currency',
      currency: currency || 'JPY',
    }).format(amount);
  } catch {
    return `${amount.toLocaleString('ja-JP')} ${currency}`;
  }
}

export default function LibraryPage() {
  const location = useLocation();
  const navigate = useNavigate();
  const api = useApiClient();
  const { isAuthenticated, logoutAll } = useAuthStatus();
  const [searchQuery, setSearchQuery] = useState('');
  const [purchases, setPurchases] = useState<Purchase[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const genreOptions = useHeaderGenres();

  useEffect(() => {
    let cancelled = false;

    const loadLibrary = async () => {
      if (!isAuthenticated) {
        setPurchases([]);
        setIsLoading(false);
        return;
      }

      setIsLoading(true);
      setError(null);
      try {
        const res = await api.getPurchases({ status: 'completed' });
        if (!cancelled) {
          setPurchases(res.items);
        }
      } catch (loadError) {
        console.error('Error fetching library purchases:', loadError);
        if (!cancelled) {
          setError('購入済み一覧の取得に失敗しました。');
        }
      } finally {
        if (!cancelled) {
          setIsLoading(false);
        }
      }
    };

    void loadLibrary();
    return () => {
      cancelled = true;
    };
  }, [api, isAuthenticated]);

  const filteredPurchases = useMemo(
    () => purchases.filter((purchase) => matchesQuery(purchase, searchQuery)),
    [purchases, searchQuery],
  );

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-gray-900">
        <Header
          isAuthenticated={false}
          onLogin={() => navigate('/login')}
          onLogout={logoutAll}
          searchQuery=""
          onSearchChange={() => { }}
          genreOptions={genreOptions}
        />
        <main className="container mx-auto px-4 pb-12 pt-24">
          <div className="mx-auto max-w-xl rounded-lg bg-gray-800 p-8 text-center text-white">
            <h1 className="mb-4 text-2xl font-bold">購入した動画</h1>
            <p className="mb-6 text-gray-300">購入済み作品を見るにはログインが必要です。</p>
            <button
              onClick={() => navigate('/login')}
              className="rounded bg-blue-600 px-6 py-2 font-semibold hover:bg-blue-700"
            >
              ログインへ
            </button>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-900">
      <Header
        isAuthenticated={isAuthenticated}
        onLogin={() => navigate('/login')}
        onLogout={logoutAll}
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        genreOptions={genreOptions}
      />

      <main className="container mx-auto px-4 pb-12 pt-24">
        <div className="mb-6 flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
          <div>
            <h1 className="text-2xl font-bold text-white">購入した動画</h1>
            <p className="mt-1 text-sm text-gray-400">
              購入済み作品を確認できます。表示中 {filteredPurchases.length} 件です。
            </p>
          </div>
          <button
            onClick={() => navigate('/account')}
            className="rounded-lg border border-gray-700 px-4 py-2 text-sm text-gray-200 hover:bg-gray-800"
          >
            アカウント設定へ
          </button>
        </div>

        {error && (
          <div className="mb-6 rounded-lg border border-red-500/40 bg-red-500/10 px-4 py-3 text-sm text-red-200">
            {error}
          </div>
        )}

        {isLoading ? (
          <div className="flex h-40 items-center justify-center">
            <div className="h-8 w-8 animate-spin rounded-full border-b-2 border-white"></div>
          </div>
        ) : filteredPurchases.length === 0 ? (
          <div className="rounded-lg bg-gray-800 p-8 text-center text-gray-300">
            {purchases.length === 0
              ? '購入済みの作品はまだありません。'
              : '検索条件に一致する購入済み作品はありません。'}
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {filteredPurchases.map((purchase) => (
              <article
                key={purchase.id}
                className="overflow-hidden rounded-xl border border-gray-800 bg-gray-800 shadow-lg"
              >
                {purchase.thumbnail ? (
                  <button
                    onClick={() => navigate(`/movies/${purchase.movie_id}`, { state: { from: location } })}
                    className="block w-full text-left"
                  >
                    <img
                      src={purchase.thumbnail}
                      alt={purchase.title ?? '購入済み作品'}
                      className="aspect-[16/9] w-full object-cover"
                    />
                  </button>
                ) : (
                  <button
                    onClick={() => navigate(`/movies/${purchase.movie_id}`, { state: { from: location } })}
                    className="flex aspect-[16/9] w-full items-center justify-center bg-gradient-to-br from-gray-700 to-gray-900 text-sm font-semibold text-gray-300"
                  >
                    購入済み作品
                  </button>
                )}
                <div className="space-y-4 p-5">
                  <div>
                    <p className="mb-2 text-xs font-semibold uppercase tracking-[0.2em] text-emerald-300">
                      Purchased
                    </p>
                    <h2 className="text-xl font-bold text-white">
                      {purchase.title ?? 'タイトル未設定'}
                    </h2>
                  </div>

                  <dl className="space-y-2 text-sm text-gray-300">
                    <div className="flex items-start justify-between gap-4">
                      <dt className="text-gray-400">購入日時</dt>
                      <dd className="text-right">{formatPurchasedAt(purchase.purchased_at)}</dd>
                    </div>
                    <div className="flex items-start justify-between gap-4">
                      <dt className="text-gray-400">購入金額</dt>
                      <dd>{formatAmount(purchase.amount_total, purchase.currency)}</dd>
                    </div>
                    <div className="flex items-start justify-between gap-4">
                      <dt className="text-gray-400">ステータス</dt>
                      <dd className="capitalize">{purchase.status}</dd>
                    </div>
                  </dl>

                  <button
                    onClick={() => navigate(`/movies/${purchase.movie_id}`, { state: { from: location } })}
                    className="w-full rounded-lg bg-white px-4 py-2 text-sm font-semibold text-gray-900 hover:bg-gray-100"
                  >
                    作品詳細を見る
                  </button>
                </div>
              </article>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
