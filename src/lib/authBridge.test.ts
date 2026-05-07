import { describe, expect, it, vi } from 'vitest';
import { getBestToken, getBillingToken, logoutLocally } from './authBridge';

describe('authBridge token helpers', () => {
  it('prefers access token for general API calls', () => {
    const auth = {
      user: {
        access_token: 'access-token',
        id_token: 'id-token',
      },
    } as never;

    expect(getBestToken(auth)).toBe('access-token');
  });

  it('prefers id token for billing calls', () => {
    const auth = {
      user: {
        access_token: 'access-token',
        id_token: 'id-token',
      },
    } as never;

    expect(getBillingToken(auth)).toBe('id-token');
  });

  it('returns null when id token is unavailable', () => {
    const auth = {
      user: {
        access_token: 'access-token',
      },
    } as never;

    expect(getBillingToken(auth)).toBeNull();
  });

  it('delegates local logout to auth context and redirects home', async () => {
    const removeUser = vi.fn().mockResolvedValue(undefined);
    const signoutRedirect = vi.fn();
    const redirectToHome = vi.fn();

    await logoutLocally({ removeUser, signoutRedirect } as never, redirectToHome);

    expect(removeUser).toHaveBeenCalledTimes(1);
    expect(signoutRedirect).not.toHaveBeenCalled();
    expect(redirectToHome).toHaveBeenCalledTimes(1);
  });
});
