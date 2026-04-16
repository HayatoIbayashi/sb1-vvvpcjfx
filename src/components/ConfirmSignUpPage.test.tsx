import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { MemoryRouter } from 'react-router-dom';
import ConfirmSignUpPage from './ConfirmSignUpPage';

const { mockNavigate, mockSend, mockConfirmCommand, mockResendCommand } = vi.hoisted(() => ({
  mockNavigate: vi.fn(),
  mockSend: vi.fn(),
  mockConfirmCommand: vi.fn(),
  mockResendCommand: vi.fn(),
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
  ConfirmSignUpCommand: vi.fn().mockImplementation((input) => {
    mockConfirmCommand(input);
    return { type: 'confirm', input };
  }),
  ResendConfirmationCodeCommand: vi.fn().mockImplementation((input) => {
    mockResendCommand(input);
    return { type: 'resend', input };
  }),
}));

describe('ConfirmSignUpPage', () => {
  beforeEach(() => {
    mockNavigate.mockReset();
    mockSend.mockReset();
    mockConfirmCommand.mockReset();
    mockResendCommand.mockReset();
  });

  it('confirms the code and redirects to login', async () => {
    mockSend.mockResolvedValue({});

    render(
      <MemoryRouter initialEntries={['/signup/confirm?email=user@example.com']}>
        <ConfirmSignUpPage />
      </MemoryRouter>,
    );

    fireEvent.change(screen.getByLabelText('確認コード'), { target: { value: '123456' } });
    fireEvent.click(screen.getByRole('button', { name: '確認を完了する' }));

    await waitFor(() => {
      expect(mockConfirmCommand).toHaveBeenCalledWith({
        ClientId: '51p21ae4hhsgjtd1jfakg4mpiu',
        Username: 'user@example.com',
        ConfirmationCode: '123456',
      });
    });
    expect(mockNavigate).toHaveBeenCalledWith('/login', {
      replace: true,
      state: {
        email: 'user@example.com',
        flashMessage: 'メール確認が完了しました。ログインしてください。',
      },
    });
  });

  it('resends the confirmation code', async () => {
    mockSend.mockResolvedValue({});

    render(
      <MemoryRouter initialEntries={['/signup/confirm?email=user@example.com']}>
        <ConfirmSignUpPage />
      </MemoryRouter>,
    );

    fireEvent.click(screen.getByRole('button', { name: '確認コードを再送する' }));

    await waitFor(() => {
      expect(mockResendCommand).toHaveBeenCalledWith({
        ClientId: '51p21ae4hhsgjtd1jfakg4mpiu',
        Username: 'user@example.com',
      });
    });
    expect(await screen.findByText('確認コードを再送しました。メールをご確認ください。')).toBeInTheDocument();
  });
});
