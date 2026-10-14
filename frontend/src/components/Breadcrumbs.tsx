import { Fragment } from 'react';
import { Link } from 'react-router-dom';
import { ChevronRightIcon, HomeIcon } from './ui/AppIcons';

export interface BreadcrumbItem {
  label: string;
  href?: string; // If undefined, this is the current page (not clickable)
}

interface BreadcrumbsProps {
  items: BreadcrumbItem[];
  showHome?: boolean; // Whether to show home icon as first item
}

export default function Breadcrumbs({ items, showHome = true }: BreadcrumbsProps) {
  if (items.length === 0) {
    return null;
  }

  return (
    <nav className="mb-6 flex min-w-0 items-center gap-1.5 text-sm text-stone-500" aria-label="Breadcrumb">
      {showHome && (
        <>
          <Link
            to="/dashboard"
            className="rounded-md p-1 text-stone-400 transition-colors hover:bg-stone-900/5 hover:text-stone-700"
            aria-label="Dashboard"
          >
            <HomeIcon className="h-4 w-4" />
          </Link>
          <ChevronRightIcon className="h-3.5 w-3.5 flex-shrink-0 text-stone-300" />
        </>
      )}

      {items.map((item, index) => {
        const isLast = index === items.length - 1;

        return (
          <Fragment key={index}>
            {item.href ? (
              <Link
                to={item.href}
                className="truncate rounded-md px-1 py-0.5 transition-colors hover:text-stone-900"
              >
                {item.label}
              </Link>
            ) : (
              <span className="truncate px-1 font-medium text-stone-900" aria-current="page">
                {item.label}
              </span>
            )}

            {!isLast && <ChevronRightIcon className="h-3.5 w-3.5 flex-shrink-0 text-stone-300" />}
          </Fragment>
        );
      })}
    </nav>
  );
}
