const PALETTES = [
  { bg: '#dfe9dc', ink: '#2f5d43', dot: 'rgba(47,93,67,0.14)' },
  { bg: '#f6ddd0', ink: '#a3401f', dot: 'rgba(163,64,31,0.13)' },
  { bg: '#f5e8c4', ink: '#8a5a0b', dot: 'rgba(138,90,11,0.14)' },
  { bg: '#ebdbe4', ink: '#6b2f52', dot: 'rgba(107,47,82,0.12)' },
  { bg: '#d9e6ee', ink: '#2a5672', dot: 'rgba(42,86,114,0.13)' },
  { bg: '#e7e6cf', ink: '#5a5a1e', dot: 'rgba(90,90,30,0.14)' },
];

function hashString(value: string) {
  let hash = 0;
  for (let i = 0; i < value.length; i += 1) {
    hash = (hash * 31 + value.charCodeAt(i)) | 0;
  }
  return Math.abs(hash);
}

function recipePalette(name: string) {
  return PALETTES[hashString(name || 'recipe') % PALETTES.length];
}

interface RecipeCoverProps {
  name: string;
  imageUrl?: string;
  className?: string;
  size?: 'sm' | 'md' | 'lg';
}

const letterSize = {
  sm: 'text-xl',
  md: 'text-5xl',
  lg: 'text-7xl',
};

export function RecipeCover({ name, imageUrl, className = '', size = 'md' }: RecipeCoverProps) {
  if (imageUrl) {
    return (
      <div className={`overflow-hidden bg-stone-100 ${className}`}>
        <img src={imageUrl} alt="" className="h-full w-full object-cover" loading="lazy" />
      </div>
    );
  }

  const palette = recipePalette(name);
  const initial = (name.trim()[0] || 'R').toUpperCase();

  return (
    <div
      className={`relative flex items-center justify-center overflow-hidden ${className}`}
      style={{
        backgroundColor: palette.bg,
        backgroundImage: `radial-gradient(${palette.dot} 1.2px, transparent 1.2px)`,
        backgroundSize: '14px 14px',
      }}
      aria-hidden="true"
    >
      <span
        className={`font-display font-semibold italic leading-none ${letterSize[size]}`}
        style={{ color: palette.ink }}
      >
        {initial}
      </span>
    </div>
  );
}
