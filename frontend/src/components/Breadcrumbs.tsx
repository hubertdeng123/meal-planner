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
    <nav
      className="mb-6 flex items-center space-x-2 text-sm text-[#78716C]"
      aria-label="Breadcrumb"
    >
      {showHome && (
        <>
          <Link
            to="/dashboard"
            className="text-[#78716C] hover:text-[#1C1917] transition-colors duration-150"
            aria-label="Dashboard"
          >
            <HomeIcon className="h-4 w-4" />
          </Link>
          {items.length > 0 && (
            <ChevronRightIcon className="h-3.5 w-3.5 text-[#D6CEC2] flex-shrink-0" />
          )}
        </>
      )}

      {items.map((item, index) => {
        const isLast = index === items.length - 1;

        return (
          <Fragment key={index}>
            {item.href ? (
              <Link
                to={item.href}
                className="text-[#78716C] hover:text-[#1C1917] transition-colors duration-150 truncate max-w-xs"
              >
                {item.label}
              </Link>
            ) : (
              <span
                className="text-[#1C1917] font-medium truncate max-w-xs animate-fade-in"
                aria-current="page"
              >
                {item.label}
              </span>
            )}

            {!isLast && <ChevronRightIcon className="h-3.5 w-3.5 text-[#D6CEC2] flex-shrink-0" />}
          </Fragment>
        );
      })}
    </nav>
  );
}
