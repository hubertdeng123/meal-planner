import { describe, it, expect, vi } from 'vitest';
import { screen } from '@testing-library/react';
import { render } from '../../test/utils';
import NotFoundPage from '../NotFoundPage';

vi.mock('../../services/auth.service', () => ({
  default: { isAuthenticated: vi.fn(() => true) },
}));
vi.mock('../../services/api', () => ({
  setLogoutFunction: vi.fn(),
}));

describe('NotFoundPage', () => {
  it('offers a way back to the main areas', () => {
    render(<NotFoundPage />);

    expect(screen.getByRole('heading', { name: "This page isn't on the menu" })).toBeVisible();
    expect(screen.getByRole('link', { name: 'Go to today' })).toHaveAttribute('href', '/dashboard');
    expect(screen.getByRole('link', { name: 'Browse recipes' })).toHaveAttribute(
      'href',
      '/recipes'
    );
  });
});
