import { render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import ReviewSection from './ReviewSection';

const { mockApi, mockAuthStatus } = vi.hoisted(() => ({
  mockApi: {
    getReviews: vi.fn(),
    addReview: vi.fn(),
  },
  mockAuthStatus: {
    isAuthenticated: false,
    loginHosted: vi.fn(),
  },
}));

vi.mock('../lib/useApiClient', () => ({
  default: () => mockApi,
}));

vi.mock('../lib/authBridge', () => ({
  useAuthStatus: () => mockAuthStatus,
}));

describe('ReviewSection', () => {
  beforeEach(() => {
    vi.stubEnv('VITE_USE_MOCK_REVIEWS', 'false');
    mockApi.getReviews.mockReset();
    mockApi.addReview.mockReset();
    mockApi.getReviews.mockResolvedValue({ items: [] });
  });

  it('uses コメント wording on the detail page section', async () => {
    render(<ReviewSection movieId="movie-1" />);

    await waitFor(() => {
      expect(mockApi.getReviews).toHaveBeenCalledWith('movie-1');
    });

    expect(screen.getByRole('heading', { name: 'コメント' })).toBeInTheDocument();
    expect(screen.getByText('最初のコメントを投稿しましょう。')).toBeInTheDocument();
    expect(screen.queryByText('レビュー')).not.toBeInTheDocument();
  });
});
