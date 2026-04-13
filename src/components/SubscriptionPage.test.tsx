import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { MemoryRouter } from 'react-router-dom';
import SubscriptionPage from './SubscriptionPage';

const { mockNavigate, mockApi, mockLogoutAll } = vi.hoisted(() => ({
  mockNavigate: vi.fn(),
  mockLogoutAll: vi.fn(),
  mockApi: {
    getSubscriptionPlans: vi.fn(),
    subscribeCurrent: vi.fn(),
  },
}));

vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual<typeof import('react-router-dom')>('react-router-dom');
  return {
    ...actual,
    useNavigate: () => mockNavigate,
  };
});

vi.mock('../lib/useApiClient', () => ({
  default: () => mockApi,
}));

vi.mock('../lib/authBridge', () => ({
  useAuthStatus: () => ({
    isAuthenticated: true,
    logoutAll: mockLogoutAll,
  }),
}));

vi.mock('./common/Header', () => ({
  Header: () => <div data-testid="header" />,
}));

describe('SubscriptionPage', () => {
  beforeEach(() => {
    mockNavigate.mockReset();
    mockLogoutAll.mockReset();
    mockApi.getSubscriptionPlans.mockReset();
    mockApi.subscribeCurrent.mockReset();
    vi.stubEnv('VITE_USE_MOCK_SUBSCRIPTIONS', 'false');

    mockApi.getSubscriptionPlans.mockResolvedValue({
      items: [
        {
          id: 'plan-basic',
          name: 'ベーシックプラン',
          description: '全作品見放題',
          price_monthly: 500,
          is_active: true,
          created_at: '2026-01-01T00:00:00.000Z',
          updated_at: '2026-01-01T00:00:00.000Z',
        },
      ],
    });
    mockApi.subscribeCurrent.mockResolvedValue({
      active: true,
      subscription: {
        id: 'subscription-1',
        user_id: 'user-1',
        plan_id: 'plan-basic',
        status: 'active',
        started_at: '2026-01-01T00:00:00.000Z',
        renews_at: '2026-02-01T00:00:00.000Z',
        canceled_at: null,
        ended_at: null,
        created_at: '2026-01-01T00:00:00.000Z',
        updated_at: '2026-01-01T00:00:00.000Z',
        plan_name: 'ベーシックプラン',
        price_monthly: 500,
        plan_is_active: true,
      },
    });
  });

  afterEach(() => {
    vi.unstubAllEnvs();
    vi.restoreAllMocks();
  });

  it('loads plans and subscribes the selected plan', async () => {
    render(
      <MemoryRouter>
        <SubscriptionPage />
      </MemoryRouter>,
    );

    await waitFor(() => {
      expect(mockApi.getSubscriptionPlans).toHaveBeenCalledTimes(1);
    });

    expect(await screen.findByText('ベーシックプラン')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'このプランを選択' }));
    fireEvent.click(screen.getByRole('button', { name: '次へ進む' }));

    await screen.findByText('支払い情報の入力');
    fireEvent.click(screen.getByRole('button', { name: '登録する' }));

    await waitFor(() => {
      expect(mockApi.subscribeCurrent).toHaveBeenCalledWith({ plan_id: 'plan-basic' });
    });
    expect(mockNavigate).toHaveBeenCalledWith('/account');
  });
});
