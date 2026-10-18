import type { ComponentType, SVGProps } from 'react';
import {
  ArchiveBoxIcon as ArchiveBoxHeroIcon,
  ArrowLeftIcon as ArrowLeftHeroIcon,
  ArrowPathIcon as ArrowPathHeroIcon,
  ArrowRightIcon as ArrowRightHeroIcon,
  ArrowRightStartOnRectangleIcon as ArrowRightStartOnRectangleHeroIcon,
  ArrowTopRightOnSquareIcon as ArrowTopRightOnSquareHeroIcon,
  ArrowsPointingOutIcon as ArrowsPointingOutHeroIcon,
  Bars3Icon as Bars3HeroIcon,
  BarsArrowDownIcon as BarsArrowDownHeroIcon,
  BarsArrowUpIcon as BarsArrowUpHeroIcon,
  BellIcon as BellHeroIcon,
  BoltIcon as BoltHeroIcon,
  BookOpenIcon as BookOpenHeroIcon,
  CalendarDaysIcon as CalendarDaysHeroIcon,
  ChartBarIcon as ChartBarHeroIcon,
  CheckCircleIcon as CheckCircleHeroIcon,
  CheckIcon as CheckHeroIcon,
  ChevronDownIcon as ChevronDownHeroIcon,
  ChevronLeftIcon as ChevronLeftHeroIcon,
  ChevronRightIcon as ChevronRightHeroIcon,
  ChevronUpIcon as ChevronUpHeroIcon,
  ClipboardDocumentListIcon as ClipboardDocumentListHeroIcon,
  ClockIcon as ClockHeroIcon,
  Cog6ToothIcon as Cog6ToothHeroIcon,
  DocumentDuplicateIcon as DocumentDuplicateHeroIcon,
  EllipsisHorizontalIcon as EllipsisHorizontalHeroIcon,
  EnvelopeIcon as EnvelopeHeroIcon,
  ExclamationCircleIcon as ExclamationCircleHeroIcon,
  ExclamationTriangleIcon as ExclamationTriangleHeroIcon,
  EyeIcon as EyeHeroIcon,
  EyeSlashIcon as EyeSlashHeroIcon,
  FireIcon as FireHeroIcon,
  GlobeAltIcon as GlobeAltHeroIcon,
  HeartIcon as HeartHeroIcon,
  HomeIcon as HomeHeroIcon,
  InformationCircleIcon as InformationCircleHeroIcon,
  LightBulbIcon as LightBulbHeroIcon,
  LinkIcon as LinkHeroIcon,
  MagnifyingGlassIcon as MagnifyingGlassHeroIcon,
  MinusIcon as MinusHeroIcon,
  PencilIcon as PencilHeroIcon,
  PlayIcon as PlayHeroIcon,
  PlusCircleIcon as PlusCircleHeroIcon,
  PlusIcon as PlusHeroIcon,
  ScaleIcon as ScaleHeroIcon,
  ShoppingBagIcon as ShoppingBagHeroIcon,
  ShoppingCartIcon as ShoppingCartHeroIcon,
  SparklesIcon as SparklesHeroIcon,
  Squares2X2Icon as Squares2X2HeroIcon,
  StarIcon as StarHeroIcon,
  StopIcon as StopHeroIcon,
  TrashIcon as TrashHeroIcon,
  UserCircleIcon as UserCircleHeroIcon,
  UserGroupIcon as UserGroupHeroIcon,
  UserIcon as UserHeroIcon,
  XCircleIcon as XCircleHeroIcon,
  XMarkIcon as XMarkHeroIcon,
} from '@heroicons/react/24/outline';
import {
  CheckCircleIcon as CheckCircleSolidHeroIcon,
  HeartIcon as HeartSolidHeroIcon,
  StarIcon as StarSolidHeroIcon,
} from '@heroicons/react/24/solid';

export type IconSize = number | 'xs' | 'sm' | 'md' | 'lg' | 'xl';
export type IconTone = 'default' | 'muted' | 'primary' | 'success' | 'warning' | 'danger';

export interface AppIconProps extends Omit<SVGProps<SVGSVGElement>, 'color'> {
  size?: IconSize;
  tone?: IconTone;
}

const toneClassMap: Record<IconTone, string> = {
  default: '',
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
    const sizeClass = pixelSize || className?.match(/\b[hw]-/) ? undefined : 'h-5 w-5';
    return (
      <Icon
        aria-hidden="true"
        {...props}
        className={cx(sizeClass, toneClassMap[tone], className)}
        style={pixelSize ? { width: pixelSize, height: pixelSize, ...style } : style}
      />
    );
  };
}

export function HungryHelperLogo({ size = 32, className = '' }: AppIconProps) {
  const pixelSize = resolveIconSize(size) ?? 32;
  return (
    <svg
      viewBox="0 0 32 32"
      width={pixelSize}
      height={pixelSize}
      className={className}
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
    >
      <rect width="32" height="32" rx="10" fill="#a63e24" />
      <path d="M15.6 13.6c-.2-3.9 2.3-6.9 6.6-7.5.1 4.2-2.4 7-6.6 7.5Z" fill="#f6d7c4" />
      <path
        d="M15.6 13.6c.6-2 1.8-3.6 3.6-4.8"
        stroke="#a63e24"
        strokeWidth="1"
        strokeLinecap="round"
      />
      <circle cx="11" cy="11.2" r="2.6" fill="#f3e1c4" />
      <path d="M6.5 15.2h19a9.5 9.5 0 0 1-19 0Z" fill="#fff" />
      <path d="M12.5 26.2h7" stroke="#fff" strokeWidth="1.8" strokeLinecap="round" />
    </svg>
  );
}

export const Bars3Icon = withHeroIcon(Bars3HeroIcon);
export const XMarkIcon = withHeroIcon(XMarkHeroIcon);
export const UserCircleIcon = withHeroIcon(UserCircleHeroIcon);
export const Cog6ToothIcon = withHeroIcon(Cog6ToothHeroIcon);
export const SettingsGearIcon = Cog6ToothIcon;
export const PlusCircleIcon = withHeroIcon(PlusCircleHeroIcon);
export const PlusIcon = withHeroIcon(PlusHeroIcon);
export const TrashIcon = withHeroIcon(TrashHeroIcon);
export const CheckIcon = withHeroIcon(CheckHeroIcon);
export const PencilIcon = withHeroIcon(PencilHeroIcon);
export const ArrowLeftIcon = withHeroIcon(ArrowLeftHeroIcon);
export const ArrowRightIcon = withHeroIcon(ArrowRightHeroIcon);
export const ArrowPathIcon = withHeroIcon(ArrowPathHeroIcon);
export const LogoutIcon = withHeroIcon(ArrowRightStartOnRectangleHeroIcon);
export const ExternalLinkIcon = withHeroIcon(ArrowTopRightOnSquareHeroIcon);
export const LinkIcon = withHeroIcon(LinkHeroIcon);
export const EnvelopeIcon = withHeroIcon(EnvelopeHeroIcon);
export const ChevronDownIcon = withHeroIcon(ChevronDownHeroIcon);
export const ChevronLeftIcon = withHeroIcon(ChevronLeftHeroIcon);
export const ChevronRightIcon = withHeroIcon(ChevronRightHeroIcon);
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
export const ExclamationTriangleIcon = withHeroIcon(ExclamationTriangleHeroIcon);
export const InformationCircleIcon = withHeroIcon(InformationCircleHeroIcon);
export const CheckCircleIcon = withHeroIcon(CheckCircleHeroIcon);
export const CheckCircleSolidIcon = withHeroIcon(CheckCircleSolidHeroIcon);
export const XCircleIcon = withHeroIcon(XCircleHeroIcon);
export const UserIcon = withHeroIcon(UserHeroIcon);
export const ScaleIcon = withHeroIcon(ScaleHeroIcon);
export const ClipboardDocumentListIcon = withHeroIcon(ClipboardDocumentListHeroIcon);
export const HomeIcon = withHeroIcon(HomeHeroIcon);
export const DashboardIcon = withHeroIcon(Squares2X2HeroIcon);
export const MagnifyingGlassIcon = withHeroIcon(MagnifyingGlassHeroIcon);
export const SortDescIcon = withHeroIcon(BarsArrowDownHeroIcon);
export const SortAscIcon = withHeroIcon(BarsArrowUpHeroIcon);
export const DocumentDuplicateIcon = withHeroIcon(DocumentDuplicateHeroIcon);
export const EyeIcon = withHeroIcon(EyeHeroIcon);
export const EyeSlashIcon = withHeroIcon(EyeSlashHeroIcon);
export const LightBulbIcon = withHeroIcon(LightBulbHeroIcon);
export const ChartBarIcon = withHeroIcon(ChartBarHeroIcon);
export const FireIcon = withHeroIcon(FireHeroIcon);
export const MinusIcon = withHeroIcon(MinusHeroIcon);
export const EllipsisHorizontalIcon = withHeroIcon(EllipsisHorizontalHeroIcon);
export const ChevronUpIcon = withHeroIcon(ChevronUpHeroIcon);
export const PlayIcon = withHeroIcon(PlayHeroIcon);
export const StopIcon = withHeroIcon(StopHeroIcon);
export const ArrowsPointingOutIcon = withHeroIcon(ArrowsPointingOutHeroIcon);

export const RecipeBookIcon = withHeroIcon(BookOpenHeroIcon);
export const BookOpenIcon = RecipeBookIcon;
export const CalendarMealIcon = withHeroIcon(CalendarDaysHeroIcon);
export const CalendarDaysIcon = CalendarMealIcon;
export const CalendarIcon = CalendarMealIcon;
export const GroceryBagIcon = withHeroIcon(ShoppingBagHeroIcon);
export const ShoppingBagIcon = GroceryBagIcon;
export const ShoppingCartIcon = withHeroIcon(ShoppingCartHeroIcon);
export const ShoppingCartCheckIcon = ShoppingCartIcon;
export const PantryIcon = withHeroIcon(ArchiveBoxHeroIcon);
export const ArchiveBoxIcon = PantryIcon;
export const SparklesIcon = withHeroIcon(SparklesHeroIcon);
export const SparkleWandIcon = SparklesIcon;
export const FireStatsIcon = FireIcon;
export const SuccessCheckIcon = CheckCircleIcon;
