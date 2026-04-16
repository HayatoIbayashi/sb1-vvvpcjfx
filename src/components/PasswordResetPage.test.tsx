import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { MemoryRouter } from 'react-router-dom';
import PasswordResetPage from './PasswordResetPage';

const {
  mockNavigate,
  mockSend,
  mockLogoutAll,
  mockAuth,
} = vi.hoisted(() => ({
  mockNavigate: vi.fn(),
  mockSend: vi.fn(),
  mockLogoutAll: vi.fn(),
  mockAuth: {
    isLoading: false,
    isAuthenticated: false,
    error: null,
    user: null,
  },
}));

vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual<typeof import('react-router-dom')>('react-router-dom');
  return {
    ...actual,
    useNavigate: () => mockNavigate,
  };
});

vi.mock('@aws-sdk/client-cognito-identity-provider', () => ({
  CognitoIdentityProviderClient: vi.fn().mockImplementation(() => ({
    send: mockSend,
  })),
  ForgotPasswordCommand: vi.fn().mockImplementation((input) => ({ input })),
  ConfirmForgotPasswordCommand: vi.fn().mockImplementation((input) => ({ input })),
}));

vi.mock('../context/AuthContext', () => ({
  useAuth: () => mockAuth,
}));

vi.mock('../lib/authBridge', () => ({
  useAuthStatus: () => ({
    isAuthenticated: false,
    logoutAll: mockLogoutAll,
  }),
}));

describe('PasswordResetPage', () => {
  beforeEach(() => {
    mockNavigate.mockReset();
    mockSend.mockReset();
    mockLogoutAll.mockReset();
  });

  it('sends a reset code to the email address', async () => {
    mockSend.mockResolvedValueOnce({});

    render(
      <MemoryRouter initialEntries={['/password-reset']}>
        <PasswordResetPage />
      </MemoryRouter>,
    );

    fireEvent.change(screen.getByLabelText('メールアドレス'), { target: { value: 'user@example.com' } });
    fireEvent.click(screen.getByRole('button', { name: '確認コードを送信する' }));

    await waitFor(() => {
      expect(mockSend).toHaveBeenCalledTimes(1);
    });

    expect(await screen.findByText('確認コードを送信しました。メールをご確認ください。')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'パスワードを更新する' })).toBeInTheDocument();
  });

  it('confirms the reset code and returns to login', async () => {
    mockSend
      .mockResolvedValueOnce({})
      .mockResolvedValueOnce({});

    render(
      <MemoryRouter initialEntries={['/password-reset']}>
        <PasswordResetPage />
      </MemoryRouter>,
    );

    fireEvent.change(screen.getByLabelText('メールアドレス'), { target: { value: 'user@example.com' } });
    fireEvent.click(screen.getByRole('button', { name: '確認コードを送信する' }));

    expect(await screen.findByRole('button', { name: 'パスワードを更新する' })).toBeInTheDocument();

    fireEvent.change(screen.getByLabelText('確認コード'), { target: { value: '123456' } });
    fireEvent.change(screen.getByLabelText('新しいパスワード'), { target: { value: 'Aa1!aaaa' } });
    fireEvent.click(screen.getByRole('button', { name: 'パスワードを更新する' }));

    await waitFor(() => {
      expect(mockNavigate).toHaveBeenCalledWith('/login', {
        replace: true,
        state: {
          email: 'user@example.com',
          flashMessage: 'パスワードを更新しました。新しいパスワードでログインしてください。',
        },
      });
    });
  });
});
