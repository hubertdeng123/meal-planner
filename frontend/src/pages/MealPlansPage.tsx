import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { CalendarDaysIcon, PlusIcon, TrashIcon } from '../components/ui/AppIcons';

import { EmptyState } from '../components/ui/EmptyState';
import { ConfirmDialog } from '../components/ui/ConfirmDialog';
import { ModalShell } from '../components/ui/ModalShell';
import { PageHeader } from '../components/ui/PageHeader';
import { StatPill } from '../components/ui/StatPill';
import { ToolbarRow } from '../components/ui/ToolbarRow';
import { useToast } from '../contexts/ToastContext';
import mealPlanService from '../services/mealPlan.service';
import type { MealPlanCreate, MealPlanList } from '../types';
import { formatLocalDate, toLocalIsoDate } from '../utils/date';

function getDefaultWeekRange() {
  const today = new Date();
  const day = today.getDay();
  const distanceToMonday = (day + 6) % 7;
  const monday = new Date(today);
  monday.setDate(today.getDate() - distanceToMonday);
  const sunday = new Date(monday);
  sunday.setDate(monday.getDate() + 6);

  return {
    start_date: toLocalIsoDate(monday),
    end_date: toLocalIsoDate(sunday),
  };
}

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
  const defaultWeek = useMemo(() => getDefaultWeekRange(), []);
  const [newPlan, setNewPlan] = useState<MealPlanCreate>({
    name: '',
    start_date: defaultWeek.start_date,
    end_date: defaultWeek.end_date,
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

  const handleCreatePlan = async () => {
    if (!newPlan.start_date || !newPlan.end_date) return;

    setCreating(true);
    try {
      const created = await mealPlanService.createMealPlan(newPlan);
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
        title="Meal Plans"
        subtitle="Plan the week in one focused flow"
        actions={
          <button className="btn-primary" onClick={() => setShowCreateModal(true)}>
            <PlusIcon className="h-4 w-4 mr-2" />
            New week plan
          </button>
        }
      />

      <ToolbarRow helper="Plan > Save > Build list > Shop">
        <input
          value={searchInput}
          onChange={e => setSearchInput(e.target.value)}
          className="input"
          placeholder="Search meal plans by name"
        />
      </ToolbarRow>

      {plans.length === 0 && !searchQuery ? (
        <EmptyState
          icon={<CalendarDaysIcon className="h-12 w-12" />}
          title="No meal plans yet"
          description="Create your first weekly plan and fill it with recipes."
          action={
            <button className="btn-primary" onClick={() => setShowCreateModal(true)}>
              <PlusIcon className="h-4 w-4 mr-2" />
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
          {plans.map(plan => (
            <div key={plan.id} className="card card-hover p-6">
              <div className="flex items-start justify-between gap-4">
                <div className="min-w-0 flex-1">
                  <h3 className="text-lg font-semibold text-stone-900">
                    {plan.name || 'Week Plan'}
                  </h3>
                  <p className="mt-1 text-sm text-stone-600">
                    {formatLocalDate(plan.start_date)} - {formatLocalDate(plan.end_date)}
                  </p>
                  <div className="mt-3">
                    <StatPill
                      label="Planned slots"
                      value={`${plan.item_count}`}
                      tone={plan.item_count > 0 ? 'success' : 'default'}
                      className="max-w-[9rem]"
                    />
                  </div>
                </div>
                <button
                  className="icon-button-danger"
                  disabled={deletingId === plan.id}
                  onClick={() => setPlanToDelete(plan)}
                  title={`Delete ${plan.name || 'meal plan'}`}
                >
                  <TrashIcon className="h-4 w-4" />
                </button>
              </div>

              <div className="mt-5">
                <Link className="btn-secondary w-full text-center" to={`/meal-plans/${plan.id}`}>
                  Open planner
                </Link>
              </div>
            </div>
          ))}
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
          <span className="text-sm text-stone-600">
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
          size="sm"
          title="Create meal plan"
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
              <label className="block text-sm font-medium text-stone-700 mb-1">Plan name</label>
              <input
                className="input"
                value={newPlan.name || ''}
                onChange={e => setNewPlan(prev => ({ ...prev, name: e.target.value }))}
                placeholder="Weeknight wins"
              />
            </div>
            <div className="grid gap-3 grid-cols-2">
              <div>
                <label className="block text-sm font-medium text-stone-700 mb-1">Start date</label>
                <input
                  className="input"
                  type="date"
                  value={newPlan.start_date}
                  onChange={e => setNewPlan(prev => ({ ...prev, start_date: e.target.value }))}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-stone-700 mb-1">End date</label>
                <input
                  className="input"
                  type="date"
                  value={newPlan.end_date}
                  onChange={e => setNewPlan(prev => ({ ...prev, end_date: e.target.value }))}
                />
              </div>
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
