import { useState, useEffect } from 'react';
import {
  BellIcon,
  EnvelopeIcon,
  ClockIcon,
  GlobeAltIcon,
  ExclamationCircleIcon,
  CheckCircleIcon,
  UserIcon,
} from '@heroicons/react/24/outline';
import notificationService from '../services/notification.service';
import authService from '../services/auth.service';
import type {
  NotificationPreferences,
  NotificationUpdate,
  ReminderSchedule,
} from '../services/notification.service';
import type { User } from '../types';

const WEEKDAYS = [
  { value: 0, label: 'Monday' },
  { value: 1, label: 'Tuesday' },
  { value: 2, label: 'Wednesday' },
  { value: 3, label: 'Thursday' },
  { value: 4, label: 'Friday' },
  { value: 5, label: 'Saturday' },
  { value: 6, label: 'Sunday' },
];

export default function SettingsPage() {
  const [user, setUser] = useState<User | null>(null);
  const [preferences, setPreferences] = useState<NotificationPreferences | null>(null);
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
      const [userData, prefsData, timezonesData, scheduleData] = await Promise.all([
        authService.getCurrentUser(),
        notificationService.getPreferences(),
        notificationService.getTimezones(),
        notificationService.getReminderSchedule().catch(() => null), // Don't fail if schedule fails
      ]);

      setUser(userData);
      setPreferences(prefsData);
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

  const handlePreferenceChange = (field: keyof NotificationUpdate, value: any) => {
    if (!preferences) return;

    setPreferences({
      ...preferences,
      [field]: value,
    });
  };

  const savePreferences = async () => {
    if (!preferences) return;

    setSaving(true);
    setMessage(null);

    try {
      const updatedPrefs = await notificationService.updatePreferences(preferences);
      setPreferences(updatedPrefs);

      // Reload reminder schedule
      const scheduleData = await notificationService.getReminderSchedule().catch(() => null);
      if (scheduleData) {
        setReminderSchedule(scheduleData);
      }

      setMessage({ type: 'success', text: 'Settings saved successfully!' });
    } catch (error) {
      console.error('Failed to save preferences:', error);
      setMessage({ type: 'error', text: 'Failed to save settings. Please try again.' });
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
    } catch (error: any) {
      console.error('Failed to send test reminder:', error);

      // Handle different types of errors with specific messages
      let errorMessage = 'Failed to send test reminder.';

      if (error.response?.status === 400) {
        // User-related errors (like disabled notifications, invalid email)
        errorMessage =
          error.response.data?.detail ||
          'Please check your notification settings and email address.';
      } else if (error.response?.status === 503) {
        // Service unavailable (SMTP configuration, connection, authentication issues)
        errorMessage =
          error.response.data?.detail ||
          'Email service is currently unavailable. Please try again later or contact support.';
      } else if (error.response?.status === 500) {
        // Internal server errors (template errors, unexpected issues)
        errorMessage =
          error.response.data?.detail ||
          'An internal error occurred. Please try again or contact support.';
      } else if (error.code === 'NETWORK_ERROR' || !error.response) {
        // Network connectivity issues
        errorMessage =
          'Network connection error. Please check your internet connection and try again.';
      }

      setMessage({
        type: 'error',
        text: errorMessage,
      });
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

  if (!preferences) {
    return (
      <div className="text-center py-12">
        <ExclamationCircleIcon className="mx-auto h-12 w-12 text-red-400" />
        <h2 className="mt-4 text-lg font-semibold text-gray-900">Failed to load settings</h2>
        <p className="mt-2 text-gray-600">Please refresh the page to try again.</p>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto">
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

      <div className="space-y-8">
        {/* Account Information */}
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
        </div>

        {/* Email Notifications */}
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
                  checked={preferences.email_notifications_enabled}
                  onChange={e =>
                    handlePreferenceChange('email_notifications_enabled', e.target.checked)
                  }
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-orange-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-orange-600"></div>
              </label>
            </div>

            {/* Weekly Planning Reminder */}
            {preferences.email_notifications_enabled && (
              <div className="border border-gray-200 rounded-lg p-4">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center">
                    <BellIcon className="h-5 w-5 text-gray-400 mr-2" />
                    <div>
                      <h3 className="text-sm font-medium text-gray-900">
                        Weekly Meal Planning Reminder
                      </h3>
                      <p className="text-sm text-gray-500">
                        Get reminded to plan your weekly meals
                      </p>
                    </div>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={preferences.weekly_planning_reminder}
                      onChange={e =>
                        handlePreferenceChange('weekly_planning_reminder', e.target.checked)
                      }
                      className="sr-only peer"
                    />
                    <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-orange-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-orange-600"></div>
                  </label>
                </div>

                {preferences.weekly_planning_reminder && (
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-4 pt-4 border-t border-gray-200">
                    {/* Day of Week */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Day of Week
                      </label>
                      <select
                        value={preferences.reminder_day_of_week}
                        onChange={e =>
                          handlePreferenceChange('reminder_day_of_week', parseInt(e.target.value))
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

                    {/* Time */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2 flex items-center">
                        <ClockIcon className="h-4 w-4 mr-1" />
                        Time
                      </label>
                      <input
                        type="time"
                        value={preferences.reminder_time}
                        onChange={e => handlePreferenceChange('reminder_time', e.target.value)}
                        className="input"
                      />
                    </div>

                    {/* Timezone */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2 flex items-center">
                        <GlobeAltIcon className="h-4 w-4 mr-1" />
                        Timezone
                      </label>
                      <select
                        value={preferences.timezone}
                        onChange={e => handlePreferenceChange('timezone', e.target.value)}
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

                {/* Next Reminder Info */}
                {preferences.weekly_planning_reminder && reminderSchedule && (
                  <div className="mt-4 p-3 bg-blue-50 rounded-lg">
                    <p className="text-sm text-blue-700">
                      <strong>Next reminder:</strong> {reminderSchedule.message}
                    </p>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-col sm:flex-row gap-4">
          <button
            onClick={savePreferences}
            disabled={saving}
            className="btn-primary flex-1 sm:flex-initial"
          >
            {saving ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2" />
                Saving...
              </>
            ) : (
              'Save Settings'
            )}
          </button>

          {preferences.email_notifications_enabled && preferences.weekly_planning_reminder && (
            <button
              onClick={sendTestReminder}
              disabled={testingSendReminder}
              className="btn-secondary flex-1 sm:flex-initial"
            >
              {testingSendReminder ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-gray-600 mr-2" />
                  Sending...
                </>
              ) : (
                'Send Test Reminder'
              )}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
