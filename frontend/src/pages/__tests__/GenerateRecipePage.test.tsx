import { describe, it, expect, vi, beforeEach } from 'vitest';
import { screen, waitFor } from '@testing-library/react';

import { render } from '../../test/utils';
import GenerateRecipePage from '../GenerateRecipePage';

vi.mock('../../services/recipe.service', () => ({
  default: {
    generateRecipeStream: vi.fn(),
  },
}));

vi.mock('../../services/api', () => ({
  setLogoutFunction: vi.fn(),
}));

describe('GenerateRecipePage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('prefills ingredients_to_use from pantry query params', async () => {
    window.history.pushState({}, '', '/generate?use=spinach&use=tomato');

    render(<GenerateRecipePage />);

    await waitFor(() => {
      expect(screen.getByText('spinach')).toBeInTheDocument();
      expect(screen.getByText('tomato')).toBeInTheDocument();
    });
  });
});
