import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { MemoryRouter } from 'react-router-dom';
import SubscriptionPage from './SubscriptionPage';

const {
  mockNavigate,
  mockApi,
  mockLogoutAll,
  mockGetBillingToken,
  mockAuth,
  mockUseMembershipStatus,
} = vi.hoisted(() => ({
  mockNavigate: vi.fn(),
  mockLogoutAll: vi.fn(),
  mockGetBillingToken: vi.fn(),
  mockAuth: {},
  mockUseMembershipStatus: vi.fn(),
  mockApi: {
    getSubscriptionPlans: vi.fn(),
    createSubscriptionCheckoutSession: vi.fn(),
  },
}));

vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual<typeof import('react-router-dom')>('react-router-dom');
  return {
    ...actual,
    useNavigate: () => mockNavigate,
  };
});

vi.mock('react-oidc-context', () => ({
  useAuth: () => mockAuth,
}));

vi.mock('../lib/useApiClient', () => ({
  default: () => mockApi,
}));

vi.mock('../lib/authBridge', () => ({
  getBillingToken: mockGetBillingToken,
  useAuthStatus: () => ({
    isAuthenticated: true,
    logoutAll: mockLogoutAll,
  }),
}));

vi.mock('../lib/useMembershipStatus', () => ({
  MEMBERSHIP_MONTHLY_PRICE: 1000,
  useMembershipStatus: () => mockUseMembershipStatus(),
}));

vi.mock('./common/Header', () => ({
  Header: () => <div data-testid="header" />,
}));

describe('SubscriptionPage', () => {
  beforeEach(() => {
    mockNavigate.mockReset();
    mockLogoutAll.mockReset();
    mockGetBillingToken.mockReset();
    mockUseMembershipStatus.mockReset();
    mockApi.getSubscriptionPlans.mockReset();
    mockApi.createSubscriptionCheckoutSession.mockReset();
    vi.stubEnv('VITE_USE_MOCK_SUBSCRIPTIONS', 'false');

    mockGetBillingToken.mockReturnValue('id-token-value');
    mockUseMembershipStatus.mockReturnValue({
      accessState: 'registered',
      isLoading: false,
    });
    mockApi.getSubscriptionPlans.mockResolvedValue({
      items: [
        {
          id: 'plan-membership',
          name: 'メンバーシップ',
          description: '全作品が見放題',
          price_monthly: 1000,
          stripe_price_id: 'price_membership',
          is_active: true,
          created_at: '2026-01-01T00:00:00.000Z',
          updated_at: '2026-01-01T00:00:00.000Z',
        },
      ],
    });
    mockApi.createSubscriptionCheckoutSession.mockResolvedValue({
      url: 'https://checkout.stripe.com/pay/cs_test_123',
      sessionId: 'cs_test_123',
    });
  });

  afterEach(() => {
    vi.unstubAllEnvs();
    vi.restoreAllMocks();
  });

  it('loads the membership plan and redirects to Stripe checkout with billing token', async () => {
    const assignMock = vi.fn();
    Object.defineProperty(window, 'location', {
      configurable: true,
      value: {
        ...window.location,
        origin: 'https://example.com',
        assign: assignMock,
      },
    });

    render(
      <MemoryRouter initialEntries={['/subscription?returnTo=%2Fmovies%2Fmovie-1']}>
        <SubscriptionPage />
      </MemoryRouter>,
    );

    await waitFor(() => {
      expect(mockApi.getSubscriptionPlans).toHaveBeenCalledTimes(1);
    });

    expect(await screen.findByRole('heading', { name: 'メンバーシップ', level: 3 })).toBeInTheDocument();
    expect((await screen.findAllByText(/1,000/)).length).toBeGreaterThan(0);

    fireEvent.click(screen.getByRole('button', { name: 'メンバーシップに登録' }));

    await waitFor(() => {
      expect(mockApi.createSubscriptionCheckoutSession).toHaveBeenCalledWith({
        plan_id: 'plan-membership',
        successUrl: 'https://example.com/subscription/complete?returnTo=%2Fmovies%2Fmovie-1',
        cancelUrl: 'https://example.com/subscription?returnTo=%2Fmovies%2Fmovie-1',
      }, 'id-token-value');
    });
    expect(assignMock).toHaveBeenCalledWith('https://checkout.stripe.com/pay/cs_test_123');
  });
});
