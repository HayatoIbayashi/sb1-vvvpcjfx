import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import LibraryPage from './LibraryPage';

const { mockApi, mockAuthStatus } = vi.hoisted(() => ({
  mockApi: {
    getPurchases: vi.fn(),
  },
  mockAuthStatus: {
    isAuthenticated: true,
    logoutAll: vi.fn(),
  },
}));

vi.mock('../lib/useApiClient', () => ({
  default: () => mockApi,
}));

vi.mock('../lib/authBridge', () => ({
  useAuthStatus: () => mockAuthStatus,
}));

describe('LibraryPage', () => {
  beforeEach(() => {
    mockApi.getPurchases.mockReset();
    mockAuthStatus.isAuthenticated = true;
    mockAuthStatus.logoutAll.mockReset();

    mockApi.getPurchases.mockResolvedValue({
      items: [
        {
          id: 'purchase-1',
          user_id: 'user-1',
          movie_id: 'movie-1',
          status: 'completed',
          amount_total: 1200,
          currency: 'JPY',
          payment_method: 'card',
          stripe_checkout_session_id: null,
          stripe_payment_intent_id: null,
          purchased_at: '2026-05-10T12:30:00.000Z',
          created_at: '2026-05-10T12:30:00.000Z',
          updated_at: '2026-05-10T12:30:00.000Z',
          title: 'RE:BORN',
          thumbnail: null,
        },
        {
          id: 'purchase-2',
          user_id: 'user-1',
          movie_id: 'movie-2',
          status: 'completed',
          amount_total: 900,
          currency: 'JPY',
          payment_method: 'card',
          stripe_checkout_session_id: null,
          stripe_payment_intent_id: null,
          purchased_at: '2026-05-09T09:00:00.000Z',
          created_at: '2026-05-09T09:00:00.000Z',
          updated_at: '2026-05-09T09:00:00.000Z',
          title: 'VERSUS',
          thumbnail: null,
        },
      ],
    });
  });

  function renderPage(initialEntries = ['/library']) {
    return render(
      <MemoryRouter initialEntries={initialEntries}>
        <Routes>
          <Route path="/library" element={<LibraryPage />} />
          <Route path="/movies/:id" element={<div>detail page</div>} />
          <Route path="/login" element={<div>login page</div>} />
        </Routes>
      </MemoryRouter>,
    );
  }

  it('loads completed purchases for authenticated users', async () => {
    renderPage();

    await waitFor(() => {
      expect(mockApi.getPurchases).toHaveBeenCalledWith({ status: 'completed' });
    });

    expect(await screen.findByText('RE:BORN')).toBeInTheDocument();
    expect(screen.getByText('VERSUS')).toBeInTheDocument();
  });

  it('shows an empty state when there are no purchases', async () => {
    mockApi.getPurchases.mockResolvedValue({ items: [] });

    renderPage();

    expect(await screen.findByText('購入済みの作品はまだありません。')).toBeInTheDocument();
  });

  it('shows an error message when the request fails', async () => {
    mockApi.getPurchases.mockRejectedValue(new Error('boom'));

    renderPage();

    expect(await screen.findByText('購入済み一覧の取得に失敗しました。')).toBeInTheDocument();
  });

  it('shows a login prompt for guests without loading purchases', () => {
    mockAuthStatus.isAuthenticated = false;

    renderPage();

    expect(screen.getByText('購入済み作品を見るにはログインが必要です。')).toBeInTheDocument();
    expect(mockApi.getPurchases).not.toHaveBeenCalled();
  });

  it('filters the purchase list by title', async () => {
    renderPage();

    await screen.findByText('RE:BORN');

    fireEvent.change(screen.getByPlaceholderText('作品を検索...'), {
      target: { value: 'versus' },
    });

    expect(screen.queryByText('RE:BORN')).not.toBeInTheDocument();
    expect(screen.getByText('VERSUS')).toBeInTheDocument();
  });

  it('navigates to the movie detail page from the card action', async () => {
    renderPage();

    await screen.findByText('RE:BORN');

    fireEvent.click(screen.getAllByRole('button', { name: '作品詳細を見る' })[0]);

    expect(await screen.findByText('detail page')).toBeInTheDocument();
  });
});
