import { useState, useEffect } from 'react';
import {
  BellIcon,
  EnvelopeIcon,
  ClockIcon,
  GlobeAltIcon,
  ExclamationCircleIcon,
  CheckCircleIcon,
  UserIcon,
  Cog6ToothIcon,
  HeartIcon,
  SparklesIcon,
  CalendarIcon,
  ScaleIcon,
  ClipboardDocumentListIcon,
} from '../components/ui/AppIcons';
import notificationService from '../services/notification.service';
import authService from '../services/auth.service';
import type {
  NotificationPreferences,
  NotificationUpdate,
  ReminderSchedule,
} from '../services/notification.service';
import type { User, UserPreferences, APIError } from '../types';
import {
  BasicPreferencesComponent,
  IngredientRulesComponent,
  FoodTypeRulesComponent,
  NutritionalRulesComponent,
  SchedulingRulesComponent,
  DietaryRulesComponent,
} from '../components/PreferenceComponents';
import { PageHeader } from '../components/ui/PageHeader';

const WEEKDAYS = [
  { value: 0, label: 'Monday' },
  { value: 1, label: 'Tuesday' },
  { value: 2, label: 'Wednesday' },
  { value: 3, label: 'Thursday' },
  { value: 4, label: 'Friday' },
  { value: 5, label: 'Saturday' },
  { value: 6, label: 'Sunday' },
];

const PREFERENCE_GROUPS = [
  {
    groupLabel: 'Account & Alerts',
    tabs: [
      {
        id: 'account',
        name: 'Account',
        subtitle: 'Your profile details and sign-in email',
        icon: UserIcon,
      },
      {
        id: 'notifications',
        name: 'Notifications',
        subtitle: 'Weekly planning nudges and email delivery schedule',
        icon: BellIcon,
      },
    ],
  },
  {
    groupLabel: 'Culinary & Dietary Profile',
    tabs: [
      {
        id: 'basic',
        name: 'Food favorites',
        subtitle: 'Cuisines, spice comfort, and flavor profiles',
        icon: HeartIcon,
      },
      {
        id: 'ingredients',
        name: 'Ingredients',
        subtitle: 'Ingredients to prioritize, include, or avoid',
        icon: SparklesIcon,
      },
      {
        id: 'cooking',
        name: 'Cooking style',
        subtitle: 'Preferred proteins, techniques, and complexity',
        icon: Cog6ToothIcon,
      },
      {
        id: 'nutrition',
        name: 'Nutrition',
        subtitle: 'Calorie goals, macro targets, and micronutrient limits',
        icon: ScaleIcon,
      },
      {
        id: 'schedule',
        name: 'Schedule',
        subtitle: 'Cooking days, prep-time limits, and batch cooking',
        icon: CalendarIcon,
      },
      {
        id: 'dietary',
        name: 'Dietary rules',
        subtitle: 'Health considerations, ethical choices, and dietary laws',
        icon: ClipboardDocumentListIcon,
      },
    ],
  },
];

const PREFERENCE_TABS = PREFERENCE_GROUPS.flatMap(group => group.tabs);

export default function SettingsPage() {
  const [activeTab, setActiveTab] = useState('account');
  const [user, setUser] = useState<User | null>(null);
  const [userPreferences, setUserPreferences] = useState<UserPreferences | null>(null);
  const [notificationPreferences, setNotificationPreferences] =
    useState<NotificationPreferences | null>(null);
  const [reminderSchedule, setReminderSchedule] = useState<ReminderSchedule | null>(null);
  const [timezones, setTimezones] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [testingSendReminder, setTestingSendReminder] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  useEffect(() => {
    void loadSettings();
  }, []);

  const loadSettings = async () => {
    try {
      const [userData, prefsData, notifPrefsData, timezonesData, scheduleData] = await Promise.all([
        authService.getCurrentUser(),
        authService.getUserPreferences(),
        notificationService.getPreferences(),
        notificationService.getTimezones(),
        notificationService.getReminderSchedule().catch(() => null),
      ]);

      setUser(userData);
      setUserPreferences(prefsData);
      setNotificationPreferences(notifPrefsData);
      setTimezones(timezonesData.timezones);
      if (scheduleData) {
        setReminderSchedule(scheduleData);
      }
    } catch (error) {
      console.error('Failed to load settings:', error);
      setMessage({ type: 'error', text: 'Could not load settings. Give it a refresh.' });
    } finally {
      setLoading(false);
    }
  };

  const handleNotificationPreferenceChange = (
    field: keyof NotificationUpdate,
    value: boolean | string | number
  ) => {
    if (!notificationPreferences) return;

    setNotificationPreferences({
      ...notificationPreferences,
      [field]: value,
    });
  };

  const saveNotificationPreferences = async () => {
    if (!notificationPreferences) return;

    setSaving(true);
    setMessage(null);

    try {
      const updatedPrefs = await notificationService.updatePreferences(notificationPreferences);
      setNotificationPreferences(updatedPrefs);

      const scheduleData = await notificationService.getReminderSchedule().catch(() => null);
      if (scheduleData) {
        setReminderSchedule(scheduleData);
      }

      setMessage({ type: 'success', text: 'Notification settings saved. Nice.' });
    } catch (error) {
      console.error('Failed to save notification preferences:', error);
      setMessage({
        type: 'error',
        text: 'Could not save notification settings. Try again?',
      });
    } finally {
      setSaving(false);
    }
  };

  const saveUserPreferences = async () => {
    if (!userPreferences) return;

    setSaving(true);
    setMessage(null);

    try {
      const updatedPrefs = await authService.updateUserPreferences(userPreferences);
      setUserPreferences(updatedPrefs);
      setMessage({ type: 'success', text: 'Preferences saved. Tasty.' });
    } catch (error) {
      console.error('Failed to save user preferences:', error);
      setMessage({ type: 'error', text: 'Could not save preferences. Try again?' });
    } finally {
      setSaving(false);
    }
  };

  const sendTestReminder = async () => {
    setTestingSendReminder(true);
    setMessage(null);

    try {
      const result = await notificationService.sendTestReminder();
      setMessage({
        type: 'success',
        text: `Test reminder sent to ${result.email}. Check your inbox.`,
      });
    } catch (error: unknown) {
      const apiError = error as APIError;
      console.error('Failed to send test reminder:', error);

      let errorMessage = 'Could not send a test reminder.';
      if (apiError.response?.status === 400) {
        errorMessage =
          apiError.response.data?.detail ||
          'Double-check notification settings and your email address.';
      } else if (apiError.response?.status === 503) {
        errorMessage =
          apiError.response.data?.detail || 'Email service is taking a break. Try again later.';
      }

      setMessage({ type: 'error', text: errorMessage });
    } finally {
      setTestingSendReminder(false);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#C84B31]" />
      </div>
    );
  }

  if (!notificationPreferences || !userPreferences) {
    return (
      <div className="surface p-10 text-center">
        <ExclamationCircleIcon className="mx-auto h-12 w-12 text-[#B91C1C]" />
        <h2 className="mt-4 font-display text-xl font-semibold text-[#1C1917]">
          Settings are taking a nap
        </h2>
        <p className="mt-2 text-sm text-[#57534E]">Give the page a refresh to wake them up.</p>
      </div>
    );
  }

  const renderAccountTab = () => (
    <div className="space-y-6">
      <div className="surface p-6 sm:p-8">
        <div className="flex items-start gap-3.5 border-b border-[#E7E0D6] pb-5 mb-6">
          <div className="icon-container-premium icon-container-orange shrink-0">
            <UserIcon className="h-5 w-5 text-[#C84B31]" />
          </div>
          <div>
            <h2 className="section-title">Account info</h2>
            <p className="section-subtitle mt-0.5">
              Your registered kitchen identity and contact address
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          <div>
            <label className="block text-sm font-semibold text-[#1C1917] mb-2">Username</label>
            <div className="rounded-xl border border-[#E7E0D6] bg-[#FAF7F2] px-3.5 py-2.5 text-sm font-medium text-[#57534E]">
              {user?.username || 'Not available'}
            </div>
          </div>
          <div>
            <label className="block text-sm font-semibold text-[#1C1917] mb-2">Email</label>
            <div className="rounded-xl border border-[#E7E0D6] bg-[#FAF7F2] px-3.5 py-2.5 text-sm font-medium text-[#57534E]">
              {user?.email || 'Not available'}
            </div>
          </div>
        </div>
        <p className="text-xs text-[#78716C] mt-5">
          Need to change account info? Reach out to support.
        </p>
      </div>
    </div>
  );

  const renderNotificationsTab = () => (
    <div className="space-y-6">
      <div className="surface p-6 sm:p-8">
        <div className="flex items-start gap-3.5 border-b border-[#E7E0D6] pb-5 mb-6">
          <div className="icon-container-premium icon-container-orange shrink-0">
            <EnvelopeIcon className="h-5 w-5 text-[#C84B31]" />
          </div>
          <div>
            <h2 className="section-title">Email notifications</h2>
            <p className="section-subtitle mt-0.5">
              Configure weekly meal-planning reminders and delivery windows
            </p>
          </div>
        </div>

        <div className="space-y-5">
          {/* Master Toggle */}
          <div className="flex items-center justify-between gap-4 rounded-2xl border border-[#E7E0D6] bg-[#FAF7F2] p-4 sm:p-5">
            <div>
              <h3 className="text-sm font-semibold text-[#1C1917]">Email notifications</h3>
              <p className="mt-0.5 text-sm text-[#57534E]">Flip all email nudges on or off</p>
            </div>
            <label className="relative inline-flex items-center cursor-pointer shrink-0">
              <input
                type="checkbox"
                checked={notificationPreferences.email_notifications_enabled}
                onChange={e =>
                  handleNotificationPreferenceChange(
                    'email_notifications_enabled',
                    e.target.checked
                  )
                }
                className="sr-only peer"
              />
              <div className="w-11 h-6 bg-[#D6CEC2] peer-focus:outline-none peer-focus:ring-3 peer-focus:ring-[#C84B31]/20 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-[#D6CEC2] after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[#C84B31]" />
            </label>
          </div>

          {/* Weekly Planning Reminder */}
          {notificationPreferences.email_notifications_enabled && (
            <div className="rounded-2xl border border-[#E7E0D6] bg-white p-5">
              <div className="flex items-center justify-between gap-4 mb-4">
                <div className="flex items-start gap-3">
                  <BellIcon className="h-5 w-5 text-[#C84B31] mt-0.5 shrink-0" />
                  <div>
                    <h3 className="text-sm font-semibold text-[#1C1917]">
                      Weekly planning reminder
                    </h3>
                    <p className="mt-0.5 text-sm text-[#57534E]">A gentle nudge to plan the week</p>
                  </div>
                </div>
                <label className="relative inline-flex items-center cursor-pointer shrink-0">
                  <input
                    type="checkbox"
                    checked={notificationPreferences.weekly_planning_reminder}
                    onChange={e =>
                      handleNotificationPreferenceChange(
                        'weekly_planning_reminder',
                        e.target.checked
                      )
                    }
                    className="sr-only peer"
                  />
                  <div className="w-11 h-6 bg-[#D6CEC2] peer-focus:outline-none peer-focus:ring-3 peer-focus:ring-[#C84B31]/20 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-[#D6CEC2] after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[#C84B31]" />
                </label>
              </div>

              {notificationPreferences.weekly_planning_reminder && (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-4 pt-4 border-t border-[#E7E0D6]">
                  <div>
                    <label className="block text-sm font-semibold text-[#1C1917] mb-2">
                      Day of Week
                    </label>
                    <select
                      value={notificationPreferences.reminder_day_of_week}
                      onChange={e =>
                        handleNotificationPreferenceChange(
                          'reminder_day_of_week',
                          parseInt(e.target.value)
                        )
                      }
                      className="input"
                    >
                      {WEEKDAYS.map(day => (
                        <option key={day.value} value={day.value}>
                          {day.label}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-semibold text-[#1C1917] mb-2 flex items-center gap-1.5">
                      <ClockIcon className="h-4 w-4 text-[#78716C]" />
                      Time
                    </label>
                    <input
                      type="time"
                      value={notificationPreferences.reminder_time}
                      onChange={e =>
                        handleNotificationPreferenceChange('reminder_time', e.target.value)
                      }
                      className="input tabular-nums"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-semibold text-[#1C1917] mb-2 flex items-center gap-1.5">
                      <GlobeAltIcon className="h-4 w-4 text-[#78716C]" />
                      Timezone
                    </label>
                    <select
                      value={notificationPreferences.timezone}
                      onChange={e => handleNotificationPreferenceChange('timezone', e.target.value)}
                      className="input"
                    >
                      {timezones.map(tz => (
                        <option key={tz} value={tz}>
                          {tz}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
              )}

              {notificationPreferences.weekly_planning_reminder && reminderSchedule && (
                <div className="mt-4 rounded-2xl border border-[#C84B31]/25 bg-[#F9F1EA] p-3.5">
                  <p className="text-sm text-[#B83B22]">
                    <strong className="font-semibold">Next reminder:</strong>{' '}
                    {reminderSchedule.message}
                  </p>
                </div>
              )}
            </div>
          )}
        </div>

        <div className="flex flex-wrap gap-3 mt-6 pt-5 border-t border-[#E7E0D6]">
          <button onClick={saveNotificationPreferences} disabled={saving} className="btn-primary">
            {saving ? 'Saving...' : 'Save notifications'}
          </button>

          {notificationPreferences.email_notifications_enabled &&
            notificationPreferences.weekly_planning_reminder && (
              <button
                onClick={sendTestReminder}
                disabled={testingSendReminder}
                className="btn-secondary"
              >
                {testingSendReminder ? 'Sending...' : 'Send test reminder'}
              </button>
            )}
        </div>
      </div>
    </div>
  );

  const renderPreferenceTab = () => {
    const components = {
      basic: () => (
        <BasicPreferencesComponent preferences={userPreferences} onChange={setUserPreferences} />
      ),
      ingredients: () => (
        <IngredientRulesComponent preferences={userPreferences} onChange={setUserPreferences} />
      ),
      cooking: () => (
        <FoodTypeRulesComponent preferences={userPreferences} onChange={setUserPreferences} />
      ),
      nutrition: () => (
        <NutritionalRulesComponent preferences={userPreferences} onChange={setUserPreferences} />
      ),
      schedule: () => (
        <SchedulingRulesComponent preferences={userPreferences} onChange={setUserPreferences} />
      ),
      dietary: () => (
        <DietaryRulesComponent preferences={userPreferences} onChange={setUserPreferences} />
      ),
    };

    const Component = components[activeTab as keyof typeof components];

    if (!Component) return null;

    const activeTabData = PREFERENCE_TABS.find(tab => tab.id === activeTab);
    const Icon = activeTabData?.icon;

    return (
      <div className="space-y-6">
        <div className="surface p-6 sm:p-8">
          <div className="flex items-start gap-3.5 border-b border-[#E7E0D6] pb-5 mb-6">
            {Icon && (
              <div className="icon-container-premium icon-container-orange shrink-0">
                <Icon className="h-5 w-5 text-[#C84B31]" />
              </div>
            )}
            <div>
              <h2 className="section-title">{activeTabData?.name}</h2>
              {activeTabData?.subtitle && (
                <p className="section-subtitle mt-0.5">{activeTabData.subtitle}</p>
              )}
            </div>
          </div>

          <Component />

          <div className="mt-8 pt-5 border-t border-[#E7E0D6] flex items-center justify-between gap-4">
            <p className="text-xs text-[#78716C]">
              Saved preferences automatically guide future AI recipe generation and weekly plans.
            </p>
            <button
              onClick={saveUserPreferences}
              disabled={saving}
              className="btn-primary shrink-0"
            >
              {saving ? 'Saving...' : 'Save preferences'}
            </button>
          </div>
        </div>
      </div>
    );
  };

  const renderTabContent = () => {
    switch (activeTab) {
      case 'account':
        return renderAccountTab();
      case 'notifications':
        return renderNotificationsTab();
      default:
        return renderPreferenceTab();
    }
  };

  return (
    <div className="max-w-6xl mx-auto">
      <PageHeader
        badge={<span className="badge">Culinary Profile & Alerts</span>}
        title="Settings"
        subtitle="Make Hungry Helper feel like yours"
      />

      {message && (
        <div
          className={`mb-6 rounded-2xl p-4 border ${
            message.type === 'success'
              ? 'bg-[#ECF5F0] border-[#3F624D]/30'
              : 'bg-[#FEE2E2] border-[#B91C1C]/25'
          }`}
        >
          <div className="flex items-start gap-3">
            <div className="shrink-0 mt-0.5">
              {message.type === 'success' ? (
                <CheckCircleIcon className="h-5 w-5 text-[#2F6F4E]" />
              ) : (
                <ExclamationCircleIcon className="h-5 w-5 text-[#991B1B]" />
              )}
            </div>
            <p
              className={`text-sm font-medium ${
                message.type === 'success' ? 'text-[#2F6F4E]' : 'text-[#991B1B]'
              }`}
            >
              {message.text}
            </p>
          </div>
        </div>
      )}

      {/* Mobile Horizontally Scrollable Pill Strip (< lg) */}
      <div className="lg:hidden mb-6 -mx-4 px-4">
        <div
          role="tablist"
          aria-label="Settings sections"
          className="flex items-center gap-2 overflow-x-auto no-scrollbar pb-2"
        >
          {PREFERENCE_TABS.map(tab => {
            const isActive = activeTab === tab.id;
            const Icon = tab.icon;
            return (
              <button
                key={tab.id}
                role="tab"
                aria-selected={isActive}
                onClick={() => setActiveTab(tab.id)}
                className={`inline-flex shrink-0 items-center gap-2 rounded-full border px-4 py-2.5 text-sm font-semibold transition-all duration-150 ${
                  isActive
                    ? 'border-[#C84B31] bg-[#C84B31] text-white shadow-xs'
                    : 'border-[#E7E0D6] bg-white text-[#57534E] hover:border-[#D6CEC2] hover:text-[#1C1917]'
                }`}
              >
                <Icon className={`h-4 w-4 ${isActive ? 'text-white' : 'text-[#78716C]'}`} />
                {tab.name}
              </button>
            );
          })}
        </div>
      </div>

      <div className="grid gap-8 lg:grid-cols-[260px_1fr] lg:items-start">
        {/* Desktop Grouped Sidebar (>= lg) */}
        <aside className="hidden lg:block surface p-4 space-y-6">
          {PREFERENCE_GROUPS.map(group => (
            <div key={group.groupLabel}>
              <p className="eyebrow px-3 mb-2">{group.groupLabel}</p>
              <div className="space-y-1">
                {group.tabs.map(tab => {
                  const isActive = activeTab === tab.id;
                  const Icon = tab.icon;
                  return (
                    <button
                      key={tab.id}
                      onClick={() => setActiveTab(tab.id)}
                      aria-current={isActive ? 'page' : undefined}
                      className={`w-full flex items-center gap-3 px-3.5 py-2.5 text-sm font-medium rounded-2xl border transition-all duration-150 ${
                        isActive
                          ? 'border-[#C84B31]/30 bg-[#F9F1EA] font-semibold text-[#1C1917] shadow-2xs'
                          : 'border-transparent text-[#57534E] hover:bg-[#FAF7F2] hover:text-[#1C1917]'
                      }`}
                    >
                      <Icon
                        className={`h-5 w-5 shrink-0 ${
                          isActive ? 'text-[#C84B31]' : 'text-[#78716C]'
                        }`}
                      />
                      <span className="truncate">{tab.name}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          ))}
        </aside>

        {/* Tab Content */}
        <div className="min-w-0">{renderTabContent()}</div>
      </div>
    </div>
  );
}
