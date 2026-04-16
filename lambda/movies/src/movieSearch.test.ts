import { describe, expect, it } from 'vitest';
import { buildMovieSearchClause } from './movieSearch';

describe('buildMovieSearchClause', () => {
  it('includes cast for public search', () => {
    const clause = buildMovieSearchClause(false);

    expect(clause).toContain(`COALESCE(array_to_string("cast", ' '), '') ILIKE $1`);
    expect(clause).not.toContain(`COALESCE(array_to_string(genre, ' '), '') ILIKE $1`);
  });

  it('includes genre and cast for admin search', () => {
    const clause = buildMovieSearchClause(true);

    expect(clause).toContain(`COALESCE(array_to_string(genre, ' '), '') ILIKE $1`);
    expect(clause).toContain(`COALESCE(array_to_string("cast", ' '), '') ILIKE $1`);
  });
});
