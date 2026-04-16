import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import SignUpPage from './SignUpPage';
import { getCognitoPasswordPolicyMessage } from '../lib/cognitoPasswordPolicy';

const { mockSignUp, mockLogoutAll, mockNavigate } = vi.hoisted(() => ({
  mockSignUp: vi.fn(),
  mockLogoutAll: vi.fn(),
  mockNavigate: vi.fn(),
}));

vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual<typeof import('react-router-dom')>('react-router-dom');
  return {
    ...actual,
    useNavigate: () => mockNavigate,
  };
});

vi.mock('../context/AuthContext', () => ({
  useAuth: () => ({
    isLoading: false,
    user: null,
  }),
}));

vi.mock('../lib/authBridge', () => ({
  useAuthStatus: () => ({
    isAuthenticated: false,
    logoutAll: mockLogoutAll,
  }),
}));

vi.mock('../lib/apiClient', () => ({
  default: {
    signUp: mockSignUp,
  },
}));

describe('SignUpPage', () => {
  beforeEach(() => {
    mockSignUp.mockReset();
    mockLogoutAll.mockReset();
    mockNavigate.mockReset();
  });

  it('blocks submission while the password does not satisfy the Cognito policy', () => {
    render(<SignUpPage />);

    fireEvent.change(screen.getByLabelText('メールアドレス'), { target: { value: 'user@example.com' } });
    fireEvent.change(screen.getByLabelText('パスワード'), { target: { value: 'short' } });
    fireEvent.change(screen.getByLabelText('年齢'), { target: { value: '30' } });
    fireEvent.change(screen.getByLabelText('都道府県'), { target: { value: '東京都' } });

    expect(screen.getAllByText(getCognitoPasswordPolicyMessage()).length).toBeGreaterThan(0);
    expect(screen.getByRole('button', { name: 'サインアップへ進む' })).toBeDisabled();
    expect(mockSignUp).not.toHaveBeenCalled();
  });

  it('navigates to the confirmation page after signup succeeds', async () => {
    mockSignUp.mockResolvedValue(undefined);

    render(<SignUpPage />);

    fireEvent.change(screen.getByLabelText('メールアドレス'), { target: { value: 'user@example.com' } });
    fireEvent.change(screen.getByLabelText('パスワード'), { target: { value: 'Aa1!aaaa' } });
    fireEvent.change(screen.getByLabelText('年齢'), { target: { value: '30' } });
    fireEvent.change(screen.getByLabelText('都道府県'), { target: { value: '東京都' } });
    fireEvent.click(screen.getByRole('button', { name: 'サインアップへ進む' }));

    await waitFor(() => {
      expect(mockSignUp).toHaveBeenCalledWith({
        email: 'user@example.com',
        password: 'Aa1!aaaa',
        gender: null,
        age: 30,
        prefecture: '東京都',
        displayName: null,
      });
    });
    await waitFor(() => {
      expect(mockNavigate).toHaveBeenCalledWith('/signup/confirm?email=user%40example.com', {
        replace: true,
        state: {
          message: '確認コードを送信しました。メールをご確認ください。',
        },
      });
    });
  });
});
