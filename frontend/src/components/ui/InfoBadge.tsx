interface InfoBadgeProps {
  icon: string;
  label: string;
  value: string | number;
  className?: string;
}

export function InfoBadge({ icon, label, value, className = '' }: InfoBadgeProps) {
  return (
    <div className={`flex flex-col items-center gap-1 ${className}`}>
      <div className="flex items-center gap-2">
        <span className="text-2xl">{icon}</span>
        <span className="text-sm font-medium text-gray-600">{label}</span>
      </div>
      <div className="text-lg font-semibold text-gray-900">{value}</div>
    </div>
  );
}
