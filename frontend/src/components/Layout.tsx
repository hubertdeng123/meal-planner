import { Fragment } from 'react';
import { Disclosure, Menu, Transition } from '@headlessui/react';
import {
  Bars3Icon,
  XMarkIcon,
  UserCircleIcon,
  SparklesIcon,
  Cog6ToothIcon,
  BookOpenIcon,
  ShoppingBagIcon,
  PlusCircleIcon,
} from '@heroicons/react/24/outline';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';

function classNames(...classes: string[]) {
  return classes.filter(Boolean).join(' ');
}

const navigation = [
  { name: 'My Recipes', href: '/recipes', icon: BookOpenIcon },
  { name: 'Grocery Lists', href: '/grocery', icon: ShoppingBagIcon },
  { name: 'Generate Recipe', href: '/generate', icon: PlusCircleIcon },
];

interface LayoutProps {
  children: React.ReactNode;
  breadcrumbs?: React.ReactNode; // Optional breadcrumbs to render above content
}

export default function Layout({ children, breadcrumbs }: LayoutProps) {
  const navigate = useNavigate();
  const location = useLocation();
  const { logout } = useAuth();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const isActive = (href: string) => {
    return location.pathname === href || location.pathname.startsWith(href + '/');
  };

  return (
    <div className="min-h-screen gradient-bg">
      <Disclosure as="nav" className="sticky top-3 z-40">
        {({ open }) => (
          <>
            <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
              <div className="relative overflow-hidden rounded-3xl border border-orange-200/70 bg-white/80 shadow-sm backdrop-blur">
                <div className="absolute inset-0 pointer-events-none bg-[radial-gradient(circle_at_top,_rgba(254,215,170,0.4),_rgba(255,255,255,0.8))]" />
                <div className="absolute right-10 top-4 h-12 w-12 rounded-full bg-orange-200/40 blur-xl pointer-events-none" />
                <div className="absolute bottom-2 left-8 h-10 w-10 rounded-full bg-rose-200/30 blur-xl pointer-events-none" />

                <div className="relative flex h-16 justify-between px-4 sm:px-6">
                  <div className="flex">
                    <div className="flex flex-shrink-0 items-center">
                      <Link
                        to="/dashboard"
                        className="flex items-center space-x-3 rounded-full border border-orange-200/70 bg-white/80 px-3 py-1.5 shadow-sm transition-all duration-200 hover:-translate-y-0.5"
                      >
                        <div className="h-8 w-8 rounded-xl gradient-primary flex items-center justify-center">
                          <SparklesIcon className="h-5 w-5 text-white" />
                        </div>
                        <h1 className="text-lg font-semibold text-orange-950">Hungry Helper</h1>
                      </Link>
                    </div>
                    <div className="hidden md:ml-6 md:flex md:items-center md:space-x-2">
                      {navigation.map(item => {
                        const Icon = item.icon;
                        return (
                          <Link
                            key={item.href}
                            to={item.href}
                            className={classNames(
                              'inline-flex items-center rounded-full px-3 py-2 text-sm font-medium transition-all duration-200',
                              isActive(item.href)
                                ? 'bg-white/80 text-orange-700 shadow-sm ring-1 ring-orange-200/80'
                                : 'text-slate-600 hover:bg-white/70 hover:text-slate-900'
                            )}
                          >
                            <Icon className="mr-2 h-4 w-4" />
                            {item.name}
                          </Link>
                        );
                      })}
                    </div>
                  </div>
                  <div className="hidden sm:ml-6 sm:flex sm:items-center">
                    <Menu as="div" className="relative ml-3">
                      <div>
                        <Menu.Button className="flex rounded-full bg-white/80 p-2 text-sm shadow-sm ring-1 ring-orange-200/70 transition-all duration-200 hover:-translate-y-0.5 focus:outline-none focus:ring-2 focus:ring-orange-500 focus:ring-offset-2">
                          <span className="sr-only">Open user menu</span>
                          <UserCircleIcon className="h-5 w-5 text-orange-600" />
                        </Menu.Button>
                      </div>
                      <Transition
                        as={Fragment}
                        enter="transition ease-out duration-200"
                        enterFrom="transform opacity-0 scale-95"
                        enterTo="transform opacity-100 scale-100"
                        leave="transition ease-in duration-75"
                        leaveFrom="transform opacity-100 scale-100"
                        leaveTo="transform opacity-0 scale-95"
                      >
                        <Menu.Items className="absolute right-0 z-10 mt-3 w-48 origin-top-right rounded-2xl bg-white py-2 shadow-xl ring-1 ring-orange-100 focus:outline-none">
                          <Menu.Item>
                            {({ active }) => (
                              <Link
                                to="/settings"
                                className={classNames(
                                  active ? 'bg-orange-50/70' : '',
                                  'flex items-center px-4 py-2 text-sm text-slate-700 transition-colors duration-200'
                                )}
                              >
                                <Cog6ToothIcon className="mr-3 h-4 w-4 text-orange-400" />
                                Settings
                              </Link>
                            )}
                          </Menu.Item>
                          <Menu.Item>
                            {({ active }) => (
                              <button
                                onClick={handleLogout}
                                className={classNames(
                                  active ? 'bg-orange-50/70' : '',
                                  'block w-full px-4 py-2 text-left text-sm text-slate-700 transition-colors duration-200'
                                )}
                              >
                                Sign out
                              </button>
                            )}
                          </Menu.Item>
                        </Menu.Items>
                      </Transition>
                    </Menu>
                  </div>
                  <div className="-mr-2 flex items-center sm:hidden">
                    <Disclosure.Button className="inline-flex items-center justify-center rounded-full border border-orange-200/70 bg-white/80 p-2 text-orange-600 shadow-sm transition-all duration-200 hover:-translate-y-0.5 focus:outline-none focus:ring-2 focus:ring-inset focus:ring-orange-500">
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
                <div className="mt-3 rounded-3xl border border-orange-200/70 bg-white/90 p-3 shadow-sm">
                  <div className="space-y-1">
                    {navigation.map(item => {
                      const Icon = item.icon;
                      return (
                        <Link
                          key={item.href}
                          to={item.href}
                          className={classNames(
                            'flex w-full items-center rounded-2xl px-3 py-2 text-left text-base font-medium transition-all duration-200',
                            isActive(item.href)
                              ? 'bg-orange-50 text-orange-700'
                              : 'text-slate-600 hover:bg-orange-50/60 hover:text-slate-900'
                          )}
                        >
                          <Icon className="mr-3 h-5 w-5" />
                          {item.name}
                        </Link>
                      );
                    })}
                  </div>
                  <div className="mt-3 border-t border-orange-100 pt-3">
                    <Link
                      to="/settings"
                      className="flex w-full items-center rounded-2xl px-3 py-2 text-left text-base font-medium text-slate-600 hover:bg-orange-50/60 hover:text-slate-900 transition-all duration-200"
                    >
                      <Cog6ToothIcon className="mr-3 h-5 w-5 text-orange-400" />
                      Settings
                    </Link>
                    <button
                      onClick={handleLogout}
                      className="flex w-full items-center rounded-2xl px-3 py-2 text-left text-base font-medium text-slate-600 hover:bg-orange-50/60 hover:text-slate-900 transition-all duration-200"
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

      <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8 animate-fade-in">
        {breadcrumbs}
        {children}
      </main>
    </div>
  );
}
