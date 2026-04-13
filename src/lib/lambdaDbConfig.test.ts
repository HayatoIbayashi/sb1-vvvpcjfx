import { describe, expect, it } from 'vitest';
import {
  normalizeConnectionString as normalizeMoviesConnectionString,
  shouldUseSsl as shouldUseMoviesSsl,
} from '../../lambda/movies/src/db';
import {
  normalizeConnectionString as normalizeAuthConnectionString,
  shouldUseSsl as shouldUseAuthSsl,
} from '../../lambda/auth-signup/src/db';

const CONNECTION_STRING = 'postgres://user:pass@example.com:5432/app?sslmode=require';

describe('lambda db ssl config', () => {
  it('removes ssl query params from movies connection strings', () => {
    expect(normalizeMoviesConnectionString(CONNECTION_STRING)).toBe(
      'postgres://user:pass@example.com:5432/app',
    );
  });

  it('removes ssl query params from auth connection strings', () => {
    expect(normalizeAuthConnectionString(CONNECTION_STRING)).toBe(
      'postgres://user:pass@example.com:5432/app',
    );
  });

  it('enables ssl for movies when sslmode=require is present', () => {
    expect(shouldUseMoviesSsl({ DATABASE_URL: CONNECTION_STRING } as NodeJS.ProcessEnv)).toBe(true);
  });

  it('enables ssl for auth when sslmode=require is present', () => {
    expect(shouldUseAuthSsl({ DATABASE_URL: CONNECTION_STRING } as NodeJS.ProcessEnv)).toBe(true);
  });

  it('respects explicit DB_SSL=false', () => {
    expect(
      shouldUseMoviesSsl({ DATABASE_URL: CONNECTION_STRING, DB_SSL: 'false' } as NodeJS.ProcessEnv),
    ).toBe(false);
    expect(
      shouldUseAuthSsl({ DATABASE_URL: CONNECTION_STRING, DB_SSL: 'false' } as NodeJS.ProcessEnv),
    ).toBe(false);
  });
});
