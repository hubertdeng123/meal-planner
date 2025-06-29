import { api } from './api';

export interface NotificationPreferences {
  email_notifications_enabled: boolean;
  weekly_planning_reminder: boolean;
  reminder_day_of_week: number; // 0=Monday, 6=Sunday
  reminder_time: string; // HH:MM format
  timezone: string;
}

export interface NotificationUpdate {
  email_notifications_enabled?: boolean;
  weekly_planning_reminder?: boolean;
  reminder_day_of_week?: number;
  reminder_time?: string;
  timezone?: string;
}

export interface ReminderSchedule {
  next_reminder: string | null;
  reminder_day: string;
  reminder_time: string;
  timezone: string;
  message: string;
}

class NotificationService {
  async getPreferences(): Promise<NotificationPreferences> {
    const response = await api.get('/notifications/preferences/');
    return response.data;
  }

  async updatePreferences(preferences: NotificationUpdate): Promise<NotificationPreferences> {
    const response = await api.put('/notifications/preferences/', preferences);
    return response.data;
  }

  async sendTestReminder(): Promise<{ detail: string; email: string }> {
    const response = await api.post('/notifications/test-weekly-reminder/');
    return response.data;
  }

  async sendGroceryNotification(
    groceryListId?: number,
    additionalEmails?: string[]
  ): Promise<{
    detail: string;
    sent_to: string[];
    total_sent: number;
    failed?: Array<{ email: string; error: string }>;
    total_failed?: number;
  }> {
    const response = await api.post('/notifications/send-grocery-notification/', {
      grocery_list_id: groceryListId,
      additional_emails: additionalEmails,
    });
    return response.data;
  }

  async sendWeeklyMealPlanNotification(
    mealPlanId?: number,
    additionalEmails?: string[],
    weeklyRecipes?: { [day: string]: Array<{ name: string; meal_type: string }> }
  ): Promise<{
    detail: string;
    sent_to: string[];
    total_sent: number;
    failed?: Array<{ email: string; error: string }>;
    total_failed?: number;
  }> {
    const response = await api.post('/notifications/send-weekly-meal-plan-notification/', {
      meal_plan_id: mealPlanId,
      additional_emails: additionalEmails,
      weekly_recipes: weeklyRecipes,
    });
    return response.data;
  }

  async getTimezones(): Promise<{ timezones: string[] }> {
    const response = await api.get('/notifications/timezone-list/');
    return response.data;
  }

  async getReminderSchedule(): Promise<ReminderSchedule> {
    const response = await api.get('/notifications/reminder-schedule/');
    return response.data;
  }
}

export default new NotificationService();
