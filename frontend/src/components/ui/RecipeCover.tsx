const PALETTES = [
  { bg: '#f6ddd0', ink: '#8c321c', dot: 'rgba(140,50,28,0.14)' },
  { bg: '#f3e4c8', ink: '#7a4a16', dot: 'rgba(122,74,22,0.14)' },
  { bg: '#efe2d4', ink: '#6b3a28', dot: 'rgba(107,58,40,0.12)' },
  { bg: '#e7efe4', ink: '#3d5c45', dot: 'rgba(61,92,69,0.12)' },
  { bg: '#f8efe2', ink: '#8a5a2b', dot: 'rgba(138,90,43,0.13)' },
  { bg: '#eadfd2', ink: '#5c4636', dot: 'rgba(92,70,54,0.12)' },
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
