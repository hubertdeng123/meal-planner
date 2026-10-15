import type { ComponentType } from 'react';
import { Menu, MenuButton, MenuItem, MenuItems } from '@headlessui/react';
import { EllipsisHorizontalIcon, type AppIconProps } from './AppIcons';

export interface OverflowMenuItem {
  label: string;
  onSelect: () => void;
  icon?: ComponentType<AppIconProps>;
  disabled?: boolean;
  tone?: 'default' | 'danger';
}

interface OverflowMenuProps {
  label?: string;
  items: OverflowMenuItem[];
  buttonClassName?: string;
}

export function OverflowMenu({
  label = 'More actions',
  items,
  buttonClassName = 'icon-button-outline h-10 w-10',
}: OverflowMenuProps) {
  return (
    <Menu>
      <MenuButton aria-label={label} title={label} className={buttonClassName}>
        <EllipsisHorizontalIcon className="h-5 w-5" />
      </MenuButton>
      <MenuItems
        anchor={{ to: 'bottom end', gap: 6 }}
        className="z-50 min-w-[13rem] rounded-xl border border-stone-200 bg-white p-1.5 shadow-lg focus:outline-none animate-scale-in"
      >
        {items.map(item => {
          const Icon = item.icon;
          const danger = item.tone === 'danger';
          return (
            <MenuItem key={item.label} disabled={item.disabled}>
              <button
                type="button"
                onClick={item.onSelect}
                className={`flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-left text-sm data-[disabled]:opacity-50 data-[focus]:bg-stone-100 ${
                  danger ? 'text-red-600' : 'text-stone-700'
                }`}
              >
                {Icon && (
                  <Icon className={`h-4 w-4 ${danger ? 'text-red-500' : 'text-stone-400'}`} />
                )}
                {item.label}
              </button>
            </MenuItem>
          );
        })}
      </MenuItems>
    </Menu>
  );
}
