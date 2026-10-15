import type { ReactNode } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { GroceryBagIcon, PantryIcon } from './AppIcons';

interface KitchenSubNavProps {
  groceryCount?: number;
  pantryCount?: number;
  expiringCount?: number;
  actions?: ReactNode;
  className?: string;
}

export function KitchenSubNav({
  groceryCount,
  pantryCount,
  expiringCount,
  actions,
  className = '',
}: KitchenSubNavProps) {
  const location = useLocation();
  const isGrocery = location.pathname === '/grocery' || location.pathname.startsWith('/grocery/');
  const isPantry = location.pathname === '/pantry' || location.pathname.startsWith('/pantry/');

  return (
    <div
      role="region"
      aria-label="Kitchen and Shop switcher"
      className={`mb-6 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-[#E7E0D6] bg-[#F3EFE6]/70 p-1.5 ${className}`.trim()}
    >
      <div className="inline-flex flex-wrap items-center gap-1">
        <Link
          to="/grocery"
          aria-current={isGrocery ? 'page' : undefined}
          className={`inline-flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-semibold transition-all duration-150 ${
            isGrocery
              ? 'bg-white text-[#1C1917] shadow-xs border border-[#E7E0D6]'
              : 'text-[#57534E] hover:bg-white/60 hover:text-[#1C1917]'
          }`}
        >
          <GroceryBagIcon className="h-4 w-4 shrink-0" />
          <span>Grocery Lists</span>
          {typeof groceryCount === 'number' && (
            <span
              className={`ml-0.5 rounded-full px-2 py-0.5 text-xs font-mono tabular-nums ${
                isGrocery ? 'bg-[#F9F1EA] text-[#9A3412]' : 'bg-[#E7E0D6]/70 text-[#57534E]'
              }`}
            >
              {groceryCount}
            </span>
          )}
        </Link>

        <Link
          to="/pantry"
          aria-current={isPantry ? 'page' : undefined}
          className={`inline-flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-semibold transition-all duration-150 ${
            isPantry
              ? 'bg-white text-[#1C1917] shadow-xs border border-[#E7E0D6]'
              : 'text-[#57534E] hover:bg-white/60 hover:text-[#1C1917]'
          }`}
        >
          <PantryIcon className="h-4 w-4 shrink-0" />
          <span>Pantry Inventory</span>
          {typeof pantryCount === 'number' && (
            <span
              className={`ml-0.5 rounded-full px-2 py-0.5 text-xs font-mono tabular-nums ${
                isPantry ? 'bg-[#ECF5F0] text-[#2F6F4E]' : 'bg-[#E7E0D6]/70 text-[#57534E]'
              }`}
            >
              {pantryCount}
            </span>
          )}
          {typeof expiringCount === 'number' && expiringCount > 0 && (
            <span className="ml-0.5 rounded-full border border-[#B45309]/25 bg-[#FEF3C7] px-2 py-0.5 text-[11px] font-semibold text-[#92400E] tabular-nums">
              {expiringCount} expiring
            </span>
          )}
        </Link>
      </div>

      {actions && <div className="flex flex-wrap items-center gap-2 pr-1">{actions}</div>}
    </div>
  );
}

export default KitchenSubNav;
