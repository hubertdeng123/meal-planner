import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { CalendarDaysIcon, ChevronRightIcon, PlusIcon, TrashIcon } from '../components/ui/AppIcons';
import { ChoiceChips } from '../components/ui/ChoiceChips';
import { ConfirmDialog } from '../components/ui/ConfirmDialog';
import { EmptyState } from '../components/ui/EmptyState';
import { ErrorState } from '../components/ui/ErrorState';
import { ModalShell } from '../components/ui/ModalShell';
import { OverflowMenu } from '../components/ui/OverflowMenu';
import { SearchInput } from '../components/ui/SearchInput';
import { SkeletonGrid } from '../components/ui/Skeletons';
import { useToast } from '../contexts/ToastContext';
import mealPlanService from '../services/mealPlan.service';
import type { MealPlanList } from '../types';
import {
  addDaysIso,
  formatLocalDate,
  formatRange,
  getDateRange,
  getWeekRange,
  todayIso,
} from '../utils/date';
import { PLAN_MEAL_TYPES } from '../utils/mealPlan';

const PAGE_SIZE = 12;

type WeekChoice = 'this' | 'next' | 'custom';

function weekFor(choice: Exclude<WeekChoice, 'custom'>) {
  const current = getWeekRange();
  if (choice === 'this') return current;
  return {
    start_date: addDaysIso(current.start_date, 7),
    end_date: addDaysIso(current.end_date, 7),
  };
}

function defaultName(start: string): string {
  return `Week of ${formatLocalDate(start, { month: 'short', day: 'numeric' })}`;
}

function fill(plan: MealPlanList) {
  const total = getDateRange(plan.start_date, plan.end_date).length * PLAN_MEAL_TYPES.length;
  const filled = Math.min(plan.item_count, total);
  return { filled, total, percent: total ? Math.round((filled / total) * 100) : 0 };
}

export default function MealPlansPage() {
  const navigate = useNavigate();
  const { addToast } = useToast();
  const [plans, setPlans] = useState<MealPlanList[]>([]);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(0);
  const [status, setStatus] = useState<'loading' | 'ready' | 'error' | 'more'>('loading');
  const [searchInput, setSearchInput] = useState('');
  const [query, setQuery] = useState('');
  const [showCreate, setShowCreate] = useState(false);
  const [planToDelete, setPlanToDelete] = useState<MealPlanList | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [creatingThisWeek, setCreatingThisWeek] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => setQuery(searchInput.trim()), 250);
    return () => clearTimeout(timer);
  }, [searchInput]);

  const load = useCallback(
    async (targetPage: number) => {
      setStatus(targetPage === 1 ? 'loading' : 'more');
      try {
        const result = await mealPlanService.getMealPlansPaginated({
          page: targetPage,
          pageSize: PAGE_SIZE,
          q: query || undefined,
          sort: 'start_date',
          order: 'desc',
        });
        setPlans(current => (targetPage === 1 ? result.items : [...current, ...result.items]));
        setPage(targetPage);
        setTotalPages(result.total_pages);
        setStatus('ready');
      } catch (error) {
        console.error('Failed to load meal plans:', error);
        if (targetPage === 1) setStatus('error');
        else {
          setStatus('ready');
          addToast('Could not load more plans.', 'error');
        }
      }
    },
    [query, addToast]
  );

  useEffect(() => {
    void load(1);
  }, [load]);

  const today = todayIso();
  const current = useMemo(
    () => plans.find(plan => plan.start_date <= today && today <= plan.end_date),
    [plans, today]
  );
  const others = plans.filter(plan => plan !== current);
  const upcoming = others.filter(plan => plan.end_date >= today);
  const past = others.filter(plan => plan.end_date < today);

  const createPlan = async (range: { start_date: string; end_date: string }, name?: string) => {
    const created = await mealPlanService.createMealPlan({
      name: name?.trim() || defaultName(range.start_date),
      ...range,
    });
    navigate(`/meal-plans/${created.id}`);
  };

  const planThisWeek = async () => {
    setCreatingThisWeek(true);
    try {
      await createPlan(weekFor('this'));
    } catch (error) {
      console.error('Failed to create plan:', error);
      addToast('Could not start this week. Try again?', 'error');
      setCreatingThisWeek(false);
    }
  };

  const handleDelete = async () => {
    if (!planToDelete) return;
    setDeleting(true);
    try {
      await mealPlanService.deleteMealPlan(planToDelete.id);
      setPlans(currentPlans => currentPlans.filter(plan => plan.id !== planToDelete.id));
      addToast('Plan deleted.', 'success');
      setPlanToDelete(null);
    } catch (error) {
      console.error('Failed to delete meal plan:', error);
      addToast('Could not delete that plan. Try again?', 'error');
    } finally {
      setDeleting(false);
    }
  };

  const showSearch = Boolean(query) || totalPages > 1 || plans.length > 6;

  return (
    <div className="mx-auto max-w-5xl">
      <header className="mb-6 flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="page-title">Meal plans</h1>
          <p className="page-subtitle">One week at a time. Fill the slots, then shop once.</p>
        </div>
        <button type="button" className="btn-primary" onClick={() => setShowCreate(true)}>
          <PlusIcon className="h-4 w-4" />
          Plan a week
        </button>
      </header>

      {showSearch && (
        <SearchInput
          value={searchInput}
          onChange={setSearchInput}
          placeholder="Search plans"
          className="mb-6 sm:max-w-sm"
        />
      )}

      {status === 'loading' ? (
        <SkeletonGrid count={4} variant="card" testId="meal-plans-loading" />
      ) : status === 'error' ? (
        <ErrorState
          title="Couldn't load your plans"
          description="Check your connection and try again."
          onRetry={() => void load(1)}
        />
      ) : plans.length === 0 && query ? (
        <EmptyState
          title="No plans match"
          description={`Nothing called "${query}".`}
          action={
            <button type="button" className="btn-secondary" onClick={() => setSearchInput('')}>
              Clear search
            </button>
          }
        />
      ) : (
        <div className="space-y-8 animate-fade-in">
          {!query &&
            (current ? (
              <CurrentWeekCard plan={current} />
            ) : (
              <section className="surface-warm flex flex-col gap-4 rounded-3xl p-6 sm:flex-row sm:items-center">
                <span className="icon-tile-lg icon-tile-accent">
                  <CalendarDaysIcon className="h-6 w-6" />
                </span>
                <div className="flex-1">
                  <h2 className="font-display text-xl font-semibold text-stone-900">
                    {plans.length === 0 ? 'Plan your first week' : 'Nothing planned this week'}
                  </h2>
                  <p className="mt-1 text-sm text-stone-600">
                    {formatRange(weekFor('this').start_date, weekFor('this').end_date)}. Pick meals
                    for each day and get one grocery list.
                  </p>
                </div>
                <button
                  type="button"
                  className="btn-primary"
                  onClick={planThisWeek}
                  disabled={creatingThisWeek}
                >
                  {creatingThisWeek ? 'Starting…' : 'Plan this week'}
                </button>
              </section>
            ))}

          {query && current && <PlanGrid plans={[current]} onDelete={setPlanToDelete} />}

          {upcoming.length > 0 && (
            <section aria-labelledby="upcoming-heading">
              <h2 id="upcoming-heading" className="section-title mb-3">
                Coming up
              </h2>
              <PlanGrid plans={upcoming} onDelete={setPlanToDelete} />
            </section>
          )}

          {past.length > 0 && (
            <section aria-labelledby="past-heading">
              <h2 id="past-heading" className="section-title mb-3">
                Past weeks
              </h2>
              <PlanGrid plans={past} onDelete={setPlanToDelete} muted />
            </section>
          )}

          {page < totalPages && (
            <div className="flex justify-center">
              <button
                type="button"
                className="btn-secondary"
                disabled={status === 'more'}
                onClick={() => void load(page + 1)}
              >
                {status === 'more' ? 'Loading…' : 'Show older plans'}
              </button>
            </div>
          )}
        </div>
      )}

      {showCreate && (
        <CreatePlanDialog
          onClose={() => setShowCreate(false)}
          onCreate={async (range, name) => {
            try {
              await createPlan(range, name);
            } catch (error) {
              console.error('Failed to create meal plan:', error);
              addToast('Could not create that plan. Try again?', 'error');
              throw error;
            }
          }}
        />
      )}

      <ConfirmDialog
        isOpen={Boolean(planToDelete)}
        title="Delete this plan?"
        description="The plan and its meal slots will be removed. Your recipes stay saved."
        confirmLabel="Delete plan"
        tone="danger"
        loading={deleting}
        onCancel={() => {
          if (!deleting) setPlanToDelete(null);
        }}
        onConfirm={handleDelete}
      />
    </div>
  );
}

function CurrentWeekCard({ plan }: { plan: MealPlanList }) {
  const { filled, total, percent } = fill(plan);
  return (
    <Link
      to={`/meal-plans/${plan.id}`}
      className="group block rounded-3xl border border-primary/20 bg-white p-6 shadow-sm transition hover:shadow-md focus:outline-none focus-visible:ring-4 focus-visible:ring-primary-soft"
    >
      <div className="flex items-start gap-4">
        <div className="min-w-0 flex-1">
          <p className="eyebrow">This week · {formatRange(plan.start_date, plan.end_date)}</p>
          <h2 className="mt-1 truncate font-display text-2xl font-semibold text-stone-900">
            {plan.name || 'This week'}
          </h2>
        </div>
        <span className="btn-secondary btn-sm pointer-events-none">
          Open
          <ChevronRightIcon className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
        </span>
      </div>
      <div className="mt-5 flex items-center gap-3">
        <div className="progress-track flex-1" aria-hidden="true">
          <div className="progress-bar" style={{ width: `${percent}%` }} />
        </div>
        <span className="text-sm font-medium tabular-nums text-stone-600">
          {filled} of {total} meals
        </span>
      </div>
    </Link>
  );
}

function PlanGrid({
  plans,
  onDelete,
  muted = false,
}: {
  plans: MealPlanList[];
  onDelete: (plan: MealPlanList) => void;
  muted?: boolean;
}) {
  return (
    <ul className="stagger grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
      {plans.map(plan => {
        const { filled, total, percent } = fill(plan);
        return (
          <li
            key={plan.id}
            className={`relative rounded-2xl border border-stone-200 bg-white p-4 shadow-xs transition hover:shadow-md ${
              muted ? 'bg-white/70' : ''
            }`}
          >
            <Link
              to={`/meal-plans/${plan.id}`}
              className="block rounded-lg pr-10 focus:outline-none focus-visible:ring-4 focus-visible:ring-primary-soft"
            >
              <span className="block truncate font-semibold text-stone-900">
                {plan.name || 'Week plan'}
              </span>
              <span className="block text-sm text-stone-500">
                {formatRange(plan.start_date, plan.end_date)}
              </span>
              <span className="mt-4 flex items-center gap-2">
                <span className="progress-track h-1.5 flex-1" aria-hidden="true">
                  <span className="progress-bar block" style={{ width: `${percent}%` }} />
                </span>
                <span className="text-xs font-medium tabular-nums text-stone-500">
                  {filled}/{total}
                </span>
              </span>
            </Link>
            <div className="absolute right-2 top-2">
              <OverflowMenu
                label={`Actions for ${plan.name || 'week plan'}`}
                buttonClassName="icon-button-muted h-9 w-9"
                items={[
                  {
                    label: 'Delete plan',
                    icon: TrashIcon,
                    tone: 'danger',
                    onSelect: () => onDelete(plan),
                  },
                ]}
              />
            </div>
          </li>
        );
      })}
    </ul>
  );
}

function CreatePlanDialog({
  onClose,
  onCreate,
}: {
  onClose: () => void;
  onCreate: (range: { start_date: string; end_date: string }, name?: string) => Promise<void>;
}) {
  const [choice, setChoice] = useState<WeekChoice>('this');
  const [custom, setCustom] = useState(weekFor('this'));
  const [name, setName] = useState('');
  const [creating, setCreating] = useState(false);

  const range = choice === 'custom' ? custom : weekFor(choice);
  const invalid = !range.start_date || !range.end_date || range.start_date > range.end_date;

  const submit = async () => {
    if (invalid) return;
    setCreating(true);
    try {
      await onCreate(range, name);
    } catch {
      setCreating(false);
    }
  };

  return (
    <ModalShell
      size="sm"
      title="Plan a week"
      onClose={onClose}
      footer={
        <>
          <button type="button" className="btn-secondary" onClick={onClose}>
            Cancel
          </button>
          <button
            type="button"
            className="btn-primary"
            disabled={creating || invalid}
            onClick={submit}
          >
            {creating ? 'Creating…' : 'Start planning'}
          </button>
        </>
      }
    >
      <form
        className="space-y-5"
        onSubmit={event => {
          event.preventDefault();
          void submit();
        }}
      >
        <ChoiceChips
          label="Which week?"
          value={choice}
          onChange={setChoice}
          options={[
            {
              value: 'this',
              label: 'This week',
              hint: formatRange(weekFor('this').start_date, weekFor('this').end_date),
            },
            {
              value: 'next',
              label: 'Next week',
              hint: formatRange(weekFor('next').start_date, weekFor('next').end_date),
            },
            { value: 'custom', label: 'Custom dates' },
          ]}
        />
        {choice === 'custom' && (
          <div className="grid grid-cols-2 gap-3 animate-fade-in">
            <div>
              <label htmlFor="plan-start" className="label">
                Start
              </label>
              <input
                id="plan-start"
                type="date"
                className="input"
                value={custom.start_date}
                onChange={event =>
                  setCustom(value => ({ ...value, start_date: event.target.value }))
                }
              />
            </div>
            <div>
              <label htmlFor="plan-end" className="label">
                End
              </label>
              <input
                id="plan-end"
                type="date"
                className="input"
                min={custom.start_date}
                value={custom.end_date}
                onChange={event => setCustom(value => ({ ...value, end_date: event.target.value }))}
              />
            </div>
            {invalid && (
              <p className="col-span-2 text-sm text-red-600" role="alert">
                The end date needs to be on or after the start.
              </p>
            )}
          </div>
        )}
        <div>
          <label htmlFor="plan-name" className="label">
            Name <span className="font-normal text-stone-400">(optional)</span>
          </label>
          <input
            id="plan-name"
            className="input"
            value={name}
            onChange={event => setName(event.target.value)}
            placeholder={range.start_date ? defaultName(range.start_date) : 'Weeknight wins'}
          />
        </div>
      </form>
    </ModalShell>
  );
}
