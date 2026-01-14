import { useEffect, useMemo, useState } from 'react';
import useApiClient from '../lib/useApiClient';
import { Review } from '../lib/apiClient';
import { useAuthStatus } from '../lib/authBridge';
import * as mock from '../lib/mockReviews';

type Props = { movieId: string };

export default function ReviewSection({ movieId }: Props) {
  const api = useApiClient();
  const { isAuthenticated, loginHosted } = useAuthStatus();
  const [reviews, setReviews] = useState<Review[]>([]);
  const [rating, setRating] = useState<number>(5);
  const [comment, setComment] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const avg = useMemo(() => {
    if (!reviews.length) return 0;
    return reviews.reduce((s, r) => s + r.rating, 0) / reviews.length;
  }, [reviews]);

  const useMock = import.meta.env.VITE_USE_MOCK_REVIEWS === 'true';

  const load = async () => {
    try {
      setError('');
      if (useMock) {
        const items = await mock.getReviews(movieId);
        setReviews(items);
      } else {
        const res = await api.getReviews(movieId);
        setReviews(res.items);
      }
    } catch {
      // レビュー取得失敗時のユーザー向けエラー表示は抑止（いったん無視）
      // ここでは状態を変更せず静かにスキップします
    }
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [movieId]);

  const submit = async () => {
    try {
      if (!useMock && !isAuthenticated) return loginHosted();
      if (!(rating >= 1 && rating <= 5)) throw new Error('評価は1〜5で選択してください');
      if (!comment.trim()) throw new Error('コメントを入力してください');
      setLoading(true);
      if (useMock) {
        await mock.addReview(movieId, rating, comment.trim());
      } else {
        await api.addReview(movieId, rating, comment.trim());
      }
      setComment('');
      setRating(5);
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'レビューの投稿に失敗しました');
    } finally {
      setLoading(false);
    }
  };

  return (
    <section className="mt-10">
      <h2 className="text-2xl font-bold text-white mb-4">レビュー</h2>

      {/* 平均評価 */}
      <div className="flex items-center gap-2 mb-4">
        <StarBar value={avg} />
        <span className="text-gray-300 text-sm">{reviews.length}件</span>
      </div>

      {/* 入力 */}
      <div className="bg-gray-800 rounded p-4 mb-6">
        {error && <p className="text-red-500 mb-2">{error}</p>}
        <div className="flex items-center gap-3 mb-3">
          <label className="text-gray-300">評価</label>
          <div className="flex items-center">
            {[1,2,3,4,5].map(n => (
              <button
                key={n}
                type="button"
                onClick={() => setRating(n)}
                className="text-2xl mr-1"
                aria-label={`評価${n}`}
              >
                <span className={n <= rating ? 'text-yellow-400' : 'text-gray-500'}>★</span>
              </button>
            ))}
          </div>
        </div>
        <textarea
          value={comment}
          onChange={(e) => setComment(e.target.value)}
          rows={3}
          placeholder="作品の感想を入力..."
          className="w-full px-3 py-2 bg-gray-700 text-white rounded mb-3"
        />
        <button
          onClick={submit}
          disabled={loading}
          className="bg-blue-600 hover:bg-blue-700 disabled:bg-blue-600/60 text-white px-4 py-2 rounded"
        >
          {loading ? '投稿中...' : '投稿する'}
        </button>
      </div>

      {/* 一覧 */}
      <ul className="space-y-4">
        {reviews.map(r => (
          <li key={r.id} className="bg-gray-800 rounded p-4">
            <div className="flex items-center justify-between mb-2">
              <div className="text-sm text-gray-300">{r.displayName || '匿名'} さん</div>
              <StarBar value={r.rating} />
            </div>
            <p className="text-gray-200 whitespace-pre-wrap">{r.comment}</p>
            <div className="text-xs text-gray-500 mt-2">{new Date(r.createdAt).toLocaleString()}</div>
          </li>
        ))}
        {!reviews.length && (
          <li className="text-gray-400">最初のレビューを投稿しましょう。</li>
        )}
      </ul>
    </section>
  );
}

function StarBar({ value }: { value: number }) {
  const full = Math.round(value);
  return (
    <div className="text-yellow-400 text-lg" aria-label={`評価 ${value.toFixed(1)}`}>
      {[1,2,3,4,5].map(n => (
        <span key={n} className={n <= full ? '' : 'text-gray-500'}>★</span>
      ))}
      <span className="text-gray-300 text-sm ml-2">{value ? value.toFixed(1) : '-.-'}</span>
    </div>
  );
}
