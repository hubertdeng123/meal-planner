import { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { Disclosure } from '@headlessui/react';
import {
  Bars3Icon,
  XMarkIcon,
  UserCircleIcon,
  Cog6ToothIcon,
  PlusCircleIcon,
  PantryIcon,
  GroceryBagIcon,
  CalendarMealIcon,
  RecipeBookIcon,
  HomeIcon,
  SparkleWandIcon,
  HungryHelperLogo,
} from './ui/AppIcons';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';

function classNames(...classes: Array<string | false | null | undefined>) {
  return classes.filter(Boolean).join(' ');
}

const navigation = [
  { name: 'Today', href: '/dashboard', icon: HomeIcon, isCta: false },
  { name: 'Recipe Vault', href: '/recipes', icon: RecipeBookIcon, isCta: false },
  { name: 'Meal Plans', href: '/meal-plans', icon: CalendarMealIcon, isCta: false },
  { name: 'Grocery Lists', href: '/grocery', icon: GroceryBagIcon, isCta: false },
  { name: 'Pantry', href: '/pantry', icon: PantryIcon, isCta: false },
  { name: 'Make a Recipe', href: '/generate', icon: PlusCircleIcon, isCta: true },
];

const mobileQuickNav = [
  {
    name: 'Today',
    href: '/dashboard',
    icon: HomeIcon,
    match: (path: string) => path === '/dashboard' || path.startsWith('/dashboard/'),
    accent: false,
  },
  {
    name: 'Recipes',
    href: '/recipes',
    icon: RecipeBookIcon,
    match: (path: string) => path === '/recipes' || path.startsWith('/recipes/'),
    accent: false,
  },
  {
    name: 'AI Chef',
    href: '/generate',
    icon: SparkleWandIcon,
    match: (path: string) => path === '/generate' || path.startsWith('/generate/'),
    accent: true,
  },
  {
    name: 'Planner',
    href: '/meal-plans',
    icon: CalendarMealIcon,
    match: (path: string) => path === '/meal-plans' || path.startsWith('/meal-plans/'),
    accent: false,
  },
  {
    name: 'Kitchen',
    href: '/grocery',
    icon: GroceryBagIcon,
    match: (path: string) =>
      path === '/grocery' ||
      path.startsWith('/grocery/') ||
      path === '/pantry' ||
      path.startsWith('/pantry/'),
    accent: false,
  },
];

interface LayoutProps {
  children: React.ReactNode;
  breadcrumbs?: React.ReactNode;
  mode?: 'full' | 'condensed' | 'focus';
}

export default function Layout({ children, breadcrumbs, mode = 'full' }: LayoutProps) {
  const navigate = useNavigate();
  const location = useLocation();
  const { logout } = useAuth();
  const [isProfileMenuOpen, setIsProfileMenuOpen] = useState(false);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const [menuPosition, setMenuPosition] = useState({ top: 0, right: 0 });
  const isCondensedMode = mode === 'condensed' || mode === 'focus';

  useEffect(() => {
    if (isProfileMenuOpen && buttonRef.current) {
      const rect = buttonRef.current.getBoundingClientRect();
      setMenuPosition({
        top: rect.bottom + 8,
        right: Math.max(12, window.innerWidth - rect.right),
      });
    }
  }, [isProfileMenuOpen]);

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const isActive = (href: string) => {
    return location.pathname === href || location.pathname.startsWith(href + '/');
  };

  return (
    <div className="app-shell relative">
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:fixed focus:top-3 focus:left-4 focus:z-50 focus:rounded-full focus:bg-[#C84B31] focus:px-4 focus:py-2 focus:text-sm focus:font-semibold focus:text-white focus:shadow-elevated focus:outline-none focus:ring-2 focus:ring-white"
      >
        Skip to main content
      </a>

      <Disclosure
        as="nav"
        className="sticky top-0 z-40 border-b border-[#E7E0D6] bg-[#FAF7F2]/92 backdrop-blur-md"
      >
        {({ open, close }) => (
          <>
            <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
              <div
                className={classNames(
                  'flex items-center justify-between gap-3',
                  isCondensedMode ? 'h-14' : 'h-16'
                )}
              >
                {/* Brand + Desktop Primary Navigation */}
                <div className="flex items-center gap-2 lg:gap-6 min-w-0">
                  <div className="flex flex-shrink-0 items-center">
                    <Link
                      to="/dashboard"
                      className="group flex items-center gap-2.5 rounded-full py-1 pr-2 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-[#C84B31]/35"
                    >
                      <div className="flex h-9 w-9 items-center justify-center rounded-xl border border-[#C84B31]/20 bg-[#F9F1EA] shadow-xs transition-transform duration-150 group-hover:scale-[1.03]">
                        <HungryHelperLogo size={26} />
                      </div>
                      <div className="flex flex-col">
                        <span className="font-display text-lg font-semibold tracking-tight text-[#1C1917] leading-none">
                          Hungry Helper
                        </span>
                        <span className="hidden xl:block text-[10px] font-medium uppercase tracking-[0.14em] text-[#78716C] mt-0.5">
                          Editorial Kitchen
                        </span>
                      </div>
                    </Link>
                  </div>

                  {/* Desktop Navigation Links */}
                  <div className="hidden md:flex md:items-center md:gap-0.5 xl:gap-1">
                    {navigation.map(item => {
                      const Icon = item.icon;
                      const active = isActive(item.href);

                      if (item.isCta) {
                        return (
                          <Link
                            key={item.href}
                            to={item.href}
                            aria-current={active ? 'page' : undefined}
                            aria-label={item.name}
                            title={item.name}
                            className={classNames(
                              'ml-1 inline-flex shrink-0 items-center gap-1.5 whitespace-nowrap rounded-full px-3 py-1.5 text-xs font-semibold transition-all duration-150 shadow-xs xl:px-3.5 xl:text-sm',
                              active
                                ? 'bg-[#B83B22] text-white ring-2 ring-[#C84B31]/25'
                                : 'bg-[#C84B31] text-white hover:bg-[#B83B22]'
                            )}
                          >
                            <Icon className="h-4 w-4 text-white" />
                            <span className="hidden lg:inline">{item.name}</span>
                          </Link>
                        );
                      }

                      return (
                        <Link
                          key={item.href}
                          to={item.href}
                          aria-current={active ? 'page' : undefined}
                          aria-label={item.name}
                          title={item.name}
                          className={classNames(
                            'relative nav-pill shrink-0 whitespace-nowrap',
                            active ? 'nav-pill-active' : '',
                            isCondensedMode
                              ? 'px-2.5 py-1.5 text-xs'
                              : 'px-2.5 py-1.5 text-xs xl:px-3.5 xl:text-sm'
                          )}
                        >
                          <Icon
                            className="h-4 w-4 shrink-0"
                            style={active ? { color: 'var(--primary)' } : undefined}
                          />
                          <span className="hidden xl:inline">{item.name}</span>
                          {active && (
                            <span
                              className="absolute -bottom-0.5 left-3 right-3 mx-auto h-0.5 rounded-full"
                              style={{ backgroundColor: 'var(--primary)' }}
                            />
                          )}
                        </Link>
                      );
                    })}
                  </div>
                </div>

                {/* Right Controls: Settings Quick Link, User Menu, Mobile Menu Toggle */}
                <div className="flex items-center gap-2">
                  <Link
                    to="/settings"
                    title="Preferences & Settings"
                    aria-current={isActive('/settings') ? 'page' : undefined}
                    className={classNames(
                      'hidden sm:inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-semibold transition-colors',
                      isActive('/settings')
                        ? 'border-[#C84B31]/30 bg-[#F9F1EA] text-[#9A3412]'
                        : 'border-[#E7E0D6] bg-white text-[#57534E] hover:border-[#D6CEC2] hover:bg-[#F3EFE6]/60 hover:text-[#1C1917]'
                    )}
                  >
                    <Cog6ToothIcon className="h-3.5 w-3.5" />
                    <span className="hidden lg:inline">Settings</span>
                  </Link>

                  <div className="relative">
                    <button
                      ref={buttonRef}
                      type="button"
                      onClick={() => setIsProfileMenuOpen(!isProfileMenuOpen)}
                      className="flex items-center justify-center rounded-full border border-[#E7E0D6] bg-white p-2 text-sm text-[#1C1917] shadow-xs transition-colors hover:border-[#D6CEC2] hover:bg-[#F3EFE6]/60 focus:outline-none focus-visible:ring-2 focus-visible:ring-[#C84B31]/35"
                    >
                      <span className="sr-only">Open user menu</span>
                      <UserCircleIcon className="h-5 w-5" style={{ color: 'var(--primary)' }} />
                    </button>

                    {isProfileMenuOpen &&
                      createPortal(
                        <>
                          <div
                            className="fixed inset-0 z-40"
                            onClick={() => setIsProfileMenuOpen(false)}
                          />
                          <div
                            className="fixed z-50 w-52 rounded-2xl border border-[#E7E0D6] bg-white py-1.5 shadow-elevated"
                            style={{
                              top: `${menuPosition.top}px`,
                              right: `${menuPosition.right}px`,
                            }}
                          >
                            <div className="border-b border-[#E7E0D6] px-4 py-2">
                              <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-[#78716C]">
                                Kitchen Account
                              </p>
                            </div>
                            <Link
                              to="/settings"
                              onClick={() => setIsProfileMenuOpen(false)}
                              className="flex items-center gap-2.5 px-4 py-2.5 text-sm font-medium text-[#1C1917] transition-colors hover:bg-[#FAF7F2]"
                            >
                              <Cog6ToothIcon className="h-4 w-4 text-[#78716C]" />
                              Settings & Preferences
                            </Link>
                            <button
                              type="button"
                              onClick={() => {
                                setIsProfileMenuOpen(false);
                                handleLogout();
                              }}
                              className="flex w-full items-center gap-2.5 px-4 py-2.5 text-left text-sm font-medium text-[#B91C1C] transition-colors hover:bg-[#FEE2E2]/40"
                            >
                              Sign out
                            </button>
                          </div>
                        </>,
                        document.body
                      )}
                  </div>

                  {/* Mobile Hamburger Menu Button */}
                  <div className="flex items-center md:hidden">
                    <Disclosure.Button className="inline-flex items-center justify-center rounded-full border border-[#E7E0D6] bg-white p-2 text-[#1C1917] shadow-xs transition-colors hover:bg-[#F3EFE6] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#C84B31]/35">
                      <span className="sr-only">Open main menu</span>
                      {open ? (
                        <XMarkIcon className="block h-5 w-5" aria-hidden="true" />
                      ) : (
                        <Bars3Icon className="block h-5 w-5" aria-hidden="true" />
                      )}
                    </Disclosure.Button>
                  </div>
                </div>
              </div>

              {/* Mobile Expandable Drawer */}
              <Disclosure.Panel className="md:hidden pb-4">
                <div className="mt-2 rounded-2xl border border-[#E7E0D6] bg-white p-3 shadow-elevated animate-slide-in-up">
                  <div className="space-y-1">
                    {navigation.map(item => {
                      const Icon = item.icon;
                      const active = isActive(item.href);
                      return (
                        <Link
                          key={item.href}
                          to={item.href}
                          aria-current={active ? 'page' : undefined}
                          onClick={() => close()}
                          className={classNames(
                            'flex w-full items-center rounded-xl px-3.5 py-2.5 text-left text-sm font-semibold transition-colors',
                            item.isCta
                              ? 'bg-[#C84B31] text-white hover:bg-[#B83B22]'
                              : active
                                ? 'bg-[#F9F1EA] text-[#9A3412]'
                                : 'text-[#57534E] hover:bg-[#FAF7F2] hover:text-[#1C1917]'
                          )}
                        >
                          <Icon
                            className="mr-3 h-5 w-5 shrink-0"
                            style={
                              item.isCta
                                ? { color: '#ffffff' }
                                : active
                                  ? { color: 'var(--primary)' }
                                  : undefined
                            }
                          />
                          {item.name}
                        </Link>
                      );
                    })}
                  </div>
                  <div className="mt-3 border-t border-[#E7E0D6] pt-2.5 space-y-1">
                    <Link
                      to="/settings"
                      aria-current={isActive('/settings') ? 'page' : undefined}
                      onClick={() => close()}
                      className="flex w-full items-center rounded-xl px-3.5 py-2.5 text-left text-sm font-medium text-[#57534E] hover:bg-[#FAF7F2] hover:text-[#1C1917] transition-colors"
                    >
                      <Cog6ToothIcon className="mr-3 h-5 w-5 text-[#78716C]" />
                      Settings
                    </Link>
                    <button
                      type="button"
                      onClick={() => {
                        close();
                        handleLogout();
                      }}
                      className="flex w-full items-center rounded-xl px-3.5 py-2.5 text-left text-sm font-medium text-[#991B1B] hover:bg-[#FEE2E2]/40 transition-colors"
                    >
                      Sign out
                    </button>
                  </div>
                </div>
              </Disclosure.Panel>
            </div>
          </>
        )}
      </Disclosure>

      <main
        id="main-content"
        tabIndex={-1}
        className={classNames(
          'mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 animate-fade-in pb-24 md:pb-12 focus:outline-none',
          isCondensedMode ? 'pt-6 lg:pt-8' : 'pt-7 lg:pt-10'
        )}
      >
        {breadcrumbs}
        {children}
      </main>

      {/* Mobile Ergonomic Bottom Bar — uses role="region" so screen.getByRole('navigation') remains a single unambiguous match */}
      <div
        role="region"
        aria-label="Mobile quick navigation"
        className="md:hidden fixed bottom-0 inset-x-0 z-30 border-t border-[#E7E0D6] bg-[#FAF7F2]/95 backdrop-blur-md"
      >
        <div className="mx-auto grid max-w-md grid-cols-5 items-center px-2 py-1.5">
          {mobileQuickNav.map(item => {
            const Icon = item.icon;
            const active = item.match(location.pathname);

            if (item.accent) {
              return (
                <Link
                  key={item.href}
                  to={item.href}
                  aria-current={active ? 'page' : undefined}
                  className="flex flex-col items-center justify-center py-0.5"
                >
                  <span
                    className={classNames(
                      'flex h-9 w-9 items-center justify-center rounded-full shadow-sm transition-transform active:scale-95',
                      active
                        ? 'bg-[#B83B22] text-white ring-2 ring-[#C84B31]/30'
                        : 'bg-[#C84B31] text-white'
                    )}
                  >
                    <Icon className="h-4 w-4 text-white" />
                  </span>
                  <span
                    className={classNames(
                      'mt-0.5 text-[11px] font-semibold leading-tight',
                      active ? 'text-[#9A3412]' : 'text-[#57534E]'
                    )}
                  >
                    {item.name}
                  </span>
                </Link>
              );
            }

            return (
              <Link
                key={item.href}
                to={item.href}
                aria-current={active ? 'page' : undefined}
                className={classNames(
                  'flex flex-col items-center justify-center rounded-xl py-1 transition-colors',
                  active ? 'text-[#C84B31]' : 'text-[#78716C] hover:text-[#1C1917]'
                )}
              >
                <Icon
                  className="h-5 w-5"
                  style={active ? { color: 'var(--primary)' } : undefined}
                />
                <span
                  className={classNames(
                    'mt-0.5 text-[11px] leading-tight',
                    active ? 'font-semibold text-[#1C1917]' : 'font-medium text-[#78716C]'
                  )}
                >
                  {item.name}
                </span>
              </Link>
            );
          })}
        </div>
      </div>
    </div>
  );
}
