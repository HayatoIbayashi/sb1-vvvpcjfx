import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { MemoryRouter } from 'react-router-dom';
import AccountSettingsPage from './AccountSettingsPage';

const { mockApi, mockAuth, mockGetBillingToken } = vi.hoisted(() => ({
  mockApi: {
    createBillingPortalSession: vi.fn(),
    getProfile: vi.fn(),
    getSubscriptionCurrent: vi.fn(),
    getWatchHistory: vi.fn(),
    updateProfile: vi.fn(),
    cancelSubscriptionCurrent: vi.fn(),
  },
  mockGetBillingToken: vi.fn(),
  mockAuth: {
    user: {
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
  getBillingToken: mockGetBillingToken,
  useAuthStatus: () => ({
    isAuthenticated: true,
  }),
}));

vi.mock('../context/AuthContext', () => ({
  useAuth: () => mockAuth,
}));

describe('AccountSettingsPage', () => {
  beforeEach(() => {
    localStorage.clear();
    vi.stubEnv('VITE_USE_MOCK_PROFILE', 'false');
    vi.stubEnv('VITE_USE_MOCK_SUBSCRIPTIONS', 'true');
    vi.stubEnv('VITE_USE_MOCK_WATCH_HISTORY', 'true');

    mockApi.getProfile.mockReset();
    mockApi.createBillingPortalSession.mockReset();
    mockApi.getSubscriptionCurrent.mockReset();
    mockApi.getWatchHistory.mockReset();
    mockApi.updateProfile.mockReset();
    mockApi.cancelSubscriptionCurrent.mockReset();
    mockGetBillingToken.mockReset();

    mockGetBillingToken.mockReturnValue('id-token-value');
    mockApi.getProfile.mockResolvedValue({
      id: 'user-1',
      email: 'user@example.com',
      display_name: 'DB Name',
      gender: 'male',
      age: 30,
      prefecture: '東京都',
      recommendation_preferences: {
        hiddenCategoryIds: [],
        warningCategoryIds: [],
        desiredGenreIds: [],
      },
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
      recommendation_preferences: {
        hiddenCategoryIds: [],
        warningCategoryIds: [],
        desiredGenreIds: [],
      },
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
        recommendationPreferences: {
          hiddenCategoryIds: [],
          warningCategoryIds: [],
          desiredGenreIds: [],
        },
      });
    });

    await waitFor(() => {
      expect(displayNameInput).toHaveValue('Updated Name');
    });
  });

  it('stores recommendation preference selections locally without changing the profile api payload', async () => {
    render(
      <MemoryRouter>
        <AccountSettingsPage />
      </MemoryRouter>,
    );

    await waitFor(() => {
      expect(mockApi.getProfile).toHaveBeenCalledTimes(1);
    });

    fireEvent.click(await screen.findByRole('button', { name: '完全非表示:過度な暴力表現' }));
    fireEvent.click(screen.getByRole('button', { name: '警告表示:ギャンブル' }));

    const desiredGroup = screen.getByRole('heading', { name: '見たいジャンル' }).closest('div');
    expect(desiredGroup).not.toBeNull();

    const desiredButtons = within(desiredGroup as HTMLElement).getAllByRole('button');
    fireEvent.click(desiredButtons[1]);
    fireEvent.click(desiredButtons[2]);
    fireEvent.click(screen.getByRole('button', { name: '視聴設定を保存' }));

    await waitFor(() => {
      expect(mockApi.updateProfile).toHaveBeenCalledWith({
        displayName: 'DB Name',
        email: 'user@example.com',
        gender: 'male',
        age: 30,
        prefecture: '東京都',
        recommendationPreferences: {
          hiddenCategoryIds: ['graphic-violence'],
          warningCategoryIds: ['gambling'],
          desiredGenreIds: ['horror', 'sexual-content'],
        },
      });
    });

    expect(JSON.parse(localStorage.getItem('account_recommendation_preferences_v1') ?? '{}')).toEqual({
      hiddenCategoryIds: ['graphic-violence'],
      warningCategoryIds: ['gambling'],
      desiredGenreIds: ['horror', 'sexual-content'],
    });
  });

  it('cancels membership via subscription api with billing token', async () => {
    vi.stubEnv('VITE_USE_MOCK_SUBSCRIPTIONS', 'false');

    mockApi.getSubscriptionCurrent.mockResolvedValue({
      active: true,
      subscription: {
        id: 'subscription-1',
        user_id: 'user-1',
        plan_id: 'plan-membership',
        status: 'active',
        started_at: '2026-01-01T00:00:00.000Z',
        renews_at: '2026-02-01T00:00:00.000Z',
        canceled_at: null,
        ended_at: null,
        created_at: '2026-01-01T00:00:00.000Z',
        updated_at: '2026-01-01T00:00:00.000Z',
        plan_name: 'メンバーシップ',
        price_monthly: 1000,
        plan_is_active: true,
      },
    });

    vi.spyOn(window, 'confirm').mockReturnValue(true);
    vi.spyOn(window, 'alert').mockImplementation(() => {});

    render(
      <MemoryRouter>
        <AccountSettingsPage />
      </MemoryRouter>,
    );

    fireEvent.click(await screen.findByRole('button', { name: 'メンバーシップを解約する' }));

    await waitFor(() => {
      expect(mockApi.cancelSubscriptionCurrent).toHaveBeenCalledWith('id-token-value');
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

  it('opens billing portal with billing token', async () => {
    vi.stubEnv('VITE_USE_MOCK_SUBSCRIPTIONS', 'false');
    mockApi.getSubscriptionCurrent.mockResolvedValue({
      active: true,
      subscription: {
        id: 'subscription-1',
        user_id: 'user-1',
        plan_id: 'plan-membership',
        status: 'active',
        started_at: '2026-01-01T00:00:00.000Z',
        renews_at: '2026-02-01T00:00:00.000Z',
        canceled_at: null,
        ended_at: null,
        created_at: '2026-01-01T00:00:00.000Z',
        updated_at: '2026-01-01T00:00:00.000Z',
        plan_name: 'メンバーシップ',
        price_monthly: 1000,
        plan_is_active: true,
      },
    });

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

    fireEvent.click(await screen.findByRole('button', { name: '請求情報を管理' }));

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
