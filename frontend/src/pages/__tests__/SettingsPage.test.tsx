import { describe, it, expect, vi, beforeEach } from 'vitest';
import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { render } from '../../test/utils';
import SettingsPage from '../SettingsPage';
import type { UserPreferences } from '../../types';
import type { NotificationPreferences } from '../../services/notification.service';

vi.mock('../../services/auth.service', () => ({
  default: {
    isAuthenticated: vi.fn(() => true),
    getCurrentUser: vi.fn(),
    getUserPreferences: vi.fn(),
    updateUserPreferences: vi.fn(),
  },
}));
vi.mock('../../services/notification.service', () => ({
  default: {
    getPreferences: vi.fn(),
    updatePreferences: vi.fn(),
    getTimezones: vi.fn(),
    getReminderSchedule: vi.fn(),
    sendTestReminder: vi.fn(),
  },
}));
vi.mock('../../services/api', () => ({
  setLogoutFunction: vi.fn(),
}));

import authService from '../../services/auth.service';
import notificationService from '../../services/notification.service';

const preferences: UserPreferences = {
  food_preferences: {
    cuisines: ['Italian'],
    favorite_ingredients: [],
    cooking_methods: [],
    preferred_spice_level: 'medium',
    flavor_profiles: [],
  },
  dietary_restrictions: [],
  ingredient_rules: { must_include: [], must_avoid: [], preferred: [], disliked: [] },
  food_type_rules: {
    protein_preferences: [],
    protein_frequency: {},
    cooking_methods_preferred: [],
    cooking_methods_avoided: [],
    meal_complexity_preference: 'medium',
    cuisine_rotation: {},
  },
  nutritional_rules: { special_nutritional_needs: [] },
  scheduling_rules: {
    preferred_cooking_days: [],
    batch_cooking_preference: false,
    leftover_tolerance: 'medium',
    meal_prep_style: 'mixed',
  },
  dietary_rules: {
    strict_restrictions: [],
    flexible_restrictions: [],
    religious_dietary_laws: [],
    ethical_choices: [],
    health_conditions: [],
    allergy_severity: {},
  },
};

const notifications: NotificationPreferences = {
  email_notifications_enabled: true,
  weekly_planning_reminder: true,
  reminder_day_of_week: 6,
  reminder_time: '18:00',
  timezone: 'UTC',
};

describe('SettingsPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(authService.getCurrentUser).mockResolvedValue({
      id: 1,
      username: 'sam',
      email: 'sam@example.com',
    } as Awaited<ReturnType<typeof authService.getCurrentUser>>);
    vi.mocked(authService.getUserPreferences).mockResolvedValue(preferences);
    vi.mocked(authService.updateUserPreferences).mockImplementation(async prefs => ({
      ...preferences,
      ...prefs,
    }));
    vi.mocked(notificationService.getPreferences).mockResolvedValue(notifications);
    vi.mocked(notificationService.updatePreferences).mockImplementation(async update => ({
      ...notifications,
      ...update,
    }));
    vi.mocked(notificationService.getTimezones).mockResolvedValue({
      timezones: ['UTC', 'Europe/London'],
    });
    vi.mocked(notificationService.getReminderSchedule).mockResolvedValue({
      next_reminder: null,
      reminder_day: 'Sunday',
      reminder_time: '18:00',
      timezone: 'UTC',
      message: 'Next reminder on Sunday at 6:00 PM.',
    });
    vi.mocked(notificationService.sendTestReminder).mockResolvedValue({
      detail: 'sent',
      email: 'sam@example.com',
    });
  });

  it('renders every section with the saved account details', async () => {
    render(<SettingsPage />);

    for (const name of ['Taste', 'Ingredients', 'Routine', 'Nutrition & health', 'Reminders']) {
      expect(await screen.findByRole('heading', { name, level: 2 })).toBeInTheDocument();
    }
    expect(screen.getByText('sam@example.com')).toBeInTheDocument();
    expect(screen.getByText('Next reminder on Sunday at 6:00 PM.')).toBeInTheDocument();
    expect(screen.queryByRole('region', { name: 'Unsaved changes' })).not.toBeInTheDocument();
  });

  it('saves only preferences when a taste chip changes', async () => {
    const user = userEvent.setup();
    render(<SettingsPage />);

    const cuisines = await screen.findByRole('group', { name: 'Cuisines you love' });
    expect(within(cuisines).getByRole('button', { name: 'Italian' })).toHaveAttribute(
      'aria-pressed',
      'true'
    );
    await user.click(within(cuisines).getByRole('button', { name: 'Thai' }));

    const bar = screen.getByRole('region', { name: 'Unsaved changes' });
    await user.click(within(bar).getByRole('button', { name: 'Save changes' }));

    await waitFor(() => expect(authService.updateUserPreferences).toHaveBeenCalledTimes(1));
    expect(vi.mocked(authService.updateUserPreferences).mock.calls[0][0]).toMatchObject({
      food_preferences: { cuisines: ['Italian', 'Thai'] },
    });
    expect(notificationService.updatePreferences).not.toHaveBeenCalled();
    await waitFor(() =>
      expect(screen.queryByRole('region', { name: 'Unsaved changes' })).not.toBeInTheDocument()
    );
  });

  it('discards unsaved edits', async () => {
    const user = userEvent.setup();
    render(<SettingsPage />);

    const cuisines = await screen.findByRole('group', { name: 'Cuisines you love' });
    await user.click(within(cuisines).getByRole('button', { name: 'Italian' }));
    expect(within(cuisines).getByRole('button', { name: 'Italian' })).toHaveAttribute(
      'aria-pressed',
      'false'
    );

    await user.click(screen.getByRole('button', { name: 'Discard' }));
    expect(within(cuisines).getByRole('button', { name: 'Italian' })).toHaveAttribute(
      'aria-pressed',
      'true'
    );
    expect(screen.queryByRole('region', { name: 'Unsaved changes' })).not.toBeInTheDocument();
  });

  it('disables the weekly reminder when email is off and blocks tests until saved', async () => {
    const user = userEvent.setup();
    render(<SettingsPage />);

    const testButton = await screen.findByRole('button', { name: 'Send a test reminder' });
    expect(testButton).toBeEnabled();

    await user.click(screen.getByRole('button', { name: 'Thu' }));
    expect(screen.getByRole('button', { name: 'Send a test reminder' })).toBeDisabled();
    expect(screen.getByText('Save your changes to send a test.')).toBeInTheDocument();

    await user.click(screen.getByRole('switch', { name: 'Email notifications' }));
    expect(screen.getByRole('switch', { name: 'Weekly planning reminder' })).toBeDisabled();
    expect(screen.queryByRole('button', { name: 'Send a test reminder' })).not.toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Save changes' }));
    await waitFor(() => expect(notificationService.updatePreferences).toHaveBeenCalledTimes(1));
    expect(vi.mocked(notificationService.updatePreferences).mock.calls[0][0]).toMatchObject({
      email_notifications_enabled: false,
      reminder_day_of_week: 3,
    });
    expect(authService.updateUserPreferences).not.toHaveBeenCalled();
  });

  it('shows a retryable error when settings fail to load', async () => {
    const user = userEvent.setup();
    vi.mocked(authService.getUserPreferences).mockRejectedValueOnce(new Error('offline'));
    vi.spyOn(console, 'error').mockImplementation(() => {});
    render(<SettingsPage />);

    expect(await screen.findByText("Couldn't load your settings")).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: /try again/i }));
    expect(await screen.findByRole('heading', { name: 'Taste', level: 2 })).toBeInTheDocument();
  });
});
