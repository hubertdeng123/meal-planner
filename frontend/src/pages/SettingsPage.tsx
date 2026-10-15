import { useCallback, useEffect, useId, useState, type ReactNode } from 'react';
import {
  IngredientPreferences,
  NutritionPreferences,
  RoutinePreferences,
  TastePreferences,
} from '../components/PreferenceComponents';
import { BellIcon, CheckCircleSolidIcon } from '../components/ui/AppIcons';
import { ChoiceChips } from '../components/ui/ChoiceChips';
import { ErrorState } from '../components/ui/ErrorState';
import { PreferenceToggle } from '../components/ui/PreferenceToggle';
import { useToast } from '../contexts/ToastContext';
import authService from '../services/auth.service';
import notificationService, {
  type NotificationPreferences,
  type ReminderSchedule,
} from '../services/notification.service';
import type { APIError, User, UserPreferences } from '../types';

const WEEKDAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

const SECTIONS = [
  { id: 'taste', title: 'Taste', description: 'What you like to eat and how you like to cook.' },
  { id: 'ingredients', title: 'Ingredients', description: 'Favourites and hard nos.' },
  { id: 'routine', title: 'Routine', description: 'How much time you have, and when.' },
  { id: 'nutrition', title: 'Nutrition & health', description: 'Optional targets and needs.' },
  { id: 'reminders', title: 'Reminders', description: 'A weekly nudge to plan ahead.' },
  { id: 'account', title: 'Account', description: 'Your sign-in details.' },
] as const;

type SectionId = (typeof SECTIONS)[number]['id'];

interface SettingsData {
  user: User;
  preferences: UserPreferences;
  notifications: NotificationPreferences;
  timezones: string[];
  schedule: ReminderSchedule | null;
}

function reminderError(error: unknown): string {
  const apiError = error as APIError;
  const detail = apiError.response?.data?.detail;
  if (apiError.response?.status === 400) return detail || 'Check your reminder settings first.';
  if (apiError.response?.status === 503) return detail || 'Email is unavailable right now.';
  return 'Could not send a test reminder.';
}

export default function SettingsPage() {
  const { addToast } = useToast();
  const [data, setData] = useState<SettingsData | null>(null);
  const [failed, setFailed] = useState(false);
  const [preferences, setPreferences] = useState<UserPreferences | null>(null);
  const [notifications, setNotifications] = useState<NotificationPreferences | null>(null);
  const [saving, setSaving] = useState(false);
  const [sendingTest, setSendingTest] = useState(false);

  const load = useCallback(async () => {
    setFailed(false);
    try {
      const [user, prefs, notif, zones, schedule] = await Promise.all([
        authService.getCurrentUser(),
        authService.getUserPreferences(),
        notificationService.getPreferences(),
        notificationService.getTimezones().catch(() => ({ timezones: [] as string[] })),
        notificationService.getReminderSchedule().catch(() => null),
      ]);
      setData({
        user,
        preferences: prefs,
        notifications: notif,
        timezones: zones.timezones,
        schedule,
      });
      setPreferences(prefs);
      setNotifications(notif);
    } catch (error) {
      console.error('Failed to load settings:', error);
      setFailed(true);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  if (failed) {
    return (
      <div className="mx-auto max-w-5xl">
        <h1 className="page-title mb-6">Settings</h1>
        <ErrorState
          title="Couldn't load your settings"
          description="Check your connection and try again."
          onRetry={() => void load()}
        />
      </div>
    );
  }

  if (!data || !preferences || !notifications) {
    return (
      <div className="mx-auto max-w-5xl" role="status" aria-label="Loading settings">
        <div className="skeleton h-8 w-40" />
        <div className="mt-6 space-y-4">
          {[0, 1, 2].map(index => (
            <div key={index} className="skeleton h-48 w-full rounded-2xl" />
          ))}
        </div>
      </div>
    );
  }

  const prefsDirty = JSON.stringify(preferences) !== JSON.stringify(data.preferences);
  const notifDirty = JSON.stringify(notifications) !== JSON.stringify(data.notifications);
  const dirty = prefsDirty || notifDirty;

  const save = async () => {
    setSaving(true);
    try {
      const [savedPrefs, savedNotif] = await Promise.all([
        prefsDirty ? authService.updateUserPreferences(preferences) : data.preferences,
        notifDirty ? notificationService.updatePreferences(notifications) : data.notifications,
      ]);
      const schedule = notifDirty
        ? await notificationService.getReminderSchedule().catch(() => null)
        : data.schedule;
      setData({ ...data, preferences: savedPrefs, notifications: savedNotif, schedule });
      setPreferences(savedPrefs);
      setNotifications(savedNotif);
      addToast('Settings saved.', 'success');
    } catch (error) {
      console.error('Failed to save settings:', error);
      addToast('Could not save your settings. Try again?', 'error');
    } finally {
      setSaving(false);
    }
  };

  const discard = () => {
    setPreferences(data.preferences);
    setNotifications(data.notifications);
  };

  const sendTest = async () => {
    setSendingTest(true);
    try {
      const result = await notificationService.sendTestReminder();
      addToast(`Test reminder sent to ${result.email}.`, 'success');
    } catch (error) {
      console.error('Failed to send test reminder:', error);
      addToast(reminderError(error), 'error');
    } finally {
      setSendingTest(false);
    }
  };

  const setNotif = (patch: Partial<NotificationPreferences>) =>
    setNotifications({ ...notifications, ...patch });

  const sections: Record<SectionId, ReactNode> = {
    taste: <TastePreferences preferences={preferences} onChange={setPreferences} />,
    ingredients: <IngredientPreferences preferences={preferences} onChange={setPreferences} />,
    routine: <RoutinePreferences preferences={preferences} onChange={setPreferences} />,
    nutrition: <NutritionPreferences preferences={preferences} onChange={setPreferences} />,
    reminders: (
      <ReminderSettings
        notifications={notifications}
        onChange={setNotif}
        timezones={data.timezones}
        schedule={notifDirty ? null : data.schedule}
        canTest={
          !notifDirty &&
          notifications.email_notifications_enabled &&
          notifications.weekly_planning_reminder
        }
        sendingTest={sendingTest}
        onSendTest={() => void sendTest()}
      />
    ),
    account: (
      <dl className="grid gap-4 sm:grid-cols-2">
        <div>
          <dt className="label">Username</dt>
          <dd className="text-[15px] text-stone-900">{data.user.username}</dd>
        </div>
        <div>
          <dt className="label">Email</dt>
          <dd className="text-[15px] text-stone-900">{data.user.email}</dd>
        </div>
      </dl>
    ),
  };

  return (
    <div className="mx-auto max-w-5xl pb-24">
      <header className="mb-6">
        <h1 className="page-title">Settings</h1>
        <p className="page-subtitle">Tune what Hungry Helper suggests and when it nudges you.</p>
      </header>

      <div className="lg:grid lg:grid-cols-[12rem_minmax(0,1fr)] lg:gap-10">
        <aside aria-label="Settings sections" className="hidden lg:block">
          <ul className="sticky top-10 space-y-0.5">
            {SECTIONS.map(section => (
              <li key={section.id}>
                <a href={`#${section.id}`} className="nav-item">
                  {section.title}
                </a>
              </li>
            ))}
          </ul>
        </aside>

        <div className="scrollbar-none -mx-4 mb-4 flex gap-2 overflow-x-auto px-4 lg:hidden">
          {SECTIONS.map(section => (
            <a key={section.id} href={`#${section.id}`} className="chip flex-shrink-0">
              {section.title}
            </a>
          ))}
        </div>

        <div className="space-y-5">
          {SECTIONS.map(section => (
            <section
              key={section.id}
              id={section.id}
              aria-labelledby={`${section.id}-heading`}
              className="card scroll-mt-20 p-5 sm:p-6 lg:scroll-mt-10"
            >
              <h2 id={`${section.id}-heading`} className="section-title">
                {section.title}
              </h2>
              <p className="helper-text mb-5 mt-0.5">{section.description}</p>
              {sections[section.id]}
            </section>
          ))}
        </div>
      </div>

      {dirty && (
        <div className="fixed inset-x-0 bottom-[calc(4.5rem+env(safe-area-inset-bottom))] z-30 flex justify-center px-4 animate-slide-in-up lg:bottom-6 lg:pl-[var(--sidebar-width)]">
          <div
            role="region"
            aria-label="Unsaved changes"
            className="flex w-full max-w-md items-center gap-2 rounded-2xl bg-stone-900 p-2 pl-4 text-white shadow-xl"
          >
            <span className="flex-1 text-sm font-medium">Unsaved changes</span>
            <button
              type="button"
              onClick={discard}
              disabled={saving}
              className="rounded-xl px-3 py-2 text-sm font-medium text-white/80 hover:bg-white/10 hover:text-white"
            >
              Discard
            </button>
            <button
              type="button"
              onClick={() => void save()}
              disabled={saving}
              className="btn-accent"
            >
              {saving ? 'Saving…' : 'Save changes'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

function ReminderSettings({
  notifications,
  onChange,
  timezones,
  schedule,
  canTest,
  sendingTest,
  onSendTest,
}: {
  notifications: NotificationPreferences;
  onChange: (patch: Partial<NotificationPreferences>) => void;
  timezones: string[];
  schedule: ReminderSchedule | null;
  canTest: boolean;
  sendingTest: boolean;
  onSendTest: () => void;
}) {
  const timeId = useId();
  const zoneId = useId();
  const zoneOptions = timezones.includes(notifications.timezone)
    ? timezones
    : [notifications.timezone, ...timezones];

  return (
    <div className="space-y-4">
      <PreferenceToggle
        label="Email notifications"
        description="Grocery lists and plans you send, plus reminders."
        checked={notifications.email_notifications_enabled}
        onChange={email_notifications_enabled => onChange({ email_notifications_enabled })}
      />
      <PreferenceToggle
        label="Weekly planning reminder"
        description="One email a week to plan the next one."
        checked={notifications.weekly_planning_reminder}
        disabled={!notifications.email_notifications_enabled}
        onChange={weekly_planning_reminder => onChange({ weekly_planning_reminder })}
      />

      {notifications.email_notifications_enabled && notifications.weekly_planning_reminder && (
        <div className="space-y-4 rounded-2xl bg-stone-50 p-4 animate-fade-in">
          <ChoiceChips
            label="Day"
            size="sm"
            options={WEEKDAYS.map((label, value) => ({ value: String(value), label }))}
            value={String(notifications.reminder_day_of_week)}
            onChange={value => onChange({ reminder_day_of_week: Number(value) })}
          />
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label htmlFor={timeId} className="label">
                Time
              </label>
              <input
                id={timeId}
                type="time"
                className="input"
                value={notifications.reminder_time}
                onChange={event => onChange({ reminder_time: event.target.value })}
              />
            </div>
            <div>
              <label htmlFor={zoneId} className="label">
                Time zone
              </label>
              <select
                id={zoneId}
                className="input"
                value={notifications.timezone}
                onChange={event => onChange({ timezone: event.target.value })}
              >
                {zoneOptions.map(zone => (
                  <option key={zone}>{zone}</option>
                ))}
              </select>
            </div>
          </div>
          {schedule && (
            <p className="flex items-start gap-2 text-sm text-stone-600">
              <BellIcon className="mt-0.5 h-4 w-4 flex-shrink-0 text-primary" />
              {schedule.message}
            </p>
          )}
          <div className="flex flex-wrap items-center gap-3">
            <button
              type="button"
              className="btn-secondary btn-sm"
              disabled={!canTest || sendingTest}
              onClick={onSendTest}
            >
              {sendingTest ? 'Sending…' : 'Send a test reminder'}
            </button>
            {!canTest && (
              <span className="text-xs text-stone-500">Save your changes to send a test.</span>
            )}
            {canTest && schedule && (
              <span className="inline-flex items-center gap-1 text-xs text-stone-500">
                <CheckCircleSolidIcon className="h-3.5 w-3.5 text-primary" />
                Reminder scheduled
              </span>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
