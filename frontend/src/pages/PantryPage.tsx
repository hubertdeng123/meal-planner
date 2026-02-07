import { useEffect, useState } from 'react';
import { ArchiveBoxIcon, PlusIcon, TrashIcon } from '../components/ui/AppIcons';

import { EmptyState } from '../components/ui/EmptyState';
import { ConfirmDialog } from '../components/ui/ConfirmDialog';
import { ModalShell } from '../components/ui/ModalShell';
import { PageHeader } from '../components/ui/PageHeader';
import { StatPill } from '../components/ui/StatPill';
import { ToolbarRow } from '../components/ui/ToolbarRow';
import { useToast } from '../contexts/ToastContext';
import pantryService from '../services/pantry.service';
import type { PantryItem, PantryItemCreate } from '../types';

export default function PantryPage() {
  const { addToast } = useToast();
  const [items, setItems] = useState<PantryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(0);
  const [searchInput, setSearchInput] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [creating, setCreating] = useState(false);
  const [deletingId, setDeletingId] = useState<number | null>(null);
  const [itemToDelete, setItemToDelete] = useState<PantryItem | null>(null);
  const [newItem, setNewItem] = useState<PantryItemCreate>({
    name: '',
    quantity: undefined,
    unit: '',
    category: 'Pantry',
  });

  useEffect(() => {
    const timer = setTimeout(() => {
      setPage(1);
      setSearchQuery(searchInput.trim());
    }, 250);
    return () => clearTimeout(timer);
  }, [searchInput]);

  useEffect(() => {
    void loadItems();
  }, [page, searchQuery]);

  const loadItems = async () => {
    setLoading(true);
    try {
      const data = await pantryService.getPantryItems({
        page,
        pageSize: 12,
        q: searchQuery || undefined,
      });
      setItems(data.items);
      setTotalPages(data.total_pages);
    } catch (error) {
      console.error('Failed to load pantry items:', error);
      addToast('Could not load pantry items.', 'error');
    } finally {
      setLoading(false);
    }
  };

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

  const handleDelete = async () => {
    if (!itemToDelete) return;
    setDeletingId(itemToDelete.id);
    try {
      await pantryService.deletePantryItem(itemToDelete.id);
      setItems(prev => prev.filter(item => item.id !== itemToDelete.id));
      addToast('Pantry item deleted.', 'success');
      setItemToDelete(null);
    } catch (error) {
      console.error('Failed to delete pantry item:', error);
      addToast('Could not delete pantry item.', 'error');
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
        title="Pantry"
        subtitle="Track staples so plans and recipes prioritize what you already have"
        actions={
          <button className="btn-primary" onClick={() => setShowCreateModal(true)}>
            <PlusIcon className="h-4 w-4 mr-2" />
            Add pantry item
          </button>
        }
      />

      <ToolbarRow helper="Pantry items are prioritized in planning and recipe prompts">
        <input
          value={searchInput}
          onChange={e => setSearchInput(e.target.value)}
          className="input"
          placeholder="Search pantry items"
        />
      </ToolbarRow>

      {items.length === 0 && !searchQuery ? (
        <EmptyState
          icon={<ArchiveBoxIcon className="h-12 w-12" />}
          title="Your pantry is empty"
          description="Add ingredients you have on hand and we’ll prioritize them in planning."
          action={
            <button className="btn-primary" onClick={() => setShowCreateModal(true)}>
              <PlusIcon className="h-4 w-4 mr-2" />
              Add first item
            </button>
          }
        />
      ) : items.length === 0 ? (
        <EmptyState
          title="No pantry items matched"
          description="Try another search term."
          variant="compact"
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
        <div className="mt-8 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {items.map(item => (
            <div key={item.id} className="card p-5">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0 flex-1">
                  <h3 className="text-lg font-semibold text-stone-900">{item.name}</h3>
                  <div className="mt-3 grid grid-cols-2 gap-2">
                    <StatPill
                      label="Quantity"
                      value={[item.quantity, item.unit].filter(Boolean).join(' ') || 'Not set'}
                      tone="default"
                    />
                    <StatPill
                      label="Category"
                      value={item.category || 'Uncategorized'}
                      tone="warm"
                    />
                  </div>
                </div>
                <button
                  className="icon-button-danger"
                  disabled={deletingId === item.id}
                  onClick={() => setItemToDelete(item)}
                  title={`Delete ${item.name}`}
                >
                  <TrashIcon className="h-4 w-4" />
                </button>
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
              <label className="block text-sm font-medium text-stone-700 mb-1">Name *</label>
              <input
                className="input"
                value={newItem.name}
                onChange={e => setNewItem(prev => ({ ...prev, name: e.target.value }))}
                placeholder="e.g., rice"
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-sm font-medium text-stone-700 mb-1">Quantity</label>
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
                <label className="block text-sm font-medium text-stone-700 mb-1">Unit</label>
                <input
                  className="input"
                  value={newItem.unit || ''}
                  onChange={e => setNewItem(prev => ({ ...prev, unit: e.target.value }))}
                  placeholder="cups"
                />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-stone-700 mb-1">Category</label>
              <input
                className="input"
                value={newItem.category || ''}
                onChange={e => setNewItem(prev => ({ ...prev, category: e.target.value }))}
                placeholder="Pantry"
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
