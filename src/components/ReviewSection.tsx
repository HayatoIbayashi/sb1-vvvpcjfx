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
    return reviews.reduce((sum, review) => sum + review.rating, 0) / reviews.length;
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
      // 取得失敗時の表示は出さず、空状態のままにする。
    }
  };

  useEffect(() => {
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [movieId]);

  const submit = async () => {
    try {
      if (!useMock && !isAuthenticated) {
        return loginHosted();
      }
      if (!(rating >= 1 && rating <= 5)) {
        throw new Error('評価は1から5で選択してください');
      }
      if (!comment.trim()) {
        throw new Error('コメントを入力してください');
      }

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
      setError(e instanceof Error ? e.message : 'コメントの投稿に失敗しました');
    } finally {
      setLoading(false);
    }
  };

  return (
    <section className="mt-10">
      <h2 className="mb-4 text-2xl font-bold text-white">コメント</h2>

      <div className="mb-4 flex items-center gap-2">
        <StarBar value={avg} />
        <span className="text-sm text-gray-300">{reviews.length}件</span>
      </div>

      <div className="mb-6 rounded bg-gray-800 p-4">
        {error && <p className="mb-2 text-red-500">{error}</p>}
        <div className="mb-3 flex items-center gap-3">
          <label className="text-gray-300">評価</label>
          <div className="flex items-center">
            {[1, 2, 3, 4, 5].map((n) => (
              <button
                key={n}
                type="button"
                onClick={() => setRating(n)}
                className="mr-1 text-2xl"
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
          placeholder="動画の感想を入力..."
          className="mb-3 w-full rounded bg-gray-700 px-3 py-2 text-white"
        />
        <button
          onClick={submit}
          disabled={loading}
          className="rounded bg-blue-600 px-4 py-2 text-white hover:bg-blue-700 disabled:bg-blue-600/60"
        >
          {loading ? '投稿中...' : '投稿する'}
        </button>
      </div>

      <ul className="space-y-4">
        {reviews.map((review) => (
          <li key={review.id} className="rounded bg-gray-800 p-4">
            <div className="mb-2 flex items-center justify-between">
              <div className="text-sm text-gray-300">{review.displayName || '匿名'} さん</div>
              <StarBar value={review.rating} />
            </div>
            <p className="whitespace-pre-wrap text-gray-200">{review.comment}</p>
            <div className="mt-2 text-xs text-gray-500">{new Date(review.createdAt).toLocaleString()}</div>
          </li>
        ))}
        {!reviews.length && (
          <li className="text-gray-400">最初のコメントを投稿しましょう。</li>
        )}
      </ul>
    </section>
  );
}

function StarBar({ value }: { value: number }) {
  const full = Math.round(value);
  return (
    <div className="text-lg text-yellow-400" aria-label={`評価 ${value.toFixed(1)}`}>
      {[1, 2, 3, 4, 5].map((n) => (
        <span key={n} className={n <= full ? '' : 'text-gray-500'}>★</span>
      ))}
      <span className="ml-2 text-sm text-gray-300">{value ? value.toFixed(1) : '-.-'}</span>
    </div>
  );
}
