import type { ComponentType, SVGProps } from 'react';
import {
  ArrowLeftIcon as ArrowLeftHeroIcon,
  ArrowRightIcon as ArrowRightHeroIcon,
  Bars3Icon as Bars3HeroIcon,
  BellIcon as BellHeroIcon,
  BoltIcon as BoltHeroIcon,
  CheckCircleIcon as CheckCircleHeroIcon,
  CheckIcon as CheckHeroIcon,
  ChevronDownIcon as ChevronDownHeroIcon,
  ChevronLeftIcon as ChevronLeftHeroIcon,
  ChevronRightIcon as ChevronRightHeroIcon,
  ClockIcon as ClockHeroIcon,
  ClipboardDocumentListIcon as ClipboardDocumentListHeroIcon,
  Cog6ToothIcon as Cog6ToothHeroIcon,
  EnvelopeIcon as EnvelopeHeroIcon,
  ExclamationCircleIcon as ExclamationCircleHeroIcon,
  ExclamationTriangleIcon as ExclamationTriangleHeroIcon,
  GlobeAltIcon as GlobeAltHeroIcon,
  HeartIcon as HeartHeroIcon,
  HomeIcon as HomeHeroIcon,
  PencilIcon as PencilHeroIcon,
  PlusCircleIcon as PlusCircleHeroIcon,
  PlusIcon as PlusHeroIcon,
  ScaleIcon as ScaleHeroIcon,
  StarIcon as StarHeroIcon,
  TrashIcon as TrashHeroIcon,
  UserCircleIcon as UserCircleHeroIcon,
  UserGroupIcon as UserGroupHeroIcon,
  UserIcon as UserHeroIcon,
  XMarkIcon as XMarkHeroIcon,
} from '@heroicons/react/24/outline';
import {
  HeartIcon as HeartSolidHeroIcon,
  StarIcon as StarSolidHeroIcon,
} from '@heroicons/react/24/solid';

import {
  AmberCheckIcon as AmberCheckBrandIcon,
  CalendarMealIcon as CalendarMealBrandIcon,
  FireStatsIcon as FireStatsBrandIcon,
  GroceryBagIcon as GroceryBagBrandIcon,
  HungryHelperLogo as HungryHelperLogoBrandIcon,
  OrangeCheckIcon as OrangeCheckBrandIcon,
  RecipeBookIcon as RecipeBookBrandIcon,
  SettingsGearIcon as SettingsGearBrandIcon,
  ShoppingCartCheckIcon as ShoppingCartCheckBrandIcon,
  SparkleWandIcon as SparkleWandBrandIcon,
  SuccessCheckIcon as SuccessCheckBrandIcon,
} from './BrandIcons';

export type IconSize = number | 'xs' | 'sm' | 'md' | 'lg' | 'xl';
export type IconTone = 'default' | 'muted' | 'primary' | 'success' | 'warning' | 'danger';

export interface AppIconProps extends Omit<SVGProps<SVGSVGElement>, 'color'> {
  size?: IconSize;
  tone?: IconTone;
}

type BrandIconProps = {
  className?: string;
  size?: number;
};

const toneClassMap: Record<IconTone, string> = {
  default: 'text-stone-700',
  muted: 'text-stone-500',
  primary: 'text-primary',
  success: 'text-emerald-600',
  warning: 'text-amber-500',
  danger: 'text-red-600',
};

function resolveIconSize(size?: IconSize): number | undefined {
  if (!size) return undefined;
  if (typeof size === 'number') return size;
  const map: Record<Exclude<IconSize, number>, number> = {
    xs: 14,
    sm: 16,
    md: 20,
    lg: 24,
    xl: 32,
  };
  return map[size];
}

function cx(...classes: Array<string | undefined>) {
  return classes.filter(Boolean).join(' ');
}

function withHeroIcon(Icon: ComponentType<SVGProps<SVGSVGElement>>) {
  return function HeroWrapper({
    size,
    tone = 'default',
    className,
    style,
    ...props
  }: AppIconProps) {
    const pixelSize = resolveIconSize(size);
    return (
      <Icon
        {...props}
        className={cx(toneClassMap[tone], className)}
        style={pixelSize ? { width: pixelSize, height: pixelSize, ...style } : style}
      />
    );
  };
}

function withBrandIcon(Icon: ComponentType<BrandIconProps>) {
  return function BrandWrapper({ size, tone = 'default', className }: AppIconProps) {
    const pixelSize = resolveIconSize(size);
    return <Icon className={cx(toneClassMap[tone], className)} size={pixelSize} />;
  };
}

function PantryJarIcon({ className = '', size = 32 }: BrandIconProps) {
  return (
    <svg
      viewBox="0 0 32 32"
      width={size}
      height={size}
      className={className}
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <defs>
        <linearGradient id="jarBodyGrad" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#fef3c7" />
          <stop offset="100%" stopColor="#fde68a" />
        </linearGradient>
        <linearGradient id="jarTopGrad" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#34d399" />
          <stop offset="100%" stopColor="#059669" />
        </linearGradient>
      </defs>
      <rect x="8" y="8" width="16" height="20" rx="4" fill="url(#jarBodyGrad)" />
      <rect x="7" y="6" width="18" height="5" rx="2.5" fill="url(#jarTopGrad)" />
      <path
        d="M12 16c1.3-1 2.7-1 4 0 1.3 1 2.7 1 4 0"
        stroke="#ea580c"
        strokeWidth="1.5"
        strokeLinecap="round"
      />
      <circle cx="14" cy="21" r="1.5" fill="#fb923c" />
      <circle cx="19" cy="22" r="1.2" fill="#f59e0b" />
    </svg>
  );
}

export const HungryHelperLogo = withBrandIcon(HungryHelperLogoBrandIcon);
export const CalendarMealIcon = withBrandIcon(CalendarMealBrandIcon);
export const GroceryBagIcon = withBrandIcon(GroceryBagBrandIcon);
export const RecipeBookIcon = withBrandIcon(RecipeBookBrandIcon);
export const SparkleWandIcon = withBrandIcon(SparkleWandBrandIcon);
export const FireStatsIcon = withBrandIcon(FireStatsBrandIcon);
export const ShoppingCartCheckIcon = withBrandIcon(ShoppingCartCheckBrandIcon);
export const SuccessCheckIcon = withBrandIcon(SuccessCheckBrandIcon);
export const SettingsGearIcon = withBrandIcon(SettingsGearBrandIcon);
export const AmberCheckIcon = withBrandIcon(AmberCheckBrandIcon);
export const OrangeCheckIcon = withBrandIcon(OrangeCheckBrandIcon);
export const PantryIcon = withBrandIcon(PantryJarIcon);

export const Bars3Icon = withHeroIcon(Bars3HeroIcon);
export const XMarkIcon = withHeroIcon(XMarkHeroIcon);
export const UserCircleIcon = withHeroIcon(UserCircleHeroIcon);
export const Cog6ToothIcon = withHeroIcon(Cog6ToothHeroIcon);
export const BookOpenIcon = withBrandIcon(RecipeBookBrandIcon);
export const ShoppingBagIcon = withBrandIcon(GroceryBagBrandIcon);
export const PlusCircleIcon = withHeroIcon(PlusCircleHeroIcon);
export const CalendarDaysIcon = withBrandIcon(CalendarMealBrandIcon);
export const ArchiveBoxIcon = withBrandIcon(PantryJarIcon);
export const ShoppingCartIcon = withBrandIcon(ShoppingCartCheckBrandIcon);
export const PlusIcon = withHeroIcon(PlusHeroIcon);
export const TrashIcon = withHeroIcon(TrashHeroIcon);
export const CheckIcon = withHeroIcon(CheckHeroIcon);
export const PencilIcon = withHeroIcon(PencilHeroIcon);
export const ArrowLeftIcon = withHeroIcon(ArrowLeftHeroIcon);
export const ArrowRightIcon = withHeroIcon(ArrowRightHeroIcon);
export const EnvelopeIcon = withHeroIcon(EnvelopeHeroIcon);
export const ChevronDownIcon = withHeroIcon(ChevronDownHeroIcon);
export const ChevronLeftIcon = withHeroIcon(ChevronLeftHeroIcon);
export const ChevronRightIcon = withHeroIcon(ChevronRightHeroIcon);
export const CalendarIcon = withBrandIcon(CalendarMealBrandIcon);
export const ClockIcon = withHeroIcon(ClockHeroIcon);
export const UserGroupIcon = withHeroIcon(UserGroupHeroIcon);
export const BoltIcon = withHeroIcon(BoltHeroIcon);
export const HeartIcon = withHeroIcon(HeartHeroIcon);
export const HeartSolidIcon = withHeroIcon(HeartSolidHeroIcon);
export const StarIcon = withHeroIcon(StarHeroIcon);
export const StarSolidIcon = withHeroIcon(StarSolidHeroIcon);
export const BellIcon = withHeroIcon(BellHeroIcon);
export const GlobeAltIcon = withHeroIcon(GlobeAltHeroIcon);
export const ExclamationCircleIcon = withHeroIcon(ExclamationCircleHeroIcon);
export const CheckCircleIcon = withHeroIcon(CheckCircleHeroIcon);
export const UserIcon = withHeroIcon(UserHeroIcon);
export const SparklesIcon = withBrandIcon(SparkleWandBrandIcon);
export const ScaleIcon = withHeroIcon(ScaleHeroIcon);
export const ClipboardDocumentListIcon = withHeroIcon(ClipboardDocumentListHeroIcon);
export const HomeIcon = withHeroIcon(HomeHeroIcon);
export const ExclamationTriangleIcon = withHeroIcon(ExclamationTriangleHeroIcon);
