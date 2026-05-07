import { describe, expect, it } from 'vitest';
import {
  buildPoolConfig,
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

  it('uses conservative default pool settings for movies lambda', () => {
    expect(buildPoolConfig({ DATABASE_URL: CONNECTION_STRING } as NodeJS.ProcessEnv)).toMatchObject({
      connectionString: 'postgres://user:pass@example.com:5432/app',
      max: 2,
      idleTimeoutMillis: 10_000,
      connectionTimeoutMillis: 2_000,
    });
  });

  it('allows movies lambda pool settings to be overridden by env', () => {
    expect(
      buildPoolConfig({
        DATABASE_URL: CONNECTION_STRING,
        DB_POOL_MAX: '3',
        DB_IDLE_TIMEOUT_MS: '15000',
        DB_CONNECTION_TIMEOUT_MS: '4000',
      } as NodeJS.ProcessEnv),
    ).toMatchObject({
      max: 3,
      idleTimeoutMillis: 15_000,
      connectionTimeoutMillis: 4_000,
    });
  });
});
