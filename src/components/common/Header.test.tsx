import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it, vi } from 'vitest';
import { Header } from './Header';

describe('Header', () => {
  it('renders genre links with encoded destinations', () => {
    render(
      <MemoryRouter>
        <Header
          isAuthenticated={false}
          onLogin={vi.fn()}
          onLogout={vi.fn()}
          searchQuery=""
          onSearchChange={vi.fn()}
          genreOptions={['ホラー 描写', 'アクション']}
        />
      </MemoryRouter>,
    );

    expect(screen.getByText('ジャンル')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'ホラー 描写' })).toHaveAttribute(
      'href',
      '/genres/%E3%83%9B%E3%83%A9%E3%83%BC%20%E6%8F%8F%E5%86%99',
    );
    expect(screen.getByRole('link', { name: 'アクション' })).toHaveAttribute(
      'href',
      '/genres/%E3%82%A2%E3%82%AF%E3%82%B7%E3%83%A7%E3%83%B3',
    );
  });

  it('shows the empty dropdown message when no genres exist', () => {
    render(
      <MemoryRouter>
        <Header
          isAuthenticated={false}
          onLogin={vi.fn()}
          onLogout={vi.fn()}
          searchQuery=""
          onSearchChange={vi.fn()}
          genreOptions={[]}
        />
      </MemoryRouter>,
    );

    expect(screen.getByText('ジャンル未設定')).toBeInTheDocument();
  });
});
