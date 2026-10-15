import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  ArrowRightIcon,
  CalendarDaysIcon,
  PlusIcon,
  SparklesIcon,
  TrashIcon,
} from '../components/ui/AppIcons';

import { EmptyState } from '../components/ui/EmptyState';
import { ConfirmDialog } from '../components/ui/ConfirmDialog';
import { ModalShell } from '../components/ui/ModalShell';
import { PageHeader } from '../components/ui/PageHeader';
import { StatPill } from '../components/ui/StatPill';
import { ToolbarRow } from '../components/ui/ToolbarRow';
import { useToast } from '../contexts/ToastContext';
import mealPlanService from '../services/mealPlan.service';
import type { MealPlanCreate, MealPlanList } from '../types';
import { formatLocalDate, parseLocalIsoDate, toLocalIsoDate } from '../utils/date';

type DatePresetKey = 'this_week' | 'next_week' | 'weekdays';

interface DatePreset {
  key: DatePresetKey;
  label: string;
  description: string;
  start_date: string;
  end_date: string;
  defaultName: string;
}

function getMondayOfCurrentWeek(baseDate = new Date()): Date {
  const today = new Date(baseDate);
  const day = today.getDay();
  const distanceToMonday = (day + 6) % 7;
  const monday = new Date(today);
  monday.setDate(today.getDate() - distanceToMonday);
  return monday;
}

function buildDatePresets(): DatePreset[] {
  const thisMonday = getMondayOfCurrentWeek();
  const thisSunday = new Date(thisMonday);
  thisSunday.setDate(thisMonday.getDate() + 6);

  const nextMonday = new Date(thisMonday);
  nextMonday.setDate(thisMonday.getDate() + 7);
  const nextSunday = new Date(nextMonday);
  nextSunday.setDate(nextMonday.getDate() + 6);

  const nextFriday = new Date(nextMonday);
  nextFriday.setDate(nextMonday.getDate() + 4);

  const thisMondayIso = toLocalIsoDate(thisMonday);
  const nextMondayIso = toLocalIsoDate(nextMonday);

  return [
    {
      key: 'this_week',
      label: 'This Week (Mon–Sun)',
      description: '7-day full schedule',
      start_date: thisMondayIso,
      end_date: toLocalIsoDate(thisSunday),
      defaultName: `Week of ${formatLocalDate(thisMondayIso, { month: 'short', day: 'numeric' })}`,
    },
    {
      key: 'next_week',
      label: 'Next Week',
      description: 'Upcoming Mon–Sun',
      start_date: nextMondayIso,
      end_date: toLocalIsoDate(nextSunday),
      defaultName: `Week of ${formatLocalDate(nextMondayIso, { month: 'short', day: 'numeric' })}`,
    },
    {
      key: 'weekdays',
      label: 'Next 5 Weekdays',
      description: 'Mon–Fri workweek',
      start_date: nextMondayIso,
      end_date: toLocalIsoDate(nextFriday),
      defaultName: `Weekdays of ${formatLocalDate(nextMondayIso, { month: 'short', day: 'numeric' })}`,
    },
  ];
}

function getPlanTotalSlots(startDate: string, endDate: string): number {
  const start = parseLocalIsoDate(startDate);
  const end = parseLocalIsoDate(endDate);
  const diffDays = Math.max(
    1,
    Math.round((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)) + 1
  );
  return diffDays * 3;
}

const WORKFLOW_STEPS = [
  '1. Plan Week',
  '2. Autofill Slots',
  '3. Build Grocery List',
  '4. Shop Aisles',
];

export default function MealPlansPage() {
  const navigate = useNavigate();
  const { addToast } = useToast();
  const [plans, setPlans] = useState<MealPlanList[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(0);
  const [searchInput, setSearchInput] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [creating, setCreating] = useState(false);
  const [deletingId, setDeletingId] = useState<number | null>(null);
  const [planToDelete, setPlanToDelete] = useState<MealPlanList | null>(null);

  const presets = useMemo(() => buildDatePresets(), []);
  const defaultPreset = presets[0];
  const [activePreset, setActivePreset] = useState<DatePresetKey | null>('this_week');
  const [newPlan, setNewPlan] = useState<MealPlanCreate>({
    name: defaultPreset.defaultName,
    start_date: defaultPreset.start_date,
    end_date: defaultPreset.end_date,
    theme: '',
  });
  const pageSize = 9;

  useEffect(() => {
    const timer = setTimeout(() => {
      setPage(1);
      setSearchQuery(searchInput.trim());
    }, 250);
    return () => clearTimeout(timer);
  }, [searchInput]);

  const loadPlans = useCallback(async () => {
    setLoading(true);
    try {
      const result = await mealPlanService.getMealPlansPaginated({
        page,
        pageSize,
        q: searchQuery || undefined,
        sort: 'created_at',
        order: 'desc',
      });
      setPlans(result.items);
      setTotalPages(result.total_pages);
    } catch (error) {
      console.error('Failed to load meal plans:', error);
      addToast('Could not load meal plans. Try again?', 'error');
    } finally {
      setLoading(false);
    }
  }, [addToast, page, pageSize, searchQuery]);

  useEffect(() => {
    void loadPlans();
  }, [loadPlans]);

  const applyPreset = (preset: DatePreset) => {
    setActivePreset(preset.key);
    setNewPlan(prev => ({
      ...prev,
      name: preset.defaultName,
      start_date: preset.start_date,
      end_date: preset.end_date,
    }));
  };

  const openCreateModal = () => {
    setActivePreset('this_week');
    setNewPlan({
      name: defaultPreset.defaultName,
      start_date: defaultPreset.start_date,
      end_date: defaultPreset.end_date,
      theme: '',
    });
    setShowCreateModal(true);
  };

  const handleCreatePlan = async () => {
    if (!newPlan.start_date || !newPlan.end_date) return;

    setCreating(true);
    try {
      const payload: MealPlanCreate = {
        ...newPlan,
        name: newPlan.name?.trim() || defaultPreset.defaultName,
        theme: newPlan.theme?.trim() || undefined,
      };
      const created = await mealPlanService.createMealPlan(payload);
      addToast('Meal plan created.', 'success');
      setShowCreateModal(false);
      navigate(`/meal-plans/${created.id}`);
    } catch (error) {
      console.error('Failed to create meal plan:', error);
      addToast('Could not create meal plan. Try again?', 'error');
    } finally {
      setCreating(false);
    }
  };

  const handleDelete = async () => {
    if (!planToDelete) return;
    setDeletingId(planToDelete.id);
    try {
      await mealPlanService.deleteMealPlan(planToDelete.id);
      setPlans(prev => prev.filter(plan => plan.id !== planToDelete.id));
      addToast('Meal plan deleted.', 'success');
      setPlanToDelete(null);
    } catch (error) {
      console.error('Failed to delete meal plan:', error);
      addToast('Could not delete meal plan. Try again?', 'error');
    } finally {
      setDeletingId(null);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div
          className="animate-spin rounded-full h-12 w-12 border-b-2"
          style={{ borderBottomColor: 'var(--primary)' }}
        ></div>
      </div>
    );
  }

  return (
    <div>
      <PageHeader
        badge={<span className="badge">Weekly Kitchen Cadence</span>}
        title="Meal Plans"
        subtitle="Map out your week's breakfast, lunch, and dinner slots, autofill gaps with AI, and compile your aisle-ready grocery list in one click."
        actions={
          <button className="btn-primary" onClick={openCreateModal}>
            <PlusIcon className="h-4 w-4" />+ New week plan
          </button>
        }
      />

      <ToolbarRow
        helper={
          <div className="flex flex-wrap items-center gap-1.5 md:justify-end">
            {WORKFLOW_STEPS.map((step, index) => (
              <span key={step} className="inline-flex items-center gap-1.5">
                <span className="inline-flex items-center rounded-full border border-[#E7E0D6] bg-white px-2.5 py-1 text-[11px] font-semibold tracking-tight text-[#57534E]">
                  {step}
                </span>
                {index < WORKFLOW_STEPS.length - 1 && (
                  <span className="text-[#78716C]" aria-hidden="true">
                    →
                  </span>
                )}
              </span>
            ))}
          </div>
        }
      >
        <input
          value={searchInput}
          onChange={e => setSearchInput(e.target.value)}
          className="input"
          placeholder="Search meal plans by name or week..."
          aria-label="Search meal plans by name"
        />
      </ToolbarRow>

      {plans.length === 0 && !searchQuery ? (
        <EmptyState
          icon={<CalendarDaysIcon className="h-12 w-12" />}
          title="No meal plans yet"
          description="Create your first weekly plan and fill it with recipes."
          action={
            <button className="btn-primary" onClick={openCreateModal}>
              <PlusIcon className="h-4 w-4 mr-1.5" />
              Create plan
            </button>
          }
        />
      ) : plans.length === 0 ? (
        <EmptyState
          title="No plans matched"
          description="Try another name."
          action={
            <button
              className="btn-secondary"
              onClick={() => {
                setSearchInput('');
                setSearchQuery('');
              }}
            >
              Clear search
            </button>
          }
        />
      ) : (
        <div className="mt-8 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {plans.map(plan => {
            const totalSlots = getPlanTotalSlots(plan.start_date, plan.end_date);
            const completionPct = Math.min(
              100,
              Math.round((plan.item_count / Math.max(1, totalSlots)) * 100)
            );

            return (
              <div key={plan.id} className="card card-hover flex flex-col justify-between p-6">
                <div>
                  <div className="flex items-start justify-between gap-3">
                    <span className="inline-flex items-center gap-1.5 rounded-full border border-[#E7E0D6] bg-[#FAF7F2] px-3 py-1 text-xs font-semibold tracking-wide text-[#57534E]">
                      <CalendarDaysIcon className="h-3.5 w-3.5 text-[#C84B31]" />
                      {formatLocalDate(plan.start_date)} – {formatLocalDate(plan.end_date)}
                    </span>
                    <button
                      className="icon-button-danger shrink-0"
                      disabled={deletingId === plan.id}
                      onClick={() => setPlanToDelete(plan)}
                      title={`Delete ${plan.name || 'meal plan'}`}
                      aria-label={`Delete ${plan.name || 'meal plan'}`}
                    >
                      <TrashIcon className="h-4 w-4" />
                    </button>
                  </div>

                  <h3 className="mt-3.5 font-display text-xl font-semibold text-[#1C1917] tracking-tight">
                    {plan.name || 'Week Plan'}
                  </h3>

                  {plan.theme && (
                    <div className="mt-2">
                      <span className="chip border-[#C84B31]/20 bg-[#F9F1EA] text-[#9A3412]">
                        <SparklesIcon className="h-3 w-3" />
                        {plan.theme}
                      </span>
                    </div>
                  )}

                  <div className="mt-4 space-y-2.5">
                    <div className="flex items-center justify-between text-xs text-[#57534E]">
                      <span className="font-medium">Planned slots: {plan.item_count}</span>
                      <span className="font-mono font-medium text-[#78716C] tabular-nums">
                        {plan.item_count}/{totalSlots} ({completionPct}%)
                      </span>
                    </div>
                    <div className="h-2 w-full overflow-hidden rounded-full bg-[#F3EFE6]">
                      <div
                        className="h-full rounded-full transition-all duration-300"
                        style={{
                          width: `${completionPct}%`,
                          backgroundColor:
                            plan.item_count > 0 ? 'var(--secondary)' : 'var(--border-strong)',
                        }}
                      />
                    </div>
                    <div className="pt-1">
                      <StatPill
                        label="Planned slots"
                        value={`${plan.item_count}`}
                        tone={plan.item_count > 0 ? 'success' : 'default'}
                        className="max-w-[9.5rem]"
                      />
                    </div>
                  </div>
                </div>

                <div className="mt-6 pt-4 border-t border-[#E7E0D6]/70">
                  <Link
                    className="btn-secondary w-full justify-between group"
                    to={`/meal-plans/${plan.id}`}
                  >
                    <span>Open planner</span>
                    <ArrowRightIcon className="h-4 w-4 text-[#78716C] transition-transform duration-150 group-hover:translate-x-0.5 group-hover:text-[#1C1917]" />
                  </Link>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {totalPages > 1 && (
        <div className="mt-8 flex items-center justify-center gap-3">
          <button
            className="btn-secondary"
            disabled={page === 1}
            onClick={() => setPage(prev => Math.max(1, prev - 1))}
          >
            Previous
          </button>
          <span className="text-sm font-medium text-[#57534E] tabular-nums">
            Page {page} of {totalPages}
          </span>
          <button
            className="btn-secondary"
            disabled={page === totalPages}
            onClick={() => setPage(prev => Math.min(totalPages, prev + 1))}
          >
            Next
          </button>
        </div>
      )}

      {showCreateModal && (
        <ModalShell
          size="md"
          title="Create meal plan"
          description="Pick a quick date preset or customize your schedule window."
          onClose={() => setShowCreateModal(false)}
          footer={
            <>
              <button className="btn-secondary" onClick={() => setShowCreateModal(false)}>
                Cancel
              </button>
              <button className="btn-primary" disabled={creating} onClick={handleCreatePlan}>
                {creating ? 'Creating...' : 'Create plan'}
              </button>
            </>
          }
        >
          <div className="space-y-4">
            <div>
              <p className="eyebrow mb-2">Quick Date Presets</p>
              <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
                {presets.map(preset => {
                  const isSelected = activePreset === preset.key;
                  return (
                    <button
                      key={preset.key}
                      type="button"
                      aria-pressed={isSelected}
                      onClick={() => applyPreset(preset)}
                      className={`rounded-2xl border p-3 text-left transition-all duration-150 ${
                        isSelected
                          ? 'border-[#C84B31] bg-[#F9F1EA] text-[#1C1917] shadow-2xs'
                          : 'border-[#E7E0D6] bg-[#FAF7F2] text-[#57534E] hover:border-[#D6CEC2] hover:bg-white'
                      }`}
                    >
                      <p className="text-xs font-semibold text-[#1C1917]">{preset.label}</p>
                      <p className="mt-0.5 text-[11px] text-[#78716C]">{preset.description}</p>
                    </button>
                  );
                })}
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-[#1C1917] mb-1">Plan name</label>
              <input
                className="input"
                value={newPlan.name || ''}
                onChange={e => setNewPlan(prev => ({ ...prev, name: e.target.value }))}
                placeholder="Weeknight wins"
              />
            </div>

            <div className="grid gap-3 grid-cols-2">
              <div>
                <label className="block text-sm font-medium text-[#1C1917] mb-1">Start date</label>
                <input
                  className="input"
                  type="date"
                  value={newPlan.start_date}
                  onChange={e => {
                    setActivePreset(null);
                    setNewPlan(prev => ({ ...prev, start_date: e.target.value }));
                  }}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-[#1C1917] mb-1">End date</label>
                <input
                  className="input"
                  type="date"
                  value={newPlan.end_date}
                  onChange={e => {
                    setActivePreset(null);
                    setNewPlan(prev => ({ ...prev, end_date: e.target.value }));
                  }}
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-[#1C1917] mb-1">
                Optional theme or note
              </label>
              <input
                className="input"
                value={newPlan.theme || ''}
                onChange={e => setNewPlan(prev => ({ ...prev, theme: e.target.value }))}
                placeholder="e.g., Mediterranean bowls, 30-min weeknights"
              />
            </div>
          </div>
        </ModalShell>
      )}

      <ConfirmDialog
        isOpen={Boolean(planToDelete)}
        title="Delete meal plan?"
        description="This will permanently remove the plan and its assigned slots."
        confirmLabel="Delete plan"
        tone="danger"
        loading={deletingId !== null}
        onCancel={() => {
          if (!deletingId) {
            setPlanToDelete(null);
          }
        }}
        onConfirm={handleDelete}
      />
    </div>
  );
}
