import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { MemoryRouter } from 'react-router-dom';
import AccountSettingsPage from './AccountSettingsPage';

const { mockApi, mockAuth } = vi.hoisted(() => ({
  mockApi: {
    createBillingPortalSession: vi.fn(),
    getProfile: vi.fn(),
    getSubscriptionCurrent: vi.fn(),
    getWatchHistory: vi.fn(),
    updateProfile: vi.fn(),
    cancelSubscriptionCurrent: vi.fn(),
  },
  mockAuth: {
    user: {
      id_token: 'id-token-value',
      profile: {
        email: 'oidc@example.com',
        name: 'OIDC Name',
      },
    },
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

vi.mock('react-oidc-context', () => ({
  useAuth: () => mockAuth,
}));

describe('AccountSettingsPage', () => {
  beforeEach(() => {
    localStorage.clear();
    vi.stubEnv('VITE_USE_MOCK_PROFILE', 'false');
    vi.stubEnv('VITE_USE_MOCK_PURCHASES', 'true');
    vi.stubEnv('VITE_USE_MOCK_SUBSCRIPTIONS', 'true');
    vi.stubEnv('VITE_USE_MOCK_WATCH_HISTORY', 'true');
    vi.stubEnv('VITE_USE_MOCK_WALLET', 'true');

    mockApi.getProfile.mockReset();
    mockApi.createBillingPortalSession.mockReset();
    mockApi.getSubscriptionCurrent.mockReset();
    mockApi.getWatchHistory.mockReset();
    mockApi.updateProfile.mockReset();
    mockApi.cancelSubscriptionCurrent.mockReset();

    mockApi.getProfile.mockResolvedValue({
      id: 'user-1',
      email: 'user@example.com',
      display_name: 'DB Name',
      gender: 'male',
      age: 30,
      prefecture: '東京都',
      created_at: '2026-01-01T00:00:00.000Z',
      updated_at: '2026-01-01T00:00:00.000Z',
    });
    mockApi.getSubscriptionCurrent.mockResolvedValue({
      active: false,
      subscription: null,
    });
    mockApi.createBillingPortalSession.mockResolvedValue({
      url: 'https://billing.stripe.com/session/test',
    });
    mockApi.getWatchHistory.mockResolvedValue({
      items: [],
    });

    mockApi.updateProfile.mockResolvedValue({
      id: 'user-1',
      email: 'user@example.com',
      display_name: 'Updated Name',
      gender: 'male',
      age: 30,
      prefecture: '東京都',
      created_at: '2026-01-01T00:00:00.000Z',
      updated_at: '2026-01-02T00:00:00.000Z',
    });
    mockApi.cancelSubscriptionCurrent.mockResolvedValue({
      active: false,
      subscription: null,
    });
  });

  afterEach(() => {
    vi.unstubAllEnvs();
    vi.restoreAllMocks();
  });

  it('loads and saves displayName via profile api', async () => {
    render(
      <MemoryRouter>
        <AccountSettingsPage />
      </MemoryRouter>,
    );

    await waitFor(() => {
      expect(mockApi.getProfile).toHaveBeenCalledTimes(1);
    });

    const displayNameInput = await screen.findByPlaceholderText('表示名');
    await waitFor(() => {
      expect(displayNameInput).toHaveValue('DB Name');
    });

    fireEvent.change(displayNameInput, { target: { value: 'Updated Name' } });
    fireEvent.click(screen.getByRole('button', { name: '保存' }));

    await waitFor(() => {
      expect(mockApi.updateProfile).toHaveBeenCalledWith({
        displayName: 'Updated Name',
        email: 'user@example.com',
        gender: 'male',
        age: 30,
        prefecture: '東京都',
      });
    });

    await waitFor(() => {
      expect(displayNameInput).toHaveValue('Updated Name');
    });
  });

  it('cancels membership via subscription api', async () => {
    vi.stubEnv('VITE_USE_MOCK_SUBSCRIPTIONS', 'false');

    mockApi.getProfile.mockResolvedValue({
      id: 'user-1',
      email: 'user@example.com',
      display_name: 'DB Name',
      gender: 'male',
      age: 30,
      prefecture: '東京都',
      created_at: '2026-01-01T00:00:00.000Z',
      updated_at: '2026-01-01T00:00:00.000Z',
    });
    mockApi.getSubscriptionCurrent.mockResolvedValue({
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

    localStorage.setItem('mock_is_member_v1', JSON.stringify(true));
    vi.spyOn(window, 'confirm').mockReturnValue(true);
    vi.spyOn(window, 'alert').mockImplementation(() => {});

    render(
      <MemoryRouter>
        <AccountSettingsPage />
      </MemoryRouter>,
    );

    fireEvent.click(await screen.findByRole('button', { name: '退会する' }));

    await waitFor(() => {
      expect(mockApi.cancelSubscriptionCurrent).toHaveBeenCalledTimes(1);
    });
  });

  it('loads watch history via api', async () => {
    vi.stubEnv('VITE_USE_MOCK_WATCH_HISTORY', 'false');
    mockApi.getWatchHistory.mockResolvedValue({
      items: [
        {
          id: 'history-1',
          movie_id: 'movie-1',
          title: '作品A',
          thumbnail: null,
          watched_at: '2026-04-13T10:00:00.000Z',
        },
      ],
    });

    render(
      <MemoryRouter>
        <AccountSettingsPage />
      </MemoryRouter>,
    );

    expect(await screen.findByText('作品A')).toBeInTheDocument();
    await waitFor(() => {
      expect(mockApi.getWatchHistory).toHaveBeenCalledWith({ limit: 20 });
    });
  });

  it('opens billing portal with id token', async () => {
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
      <MemoryRouter>
        <AccountSettingsPage />
      </MemoryRouter>,
    );

    fireEvent.click(screen.getByRole('button', { name: 'お支払い方法を変更' }));

    await waitFor(() => {
      expect(mockApi.createBillingPortalSession).toHaveBeenCalledWith(
        { returnUrl: 'https://example.com/account' },
        'id-token-value',
      );
    });
    await waitFor(() => {
      expect(assignMock).toHaveBeenCalledWith('https://billing.stripe.com/session/test');
    });
  });
});
