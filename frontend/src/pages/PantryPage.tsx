import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  ArchiveBoxIcon,
  ArrowRightIcon,
  ExclamationTriangleIcon,
  PencilIcon,
  PlusIcon,
  SparklesIcon,
  TrashIcon,
} from '../components/ui/AppIcons';

import { EmptyState } from '../components/ui/EmptyState';
import { ConfirmDialog } from '../components/ui/ConfirmDialog';
import { ModalShell } from '../components/ui/ModalShell';
import { PageHeader } from '../components/ui/PageHeader';
import { ToolbarRow } from '../components/ui/ToolbarRow';
import { KitchenSubNav } from '../components/ui/KitchenSubNav';
import { useToast } from '../contexts/ToastContext';
import pantryService from '../services/pantry.service';
import type { PantryItem, PantryItemCreate, PantryItemUpdate } from '../types';
import { formatLocalDate, parseLocalIsoDate } from '../utils/date';

type PantryViewMode = 'use_soon' | 'recently_updated' | 'expiry_order';

interface ExpiryDetails {
  state: 'expired' | 'soon' | 'normal' | 'none';
  diffDays: number | null;
  badgeLabel: string;
}

function getExpiryDetails(item: PantryItem): ExpiryDetails {
  if (!item.expires_at) {
    return { state: 'none', diffDays: null, badgeLabel: 'Fresh' };
  }
  const expiryDate = parseLocalIsoDate(item.expires_at.slice(0, 10));
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const diffMs = expiryDate.getTime() - today.getTime();
  const diffDays = Math.ceil(diffMs / (1000 * 60 * 60 * 24));

  if (diffDays < 0) {
    return { state: 'expired', diffDays, badgeLabel: 'Expired' };
  }
  if (diffDays === 0) {
    return { state: 'soon', diffDays: 0, badgeLabel: 'Expires today' };
  }
  if (diffDays === 1) {
    return { state: 'soon', diffDays: 1, badgeLabel: 'Tomorrow' };
  }
  if (diffDays <= 3) {
    return { state: 'soon', diffDays, badgeLabel: `Expires in ${diffDays}d` };
  }
  return { state: 'normal', diffDays, badgeLabel: 'Fresh' };
}

export default function PantryPage() {
  const navigate = useNavigate();
  const { addToast } = useToast();
  const [items, setItems] = useState<PantryItem[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(0);
  const [searchInput, setSearchInput] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [viewMode, setViewMode] = useState<PantryViewMode>('recently_updated');
  const [selectedCategory, setSelectedCategory] = useState<string>('All Categories');
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [creating, setCreating] = useState(false);
  const [editingItem, setEditingItem] = useState<PantryItem | null>(null);
  const [editForm, setEditForm] = useState<PantryItemUpdate>({
    name: '',
    quantity: undefined,
    unit: '',
    category: 'Pantry',
    expires_at: undefined,
  });
  const [savingEdit, setSavingEdit] = useState(false);
  const [deletingId, setDeletingId] = useState<number | null>(null);
  const [itemToDelete, setItemToDelete] = useState<PantryItem | null>(null);
  const [newItem, setNewItem] = useState<PantryItemCreate>({
    name: '',
    quantity: undefined,
    unit: '',
    category: 'Pantry',
  });
  const hasLoadedOnceRef = useRef(false);
  const latestRequestIdRef = useRef(0);

  useEffect(() => {
    const timer = setTimeout(() => {
      setPage(1);
      setSearchQuery(searchInput.trim());
    }, 250);
    return () => clearTimeout(timer);
  }, [searchInput]);

  const { sort, order, showExpiringOnly } = useMemo(() => {
    if (viewMode === 'use_soon') {
      return {
        sort: 'expires_at' as const,
        order: 'asc' as const,
        showExpiringOnly: true,
      };
    }
    if (viewMode === 'expiry_order') {
      return {
        sort: 'expires_at' as const,
        order: 'asc' as const,
        showExpiringOnly: false,
      };
    }
    return {
      sort: 'updated_at' as const,
      order: 'desc' as const,
      showExpiringOnly: false,
    };
  }, [viewMode]);

  const loadItems = useCallback(async () => {
    const requestId = latestRequestIdRef.current + 1;
    latestRequestIdRef.current = requestId;

    if (hasLoadedOnceRef.current) {
      setIsRefreshing(true);
    } else {
      setLoading(true);
    }

    try {
      const data = await pantryService.getPantryItems({
        page,
        pageSize: 12,
        q: searchQuery || undefined,
        sort,
        order,
      });
      if (requestId !== latestRequestIdRef.current) return;
      setItems(data.items);
      setTotalCount(data.total ?? data.items.length);
      setTotalPages(data.total_pages);
    } catch (error) {
      if (requestId !== latestRequestIdRef.current) return;
      console.error('Failed to load pantry items:', error);
      addToast('Could not load pantry items.', 'error');
    } finally {
      if (requestId === latestRequestIdRef.current) {
        hasLoadedOnceRef.current = true;
        setLoading(false);
        setIsRefreshing(false);
      }
    }
  }, [addToast, order, page, searchQuery, sort]);

  useEffect(() => {
    void loadItems();
  }, [loadItems]);

  const handleCreate = async () => {
    if (!newItem.name.trim()) return;
    setCreating(true);
    try {
      await pantryService.createPantryItem({
        ...newItem,
        name: newItem.name.trim(),
      });
      addToast('Pantry item added.', 'success');
      setShowCreateModal(false);
      setNewItem({ name: '', quantity: undefined, unit: '', category: 'Pantry' });
      await loadItems();
    } catch (error) {
      console.error('Failed to create pantry item:', error);
      addToast('Could not add pantry item.', 'error');
    } finally {
      setCreating(false);
    }
  };

  const openEditModal = (item: PantryItem) => {
    setEditingItem(item);
    setEditForm({
      name: item.name,
      quantity: item.quantity,
      unit: item.unit || '',
      category: item.category || 'Pantry',
      expires_at: item.expires_at ? item.expires_at.slice(0, 10) : undefined,
    });
  };

  const handleUpdate = async () => {
    if (!editingItem || !editForm.name?.trim()) return;
    setSavingEdit(true);
    try {
      const payload: PantryItemUpdate = {
        ...editForm,
        name: editForm.name.trim(),
      };
      if (typeof pantryService.updatePantryItem === 'function') {
        const updated = await pantryService.updatePantryItem(editingItem.id, payload);
        setItems(prev => prev.map(i => (i.id === editingItem.id ? updated : i)));
      } else {
        setItems(prev =>
          prev.map(i =>
            i.id === editingItem.id
              ? {
                  ...i,
                  name: payload.name || i.name,
                  quantity: payload.quantity,
                  unit: payload.unit,
                  category: payload.category,
                  expires_at: payload.expires_at,
                }
              : i
          )
        );
      }
      addToast('Pantry item updated.', 'success');
      setEditingItem(null);
    } catch (error) {
      console.error('Failed to update pantry item:', error);
      addToast('Could not update pantry item.', 'error');
    } finally {
      setSavingEdit(false);
    }
  };

  const handleDelete = async () => {
    if (!itemToDelete) return;
    setDeletingId(itemToDelete.id);
    try {
      await pantryService.deletePantryItem(itemToDelete.id);
      setItems(prev => prev.filter(item => item.id !== itemToDelete.id));
      setTotalCount(prev => Math.max(0, prev - 1));
      addToast('Pantry item deleted.', 'success');
      setItemToDelete(null);
    } catch (error) {
      console.error('Failed to delete pantry item:', error);
      addToast('Could not delete pantry item.', 'error');
    } finally {
      setDeletingId(null);
    }
  };

  const expiringItems = useMemo(() => {
    return items.filter(item => {
      const { state } = getExpiryDetails(item);
      return state === 'soon' || state === 'expired';
    });
  }, [items]);

  const expiringSoonCount = expiringItems.length;

  const availableCategories = useMemo(() => {
    const categories = new Set<string>();
    items.forEach(item => {
      categories.add(item.category || 'Uncategorized');
    });
    return ['All Categories', ...Array.from(categories)];
  }, [items]);

  const activeCategory = availableCategories.includes(selectedCategory)
    ? selectedCategory
    : 'All Categories';

  const visibleItems = useMemo(() => {
    return items.filter(item => {
      if (showExpiringOnly) {
        const { state } = getExpiryDetails(item);
        if (state !== 'soon' && state !== 'expired') return false;
      }
      if (activeCategory !== 'All Categories') {
        const itemCategory = item.category || 'Uncategorized';
        if (itemCategory !== activeCategory) return false;
      }
      return true;
    });
  }, [items, showExpiringOnly, activeCategory]);

  const handleCookWithExpiring = () => {
    if (expiringItems.length === 0) return;
    const params = new URLSearchParams();
    expiringItems.forEach(item => {
      params.append('use', item.name);
    });
    navigate(`/generate?${params.toString()}`);
  };

  const getViewModeButtonClass = (mode: PantryViewMode) =>
    [
      'rounded-full border px-4 py-2 text-sm font-semibold transition-colors duration-150',
      'focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-[color:var(--primary-soft)]',
      viewMode === mode
        ? 'border-[#C84B31]/30 bg-[#F9F1EA] text-[#9A3412] shadow-2xs'
        : 'border-[#D6CEC2] bg-white text-[#57534E] hover:bg-[#FAF7F2] hover:text-[#1C1917]',
    ].join(' ');

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div
          className="animate-spin rounded-full h-12 w-12 border-b-2"
          style={{ borderBottomColor: 'var(--primary)' }}
        />
      </div>
    );
  }

  return (
    <div>
      <KitchenSubNav
        pantryCount={totalCount || items.length}
        expiringCount={expiringSoonCount}
        actions={
          <Link to="/grocery" className="btn-ghost text-xs">
            <span>View Shopping Lists</span>
            <ArrowRightIcon className="h-3.5 w-3.5" />
          </Link>
        }
      />

      <PageHeader
        badge={<span className="badge">Kitchen &amp; Shop</span>}
        title="Pantry"
        subtitle="Track staples and fresh produce so weekly plans and AI recipes prioritize what you already have on hand."
        actions={
          <button className="btn-primary" onClick={() => setShowCreateModal(true)}>
            <PlusIcon className="h-4 w-4" />
            <span>Add pantry item</span>
          </button>
        }
      />

      {/* Batch Expiry Triage Banner */}
      {expiringSoonCount > 0 && (
        <div className="mb-6 rounded-3xl border border-[#B45309]/30 bg-[#FEF3C7]/75 p-5 sm:p-6">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-start gap-3.5">
              <div className="icon-container-premium icon-container-amber shrink-0">
                <ExclamationTriangleIcon className="h-5 w-5 text-[#B45309]" />
              </div>
              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <span className="eyebrow !text-[#92400E]">Expiry Triage</span>
                  <span className="rounded-full bg-[#B45309]/15 px-2.5 py-0.5 text-xs font-semibold text-[#92400E] tabular-nums">
                    {expiringSoonCount} {expiringSoonCount === 1 ? 'item' : 'items'} within 3 days
                  </span>
                </div>
                <h2 className="mt-1 font-display text-lg sm:text-xl font-semibold text-[#1C1917]">
                  Put expiring ingredients to work tonight
                </h2>
                <p className="mt-1 text-sm text-[#57534E]">
                  Ready to use soon: {expiringItems.map(item => item.name).join(', ')}.
                </p>
              </div>
            </div>
            <div className="flex flex-wrap items-center gap-2.5 sm:shrink-0">
              <button type="button" onClick={handleCookWithExpiring} className="btn-primary">
                <SparklesIcon className="h-4 w-4" />
                <span>Cook with expiring items</span>
              </button>
            </div>
          </div>
        </div>
      )}

      <ToolbarRow helper="Pantry items are prioritized in planning and recipe prompts">
        <div className="flex flex-col gap-3">
          <div className="flex flex-col gap-3 md:flex-row md:items-center">
            <div className="flex-1">
              <input
                value={searchInput}
                onChange={e => setSearchInput(e.target.value)}
                className="input"
                placeholder="Search pantry items"
              />
            </div>
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                className={getViewModeButtonClass('use_soon')}
                aria-pressed={viewMode === 'use_soon'}
                onClick={() => {
                  setPage(1);
                  setViewMode('use_soon');
                }}
              >
                Use soon
              </button>
              <button
                type="button"
                className={getViewModeButtonClass('recently_updated')}
                aria-pressed={viewMode === 'recently_updated'}
                onClick={() => {
                  setPage(1);
                  setViewMode('recently_updated');
                }}
              >
                Recently updated
              </button>
              <button
                type="button"
                className={getViewModeButtonClass('expiry_order')}
                aria-pressed={viewMode === 'expiry_order'}
                onClick={() => {
                  setPage(1);
                  setViewMode('expiry_order');
                }}
              >
                Expiry order
              </button>
            </div>
            {isRefreshing && <span className="sr-only">Updating pantry</span>}
          </div>

          {/* Category Filter Pills */}
          {availableCategories.length > 1 && (
            <div
              role="group"
              aria-label="Filter pantry by category"
              className="flex items-center gap-1.5 overflow-x-auto pt-1"
            >
              {availableCategories.map(category => {
                const isSelected = activeCategory === category;
                return (
                  <button
                    key={category}
                    type="button"
                    aria-pressed={isSelected}
                    onClick={() => setSelectedCategory(category)}
                    className={`shrink-0 rounded-full border px-3 py-1 text-xs font-semibold transition-colors ${
                      isSelected
                        ? 'border-[#1C1917] bg-[#1C1917] text-white'
                        : 'border-[#E7E0D6] bg-white text-[#57534E] hover:border-[#D6CEC2] hover:text-[#1C1917]'
                    }`}
                  >
                    {category}
                  </button>
                );
              })}
            </div>
          )}
        </div>
      </ToolbarRow>

      {visibleItems.length === 0 && !searchQuery ? (
        <EmptyState
          icon={<ArchiveBoxIcon className="h-12 w-12" />}
          title="Your pantry is empty"
          description="Add ingredients you have on hand and we’ll prioritize them in planning."
          action={
            <button className="btn-primary" onClick={() => setShowCreateModal(true)}>
              <PlusIcon className="h-4 w-4" />
              <span>Add first item</span>
            </button>
          }
        />
      ) : visibleItems.length === 0 ? (
        <EmptyState
          title="No pantry items matched"
          description="Try another search term or category filter."
          variant="compact"
          action={
            <button
              className="btn-secondary"
              onClick={() => {
                setSearchInput('');
                setSearchQuery('');
                setSelectedCategory('All Categories');
              }}
            >
              Clear search
            </button>
          }
        />
      ) : (
        <div className="mt-8 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {visibleItems.map(item => {
            const expiry = getExpiryDetails(item);
            const quantityText = [item.quantity, item.unit].filter(Boolean).join(' ') || 'Not set';
            const expiryDateText = item.expires_at
              ? formatLocalDate(item.expires_at.slice(0, 10))
              : 'No expiry set';

            const badgeClasses =
              expiry.state === 'expired'
                ? 'border-[#B91C1C]/25 bg-[#FEE2E2] text-[#991B1B]'
                : expiry.state === 'soon'
                  ? 'border-[#B45309]/25 bg-[#FEF3C7] text-[#92400E]'
                  : 'border-[#3F624D]/25 bg-[#ECF5F0] text-[#2F6F4E]';

            return (
              <div key={item.id} className="card card-hover flex flex-col justify-between p-5">
                <div>
                  {/* Top: Item name, category badge, and expiry status badge */}
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0 flex-1">
                      <h3 className="font-display text-lg font-semibold text-[#1C1917] truncate">
                        {item.name}
                      </h3>
                      <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
                        <span className="inline-flex items-center rounded-full border border-[#E7E0D6] bg-[#FAF7F2] px-2.5 py-0.5 text-xs font-medium text-[#57534E]">
                          {item.category || 'Uncategorized'}
                        </span>
                        <span
                          className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold tabular-nums ${badgeClasses}`}
                        >
                          {expiry.badgeLabel}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Middle: Compact quantity & expiry metadata strip */}
                  <div className="mt-4 flex flex-wrap items-center gap-x-3 gap-y-1.5 rounded-2xl border border-[#E7E0D6] bg-[#FAF7F2] px-3.5 py-2.5 text-xs text-[#57534E] tabular-nums">
                    <div>
                      <span className="font-semibold text-[#78716C]">Quantity:</span>{' '}
                      <span className="font-semibold text-[#1C1917]">{quantityText}</span>
                    </div>
                    <span className="text-[#D6CEC2]" aria-hidden="true">
                      •
                    </span>
                    <div>
                      <span className="font-semibold text-[#78716C]">Expires:</span>{' '}
                      <span className="font-medium text-[#1C1917]">{expiryDateText}</span>
                    </div>
                  </div>
                </div>

                {/* Bottom action bar */}
                <div className="mt-4 pt-3.5 border-t border-[#E7E0D6]/80 flex items-center justify-between gap-2">
                  <button
                    type="button"
                    className="btn-ghost !px-3 !py-1.5 text-xs !text-[#C84B31] hover:!bg-[#F9F1EA]"
                    onClick={() => navigate(`/generate?use=${encodeURIComponent(item.name)}`)}
                  >
                    Use in recipe
                  </button>

                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      className="icon-button-muted"
                      onClick={() => openEditModal(item)}
                      title={`Edit ${item.name}`}
                      aria-label={`Edit ${item.name}`}
                    >
                      <PencilIcon className="h-4 w-4" />
                    </button>
                    <button
                      type="button"
                      className="icon-button-danger"
                      disabled={deletingId === item.id}
                      onClick={() => setItemToDelete(item)}
                      title={`Delete ${item.name}`}
                      aria-label={`Delete ${item.name}`}
                    >
                      <TrashIcon className="h-4 w-4" />
                    </button>
                  </div>
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

      {/* Create Modal */}
      {showCreateModal && (
        <ModalShell
          size="sm"
          title="Add pantry item"
          onClose={() => setShowCreateModal(false)}
          footer={
            <>
              <button className="btn-secondary" onClick={() => setShowCreateModal(false)}>
                Cancel
              </button>
              <button
                className="btn-primary"
                disabled={creating || !newItem.name.trim()}
                onClick={handleCreate}
              >
                {creating ? 'Adding...' : 'Add item'}
              </button>
            </>
          }
        >
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-[#1C1917] mb-1">Name *</label>
              <input
                className="input"
                value={newItem.name}
                onChange={e => setNewItem(prev => ({ ...prev, name: e.target.value }))}
                placeholder="e.g., Spinach"
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-sm font-medium text-[#1C1917] mb-1">Quantity</label>
                <input
                  type="number"
                  className="input"
                  value={newItem.quantity || ''}
                  onChange={e =>
                    setNewItem(prev => ({
                      ...prev,
                      quantity: e.target.value ? Number(e.target.value) : undefined,
                    }))
                  }
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-[#1C1917] mb-1">Unit</label>
                <input
                  className="input"
                  value={newItem.unit || ''}
                  onChange={e => setNewItem(prev => ({ ...prev, unit: e.target.value }))}
                  placeholder="cups"
                />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-[#1C1917] mb-1">Category</label>
              <input
                className="input"
                value={newItem.category || ''}
                onChange={e => setNewItem(prev => ({ ...prev, category: e.target.value }))}
                placeholder="Pantry"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-[#1C1917] mb-1">Expiry date</label>
              <input
                className="input"
                type="date"
                value={newItem.expires_at ? newItem.expires_at.slice(0, 10) : ''}
                onChange={e =>
                  setNewItem(prev => ({
                    ...prev,
                    expires_at: e.target.value || undefined,
                  }))
                }
              />
            </div>
          </div>
        </ModalShell>
      )}

      {/* Edit Modal */}
      {editingItem && (
        <ModalShell
          size="sm"
          title="Edit pantry item"
          onClose={() => setEditingItem(null)}
          footer={
            <>
              <button className="btn-secondary" onClick={() => setEditingItem(null)}>
                Cancel
              </button>
              <button
                className="btn-primary"
                disabled={savingEdit || !editForm.name?.trim()}
                onClick={handleUpdate}
              >
                {savingEdit ? 'Saving...' : 'Save changes'}
              </button>
            </>
          }
        >
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-[#1C1917] mb-1">Name *</label>
              <input
                className="input"
                value={editForm.name || ''}
                onChange={e => setEditForm(prev => ({ ...prev, name: e.target.value }))}
                placeholder="e.g., Spinach"
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-sm font-medium text-[#1C1917] mb-1">Quantity</label>
                <input
                  type="number"
                  className="input"
                  value={editForm.quantity ?? ''}
                  onChange={e =>
                    setEditForm(prev => ({
                      ...prev,
                      quantity: e.target.value ? Number(e.target.value) : undefined,
                    }))
                  }
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-[#1C1917] mb-1">Unit</label>
                <input
                  className="input"
                  value={editForm.unit || ''}
                  onChange={e => setEditForm(prev => ({ ...prev, unit: e.target.value }))}
                  placeholder="cups"
                />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-[#1C1917] mb-1">Category</label>
              <input
                className="input"
                value={editForm.category || ''}
                onChange={e => setEditForm(prev => ({ ...prev, category: e.target.value }))}
                placeholder="Pantry"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-[#1C1917] mb-1">Expiry date</label>
              <input
                className="input"
                type="date"
                value={editForm.expires_at ? editForm.expires_at.slice(0, 10) : ''}
                onChange={e =>
                  setEditForm(prev => ({
                    ...prev,
                    expires_at: e.target.value || undefined,
                  }))
                }
              />
            </div>
          </div>
        </ModalShell>
      )}

      <ConfirmDialog
        isOpen={Boolean(itemToDelete)}
        title="Delete pantry item?"
        description={
          itemToDelete
            ? `"${itemToDelete.name}" will be removed from your pantry inventory.`
            : 'This item will be removed from your pantry inventory.'
        }
        confirmLabel="Delete item"
        tone="danger"
        loading={deletingId !== null}
        onCancel={() => {
          if (!deletingId) {
            setItemToDelete(null);
          }
        }}
        onConfirm={handleDelete}
      />
    </div>
  );
}
