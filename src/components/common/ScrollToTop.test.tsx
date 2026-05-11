import { fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter, Routes, Route, useNavigate } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ScrollToTop } from './ScrollToTop';

function NavigationButtons() {
  const navigate = useNavigate();

  return (
    <>
      <button onClick={() => navigate('/movies/movie-1')}>path only</button>
      <button onClick={() => navigate('/movies/movie-1?testDetailId=member-test-1')}>with search</button>
      <button onClick={() => navigate('/movies/movie-1?testDetailId=member-test-2')}>search only</button>
    </>
  );
}

describe('ScrollToTop', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    window.scrollTo = vi.fn();
  });

  it('scrolls to the top on initial render', () => {
    render(
      <MemoryRouter initialEntries={['/']}>
        <ScrollToTop />
      </MemoryRouter>,
    );

    expect(window.scrollTo).toHaveBeenCalledWith(0, 0);
  });

  it('scrolls to the top when the pathname changes', () => {
    render(
      <MemoryRouter initialEntries={['/']}>
        <ScrollToTop />
        <Routes>
          <Route path="/" element={<NavigationButtons />} />
          <Route path="/movies/:id" element={<div>detail</div>} />
        </Routes>
      </MemoryRouter>,
    );

    vi.mocked(window.scrollTo).mockClear();
    fireEvent.click(screen.getByRole('button', { name: 'path only' }));

    expect(screen.getByText('detail')).toBeInTheDocument();
    expect(window.scrollTo).toHaveBeenCalledWith(0, 0);
  });

  it('scrolls to the top when the search changes', () => {
    render(
      <MemoryRouter initialEntries={['/movies/movie-1?testDetailId=member-test-1']}>
        <ScrollToTop />
        <Routes>
          <Route path="/" element={<NavigationButtons />} />
          <Route path="/movies/:id" element={<NavigationButtons />} />
        </Routes>
      </MemoryRouter>,
    );

    vi.mocked(window.scrollTo).mockClear();
    fireEvent.click(screen.getByRole('button', { name: 'search only' }));

    expect(window.scrollTo).toHaveBeenCalledWith(0, 0);
  });
}
