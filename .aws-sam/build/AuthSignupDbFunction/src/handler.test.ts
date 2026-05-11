import { beforeEach, describe, expect, it, vi } from 'vitest';

const { mockSignUpToCognito, mockUpsertUserAndProfile } = vi.hoisted(() => ({
  mockSignUpToCognito: vi.fn(),
  mockUpsertUserAndProfile: vi.fn(),
}));

vi.mock('./cognito.js', () => ({
  signUpToCognito: mockSignUpToCognito,
}));

vi.mock('./invokeDbUpsert.js', () => ({
  invokeDbUpsert: mockUpsertUserAndProfile,
}));

import { handler } from './handler.js';

type HandlerResult = {
  statusCode: number;
  body?: string;
};

function buildEvent(body: Record<string, unknown>) {
  return {
    body: JSON.stringify(body),
    isBase64Encoded: false,
    requestContext: {
      http: {
        method: 'POST',
      },
    },
  } as const;
}

describe('auth-signup handler', () => {
  beforeEach(() => {
    mockSignUpToCognito.mockReset();
    mockUpsertUserAndProfile.mockReset();
  });

  it('passes supported profile attributes through to Cognito signup', async () => {
    mockSignUpToCognito.mockResolvedValue({
      userSub: 'user-sub-1',
      userConfirmed: false,
    });
    mockUpsertUserAndProfile.mockResolvedValue({ ok: true });

    const result = await handler(buildEvent({
      email: 'user@example.com',
      password: 'Aa1!aaaa',
      gender: 'female',
      age: 30,
      prefecture: '東京都',
      displayName: 'テストユーザー',
    }) as never) as HandlerResult;

    expect(result.statusCode).toBe(200);
    expect(mockSignUpToCognito).toHaveBeenCalledWith({
      email: 'user@example.com',
      password: 'Aa1!aaaa',
      gender: 'female',
      displayName: 'テストユーザー',
    });
    expect(mockUpsertUserAndProfile).toHaveBeenCalledWith({
      userId: 'user-sub-1',
      email: 'user@example.com',
      gender: 'female',
      age: 30,
      prefecture: '東京都',
      displayName: 'テストユーザー',
    });
  });

  it('returns a validation message for Cognito password policy errors', async () => {
    const error = Object.assign(new Error('Password did not conform with policy'), {
      name: 'InvalidPasswordException',
    });
    mockSignUpToCognito.mockRejectedValue(error);

    const result = await handler(buildEvent({
      email: 'user@example.com',
      password: 'short',
    }) as never) as HandlerResult;

    expect(result.statusCode).toBe(400);
    expect(JSON.parse(result.body ?? '{}')).toEqual({
      code: 'InvalidPasswordException',
      message: 'Password did not conform with policy',
    });
  });

  it('returns conflict when the user already exists', async () => {
    const error = Object.assign(new Error('User already exists'), {
      name: 'UsernameExistsException',
    });
    mockSignUpToCognito.mockRejectedValue(error);

    const result = await handler(buildEvent({
      email: 'user@example.com',
      password: 'Aa1!aaaa',
    }) as never) as HandlerResult;

    expect(result.statusCode).toBe(409);
    expect(JSON.parse(result.body ?? '{}')).toEqual({
      code: 'USERNAME_EXISTS',
      message: 'User already exists',
    });
  });
});
