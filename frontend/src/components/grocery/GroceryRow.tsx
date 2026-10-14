import { useState, type FormEvent } from 'react';
import type { GroceryItem, GroceryItemUpdate } from '../../types';
import { AISLE_ORDER, aisleOf, formatItemAmount } from '../../utils/grocery';
import { CheckIcon, PencilIcon, TrashIcon } from '../ui/AppIcons';

interface GroceryRowProps {
  item: GroceryItem;
  onToggle: (item: GroceryItem) => void;
  onSave: (item: GroceryItem, updates: GroceryItemUpdate) => Promise<boolean>;
  onDelete: (item: GroceryItem) => void;
}

export function GroceryRow({ item, onToggle, onSave, onDelete }: GroceryRowProps) {
  const [editing, setEditing] = useState(false);

  if (editing) {
    return (
      <li>
        <GroceryEditForm
          item={item}
          onCancel={() => setEditing(false)}
          onDelete={() => onDelete(item)}
          onSave={async updates => {
            if (await onSave(item, updates)) setEditing(false);
          }}
        />
      </li>
    );
  }

  const amount = formatItemAmount(item);
  return (
    <li className="group flex items-center">
      <button
        type="button"
        role="checkbox"
        aria-checked={item.checked}
        onClick={() => onToggle(item)}
        className="flex min-h-[3.5rem] flex-1 items-center gap-3.5 rounded-xl px-2 py-2 text-left transition active:bg-stone-100 hover:bg-stone-50 focus:outline-none focus-visible:ring-4 focus-visible:ring-primary-soft"
      >
        <span
          aria-hidden="true"
          className={`flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-full border-2 transition-colors ${
            item.checked ? 'border-primary bg-primary text-white' : 'border-stone-300 bg-white'
          }`}
        >
          {item.checked && <CheckIcon className="h-4 w-4 animate-check-in" />}
        </span>
        <span
          className={`min-w-0 flex-1 text-base ${
            item.checked ? 'text-stone-400 line-through' : 'font-medium text-stone-900'
          }`}
        >
          {item.name}
        </span>
        {amount && (
          <span
            className={`flex-shrink-0 text-sm tabular-nums ${
              item.checked ? 'text-stone-300' : 'text-stone-500'
            }`}
          >
            {amount}
          </span>
        )}
      </button>
      <button
        type="button"
        onClick={() => setEditing(true)}
        aria-label={`Edit ${item.name}`}
        className="ml-1 inline-flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-lg text-stone-400 transition hover:bg-stone-100 hover:text-stone-700 focus:outline-none focus-visible:ring-4 focus-visible:ring-primary-soft sm:opacity-0 sm:group-hover:opacity-100 sm:focus-visible:opacity-100"
      >
        <PencilIcon className="h-4 w-4" />
      </button>
    </li>
  );
}

function GroceryEditForm({
  item,
  onSave,
  onCancel,
  onDelete,
}: {
  item: GroceryItem;
  onSave: (updates: GroceryItemUpdate) => Promise<void>;
  onCancel: () => void;
  onDelete: () => void;
}) {
  const [name, setName] = useState(item.name);
  const [quantity, setQuantity] = useState(item.quantity ? String(item.quantity) : '');
  const [unit, setUnit] = useState(item.unit ?? '');
  const [category, setCategory] = useState(aisleOf(item));
  const [saving, setSaving] = useState(false);

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    if (!name.trim()) return;
    setSaving(true);
    const parsed = Number(quantity);
    await onSave({
      name: name.trim(),
      quantity: quantity.trim() && Number.isFinite(parsed) && parsed > 0 ? parsed : undefined,
      unit: unit.trim() || undefined,
      category,
    });
    setSaving(false);
  };

  return (
    <form
      onSubmit={submit}
      onKeyDown={event => {
        if (event.key === 'Escape') onCancel();
      }}
      aria-label={`Edit ${item.name}`}
      className="my-1 space-y-3 rounded-2xl border border-primary/30 bg-primary-soft/30 p-3 animate-fade-in"
    >
      <div className="grid grid-cols-[1fr_5rem_5rem] gap-2">
        <label className="sr-only" htmlFor={`item-name-${item.id}`}>
          Item name
        </label>
        <input
          id={`item-name-${item.id}`}
          className="input"
          value={name}
          onChange={event => setName(event.target.value)}
          autoFocus
        />
        <label className="sr-only" htmlFor={`item-qty-${item.id}`}>
          Quantity
        </label>
        <input
          id={`item-qty-${item.id}`}
          className="input"
          inputMode="decimal"
          placeholder="Qty"
          value={quantity}
          onChange={event => setQuantity(event.target.value)}
        />
        <label className="sr-only" htmlFor={`item-unit-${item.id}`}>
          Unit
        </label>
        <input
          id={`item-unit-${item.id}`}
          className="input"
          placeholder="Unit"
          value={unit}
          onChange={event => setUnit(event.target.value)}
        />
      </div>
      <div className="flex flex-wrap items-center gap-2">
        <label className="sr-only" htmlFor={`item-aisle-${item.id}`}>
          Aisle
        </label>
        <select
          id={`item-aisle-${item.id}`}
          className="input w-auto py-2"
          value={category}
          onChange={event => setCategory(event.target.value)}
        >
          {[...new Set([...AISLE_ORDER, category])].map(aisle => (
            <option key={aisle}>{aisle}</option>
          ))}
        </select>
        <button
          type="button"
          onClick={onDelete}
          className="btn-ghost btn-sm text-red-600 hover:bg-red-50"
        >
          <TrashIcon className="h-4 w-4" />
          Remove
        </button>
        <span className="flex-1" />
        <button type="button" onClick={onCancel} className="btn-ghost btn-sm">
          Cancel
        </button>
        <button type="submit" disabled={saving || !name.trim()} className="btn-primary btn-sm">
          {saving ? 'Saving…' : 'Save'}
        </button>
      </div>
    </form>
  );
}
