import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, it } from 'vitest';
import { App } from './App';

function open(path = '/') {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <App />
    </MemoryRouter>,
  );
}

describe('application foundation', () => {
  beforeEach(() => window.localStorage.clear());

  it('loads the library shell and navigates to preferences', async () => {
    const user = userEvent.setup();
    open();
    expect(screen.getByRole('heading', { name: 'A little room for reading.' })).toBeInTheDocument();
    await user.click(screen.getByRole('link', { name: 'Find your reading atmosphere' }));
    expect(screen.getByRole('heading', { name: 'Reading preferences' })).toBeInTheDocument();
    await user.click(screen.getAllByRole('button', { name: 'Midnight' })[1]);
    expect(document.documentElement).toHaveAttribute('data-theme', 'midnight');
    expect(JSON.parse(window.localStorage.getItem('folio.preferences.v1')!).theme).toBe('midnight');
  });

  it.each([
    ['/books/a-place-between', 'A Place Between'],
    ['/admin', 'A thoughtful library starts here'],
    ['/missing', 'This page is missing'],
    ['/books/missing', 'This page is missing'],
  ])('supports direct navigation to %s', async (path, heading) => {
    open(path);
    expect(await screen.findByRole('heading', { name: heading })).toBeInTheDocument();
  });
});
