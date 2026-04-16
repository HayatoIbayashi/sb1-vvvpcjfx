import { beforeEach, describe, expect, it, vi } from 'vitest';
import { getBestToken, getBillingToken, logoutLocally } from './authBridge';

describe('authBridge token helpers', () => {
  beforeEach(() => {
    localStorage.clear();
  });

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

  it('falls back to stored id token for billing calls', () => {
    localStorage.setItem('cognito_tokens', JSON.stringify({
      access_token: 'stored-access-token',
      id_token: 'stored-id-token',
    }));

    const auth = {
      user: {
        access_token: 'access-token',
      },
    } as never;

    expect(getBillingToken(auth)).toBe('stored-id-token');
  });

  it('clears local auth state and redirects home without hosted ui logout', async () => {
    localStorage.setItem('cognito_tokens', JSON.stringify({
      access_token: 'stored-access-token',
      id_token: 'stored-id-token',
    }));
    localStorage.setItem('oidc.user:example', 'stale-oidc-user');

    const removeUser = vi.fn().mockResolvedValue(undefined);
    const signoutRedirect = vi.fn();
    const redirectToHome = vi.fn();

    await logoutLocally({ removeUser, signoutRedirect } as never, redirectToHome);

    expect(removeUser).toHaveBeenCalledTimes(1);
    expect(signoutRedirect).not.toHaveBeenCalled();
    expect(localStorage.getItem('cognito_tokens')).toBeNull();
    expect(localStorage.getItem('oidc.user:example')).toBeNull();
    expect(redirectToHome).toHaveBeenCalledTimes(1);
  });
});
