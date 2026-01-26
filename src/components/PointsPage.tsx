import { useEffect, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import useApiClient from '../lib/useApiClient';

type ExpirationItem = {
  date: string;
  amount: number;
  type: 'paid' | 'bonus';
  note?: string;
};

type HistoryItem = {
  id: string;
  date: string;
  title: string;
  diff: number;
  type: 'credit' | 'debit';
};

const NO_EXPIRY_DATE = 'no-expiry';

function formatDate(date: string) {
  if (date === NO_EXPIRY_DATE) return '期限なし';
  return new Date(date).toLocaleDateString();
}

export default function PointsPage() {
  const navigate = useNavigate();
  const [showHistory, setShowHistory] = useState(false);
  const expirationRef = useRef<HTMLDivElement | null>(null);

  // 表示用のモックデータ。実データ連携時は API/ストアと置き換え想定。
  const api = useApiClient();
  const useMockWallet = import.meta.env.VITE_USE_MOCK_WALLET === 'true';

  const [summary, setSummary] = useState({
    total: 2300,
    expiringSoonAmount: 500,
    expiringSoonDate: '2025-12-01',
  });
  const [buckets, setBuckets] = useState([
    { label: '有償', amount: 1300, hint: '失効予定 2025-12-01' },
    { label: 'ボーナス', amount: 1000, hint: '期限なし' },
  ]);
  const [expirations, setExpirations] = useState<ExpirationItem[]>([
    { date: '2025-12-01', amount: 300, type: 'paid' },
    { date: '2025-12-20', amount: 200, type: 'paid' },
    { date: NO_EXPIRY_DATE, amount: 1000, type: 'bonus', note: 'キャンペーン' },
  ]);
  const [history, setHistory] = useState<HistoryItem[]>([
    { id: 'h1', date: '2025-09-05', title: 'ポイント利用', diff: -400, type: 'debit' },
    { id: 'h2', date: '2025-08-28', title: 'ポイント付与', diff: 1000, type: 'credit' },
    { id: 'h3', date: '2025-08-15', title: 'ボーナス付与', diff: 500, type: 'credit' },
    { id: 'h4', date: '2025-08-01', title: 'ポイント利用', diff: -300, type: 'debit' },
  ]);

  // ウォレット概要（残高/失効予定）を取得
  useEffect(() => {
    let cancelled = false;
    const loadWallet = async () => {
      if (useMockWallet) return;
      try {
        const res = await api.getWalletSummary();
        if (cancelled) return;
        setSummary({
          total: res.total_points,
          expiringSoonAmount: res.expiring_soon_amount,
          expiringSoonDate: res.expiring_soon_date || NO_EXPIRY_DATE,
        });
        setBuckets([
          { label: '有償', amount: res.paid_points, hint: res.expiring_soon_date ? `失効予定 ${res.expiring_soon_date}` : '失効予定なし' },
          { label: 'ボーナス', amount: res.bonus_points, hint: '期限なし' },
        ]);
        setExpirations(res.expirations.map((item) => ({
          date: item.date,
          amount: item.amount,
          type: item.type,
          note: item.note || undefined,
        })));
      } catch (error) {
        console.error('Error fetching wallet summary:', error);
      }
    };
    loadWallet();
    return () => {
      cancelled = true;
    };
  }, [api, useMockWallet]);

  // 取引履歴を取得
  useEffect(() => {
    let cancelled = false;
    const loadHistory = async () => {
      if (useMockWallet) return;
      try {
        const res = await api.getWalletTransactions();
        if (cancelled) return;
        setHistory(res.items.map((item) => ({
          id: item.id,
          date: item.date,
          title: item.title,
          diff: item.diff,
          type: item.type,
        })));
      } catch (error) {
        console.error('Error fetching wallet transactions:', error);
      }
    };
    loadHistory();
    return () => {
      cancelled = true;
    };
  }, [api, useMockWallet]);

  const handleJumpToExpirations = () => {
    expirationRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  return (
    <div className="min-h-screen bg-gray-900 text-white">
      <div className="container mx-auto px-4 pt-24 pb-16 max-w-5xl">
        {/* ヘッダー */}
        <div className="bg-gradient-to-r from-blue-600/30 via-indigo-600/20 to-purple-600/20 border border-blue-500/40 rounded-2xl p-6 shadow-lg">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div>
              <p className="text-sm text-blue-200">ポイント残高</p>
              <div className="flex items-end gap-3">
                <span className="text-4xl font-bold text-white">{summary.total.toLocaleString()} pt</span>
                <span className="text-sm text-gray-200">現在保有</span>
              </div>
              {summary.expiringSoonAmount > 0 && summary.expiringSoonDate !== NO_EXPIRY_DATE ? (
                <button
                  onClick={handleJumpToExpirations}
                  className="mt-2 text-sm text-blue-200 underline underline-offset-4 decoration-dotted hover:text-blue-100"
                >
                  うち {summary.expiringSoonAmount.toLocaleString()} pt が {summary.expiringSoonDate} に失効予定
                </button>
              ) : (
                <div className="mt-2 text-sm text-blue-200">失効予定なし</div>
              )}
            </div>
            <div className="flex items-center gap-3">
              <button
                onClick={() => navigate(-1)}
                className="px-4 py-2 rounded-lg bg-gray-800/70 hover:bg-gray-700 text-sm border border-gray-700"
              >
                前の画面に戻る
              </button>
              <Link
                to="/account"
                className="px-4 py-2 rounded-lg bg-white text-gray-900 font-semibold hover:bg-gray-100 text-sm"
              >
                マイページに戻る
              </Link>
            </div>
          </div>
        </div>

        {/* 内訳カード */}
        <div className="grid md:grid-cols-2 gap-4 mt-6">
          {buckets.map((bucket) => (
            <div key={bucket.label} className="bg-gray-800 rounded-xl p-5 border border-gray-700">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-400">{bucket.label}ポイント</p>
                  <p className="text-3xl font-bold text-white">{bucket.amount.toLocaleString()} pt</p>
                  <p className="text-xs text-gray-400 mt-1">{bucket.hint}</p>
                </div>
                <div className="text-xs text-gray-300 bg-gray-700/60 px-3 py-1 rounded-full border border-gray-600">
                  内訳を表示中
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* 失効予定一覧 */}
        <div ref={expirationRef} className="mt-8 bg-gray-800 rounded-xl border border-gray-700">
          <div className="flex items-center justify-between px-6 py-4 border-b border-gray-700">
            <h2 className="text-xl font-semibold">失効予定一覧</h2>
            <span className="text-sm text-gray-400">失効の早いものから自動で優先利用</span>
          </div>
          <div className="divide-y divide-gray-700">
            {expirations.map((item) => (
              <div key={`${item.date}-${item.amount}`} className="flex flex-col md:flex-row md:items-center md:justify-between px-6 py-4 gap-2">
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-full bg-blue-600/30 border border-blue-500/50 flex items-center justify-center text-blue-100 font-semibold">
                    {item.type === 'paid' ? '有償' : '無償'}
                  </div>
                  <div>
                    <p className="text-lg font-semibold">{item.amount.toLocaleString()} pt</p>
                    <p className="text-sm text-gray-400">{formatDate(item.date)}{item.note ? `（${item.note}）` : ''}</p>
                  </div>
                </div>
                <div className="text-sm text-gray-300 bg-gray-700/60 px-3 py-1 rounded-full border border-gray-600">
                  {item.date === NO_EXPIRY_DATE ? '期限なし' : '失効予定'}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* 注意書き */}
        <div className="mt-4 text-xs text-gray-400 space-y-1">
          <p>※ポイントは有効期限の早いものから自動的に優先して利用されます。</p>
          <p>※有償ポイントとボーナスポイントは合算して表示していますが、内訳は「詳細」をご確認ください。</p>
        </div>

        {/* 詳細履歴リンク */}
        <div id="points-history" className="mt-6 flex items-center justify-between bg-gray-800 rounded-xl border border-gray-700 px-6 py-4">
          <div>
            <p className="text-lg font-semibold">ポイント詳細履歴</p>
            <p className="text-sm text-gray-400">付与・利用の履歴を別タブまたはモーダルで確認できます。</p>
          </div>
          <div className="flex items-center gap-3">
            <a
              className="text-sm text-blue-300 underline underline-offset-4 decoration-dotted hover:text-blue-200"
              href="/account/points#points-history"
              target="_blank"
              rel="noreferrer"
            >
              別タブで開く
            </a>
            <button
              onClick={() => setShowHistory(true)}
              className="bg-white text-gray-900 px-4 py-2 rounded-lg font-semibold hover:bg-gray-100 text-sm"
            >
              詳細履歴を見る
            </button>
          </div>
        </div>

        {showHistory && (
          <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 px-4">
            <div className="bg-gray-900 border border-gray-700 rounded-2xl w-full max-w-3xl shadow-2xl overflow-hidden">
              <div className="flex items-center justify-between px-6 py-4 border-b border-gray-700">
                <h3 className="text-xl font-semibold">ポイント履歴</h3>
                <button
                  onClick={() => setShowHistory(false)}
                  className="text-sm text-gray-300 hover:text-white"
                >
                  閉じる
                </button>
              </div>
              <div className="max-h-[70vh] overflow-y-auto">
                <table className="w-full text-sm">
                  <thead className="bg-gray-800 text-gray-300">
                    <tr>
                      <th className="text-left px-6 py-3">日付</th>
                      <th className="text-left px-6 py-3">内容</th>
                      <th className="text-right px-6 py-3">増減</th>
                      <th className="text-left px-6 py-3">区分</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-800">
                    {history.map((item) => (
                      <tr key={item.id}>
                        <td className="px-6 py-3 text-gray-200">{formatDate(item.date)}</td>
                        <td className="px-6 py-3 text-gray-100">{item.title}</td>
                        <td className={`px-6 py-3 text-right font-semibold ${item.diff >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                          {item.diff >= 0 ? '+' : ''}{item.diff.toLocaleString()} pt
                        </td>
                        <td className="px-6 py-3 text-gray-200">{item.type === 'credit' ? '付与' : '利用'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <div className="px-6 py-4 bg-gray-800 text-gray-300 text-xs">
                ※履歴は最新順に表示しています。実データ反映時は付与/利用元とトランザクションIDを合わせて表示してください。
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
