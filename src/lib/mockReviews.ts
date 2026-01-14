import { Review } from './apiClient';

const STORAGE_KEY = 'mock_reviews_v1';

type Store = Record<string, Review[]>; // movieId -> reviews

function loadStore(): Store {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return {};
    return JSON.parse(raw) as Store;
  } catch {
    return {};
  }
}

function saveStore(s: Store) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(s));
}

function genId() {
  return Math.random().toString(36).slice(2) + Date.now().toString(36);
}

export async function getReviews(movieId: string): Promise<Review[]> {
  const s = loadStore();
  const items = s[movieId] || [];
  // 新しい順
  return items.slice().sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1));
}

export async function addReview(movieId: string, rating: number, comment: string) {
  const s = loadStore();
  const items = s[movieId] || [];
  const now = new Date().toISOString();
  const r: Review = {
    id: genId(),
    movieId,
    userId: 'mock-user',
    displayName: 'ゲスト',
    rating,
    comment,
    createdAt: now,
  };
  items.push(r);
  s[movieId] = items;
  saveStore(s);
}

export function clearAll() {
  localStorage.removeItem(STORAGE_KEY);
}

