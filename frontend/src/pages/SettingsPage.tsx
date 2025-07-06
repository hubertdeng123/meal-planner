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
} from '@heroicons/react/24/outline';
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

const WEEKDAYS = [
  { value: 0, label: 'Monday' },
  { value: 1, label: 'Tuesday' },
  { value: 2, label: 'Wednesday' },
  { value: 3, label: 'Thursday' },
  { value: 4, label: 'Friday' },
  { value: 5, label: 'Saturday' },
  { value: 6, label: 'Sunday' },
];

const PREFERENCE_TABS = [
  { id: 'account', name: 'Account', icon: UserIcon },
  { id: 'notifications', name: 'Notifications', icon: BellIcon },
  { id: 'basic', name: 'Food Preferences', icon: HeartIcon },
  { id: 'ingredients', name: 'Ingredients', icon: SparklesIcon },
  { id: 'cooking', name: 'Cooking', icon: Cog6ToothIcon },
  { id: 'nutrition', name: 'Nutrition', icon: ScaleIcon },
  { id: 'schedule', name: 'Schedule', icon: CalendarIcon },
  { id: 'dietary', name: 'Dietary Rules', icon: ClipboardDocumentListIcon },
];

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
    loadSettings();
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
      setMessage({ type: 'error', text: 'Failed to load settings. Please refresh the page.' });
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

      // Reload reminder schedule
      const scheduleData = await notificationService.getReminderSchedule().catch(() => null);
      if (scheduleData) {
        setReminderSchedule(scheduleData);
      }

      setMessage({ type: 'success', text: 'Notification settings saved successfully!' });
    } catch (error) {
      console.error('Failed to save notification preferences:', error);
      setMessage({
        type: 'error',
        text: 'Failed to save notification settings. Please try again.',
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
      setMessage({ type: 'success', text: 'Food preferences saved successfully!' });
    } catch (error) {
      console.error('Failed to save user preferences:', error);
      setMessage({ type: 'error', text: 'Failed to save food preferences. Please try again.' });
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
        text: `Test reminder sent to ${result.email}! Check your inbox.`,
      });
    } catch (error: unknown) {
      const apiError = error as APIError;
      console.error('Failed to send test reminder:', error);

      let errorMessage = 'Failed to send test reminder.';
      if (apiError.response?.status === 400) {
        errorMessage =
          apiError.response.data?.detail ||
          'Please check your notification settings and email address.';
      } else if (apiError.response?.status === 503) {
        errorMessage =
          apiError.response.data?.detail ||
          'Email service is currently unavailable. Please try again later.';
      }

      setMessage({ type: 'error', text: errorMessage });
    } finally {
      setTestingSendReminder(false);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-600"></div>
      </div>
    );
  }

  if (!notificationPreferences || !userPreferences) {
    return (
      <div className="text-center py-12">
        <ExclamationCircleIcon className="mx-auto h-12 w-12 text-red-400" />
        <h2 className="mt-4 text-lg font-semibold text-gray-900">Failed to load settings</h2>
        <p className="mt-2 text-gray-600">Please refresh the page to try again.</p>
      </div>
    );
  }

  const renderAccountTab = () => (
    <div className="space-y-6">
      <div className="card p-6">
        <div className="flex items-center mb-4">
          <UserIcon className="h-6 w-6 text-gray-500 mr-3" />
          <h2 className="text-xl font-semibold text-gray-900">Account Information</h2>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Username</label>
            <div className="input bg-gray-50 text-gray-500">
              {user?.username || 'Not available'}
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
            <div className="input bg-gray-50 text-gray-500">{user?.email || 'Not available'}</div>
          </div>
        </div>
        <p className="text-sm text-gray-500 mt-4">
          To update your account information, please contact support.
        </p>
      </div>
    </div>
  );

  const renderNotificationsTab = () => (
    <div className="space-y-6">
      <div className="card p-6">
        <div className="flex items-center mb-6">
          <EnvelopeIcon className="h-6 w-6 text-gray-500 mr-3" />
          <h2 className="text-xl font-semibold text-gray-900">Email Notifications</h2>
        </div>

        <div className="space-y-6">
          {/* Master Toggle */}
          <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
            <div>
              <h3 className="text-sm font-medium text-gray-900">Email Notifications</h3>
              <p className="text-sm text-gray-500">Enable or disable all email notifications</p>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
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
              <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-orange-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-orange-600"></div>
            </label>
          </div>

          {/* Weekly Planning Reminder */}
          {notificationPreferences.email_notifications_enabled && (
            <div className="border border-gray-200 rounded-lg p-4">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center">
                  <BellIcon className="h-5 w-5 text-gray-400 mr-2" />
                  <div>
                    <h3 className="text-sm font-medium text-gray-900">
                      Weekly Meal Planning Reminder
                    </h3>
                    <p className="text-sm text-gray-500">Get reminded to plan your weekly meals</p>
                  </div>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
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
                  <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-orange-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-orange-600"></div>
                </label>
              </div>

              {notificationPreferences.weekly_planning_reminder && (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-4 pt-4 border-t border-gray-200">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
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
                    <label className="block text-sm font-medium text-gray-700 mb-2 flex items-center">
                      <ClockIcon className="h-4 w-4 mr-1" />
                      Time
                    </label>
                    <input
                      type="time"
                      value={notificationPreferences.reminder_time}
                      onChange={e =>
                        handleNotificationPreferenceChange('reminder_time', e.target.value)
                      }
                      className="input"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2 flex items-center">
                      <GlobeAltIcon className="h-4 w-4 mr-1" />
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
                <div className="mt-4 p-3 bg-blue-50 rounded-lg">
                  <p className="text-sm text-blue-700">
                    <strong>Next reminder:</strong> {reminderSchedule.message}
                  </p>
                </div>
              )}
            </div>
          )}
        </div>

        <div className="flex gap-4 mt-6">
          <button onClick={saveNotificationPreferences} disabled={saving} className="btn-primary">
            {saving ? 'Saving...' : 'Save Notification Settings'}
          </button>

          {notificationPreferences.email_notifications_enabled &&
            notificationPreferences.weekly_planning_reminder && (
              <button
                onClick={sendTestReminder}
                disabled={testingSendReminder}
                className="btn-secondary"
              >
                {testingSendReminder ? 'Sending...' : 'Send Test Reminder'}
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

    return (
      <div className="space-y-6">
        <div className="card p-6">
          <div className="flex items-center mb-6">
            {(() => {
              const activeTabData = PREFERENCE_TABS.find(tab => tab.id === activeTab);
              const Icon = activeTabData?.icon;
              return Icon ? <Icon className="h-6 w-6 text-gray-500 mr-3" /> : null;
            })()}
            <h2 className="text-xl font-semibold text-gray-900">
              {PREFERENCE_TABS.find(tab => tab.id === activeTab)?.name}
            </h2>
          </div>

          <Component />

          <div className="mt-6">
            <button onClick={saveUserPreferences} disabled={saving} className="btn-primary">
              {saving ? 'Saving...' : 'Save Preferences'}
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
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">Settings</h1>
        <p className="mt-2 text-gray-600">Manage your account preferences and notifications</p>
      </div>

      {/* Status Message */}
      {message && (
        <div
          className={`mb-6 rounded-lg p-4 ${
            message.type === 'success'
              ? 'bg-green-50 border border-green-200'
              : 'bg-red-50 border border-red-200'
          }`}
        >
          <div className="flex">
            <div className="flex-shrink-0">
              {message.type === 'success' ? (
                <CheckCircleIcon className="h-5 w-5 text-green-400" />
              ) : (
                <ExclamationCircleIcon className="h-5 w-5 text-red-400" />
              )}
            </div>
            <div className="ml-3">
              <p
                className={`text-sm ${
                  message.type === 'success' ? 'text-green-700' : 'text-red-700'
                }`}
              >
                {message.text}
              </p>
            </div>
          </div>
        </div>
      )}

      <div className="flex flex-col lg:flex-row gap-8">
        {/* Tab Navigation */}
        <div className="lg:w-64 flex-shrink-0">
          <nav className="space-y-1">
            {PREFERENCE_TABS.map(tab => {
              const isActive = activeTab === tab.id;
              const Icon = tab.icon;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`w-full flex items-center px-3 py-2 text-sm font-medium rounded-lg transition-colors ${
                    isActive
                      ? 'bg-orange-50 text-orange-700 border-r-2 border-orange-500'
                      : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
                  }`}
                >
                  <Icon
                    className={`mr-3 h-5 w-5 ${isActive ? 'text-orange-500' : 'text-gray-400'}`}
                  />
                  {tab.name}
                </button>
              );
            })}
          </nav>
        </div>

        {/* Tab Content */}
        <div className="flex-1">{renderTabContent()}</div>
      </div>
    </div>
  );
}
