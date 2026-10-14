import { useEffect, useState, type ComponentType } from 'react';
import { Menu, MenuButton, MenuItem, MenuItems } from '@headlessui/react';
import { Link, NavLink, useLocation, useNavigate } from 'react-router-dom';
import {
  Bars3Icon,
  CalendarMealIcon,
  ChevronDownIcon,
  Cog6ToothIcon,
  DashboardIcon,
  GroceryBagIcon,
  HungryHelperLogo,
  LogoutIcon,
  PantryIcon,
  RecipeBookIcon,
  SparklesIcon,
  XMarkIcon,
  type AppIconProps,
} from './ui/AppIcons';
import { useAuth } from '../hooks/useAuth';
import authService from '../services/auth.service';
import type { User } from '../types';

function classNames(...classes: Array<string | false | undefined>) {
  return classes.filter(Boolean).join(' ');
}

interface NavEntry {
  name: string;
  href: string;
  icon: ComponentType<AppIconProps>;
}

const navigationGroups: Array<{ label: string; items: NavEntry[] }> = [
  {
    label: 'Kitchen',
    items: [
      { name: 'Dashboard', href: '/dashboard', icon: DashboardIcon },
      { name: 'Recipe Vault', href: '/recipes', icon: RecipeBookIcon },
      { name: 'Make a Recipe', href: '/generate', icon: SparklesIcon },
    ],
  },
  {
    label: 'Planning',
    items: [
      { name: 'Meal Plans', href: '/meal-plans', icon: CalendarMealIcon },
      { name: 'Grocery Lists', href: '/grocery', icon: GroceryBagIcon },
      { name: 'Pantry', href: '/pantry', icon: PantryIcon },
    ],
  },
];

let cachedUser: User | null = null;

function useCurrentUser() {
  const [user, setUser] = useState<User | null>(cachedUser);

  useEffect(() => {
    if (cachedUser) return;
    let cancelled = false;
    const load = async () => {
      try {
        const data = await authService.getCurrentUser();
        cachedUser = data;
        if (!cancelled) setUser(data);
      } catch {
        // The shell still renders without profile details.
      }
    };
    void load();
    return () => {
      cancelled = true;
    };
  }, []);

  return user;
}

function initialsFor(user: User | null) {
  const source = user?.username || user?.email || '';
  return source.slice(0, 2).toUpperCase() || 'HH';
}

function Brand({ compact = false }: { compact?: boolean }) {
  return (
    <Link
      to="/dashboard"
      className="group flex items-center gap-2.5 rounded-lg px-1 py-1 focus:outline-none focus-visible:ring-4 focus-visible:ring-primary-soft"
    >
      <HungryHelperLogo size={compact ? 30 : 34} className="transition-transform duration-200 group-hover:-rotate-6" />
      <span className="font-display text-[1.15rem] font-semibold text-stone-900">Hungry Helper</span>
    </Link>
  );
}

function NavList({ onNavigate }: { onNavigate?: () => void }) {
  return (
    <div className="space-y-6">
      {navigationGroups.map(group => (
        <div key={group.label}>
          <p className="eyebrow mb-2 px-3">{group.label}</p>
          <ul className="space-y-0.5">
            {group.items.map(item => {
              const Icon = item.icon;
              return (
                <li key={item.href}>
                  <NavLink
                    to={item.href}
                    onClick={onNavigate}
                    className={({ isActive }) =>
                      classNames('nav-item', isActive && 'nav-item-active')
                    }
                  >
                    {({ isActive }) => (
                      <>
                        <Icon
                          className={classNames(
                            'h-[18px] w-[18px]',
                            isActive ? 'text-primary' : 'text-stone-400'
                          )}
                        />
                        {item.name}
                      </>
                    )}
                  </NavLink>
                </li>
              );
            })}
          </ul>
        </div>
      ))}
    </div>
  );
}

interface LayoutProps {
  children: React.ReactNode;
  breadcrumbs?: React.ReactNode;
  mode?: 'full' | 'condensed' | 'focus';
}

export default function Layout({ children, breadcrumbs, mode = 'full' }: LayoutProps) {
  const navigate = useNavigate();
  const location = useLocation();
  const { logout } = useAuth();
  const user = useCurrentUser();
  const [mobileOpen, setMobileOpen] = useState(false);

  useEffect(() => {
    setMobileOpen(false);
  }, [location.pathname]);

  useEffect(() => {
    if (!mobileOpen) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setMobileOpen(false);
    };
    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, [mobileOpen]);

  const handleLogout = () => {
    cachedUser = null;
    logout();
    navigate('/login');
  };

  const isFocusMode = mode === 'focus';

  return (
    <div className="app-shell">
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-[var(--sidebar-width)] flex-col border-r border-stone-900/[0.06] bg-[#efede6] lg:flex">
        <div className="px-4 pb-4 pt-5">
          <Brand />
        </div>

        <div className="px-4">
          <Link to="/generate" className="btn-primary w-full">
            <SparklesIcon className="h-4 w-4" />
            New recipe
          </Link>
        </div>

        <nav aria-label="Main" className="mt-6 flex-1 overflow-y-auto px-2">
          <NavList />
        </nav>

        <div className="border-t border-stone-900/[0.06] p-3">
          <Menu>
            <MenuButton
              aria-label="Open user menu"
              className="flex w-full items-center gap-3 rounded-xl px-2 py-2 text-left transition-colors hover:bg-stone-900/5 focus:outline-none focus-visible:ring-4 focus-visible:ring-primary-soft data-[open]:bg-stone-900/5"
            >
              <span className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full bg-primary text-xs font-semibold text-white">
                {initialsFor(user)}
              </span>
              <span className="min-w-0 flex-1">
                <span className="block truncate text-sm font-semibold text-stone-900">
                  {user?.username || 'Your kitchen'}
                </span>
                <span className="block truncate text-xs text-stone-500">
                  {user?.email || 'Account & settings'}
                </span>
              </span>
              <ChevronDownIcon className="h-4 w-4 text-stone-400" />
            </MenuButton>
            <MenuItems
              anchor={{ to: 'top start', gap: 8 }}
              className="z-50 w-[calc(var(--sidebar-width)-1.5rem)] rounded-xl border border-stone-200 bg-white p-1.5 shadow-lg focus:outline-none"
            >
              <MenuItem>
                <Link
                  to="/settings"
                  className="flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm text-stone-700 data-[focus]:bg-stone-100"
                >
                  <Cog6ToothIcon className="h-4 w-4 text-stone-400" />
                  Settings
                </Link>
              </MenuItem>
              <MenuItem>
                <button
                  type="button"
                  onClick={handleLogout}
                  className="flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-left text-sm text-stone-700 data-[focus]:bg-stone-100"
                >
                  <LogoutIcon className="h-4 w-4 text-stone-400" />
                  Sign out
                </button>
              </MenuItem>
            </MenuItems>
          </Menu>
        </div>
      </aside>

      <header className="sticky top-0 z-30 flex h-14 items-center justify-between border-b border-stone-900/[0.06] bg-[#f6f5f1]/85 px-4 backdrop-blur-md lg:hidden">
        <Brand compact />
        <div className="flex items-center gap-1">
          <Link to="/generate" className="icon-button-muted" aria-label="Make a recipe">
            <SparklesIcon className="h-5 w-5" />
          </Link>
          <button
            type="button"
            className="icon-button-muted"
            onClick={() => setMobileOpen(true)}
            aria-expanded={mobileOpen}
          >
            <span className="sr-only">Open main menu</span>
            <Bars3Icon className="h-6 w-6" />
          </button>
        </div>
      </header>

      {mobileOpen && (
        <div className="fixed inset-0 z-50 lg:hidden" role="dialog" aria-modal="true">
          <div
            className="absolute inset-0 bg-stone-950/40 animate-fade-in"
            onClick={() => setMobileOpen(false)}
          />
          <div className="absolute inset-y-0 left-0 flex w-[min(20rem,85vw)] flex-col bg-[#f3f2ec] shadow-xl animate-slide-in-left">
            <div className="flex items-center justify-between px-4 pb-3 pt-4">
              <Brand compact />
              <button
                type="button"
                className="icon-button-muted"
                onClick={() => setMobileOpen(false)}
                aria-label="Close menu"
              >
                <XMarkIcon className="h-5 w-5" />
              </button>
            </div>
            <div className="px-4">
              <Link to="/generate" className="btn-primary w-full">
                <SparklesIcon className="h-4 w-4" />
                New recipe
              </Link>
            </div>
            <div className="mt-6 flex-1 overflow-y-auto px-2">
              <NavList onNavigate={() => setMobileOpen(false)} />
            </div>
            <div className="space-y-0.5 border-t border-stone-900/[0.06] p-2">
              <Link to="/settings" className="nav-item">
                <Cog6ToothIcon className="h-[18px] w-[18px] text-stone-400" />
                Settings
              </Link>
              <button type="button" onClick={handleLogout} className="nav-item w-full">
                <LogoutIcon className="h-[18px] w-[18px] text-stone-400" />
                Sign out
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="lg:pl-[var(--sidebar-width)]">
        <main
          className={classNames(
            'mx-auto w-full px-4 py-6 animate-fade-in sm:px-6 lg:px-10 lg:py-10',
            isFocusMode ? 'max-w-5xl' : 'max-w-6xl'
          )}
        >
          {breadcrumbs}
          {children}
        </main>
      </div>
    </div>
  );
}
