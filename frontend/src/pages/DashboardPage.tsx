import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  ArrowRightIcon,
  CalendarMealIcon,
  ClockIcon,
  FireStatsIcon,
  PantryIcon,
  RecipeBookIcon,
  ShoppingCartCheckIcon,
  SparkleWandIcon,
} from '../components/ui/AppIcons';
import { EmptyState } from '../components/ui/EmptyState';
import { SectionCard } from '../components/ui/SectionCard';
import { StatPill } from '../components/ui/StatPill';
import dashboardService from '../services/dashboard.service';
import type { DashboardActionItem, DashboardSummary } from '../types';
import { parseLocalIsoDate } from '../utils/date';

function getGreeting() {
  const hour = new Date().getHours();
  if (hour < 12) return 'Good morning';
  if (hour < 17) return 'Good afternoon';
  return 'Good evening';
}

function actionTone(impact: DashboardActionItem['impact']) {
  if (impact === 'high') {
    return {
      badge: 'border-[#B91C1C]/25 bg-[#FEE2E2] text-[#991B1B]',
      dot: 'bg-[#991B1B]',
      label: 'High impact',
    };
  }
  if (impact === 'medium') {
    return {
      badge: 'border-[#B45309]/25 bg-[#FEF3C7] text-[#92400E]',
      dot: 'bg-[#92400E]',
      label: 'Medium impact',
    };
  }
  return {
    badge: 'border-[#E7E0D6] bg-[#F3EFE6] text-[#57534E]',
    dot: 'bg-[#78716C]',
    label: 'Low impact',
  };
}

function formatShortDate(value: string) {
  const date = /^\d{4}-\d{2}-\d{2}$/.test(value) ? parseLocalIsoDate(value) : new Date(value);
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
        <div className="h-64 rounded-3xl border border-[#E7E0D6] bg-[#F3EFE6]/70 animate-pulse" />
        <div className="grid gap-6 lg:grid-cols-2">
          <div className="h-72 rounded-3xl border border-[#E7E0D6] bg-[#F3EFE6]/70 animate-pulse" />
          <div className="h-72 rounded-3xl border border-[#E7E0D6] bg-[#F3EFE6]/70 animate-pulse" />
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
  const topExpiringItems = summary.pantry_risk.top_items;
  const useAllExpiringHref =
    topExpiringItems.length >= 2
      ? `/generate?use=${topExpiringItems.map(item => encodeURIComponent(item.name)).join('&use=')}`
      : null;

  return (
    <div className="space-y-8">
      {/* Organic-Modern Editorial Masthead */}
      <section className="surface relative overflow-hidden p-6 sm:p-8 lg:p-10">
        <div className="grid gap-8 xl:grid-cols-[1.25fr_0.75fr] xl:items-start">
          <div className="space-y-6">
            <div className="flex flex-wrap items-center gap-3">
              <span className="badge">Today's Kitchen</span>
              <span className="eyebrow">Daily decision cockpit</span>
              <span className="text-xs text-[#D6CEC2]" aria-hidden="true">
                •
              </span>
              <span className="text-xs font-medium text-[#57534E]">{todayLabel}</span>
            </div>

            <div className="space-y-3">
              <h1 className="font-display text-3xl font-semibold leading-[1.12] tracking-tight text-[#1C1917] sm:text-4xl lg:text-[2.65rem]">
                {getGreeting()}. {summary.today_brief.headline}
              </h1>
              <p className="max-w-2xl text-base leading-relaxed text-[#57534E]">
                {summary.today_brief.subline}
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-3 pt-1">
              <Link to={primaryAction.href} className="btn-primary">
                <SparkleWandIcon size={18} className="text-white" />
                {primaryAction.label}
              </Link>
              {secondaryActions.map(action => (
                <Link key={action.id} to={action.cta.href} className="btn-secondary">
                  {action.cta.label}
                </Link>
              ))}
            </div>

            {/* 3-Metric Quick Summary Strip */}
            <div className="grid grid-cols-1 gap-3 border-t border-[#E7E0D6] pt-6 sm:grid-cols-3">
              <div className="rounded-2xl border border-[#E7E0D6] bg-[#FAF7F2] px-4 py-3.5">
                <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-[#78716C]">
                  Week Coverage
                </p>
                <div className="mt-1 flex items-baseline justify-between gap-2">
                  <span className="font-display text-2xl font-semibold tabular-nums text-[#1C1917]">
                    {summary.plan_continuity.completion_percent}%
                  </span>
                  <span className="text-xs font-medium tabular-nums text-[#57534E]">
                    {summary.plan_continuity.open_slots} open
                  </span>
                </div>
              </div>

              <div className="rounded-2xl border border-[#E7E0D6] bg-[#FAF7F2] px-4 py-3.5">
                <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-[#78716C]">
                  Pantry Expiring Soon
                </p>
                <div className="mt-1 flex items-baseline justify-between gap-2">
                  <span
                    className={`font-display text-2xl font-semibold tabular-nums ${
                      summary.pantry_risk.expiring_3d_count > 0
                        ? 'text-[#B45309]'
                        : 'text-[#2F6F4E]'
                    }`}
                  >
                    {summary.pantry_risk.expiring_3d_count}
                  </span>
                  <span className="text-xs font-medium text-[#57534E]">
                    {summary.pantry_risk.expiring_3d_count === 1 ? 'item in 3d' : 'items in 3d'}
                  </span>
                </div>
              </div>

              <div className="rounded-2xl border border-[#E7E0D6] bg-[#FAF7F2] px-4 py-3.5">
                <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-[#78716C]">
                  Shopping Progress
                </p>
                <div className="mt-1 flex items-baseline justify-between gap-2">
                  <span className="font-display text-2xl font-semibold tabular-nums text-[#1C1917]">
                    {summary.recent_context.recent_grocery_list
                      ? summary.recent_context.recent_grocery_list.unchecked_count
                      : 0}
                  </span>
                  <span className="text-xs font-medium text-[#57534E]">
                    {summary.recent_context.recent_grocery_list ? 'remaining' : 'no active list'}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Right now Priority Queue */}
          <div className="bg-[#FAF7F2] border border-[#E7E0D6] rounded-2xl p-5">
            <div className="flex items-center justify-between border-b border-[#E7E0D6] pb-3.5">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[#78716C]">
                  Right now
                </p>
                <p className="mt-0.5 text-xs text-[#57534E]">Recommended kitchen priorities</p>
              </div>
              <div className="icon-container-premium icon-container-orange icon-container-sm">
                <FireStatsIcon size={18} />
              </div>
            </div>

            <div className="mt-4 space-y-3">
              {summary.action_queue.map(action => {
                const tone = actionTone(action.impact);
                return (
                  <div
                    key={action.id}
                    className="rounded-2xl border border-[#E7E0D6] bg-white p-4 transition-all duration-150 hover:border-[#D6CEC2]"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="text-sm font-semibold text-[#1C1917]">{action.title}</p>
                        <p className="mt-1 text-xs leading-relaxed text-[#57534E]">
                          {action.rationale}
                        </p>
                      </div>
                      <span
                        className={`inline-flex shrink-0 items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11px] font-semibold ${tone.badge}`}
                      >
                        <span className={`h-1.5 w-1.5 rounded-full ${tone.dot}`} />
                        {tone.label}
                      </span>
                    </div>
                    <Link
                      to={action.cta.href}
                      className="mt-3 inline-flex items-center text-xs font-semibold uppercase tracking-[0.08em] text-[#C84B31] hover:text-[#B83B22]"
                    >
                      {action.cta.label}
                      <ArrowRightIcon className="ml-1.5 h-3.5 w-3.5" />
                    </Link>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </section>

      {/* Plan Continuity & Interactive Pantry Triage */}
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
            ) : (
              <Link to="/meal-plans" className="btn-secondary text-sm">
                View planner
              </Link>
            )
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
              <div className="space-y-2.5">
                {summary.plan_continuity.next_slots.map(slot => (
                  <Link
                    key={`${slot.date}-${slot.meal_type}`}
                    to={slot.href}
                    className="group flex items-center justify-between rounded-2xl border border-[#E7E0D6] bg-[#FAF7F2]/60 px-4 py-3.5 transition-all hover:-translate-y-0.5 hover:border-[#D6CEC2] hover:bg-white"
                  >
                    <div className="flex items-center gap-3">
                      <div
                        className={`icon-container-premium icon-container-sm ${
                          slot.has_recipe ? 'icon-container-emerald' : 'icon-container-orange'
                        }`}
                      >
                        <CalendarMealIcon size={16} />
                      </div>
                      <div>
                        <p className="text-sm font-semibold text-[#1C1917]">
                          {titleCaseMealType(slot.meal_type)} • {formatShortDate(slot.date)}
                        </p>
                        <p className="mt-0.5 text-xs text-[#57534E]">
                          {slot.has_recipe
                            ? 'Assigned recipe in this slot'
                            : 'Open slot waiting for a recipe'}
                        </p>
                      </div>
                    </div>
                    <ArrowRightIcon className="h-4 w-4 text-[#78716C] transition-transform group-hover:translate-x-1 group-hover:text-[#1C1917]" />
                  </Link>
                ))}
              </div>
            ) : (
              <div className="rounded-2xl border border-dashed border-[#D6CEC2] bg-[#FAF7F2] p-5 text-sm text-[#57534E]">
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
            <div className="flex flex-wrap items-center gap-2">
              {useAllExpiringHref && (
                <Link to={useAllExpiringHref} className="btn-primary text-xs px-4 py-2">
                  <SparkleWandIcon size={14} className="text-white" />
                  Use all expiring
                </Link>
              )}
              <Link to={summary.pantry_risk.cta.href} className="btn-secondary text-sm">
                {summary.pantry_risk.cta.label}
              </Link>
            </div>
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

            {topExpiringItems.length > 0 ? (
              <div className="space-y-2.5">
                {topExpiringItems.map(item => (
                  <div
                    key={`${item.name}-${item.expires_at}`}
                    className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-[#E7E0D6] bg-[#FAF7F2]/60 px-4 py-3 transition-colors hover:border-[#D6CEC2] hover:bg-white"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="icon-container-premium icon-container-amber icon-container-sm shrink-0">
                        <PantryIcon size={16} />
                      </div>
                      <div className="min-w-0">
                        <p className="text-sm font-semibold text-[#1C1917] truncate">{item.name}</p>
                        <p className="text-xs text-[#B45309] font-medium tabular-nums">
                          Expires {formatShortDate(item.expires_at)}
                        </p>
                      </div>
                    </div>
                    <Link
                      to={`/generate?use=${encodeURIComponent(item.name)}`}
                      className="inline-flex items-center gap-1.5 rounded-full border border-[#C84B31]/25 bg-[#F9F1EA] px-3 py-1.5 text-xs font-semibold text-[#9A3412] transition-colors hover:border-[#C84B31] hover:bg-[#C84B31] hover:text-white"
                    >
                      <SparkleWandIcon size={14} />
                      Cook with this
                    </Link>
                  </div>
                ))}
              </div>
            ) : (
              <div className="rounded-2xl border border-dashed border-[#D6CEC2] bg-[#FAF7F2] p-5 text-sm text-[#57534E]">
                Nothing urgent in pantry right now.
              </div>
            )}
          </div>
        </SectionCard>
      </section>

      {/* Shopping Continuity & Recent Context */}
      <section className="grid gap-6 xl:grid-cols-[0.95fr_1.05fr]">
        <SectionCard
          title="Shopping continuity"
          subtitle="Pick up where your latest list left off"
          className="p-6"
          action={
            <Link to="/grocery" className="btn-ghost text-xs">
              All lists
            </Link>
          }
        >
          {summary.recent_context.recent_grocery_list ? (
            <Link
              to={summary.recent_context.recent_grocery_list.href}
              className="group flex items-center justify-between rounded-2xl border border-[#E7E0D6] bg-[#FAF7F2]/60 px-4 py-4 transition-all hover:-translate-y-0.5 hover:border-[#D6CEC2] hover:bg-white"
            >
              <div className="flex items-center gap-3.5">
                <div className="icon-container-premium icon-container-emerald">
                  <ShoppingCartCheckIcon size={20} />
                </div>
                <div>
                  <p className="text-sm font-semibold text-[#1C1917]">Latest grocery list</p>
                  <p className="mt-0.5 text-xs text-[#57534E] tabular-nums">
                    {summary.recent_context.recent_grocery_list.unchecked_count} item(s) still
                    unchecked
                  </p>
                </div>
              </div>
              <ArrowRightIcon className="h-4 w-4 text-[#78716C] transition-transform group-hover:translate-x-1 group-hover:text-[#1C1917]" />
            </Link>
          ) : (
            <div className="rounded-2xl border border-dashed border-[#D6CEC2] bg-[#FAF7F2] p-5 text-sm text-[#57534E]">
              No active grocery list yet. Build one from recipes or a meal plan.
            </div>
          )}
        </SectionCard>

        <SectionCard
          title="Recent context"
          subtitle="Continue from your latest saved recipes"
          className="p-6"
          action={
            <Link to="/recipes" className="btn-ghost text-xs">
              Recipe Vault
            </Link>
          }
        >
          {summary.recent_context.recent_recipes.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-[#D6CEC2] bg-[#FAF7F2] p-6 text-center">
              <p className="text-sm text-[#57534E]">No saved recipes yet.</p>
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
                  className="group flex items-start justify-between gap-4 rounded-2xl border border-[#E7E0D6] bg-[#FAF7F2]/60 px-4 py-3.5 transition-all hover:-translate-y-0.5 hover:border-[#D6CEC2] hover:bg-white"
                >
                  <div className="flex items-start gap-3 min-w-0">
                    <div className="icon-container-premium icon-container-orange icon-container-sm mt-0.5 shrink-0">
                      <RecipeBookIcon size={16} />
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-[#1C1917] truncate">{recipe.name}</p>
                      <div className="mt-2 flex flex-wrap items-center gap-2">
                        <span className="inline-flex items-center gap-1 rounded-full border border-[#E7E0D6] bg-white px-2.5 py-0.5 text-[11px] font-medium tabular-nums text-[#57534E]">
                          <ClockIcon className="h-3 w-3 text-[#78716C]" />
                          {recipe.total_minutes > 0
                            ? `${recipe.total_minutes} min`
                            : 'Time not set'}
                        </span>
                        {recipe.tags.slice(0, 2).map(tag => (
                          <span
                            key={tag}
                            className="rounded-full border border-[#C84B31]/20 bg-[#F9F1EA] px-2.5 py-0.5 text-[11px] font-semibold text-[#9A3412]"
                          >
                            {tag}
                          </span>
                        ))}
                      </div>
                    </div>
                  </div>
                  <ArrowRightIcon className="mt-1 h-4 w-4 shrink-0 text-[#78716C] transition-transform group-hover:translate-x-1 group-hover:text-[#1C1917]" />
                </Link>
              ))}
            </div>
          )}
        </SectionCard>
      </section>
    </div>
  );
}
