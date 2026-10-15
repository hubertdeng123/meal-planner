import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  ArrowRightIcon,
  CalendarDaysIcon,
  ChevronRightIcon,
  ClockIcon,
  PantryIcon,
  PlayIcon,
  ShoppingBagIcon,
  SparklesIcon,
} from '../components/ui/AppIcons';
import { ErrorState } from '../components/ui/ErrorState';
import { RecipeCover } from '../components/ui/RecipeCover';
import { useCurrentUser } from '../hooks/useCurrentUser';
import dashboardService from '../services/dashboard.service';
import mealPlanService from '../services/mealPlan.service';
import recipeService from '../services/recipe.service';
import type { DashboardSummary, MealPlan, Recipe } from '../types';
import {
  daysFromToday,
  formatLocalDate,
  getDateRange,
  getWeekRange,
  todayIso,
} from '../utils/date';
import { PLAN_MEAL_TYPES, indexItems, slotKey } from '../utils/mealPlan';
import { formatMinutes } from '../utils/recipe';

function greeting(): string {
  const hour = new Date().getHours();
  if (hour < 12) return 'Good morning';
  if (hour < 17) return 'Good afternoon';
  return 'Good evening';
}

function expiryLabel(expiresAt: string): string {
  const days = daysFromToday(expiresAt);
  if (days < 0) return 'Expired';
  if (days === 0) return 'Today';
  if (days === 1) return 'Tomorrow';
  return `${days} days`;
}

interface TodayData {
  summary: DashboardSummary;
  plan: MealPlan | null;
  tonight: Recipe | null;
}

async function loadToday(): Promise<TodayData> {
  const summary = await dashboardService.getDashboardSummary();
  const planId = summary.plan_continuity.active_plan_id;
  let plan: MealPlan | null = null;
  let tonight: Recipe | null = null;
  if (planId) {
    try {
      plan = await mealPlanService.getMealPlan(planId);
      const dinner = indexItems(plan.items).get(slotKey(todayIso(), 'dinner'));
      if (dinner?.recipe_id) {
        tonight = await recipeService.getRecipe(dinner.recipe_id);
      }
    } catch (error) {
      console.error('Failed to load plan context:', error);
    }
  }
  return { summary, plan, tonight };
}

export default function DashboardPage() {
  const user = useCurrentUser();
  const [data, setData] = useState<TodayData | null>(null);
  const [failed, setFailed] = useState(false);

  const load = useCallback(async () => {
    setFailed(false);
    setData(null);
    try {
      setData(await loadToday());
    } catch (error) {
      console.error('Failed to load dashboard summary:', error);
      setFailed(true);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const today = todayIso();
  const header = (
    <header className="mb-6 sm:mb-8">
      <p className="eyebrow">
        {formatLocalDate(today, { weekday: 'long', month: 'long', day: 'numeric' })}
      </p>
      <h1 className="page-title mt-1">
        {greeting()}
        {user?.username ? `, ${user.username}` : ''}
      </h1>
    </header>
  );

  if (failed) {
    return (
      <div className="mx-auto max-w-5xl">
        {header}
        <ErrorState
          title="Couldn't load your day"
          description="Check your connection and try again."
          onRetry={() => void load()}
        />
      </div>
    );
  }

  if (!data) {
    return (
      <div className="mx-auto max-w-5xl">
        {header}
        <DashboardSkeleton />
      </div>
    );
  }

  const { summary, plan, tonight } = data;
  const nextUp = summary.action_queue
    .filter(action => action.cta.href !== summary.today_brief.primary_action.href)
    .slice(0, 3);
  const recentRecipes = summary.recent_context.recent_recipes.slice(0, 4);
  const shopping = summary.recent_context.recent_grocery_list;

  return (
    <div className="mx-auto max-w-5xl animate-fade-in">
      {header}

      <div className="grid gap-5 lg:grid-cols-[minmax(0,3fr)_minmax(0,2fr)]">
        <div className="space-y-5">
          <TonightCard summary={summary} tonight={tonight} />
          <WeekStrip plan={plan} completion={summary.plan_continuity.completion_percent} />
        </div>

        <div className="space-y-5">
          {nextUp.length > 0 && (
            <section aria-labelledby="next-up-heading" className="card p-5">
              <h2 id="next-up-heading" className="section-title">
                Next up
              </h2>
              <ul className="-mx-2 mt-2">
                {nextUp.map(action => (
                  <li key={action.id}>
                    <Link
                      to={action.cta.href}
                      className="flex items-center gap-3 rounded-xl px-2 py-3 transition hover:bg-stone-50 focus:outline-none focus-visible:ring-4 focus-visible:ring-primary-soft"
                    >
                      <span className="min-w-0 flex-1">
                        <span className="block text-sm font-semibold text-stone-900">
                          {action.title}
                        </span>
                        <span className="block text-sm text-stone-500">{action.rationale}</span>
                      </span>
                      <ChevronRightIcon className="h-4 w-4 flex-shrink-0 text-stone-400" />
                    </Link>
                  </li>
                ))}
              </ul>
            </section>
          )}

          <section aria-labelledby="pantry-heading" className="card p-5">
            <div className="flex items-center gap-3">
              <span className="icon-tile-sm icon-tile-amber">
                <PantryIcon className="h-4 w-4" />
              </span>
              <h2 id="pantry-heading" className="section-title flex-1">
                Use soon
              </h2>
              <Link to="/pantry" className="text-sm font-medium text-primary hover:underline">
                Pantry
              </Link>
            </div>
            {summary.pantry_risk.top_items.length > 0 ? (
              <>
                <ul className="mt-3 space-y-2">
                  {summary.pantry_risk.top_items.map(item => {
                    const days = daysFromToday(item.expires_at);
                    return (
                      <li
                        key={item.name}
                        className="flex items-center justify-between gap-3 text-sm"
                      >
                        <span className="font-medium text-stone-800">{item.name}</span>
                        <span
                          className={`rounded-full px-2 py-0.5 text-xs font-semibold ${
                            days <= 0 ? 'bg-red-50 text-red-700' : 'bg-amber-50 text-amber-700'
                          }`}
                        >
                          {expiryLabel(item.expires_at)}
                        </span>
                      </li>
                    );
                  })}
                </ul>
                {summary.pantry_risk.expiring_3d_count > summary.pantry_risk.top_items.length && (
                  <p className="helper-text mt-2">
                    +{summary.pantry_risk.expiring_3d_count - summary.pantry_risk.top_items.length}{' '}
                    more this week
                  </p>
                )}
                <Link
                  to={summary.pantry_risk.cta.href}
                  className="btn-secondary btn-sm mt-4 w-full"
                >
                  <SparklesIcon className="h-4 w-4" />
                  Cook with these
                </Link>
              </>
            ) : (
              <p className="helper-text mt-2">Nothing is about to expire. Nice.</p>
            )}
          </section>

          {shopping && shopping.unchecked_count > 0 && (
            <Link
              to={shopping.href}
              className="card card-hover flex items-center gap-3 p-4 focus:outline-none focus-visible:ring-4 focus-visible:ring-primary-soft"
            >
              <span className="icon-tile-sm">
                <ShoppingBagIcon className="h-4 w-4" />
              </span>
              <span className="min-w-0 flex-1">
                <span className="block text-sm font-semibold text-stone-900">Resume shopping</span>
                <span className="block text-sm text-stone-500">
                  {shopping.unchecked_count} item{shopping.unchecked_count === 1 ? '' : 's'} left on
                  your list
                </span>
              </span>
              <ChevronRightIcon className="h-4 w-4 text-stone-400" />
            </Link>
          )}
        </div>
      </div>

      <section aria-labelledby="recent-heading" className="mt-8">
        <div className="mb-3 flex items-center justify-between">
          <h2 id="recent-heading" className="section-title">
            Recently made
          </h2>
          {recentRecipes.length > 0 && (
            <Link to="/recipes" className="text-sm font-medium text-primary hover:underline">
              All recipes
            </Link>
          )}
        </div>
        {recentRecipes.length > 0 ? (
          <ul className="stagger grid grid-cols-2 gap-3 sm:grid-cols-4">
            {recentRecipes.map(recipe => (
              <li key={recipe.id}>
                <Link
                  to={`/recipes/${recipe.id}`}
                  className="group block overflow-hidden rounded-2xl border border-stone-200 bg-white transition hover:-translate-y-0.5 hover:shadow-md focus:outline-none focus-visible:ring-4 focus-visible:ring-primary-soft"
                >
                  <RecipeCover name={recipe.name} size="sm" className="h-20" />
                  <span className="block p-3">
                    <span className="line-clamp-2 text-sm font-semibold text-stone-900">
                      {recipe.name}
                    </span>
                    {recipe.total_minutes > 0 && (
                      <span className="mt-1 flex items-center gap-1 text-xs text-stone-500">
                        <ClockIcon className="h-3.5 w-3.5" />
                        {formatMinutes(recipe.total_minutes)}
                      </span>
                    )}
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        ) : (
          <div className="rounded-2xl border border-dashed border-stone-300 px-6 py-8 text-center">
            <p className="text-sm text-stone-600">Recipes you make will show up here.</p>
            <Link to="/generate" className="btn-primary btn-sm mt-3">
              Make your first recipe
            </Link>
          </div>
        )}
      </section>
    </div>
  );
}

function TonightCard({ summary, tonight }: { summary: DashboardSummary; tonight: Recipe | null }) {
  if (tonight) {
    const minutes = tonight.total_minutes ?? 0;
    return (
      <section
        aria-labelledby="tonight-heading"
        className="surface-warm overflow-hidden rounded-3xl sm:flex"
      >
        <RecipeCover
          name={tonight.name}
          imageUrl={tonight.image_url}
          className="h-32 sm:h-auto sm:w-48 sm:flex-shrink-0"
        />
        <div className="p-5 sm:p-6">
          <p className="eyebrow">Tonight's dinner</p>
          <h2
            id="tonight-heading"
            className="mt-1 font-display text-2xl font-semibold text-stone-900"
          >
            {tonight.name}
          </h2>
          {minutes > 0 && (
            <p className="mt-1 flex items-center gap-1.5 text-sm text-stone-600">
              <ClockIcon className="h-4 w-4" />
              {formatMinutes(minutes)}
            </p>
          )}
          <Link to={`/recipes/${tonight.id}`} className="btn-primary mt-4">
            <PlayIcon className="h-4 w-4" />
            Get cooking
          </Link>
        </div>
      </section>
    );
  }

  const { headline, subline, primary_action: action } = summary.today_brief;
  return (
    <section aria-labelledby="tonight-heading" className="surface-warm rounded-3xl p-5 sm:p-7">
      <p className="eyebrow">Today</p>
      <h2 id="tonight-heading" className="mt-1 font-display text-2xl font-semibold text-stone-900">
        {headline}
      </h2>
      <p className="mt-1.5 text-[15px] text-stone-600">{subline}</p>
      <div className="mt-5 flex flex-wrap gap-2">
        <Link to={action.href} className="btn-primary">
          {action.label}
          <ArrowRightIcon className="h-4 w-4" />
        </Link>
        {action.href !== '/generate' && (
          <Link to="/generate" className="btn-secondary">
            <SparklesIcon className="h-4 w-4" />
            Make a recipe
          </Link>
        )}
      </div>
    </section>
  );
}

function WeekStrip({ plan, completion }: { plan: MealPlan | null; completion: number }) {
  const today = todayIso();
  const range = plan ?? getWeekRange();
  const dates = getDateRange(range.start_date, range.end_date).slice(0, 7);
  const filled = indexItems(plan?.items ?? []);

  return (
    <section aria-labelledby="week-heading" className="card p-5">
      <div className="flex items-center gap-3">
        <span className="icon-tile-sm">
          <CalendarDaysIcon className="h-4 w-4" />
        </span>
        <div className="min-w-0 flex-1">
          <h2 id="week-heading" className="section-title truncate">
            {plan?.name || 'This week'}
          </h2>
          {plan && <p className="helper-text mt-0">{completion}% planned</p>}
        </div>
        <Link to={plan ? `/meal-plans/${plan.id}` : '/meal-plans'} className="btn-ghost btn-sm">
          {plan ? 'Open' : 'Plan the week'}
          <ChevronRightIcon className="h-4 w-4" />
        </Link>
      </div>

      <ol className="mt-4 grid grid-cols-7 gap-1.5" aria-label="Days">
        {dates.map(date => {
          const isToday = date === today;
          const isPast = date < today;
          const count = PLAN_MEAL_TYPES.filter(meal => filled.has(slotKey(date, meal))).length;
          return (
            <li
              key={date}
              aria-current={isToday ? 'date' : undefined}
              aria-label={`${formatLocalDate(date, { weekday: 'long' })}: ${count} of ${PLAN_MEAL_TYPES.length} meals planned`}
              className={`flex flex-col items-center rounded-xl py-2 ${
                isToday ? 'bg-primary text-white' : isPast ? 'text-stone-400' : 'text-stone-700'
              }`}
            >
              <span className="text-[11px] font-medium uppercase">
                {formatLocalDate(date, { weekday: 'narrow' })}
              </span>
              <span className="text-base font-semibold tabular-nums">
                {formatLocalDate(date, { day: 'numeric' })}
              </span>
              <span className="mt-1 flex gap-0.5" aria-hidden="true">
                {PLAN_MEAL_TYPES.map(meal => (
                  <span
                    key={meal}
                    className={`h-1.5 w-1.5 rounded-full ${
                      filled.has(slotKey(date, meal))
                        ? isToday
                          ? 'bg-white'
                          : 'bg-primary'
                        : isToday
                          ? 'bg-white/35'
                          : 'bg-stone-200'
                    }`}
                  />
                ))}
              </span>
            </li>
          );
        })}
      </ol>
      {plan && (
        <div className="progress-track mt-4" aria-hidden="true">
          <div className="progress-bar" style={{ width: `${completion}%` }} />
        </div>
      )}
    </section>
  );
}

function DashboardSkeleton() {
  return (
    <div role="status" aria-label="Loading your day" className="grid gap-5 lg:grid-cols-[3fr_2fr]">
      <div className="space-y-5">
        <div className="skeleton h-48 rounded-3xl" />
        <div className="skeleton h-40 rounded-2xl" />
      </div>
      <div className="space-y-5">
        <div className="skeleton h-44 rounded-2xl" />
        <div className="skeleton h-36 rounded-2xl" />
      </div>
    </div>
  );
}
