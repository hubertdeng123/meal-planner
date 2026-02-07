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
} from './ui/AppIcons';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { HungryHelperLogo } from './ui/AppIcons';

function classNames(...classes: string[]) {
  return classes.filter(Boolean).join(' ');
}

const navigation = [
  { name: 'Recipe Vault', href: '/recipes', icon: RecipeBookIcon },
  { name: 'Meal Plans', href: '/meal-plans', icon: CalendarMealIcon },
  { name: 'Grocery Lists', href: '/grocery', icon: GroceryBagIcon },
  { name: 'Pantry', href: '/pantry', icon: PantryIcon },
  { name: 'Make a Recipe', href: '/generate', icon: PlusCircleIcon },
];

interface LayoutProps {
  children: React.ReactNode;
  breadcrumbs?: React.ReactNode; // Optional breadcrumbs to render above content
}

export default function Layout({ children, breadcrumbs }: LayoutProps) {
  const navigate = useNavigate();
  const location = useLocation();
  const { logout } = useAuth();
  const [isProfileMenuOpen, setIsProfileMenuOpen] = useState(false);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const [menuPosition, setMenuPosition] = useState({ top: 0, right: 0 });

  useEffect(() => {
    if (isProfileMenuOpen && buttonRef.current) {
      const rect = buttonRef.current.getBoundingClientRect();
      setMenuPosition({
        top: rect.bottom + 8,
        right: window.innerWidth - rect.right,
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
    <div className="app-shell relative overflow-hidden">
      <Disclosure as="nav" className="sticky top-4 z-40">
        {({ open }) => (
          <>
            <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
              <div className="relative overflow-hidden glass-panel">
                <div className="absolute inset-0 pointer-events-none bg-[radial-gradient(circle_at_top,_rgba(255,223,210,0.45),_rgba(255,255,255,0.9))]" />
                <div
                  className="absolute right-10 top-4 h-12 w-12 rounded-full blur-xl pointer-events-none"
                  style={{ backgroundColor: 'var(--primary-soft)' }}
                />
                <div className="absolute bottom-2 left-8 h-10 w-10 rounded-full bg-emerald-200/40 blur-xl pointer-events-none" />

                <div className="relative flex h-16 justify-between px-4 sm:px-6">
                  <div className="flex">
                    <div className="flex flex-shrink-0 items-center">
                      <Link
                        to="/dashboard"
                        className="flex items-center space-x-3 rounded-full border border-slate-200/70 bg-white/90 px-3 py-1.5 shadow-sm transition-all duration-200 hover:-translate-y-0.5"
                      >
                        <div className="h-8 w-8 rounded-xl gradient-primary flex items-center justify-center overflow-hidden">
                          <HungryHelperLogo size={28} />
                        </div>
                        <h1 className="font-display text-lg font-semibold text-slate-900">
                          Hungry Helper
                        </h1>
                      </Link>
                    </div>
                    <div className="hidden md:ml-6 md:flex md:items-center md:space-x-2">
                      {navigation.map(item => {
                        const Icon = item.icon;
                        const active = isActive(item.href);
                        return (
                          <Link
                            key={item.href}
                            to={item.href}
                            className={classNames(
                              'relative nav-pill transition-all duration-200',
                              active ? 'nav-pill-active' : ''
                            )}
                            style={active ? { color: 'var(--primary-hover)' } : undefined}
                          >
                            <Icon
                              className={classNames('mr-2 h-4 w-4', active ? '' : '')}
                              style={active ? { color: 'var(--primary)' } : undefined}
                            />
                            {item.name}
                            {active && (
                              <span
                                className="absolute -bottom-0.5 left-0 right-0 mx-auto w-3/5 h-0.5 rounded-full animate-scale-in origin-center"
                                style={{ backgroundColor: 'var(--primary)' }}
                              />
                            )}
                          </Link>
                        );
                      })}
                    </div>
                  </div>
                  <div className="hidden sm:ml-6 sm:flex sm:items-center">
                    <div className="relative ml-3">
                      <button
                        ref={buttonRef}
                        onClick={() => setIsProfileMenuOpen(!isProfileMenuOpen)}
                        className="flex rounded-full bg-white/90 p-2 text-sm shadow-sm ring-1 ring-stone-200 transition-all duration-200 hover:-translate-y-0.5 focus:outline-none focus:ring-2 focus:ring-offset-2"
                        style={{ '--tw-ring-color': 'var(--primary-soft)' } as React.CSSProperties}
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
                              className="fixed z-50 w-48 rounded-2xl bg-white py-2 shadow-xl ring-1 ring-slate-200"
                              style={{
                                top: `${menuPosition.top}px`,
                                right: `${menuPosition.right}px`,
                              }}
                            >
                              <Link
                                to="/settings"
                                onClick={() => setIsProfileMenuOpen(false)}
                                className="flex items-center px-4 py-2 text-sm text-slate-700 transition-colors duration-200 hover:bg-slate-50"
                              >
                                <Cog6ToothIcon className="mr-3 h-4 w-4 text-slate-400" />
                                Settings
                              </Link>
                              <button
                                onClick={() => {
                                  setIsProfileMenuOpen(false);
                                  handleLogout();
                                }}
                                className="block w-full px-4 py-2 text-left text-sm text-slate-700 transition-colors duration-200 hover:bg-slate-50"
                              >
                                Sign out
                              </button>
                            </div>
                          </>,
                          document.body
                        )}
                    </div>
                  </div>
                  <div className="-mr-2 flex items-center sm:hidden">
                    <Disclosure.Button
                      className="inline-flex items-center justify-center rounded-full border border-stone-200/70 bg-white/90 p-2 text-stone-700 shadow-sm transition-all duration-200 hover:-translate-y-0.5 focus:outline-none focus:ring-2 focus:ring-inset"
                      style={{ '--tw-ring-color': 'var(--primary-soft)' } as React.CSSProperties}
                    >
                      <span className="sr-only">Open main menu</span>
                      {open ? (
                        <XMarkIcon className="block h-6 w-6" aria-hidden="true" />
                      ) : (
                        <Bars3Icon className="block h-6 w-6" aria-hidden="true" />
                      )}
                    </Disclosure.Button>
                  </div>
                </div>
              </div>

              <Disclosure.Panel className="md:hidden">
                <div className="mt-3 rounded-3xl border border-stone-200/70 bg-white/95 p-3 shadow-sm animate-slide-in-up">
                  <div className="space-y-1">
                    {navigation.map((item, index) => {
                      const Icon = item.icon;
                      const active = isActive(item.href);
                      return (
                        <Link
                          key={item.href}
                          to={item.href}
                          className={classNames(
                            'flex w-full items-center rounded-2xl px-4 py-3 text-left text-base font-medium transition-all duration-200 opacity-0 animate-slide-in-up',
                            active
                              ? 'text-stone-600 hover:bg-stone-50 hover:text-stone-900'
                              : 'text-stone-600 hover:bg-stone-50 hover:text-stone-900'
                          )}
                          style={{
                            animationDelay: `${index * 50}ms`,
                            animationFillMode: 'forwards',
                            ...(active
                              ? {
                                  backgroundColor: 'var(--primary-soft)',
                                  color: 'var(--primary-hover)',
                                }
                              : {}),
                          }}
                        >
                          <Icon
                            className="mr-3 h-6 w-6"
                            style={active ? { color: 'var(--primary)' } : undefined}
                          />
                          {item.name}
                        </Link>
                      );
                    })}
                  </div>
                  <div className="mt-3 border-t-2 border-stone-200 pt-3">
                    <Link
                      to="/settings"
                      className="flex w-full items-center rounded-2xl px-4 py-3 text-left text-base font-medium text-stone-600 hover:bg-stone-50 hover:text-stone-900 transition-all duration-200"
                    >
                      <Cog6ToothIcon className="mr-3 h-6 w-6 text-stone-400" />
                      Settings
                    </Link>
                    <button
                      onClick={handleLogout}
                      className="flex w-full items-center rounded-2xl px-4 py-3 text-left text-base font-medium text-stone-600 hover:bg-stone-50 hover:text-stone-900 transition-all duration-200"
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

      <main className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-8 lg:py-10 animate-fade-in">
        {breadcrumbs}
        {children}
      </main>
    </div>
  );
}
