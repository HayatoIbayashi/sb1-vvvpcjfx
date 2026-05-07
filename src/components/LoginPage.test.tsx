import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { MemoryRouter } from 'react-router-dom';
import LoginPage from './LoginPage';

const { mockNavigate, mockSend, mockLogoutAll, mockAuth } = vi.hoisted(() => ({
  mockNavigate: vi.fn(),
  mockSend: vi.fn(),
  mockLogoutAll: vi.fn(),
  mockAuth: {
    isLoading: false,
    error: null,
    user: null,
    setTokens: vi.fn(),
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
  InitiateAuthCommand: vi.fn().mockImplementation((input) => ({ input })),
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

describe('LoginPage', () => {
  beforeEach(() => {
    mockNavigate.mockReset();
    mockSend.mockReset();
    mockLogoutAll.mockReset();
    mockAuth.setTokens.mockReset();
    localStorage.clear();
  });

  it('redirects unconfirmed users to the confirmation page', async () => {
    mockSend.mockRejectedValue(Object.assign(new Error('User is not confirmed.'), {
      name: 'UserNotConfirmedException',
    }));

    render(
      <MemoryRouter initialEntries={['/login']}>
        <LoginPage />
      </MemoryRouter>,
    );

    fireEvent.change(screen.getByLabelText('メールアドレス'), { target: { value: 'user@example.com' } });
    fireEvent.change(screen.getByLabelText('パスワード'), { target: { value: 'Aa1!aaaa' } });
    fireEvent.click(screen.getByRole('button', { name: 'ログイン' }));

    await waitFor(() => {
      expect(mockNavigate).toHaveBeenCalledWith('/signup/confirm?email=user%40example.com', {
        replace: true,
        state: {
          message: '確認コードを入力してください。確認メールが未着なら再送できます。',
        },
      });
    });
  });
});
