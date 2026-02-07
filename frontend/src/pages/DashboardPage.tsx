import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  ArrowRightIcon,
  ClockIcon,
  FireStatsIcon,
  PantryIcon,
  ShoppingCartCheckIcon,
  SparkleWandIcon,
} from '../components/ui/AppIcons';
import { EmptyState } from '../components/ui/EmptyState';
import { SectionCard } from '../components/ui/SectionCard';
import { StatPill } from '../components/ui/StatPill';
import dashboardService from '../services/dashboard.service';
import type { DashboardActionItem, DashboardSummary } from '../types';

function getGreeting() {
  const hour = new Date().getHours();
  if (hour < 12) return 'Good morning';
  if (hour < 17) return 'Good afternoon';
  return 'Good evening';
}

function actionTone(impact: DashboardActionItem['impact']) {
  if (impact === 'high') {
    return {
      badge: 'bg-red-50 text-red-700 border-red-200',
      label: 'High impact',
    };
  }
  if (impact === 'medium') {
    return {
      badge: 'bg-amber-50 text-amber-700 border-amber-200',
      label: 'Medium impact',
    };
  }
  return {
    badge: 'bg-stone-100 text-stone-700 border-stone-200',
    label: 'Low impact',
  };
}

function formatShortDate(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
  }).format(date);
}

function titleCaseMealType(value: string) {
  return value.charAt(0).toUpperCase() + value.slice(1);
}

export default function DashboardPage() {
  const [summary, setSummary] = useState<DashboardSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const loadSummary = async () => {
      setLoading(true);
      setError('');
      try {
        const data = await dashboardService.getDashboardSummary();
        setSummary(data);
      } catch (loadError) {
        console.error('Failed to load dashboard summary:', loadError);
        setError('Could not load your dashboard right now.');
      } finally {
        setLoading(false);
      }
    };

    void loadSummary();
  }, []);

  const todayLabel = useMemo(
    () =>
      new Intl.DateTimeFormat('en-US', {
        weekday: 'long',
        month: 'short',
        day: 'numeric',
      }).format(new Date()),
    []
  );

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="h-60 rounded-[2rem] bg-stone-100 animate-pulse" />
        <div className="grid gap-4 lg:grid-cols-2">
          <div className="h-72 rounded-3xl bg-stone-100 animate-pulse" />
          <div className="h-72 rounded-3xl bg-stone-100 animate-pulse" />
        </div>
      </div>
    );
  }

  if (error || !summary) {
    return (
      <EmptyState
        title="Dashboard unavailable"
        description={error || 'Something went wrong while loading your dashboard.'}
        action={
          <Link className="btn-primary" to="/generate">
            Generate a recipe
          </Link>
        }
      />
    );
  }

  const primaryAction = summary.today_brief.primary_action;
  const secondaryActions = summary.action_queue.slice(1, 3);

  return (
    <div className="space-y-8">
      <section className="relative overflow-hidden rounded-[2rem] border border-stone-200/70 bg-gradient-to-br from-orange-50 via-amber-50 to-emerald-50 p-6 shadow-[0_22px_80px_-52px_rgba(28,25,23,0.5)] sm:p-8 lg:p-10">
        <div className="pointer-events-none absolute -top-16 right-8 h-40 w-40 rounded-full bg-orange-200/40 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-20 left-12 h-48 w-48 rounded-full bg-emerald-200/35 blur-3xl" />

        <div className="relative grid gap-8 xl:grid-cols-[1.25fr_0.75fr]">
          <div className="space-y-5">
            <span className="inline-flex items-center gap-2 rounded-full border border-white/80 bg-white/80 px-4 py-1.5 text-xs font-semibold uppercase tracking-[0.14em] text-stone-700">
              Daily decision cockpit
            </span>

            <div className="space-y-2">
              <p className="text-sm font-medium text-stone-600">{todayLabel}</p>
              <h1 className="text-3xl font-bold leading-tight text-stone-900 sm:text-4xl">
                {getGreeting()}. {summary.today_brief.headline}
              </h1>
              <p className="max-w-2xl text-sm text-stone-700 sm:text-base">
                {summary.today_brief.subline}
              </p>
            </div>

            <div className="flex flex-wrap gap-3">
              <Link to={primaryAction.href} className="btn-primary">
                {primaryAction.label}
              </Link>
              {secondaryActions.map(action => (
                <Link key={action.id} to={action.cta.href} className="btn-secondary">
                  {action.cta.label}
                </Link>
              ))}
            </div>
          </div>

          <div className="rounded-3xl border border-stone-200/70 bg-white/90 p-5 backdrop-blur-sm">
            <div className="flex items-center justify-between">
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-stone-500">
                Right now
              </p>
              <FireStatsIcon size={26} />
            </div>

            <div className="mt-4 space-y-3">
              {summary.action_queue.map(action => {
                const tone = actionTone(action.impact);
                return (
                  <div key={action.id} className="rounded-2xl border border-stone-200 bg-white p-3">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="text-sm font-semibold text-stone-900">{action.title}</p>
                        <p className="mt-1 text-xs text-stone-600">{action.rationale}</p>
                      </div>
                      <span
                        className={`inline-flex items-center rounded-full border px-2.5 py-1 text-[11px] font-semibold ${tone.badge}`}
                      >
                        {tone.label}
                      </span>
                    </div>
                    <Link
                      to={action.cta.href}
                      className="mt-3 inline-flex items-center text-sm font-semibold text-primary hover:text-primary-hover"
                    >
                      {action.cta.label}
                      <ArrowRightIcon className="ml-1 h-4 w-4" />
                    </Link>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </section>

      <section className="grid gap-6 xl:grid-cols-[1.05fr_0.95fr]">
        <SectionCard
          title="Plan continuity"
          subtitle="Keep this week realistic and complete"
          className="p-6"
          action={
            summary.plan_continuity.active_plan_id ? (
              <Link
                to={`/meal-plans/${summary.plan_continuity.active_plan_id}`}
                className="btn-secondary text-sm"
              >
                Open plan
              </Link>
            ) : null
          }
        >
          <div className="space-y-4">
            <div className="grid gap-3 sm:grid-cols-2">
              <StatPill
                label="Completion"
                value={`${summary.plan_continuity.completion_percent}%`}
                tone="success"
              />
              <StatPill
                label="Open slots"
                value={summary.plan_continuity.open_slots}
                tone={summary.plan_continuity.open_slots > 0 ? 'warm' : 'default'}
              />
            </div>

            {summary.plan_continuity.next_slots.length > 0 ? (
              <div className="space-y-2">
                {summary.plan_continuity.next_slots.map(slot => (
                  <Link
                    key={`${slot.date}-${slot.meal_type}`}
                    to={slot.href}
                    className="group flex items-center justify-between rounded-2xl border border-stone-200/70 bg-white px-4 py-3 transition-all hover:-translate-y-0.5 hover:border-stone-300"
                  >
                    <div>
                      <p className="text-sm font-semibold text-stone-900">
                        {titleCaseMealType(slot.meal_type)} • {formatShortDate(slot.date)}
                      </p>
                      <p className="mt-1 text-xs text-stone-600">
                        {slot.has_recipe
                          ? 'Assigned recipe in this slot'
                          : 'Open slot waiting for a recipe'}
                      </p>
                    </div>
                    <ArrowRightIcon className="h-4 w-4 text-stone-400 transition-transform group-hover:translate-x-1" />
                  </Link>
                ))}
              </div>
            ) : (
              <div className="rounded-2xl border border-dashed border-stone-200 bg-stone-50 p-4 text-sm text-stone-600">
                No active plan slots yet. Build a plan to unlock week-level guidance.
              </div>
            )}
          </div>
        </SectionCard>

        <SectionCard
          title="Pantry risk"
          subtitle="Use expiring ingredients before buying more"
          className="p-6"
          action={
            <Link to={summary.pantry_risk.cta.href} className="btn-secondary text-sm">
              {summary.pantry_risk.cta.label}
            </Link>
          }
        >
          <div className="space-y-4">
            <div className="grid gap-3 sm:grid-cols-2">
              <StatPill
                label="Expiring in 3 days"
                value={summary.pantry_risk.expiring_3d_count}
                tone={summary.pantry_risk.expiring_3d_count > 0 ? 'warm' : 'default'}
              />
              <StatPill label="Focus" value="Waste prevention" tone="success" />
            </div>

            {summary.pantry_risk.top_items.length > 0 ? (
              <div className="space-y-2">
                {summary.pantry_risk.top_items.map(item => (
                  <div
                    key={`${item.name}-${item.expires_at}`}
                    className="flex items-center justify-between rounded-2xl border border-stone-200/70 bg-white px-4 py-3"
                  >
                    <div className="flex items-center gap-3">
                      <div className="icon-container-premium icon-container-emerald icon-container-sm">
                        <PantryIcon size={16} />
                      </div>
                      <div>
                        <p className="text-sm font-semibold text-stone-900">{item.name}</p>
                        <p className="text-xs text-stone-600">
                          Expires {formatShortDate(item.expires_at)}
                        </p>
                      </div>
                    </div>
                    <SparkleWandIcon className="h-4 w-4 text-emerald-600" />
                  </div>
                ))}
              </div>
            ) : (
              <div className="rounded-2xl border border-dashed border-stone-200 bg-stone-50 p-4 text-sm text-stone-600">
                Nothing urgent in pantry right now.
              </div>
            )}
          </div>
        </SectionCard>
      </section>

      <section className="grid gap-6 xl:grid-cols-[0.95fr_1.05fr]">
        <SectionCard
          title="Shopping continuity"
          subtitle="Pick up where your latest list left off"
          className="p-6"
        >
          {summary.recent_context.recent_grocery_list ? (
            <Link
              to={summary.recent_context.recent_grocery_list.href}
              className="group flex items-center justify-between rounded-2xl border border-stone-200/70 bg-white px-4 py-3 transition-all hover:-translate-y-0.5 hover:border-stone-300"
            >
              <div className="flex items-center gap-3">
                <div className="icon-container-premium icon-container-emerald">
                  <ShoppingCartCheckIcon size={20} />
                </div>
                <div>
                  <p className="text-sm font-semibold text-stone-900">Latest grocery list</p>
                  <p className="text-xs text-stone-600">
                    {summary.recent_context.recent_grocery_list.unchecked_count} item(s) still
                    unchecked
                  </p>
                </div>
              </div>
              <ArrowRightIcon className="h-4 w-4 text-stone-400 transition-transform group-hover:translate-x-1" />
            </Link>
          ) : (
            <div className="rounded-2xl border border-dashed border-stone-200 bg-stone-50 p-4 text-sm text-stone-600">
              No active grocery list yet. Build one from recipes or a meal plan.
            </div>
          )}
        </SectionCard>

        <SectionCard
          title="Recent context"
          subtitle="Continue from your latest saved recipes"
          className="p-6"
        >
          {summary.recent_context.recent_recipes.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-stone-200 bg-stone-50 p-6 text-center">
              <p className="text-sm text-stone-600">No saved recipes yet.</p>
              <Link to="/generate" className="btn-primary mt-4 inline-flex">
                Generate first recipe
              </Link>
            </div>
          ) : (
            <div className="space-y-3">
              {summary.recent_context.recent_recipes.map(recipe => (
                <Link
                  key={recipe.id}
                  to={`/recipes/${recipe.id}`}
                  className="group flex items-start justify-between rounded-2xl border border-stone-200/70 bg-white px-4 py-3 transition-all hover:-translate-y-0.5 hover:border-stone-300"
                >
                  <div>
                    <p className="text-sm font-semibold text-stone-900">{recipe.name}</p>
                    <div className="mt-2 flex flex-wrap items-center gap-2">
                      <span className="inline-flex items-center gap-1 rounded-full bg-stone-100 px-2.5 py-1 text-[11px] font-semibold text-stone-600">
                        <ClockIcon className="h-3.5 w-3.5" />
                        {recipe.total_minutes > 0 ? `${recipe.total_minutes} min` : 'Time not set'}
                      </span>
                      {recipe.tags.slice(0, 2).map(tag => (
                        <span
                          key={tag}
                          className="rounded-full bg-orange-50 px-2.5 py-1 text-[11px] font-semibold text-orange-700"
                        >
                          {tag}
                        </span>
                      ))}
                    </div>
                  </div>
                  <ArrowRightIcon className="mt-1 h-4 w-4 text-stone-400 transition-transform group-hover:translate-x-1" />
                </Link>
              ))}
            </div>
          )}
        </SectionCard>
      </section>
    </div>
  );
}
