import { render, screen, waitFor } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import SubscriptionCompletionPage from './SubscriptionCompletionPage';

const { mockApi } = vi.hoisted(() => ({
  mockApi: {
    getSubscriptionCurrent: vi.fn(),
  },
}));

vi.mock('../lib/useApiClient', () => ({
  default: () => mockApi,
}));

vi.mock('../lib/authBridge', () => ({
  useAuthStatus: () => ({
    isAuthenticated: true,
  }),
}));

describe('SubscriptionCompletionPage', () => {
  it('returns to the original screen after membership activation is confirmed', async () => {
    mockApi.getSubscriptionCurrent.mockResolvedValue({
      active: true,
      subscription: {
        id: 'subscription-1',
        user_id: 'user-1',
        plan_id: 'plan-membership',
        status: 'active',
        started_at: '2026-04-01T00:00:00.000Z',
        renews_at: '2026-05-01T00:00:00.000Z',
        canceled_at: null,
        ended_at: null,
        created_at: '2026-04-01T00:00:00.000Z',
        updated_at: '2026-04-01T00:00:00.000Z',
        plan_name: 'メンバーシップ',
        price_monthly: 1000,
        plan_is_active: true,
      },
    });

    render(
      <MemoryRouter initialEntries={['/subscription/complete?returnTo=%2Fmovies%2Fmovie-1']}>
        <Routes>
          <Route path="/subscription/complete" element={<SubscriptionCompletionPage />} />
          <Route path="/movies/:id" element={<div>detail returned</div>} />
        </Routes>
      </MemoryRouter>,
    );

    await waitFor(() => {
      expect(mockApi.getSubscriptionCurrent).toHaveBeenCalledTimes(1);
    });
    expect(await screen.findByText('detail returned')).toBeInTheDocument();
  });
});
